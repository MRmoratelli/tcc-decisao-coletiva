// Ten fictitious identities, synthetic AI and embedded PostgreSQL only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { Repository,type SQLPool } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
import { FakeAI,proposal } from './fixtures.js';
import {type FactualAdapter} from './factual.js';
import {syntheticReport,fact} from './factual-fixtures.js';
test('Factual 10–14: dez identidades simultâneas, autorização, contestação, persistência, importação e consenso',async()=>{
 const db=new PGlite(),query=async(sql:string,values?:any[])=>{if(sql.includes('CREATE TABLE')){await db.exec(sql);return {rows:[]};}return db.query(sql,values);};let tail=Promise.resolve();
 const pool:SQLPool={query,async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;return {query,release};}};await migrate({query});
 const repo=new Repository(pool,'synthetic-pepper-for-ten-participant-test'),ai=new FakeAI();let calls=0;
 const factual:FactualAdapter={enabled:true,async check(text){calls++;await new Promise(r=>setTimeout(r,10));return syntheticReport(text);}};
 const server=createApp(repo,ai,'synthetic-signing-for-ten-participant-test',{factual}).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const addr=server.address();assert.ok(addr&&typeof addr!=='string');const base='http://127.0.0.1:'+addr.port+'/api';
 const post=async(path:string,body:any)=>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};};
 try{
  const c=(await post('/rooms',{proposal,participantCount:10,bypassReason:'Criação técnica sintética sem IA.'})).data;
  const view=async(credential=c.moderatorCredential)=>(await post('/rooms/'+c.code+'/view',{credential})).data;
  const v=await view(),binding={proposalId:v.state.proposals[0].id,roundId:v.state.rounds[0].id};
  const results=await Promise.all(c.participants.map((p:any,i:number)=>post('/rooms/'+c.code+'/fact-check',{credential:p.credential,...binding,consent:true,text:'Alegação pública sintética número '+i+'.'})));
  assert.ok(results.every(r=>r.status===201),JSON.stringify(results.map(r=>({status:r.status,error:r.data.error}))));assert.equal(calls,10);
  const hidden=await Promise.all(c.participants.map((p:any)=>view(p.credential)));assert.ok(hidden.every(v=>v.state.factualChecks.length===1));
  const all=await view();assert.equal(all.state.factualChecks.length,10);assert.equal(all.state.votes.length,0);assert.equal(all.state.decision.status,'OPEN');
  const own=hidden[0].state.factualChecks[0];assert.equal((await post('/rooms/'+c.code+'/contest',{credential:c.participants[0].credential,revision:all.revision,targetId:own.id,text:'Contesto a interpretação sintética e mantenho minha posição.'})).status,201);
  const unauthorized=await post('/rooms/'+c.code+'/fact-check',{credential:'x'.repeat(43),...binding,consent:true,text:fact.text});assert.equal(unauthorized.status,401);
  // Imported evidence must not poison the live cache: an immediate fresh check is allowed.
  const openArchive=(await post('/rooms/'+c.code+'/export',{credential:c.moderatorCredential})).data;
  openArchive.state.factualChecks[0].createdAt='2099-01-01T00:00:00Z';
  const openCopy=(await post('/import',openArchive)).data;
  const fresh=await post('/rooms/'+openCopy.code+'/fact-check',{credential:openCopy.participants[0].credential,...binding,consent:true,text:'Alegação pública sintética número 0.'});
  assert.equal(fresh.status,201);assert.equal(fresh.data.cached,false);assert.equal(fresh.data.check.provenance,'SYNTHETIC_TEST');assert.equal(calls,11);
  // The first simultaneous vote submissions may race: retry only 409, never duplicate an accepted write.
  const cast=async(p:any)=>{for(let n=0;n<15;n++){const w=await view(p.credential),r=await post('/rooms/'+c.code+'/votes',{credential:p.credential,revision:w.revision,...binding,choice:'ACEITO'});if(r.status===201)return;if(r.status!==409)assert.fail('Vote failed: '+r.status);}assert.fail('Concurrent vote retry exhausted');};
  await Promise.all(c.participants.slice(0,9).map(cast));assert.equal((await view()).state.decision.status,'OPEN');await cast(c.participants[9]);assert.equal((await view()).state.decision.status,'CONSENSUS');
  const archive=(await post('/rooms/'+c.code+'/export',{credential:c.moderatorCredential})).data;assert.equal(archive.state.factualChecks.length,10);assert.equal(archive.state.contests.length,1);assert.ok(!JSON.stringify(archive).includes(c.moderatorCredential));
  const restored=await post('/import',archive);assert.equal(restored.status,201);const copy=(await post('/rooms/'+restored.data.code+'/view',{credential:restored.data.moderatorCredential})).data;assert.equal(copy.state.factualChecks.length,10);assert.ok(copy.state.factualChecks.every((f:any)=>f.provenance==='IMPORTED_UNAUTHENTICATED'));
  const legacy=structuredClone(archive);delete legacy.state.factualChecks;legacy.state.contests=[];assert.equal((await post('/import',legacy)).status,201);
  // A forged favorable result with missing metadata links is rejected on import.
  const invalid=structuredClone(archive);invalid.state.factualChecks[0].claims[0].evidenceLinks=[];assert.equal((await post('/import',invalid)).status,400);
 }finally{await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
