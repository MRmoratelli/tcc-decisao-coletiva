// Technical synthetic tests. No provider network, credits or participant data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {MemoryProviderBudget,PostgresProviderBudget,type BudgetLimits} from './budget.js';
import {migrate} from './migrate.js';
import type {SQLPool} from './db.js';
import {FactualService} from './factual.js';
import {fact,retrieved,verdict,syntheticNow} from './factual-fixtures.js';
import {FACTUAL_MODEL} from '../shared/factual.js';
const limits:BudgetLimits={daily:100,minute:15,monthly:1000,concurrent:10};
test('Tavily: 100 complete synthetic checks admitted; 101st search blocked; cache consumes no duplicate',async()=>{
 let now=syntheticNow,searches=0,calls=0;
 const s=new FactualService({enabled:true,freeTierConfirmed:true,now:()=>now,search:{configured:true,synthetic:true,async search(){searches++;return retrieved();}},geminiTransport:async mode=>{calls++;return mode==='classify'?{text:JSON.stringify({claims:[fact]}),modelVersion:FACTUAL_MODEL}:verdict();}});
 assert.equal(s.limits.maxDailySearches,100);assert.equal(s.limits.maxMinuteSearches,15);
 for(let i=0;i<100;i++){now+=20000;const report=await s.check(fact.text,'synthetic-room-'+i);assert.equal(report.claims[0].status,'EVIDENCIA_FAVORAVEL');}
 assert.equal(searches,100);assert.equal(calls,200);
 await s.check(fact.text,'synthetic-room-99');assert.equal(searches,100);assert.equal(calls,200);
 now+=20000;const blocked=await s.check(fact.text,'synthetic-room-101');assert.equal(blocked.claims[0].failureCode,'LOCAL_SEARCH_LIMIT');assert.equal(searches,100);
});
test('Tavily: 15 reservations per rolling minute; 16th blocked; UTC day/month reset independently',async()=>{
 let now=syntheticNow;const b=new MemoryProviderBudget(()=>now);
 for(let i=0;i<15;i++)await(await b.reserve('search',limits))();
 await assert.rejects(()=>b.reserve('search',limits),/LOCAL_SEARCH_LIMIT/);
 now+=60000;await(await b.reserve('search',limits))();
 const small={...limits,daily:1,monthly:2};const c=new MemoryProviderBudget(()=>now);await(await c.reserve('search',small))();
 now+=86400000;await(await c.reserve('search',small))();now+=86400000;
 await assert.rejects(()=>c.reserve('search',small),/LOCAL_SEARCH_MONTHLY_LIMIT/);
 now=Date.UTC(2026,11,1);await(await c.reserve('search',small))();
});
test('Tavily: failures retain reservations; concurrency leases expire after process interruption',async()=>{
 let now=syntheticNow;const b=new MemoryProviderBudget(()=>now),l={...limits,daily:2,concurrent:2};
 const first=await b.reserve('search',l);await b.reserve('search',l);await assert.rejects(()=>b.reserve('gemini',{daily:250,minute:12,concurrent:2}),/CONCURRENCY/);
 now+=90000;await(await b.reserve('gemini',{daily:250,minute:12,concurrent:2}))();await first();
 await assert.rejects(()=>b.reserve('search',l),/LOCAL_SEARCH_LIMIT/);
});
test('PostgreSQL ledger: concurrent instances, 100/101, restart, monthly barrier and fail-closed',async()=>{
 const db=new PGlite();const query=async(sql:string,values?:any[]):Promise<{rows:any[]}>=>{if(sql.includes('CREATE TABLE')){await db.exec(sql);return {rows:[]};}return db.query(sql,values);};
 let tail=Promise.resolve();const pool:SQLPool={query,async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;return {query,release};}};
 try{await migrate({query});await migrate({query});const a=new PostgresProviderBudget(pool),b=new PostgresProviderBudget(pool),wide={...limits,minute:100,concurrent:100};
  const attempts=await Promise.allSettled(Array.from({length:101},(_,i)=>(i%2?a:b).reserve('search',wide)));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,100);assert.equal(attempts.filter(r=>r.status==='rejected').length,1);
  for(const r of attempts)if(r.status==='fulfilled')await r.value();
  await assert.rejects(()=>new PostgresProviderBudget(pool).reserve('search',wide),/LOCAL_SEARCH_LIMIT/);
  const state=(await query('SELECT state FROM dc2_provider_budget WHERE id=1')).rows[0].state as import('./budget.js').BudgetState;
  assert.equal(state.search.calls,100);assert.equal(state.search.monthly,100);assert.equal(state.leases.length,0);
  state.search.calls=0;state.search.minute=[];state.search.monthly=1000;await query('UPDATE dc2_provider_budget SET state=$1 WHERE id=1',[JSON.stringify(state)]);
  await assert.rejects(()=>b.reserve('search',wide),/LOCAL_SEARCH_MONTHLY_LIMIT/);
  state.search.monthly=0;await query('UPDATE dc2_provider_budget SET state=$1 WHERE id=1',[JSON.stringify(state)]);
  const burst=await Promise.allSettled(Array.from({length:16},()=>b.reserve('search',{...limits,concurrent:20})));
  assert.equal(burst.filter(r=>r.status==='fulfilled').length,15);for(const r of burst)if(r.status==='fulfilled')await r.value();
  const broken=new PostgresProviderBudget({query,async connect(){throw Error('database unavailable');}});await assert.rejects(()=>broken.reserve('search',limits),/PERSISTENT_BUDGET_UNAVAILABLE/);
 }finally{await db.close();}
});
