// All identities, decisions and answers below are synthetic technical fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {Repository,type SQLPool} from './db.js';
import {migrate} from './migrate.js';
import {createApp} from './app.js';
import {FakeAI,proposal} from './fixtures.js';
import {NATURALISTIC_VERSION,APPLICATION_VARIANT} from '../shared/instrument.js';
import {INSTRUMENT_VERSION} from '../shared/contracts.js';
test('HTTP DSR: ten simultaneous identities; one-round consensus/impasse, two rounds, restart and historical import',async()=>{
 const db=new PGlite();const query=async(sql:string,values?:any[])=>{if(sql.includes('CREATE TABLE')){await db.exec(sql);return {rows:[]};}return db.query(sql,values);};let tail=Promise.resolve();
 const pool:SQLPool={query,async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;return {query,release};}};await migrate({query});
 const pepper='synthetic-only-evaluation-pepper-value',repo=new Repository(pool,pepper),server=createApp(repo,new FakeAI(),'synthetic-only-evaluation-signing-value').listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const addr=server.address();assert.ok(addr&&typeof addr!=='string');const base='http://127.0.0.1:'+addr.port+'/api';
 const post=async(path:string,body:any)=>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};};
 const input={instrumentVersion:NATURALISTIC_VERSION,applicationVariant:APPLICATION_VARIANT,baseInstrumentVersion:INSTRUMENT_VERSION,answers:[5,'N/A',null,...Array(19).fill(null)],open:['[SINTÉTICO]','','',''],consent:true};
 const view=async(c:any,credential=c.moderatorCredential)=>(await post('/rooms/'+c.code+'/view',{credential})).data;
 const action=async(c:any,path:string,body:any={},credential=c.moderatorCredential)=>{const v=await view(c,credential);return post('/rooms/'+c.code+path,{credential,revision:v.revision,...body});};
 const create=async()=>(await post('/rooms',{proposal:{...proposal,title:'[SINTÉTICO DSR] Encerramento legítimo'},participantCount:10,bypassReason:'Teste técnico, sem dados científicos.'})).data;
 const accept=async(c:any,p:any)=>{for(let i=0;i<20;i++){const v=await view(c,p.credential),r=v.state.rounds.at(-1);const result=await action(c,'/votes',{roundId:r.id,proposalId:r.proposalId,choice:'ACEITO',justification:''},p.credential);if(result.status===201)return;assert.equal(result.status,409);}throw Error('Concurrent test retry exceeded');};
 try{
  const a=await create();assert.equal((await action(a,'/evaluation',{input},a.participants[0].credential)).status,409);
  await Promise.all(a.participants.slice(0,9).map((p:any)=>accept(a,p)));assert.equal((await view(a)).state.decision.status,'OPEN');await accept(a,a.participants[9]);
  for(const p of a.participants){const r=await action(a,'/evaluation',{input},p.credential);assert.equal(r.status,201,JSON.stringify(r.data));}
  const exported=(await action(a,'/export')).data;assert.equal(exported.state.rounds.length,1);assert.equal(exported.state.evaluations.length,10);assert.equal(exported.evaluation.items[1].na,10);assert.equal(exported.evaluation.items[2].missing,10);
  const identity=await new Repository(pool,pepper).authorize(a.code,a.moderatorCredential);assert.ok(identity);assert.deepEqual((await new Repository(pool,pepper).read(identity)).state,exported.state);
  const restored=await post('/import',exported);assert.equal(restored.status,201,JSON.stringify(restored.data));assert.deepEqual((await action(restored.data,'/export')).data.state.evaluations.map((e:any)=>e.input),exported.state.evaluations.map((e:any)=>e.input));
  const b=await create();assert.equal((await action(b,'/close',{reason:'[SINTÉTICO] Impasse sem rodada artificial.'})).status,200);assert.equal((await action(b,'/evaluation',{input},b.participants[0].credential)).status,201);assert.equal((await view(b,b.participants[0].credential)).state.evaluations[0].applicationContext.processResult,'CLOSED_WITHOUT_CONSENSUS');
  const c=await create();const v=await view(c);assert.equal((await action(c,'/publish',{proposal:{...proposal,text:'[SINTÉTICO] Revisão operacional necessária.'},sourceId:v.state.proposals[0].id,reason:'Revisão substantiva sintética.',confirm:true,coverage:[]})).status,200);await action(c,'/close',{reason:'[SINTÉTICO] Encerramento da segunda rodada.'});
  const legacy={instrumentVersion:INSTRUMENT_VERSION,answers:Array(22).fill(null),open:Array(4).fill(''),consent:true};assert.equal((await action(c,'/evaluation',{input:legacy},c.participants[0].credential)).status,201);const historical=(await action(c,'/export')).data;const copy=await post('/import',historical);assert.equal(copy.status,201);assert.deepEqual((await action(copy.data,'/export')).data.state.evaluations[0].input,legacy);
 }finally{await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
