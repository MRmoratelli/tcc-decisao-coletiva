import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { Repository,type SQLPool } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
import {GeminiAdapter} from './ai.js';
import { FakeAI,proposal,review } from './fixtures.js';
import { RESEARCH_VERSION } from '../shared/research.js';
const db=new PGlite();
const query=async(sql:string,values?:any[]):Promise<{rows:any[]}>=>{if(sql.includes('CREATE TABLE')){await db.exec(sql);return {rows:[]};}return db.query(sql,values);};
let tail=Promise.resolve();
const pool:SQLPool={query,async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;return {query,release};}};
await migrate({query});
const repo=new Repository(pool,'synthetic-usability-pepper-not-real-credential'),ai=new FakeAI();
const server=createApp(repo,ai,'synthetic-usability-signing-not-real-credential').listen(0,'127.0.0.1');
await new Promise<void>(r=>server.once('listening',r));const addr=server.address();if(!addr||typeof addr==='string')throw Error('server');
const base='http://127.0.0.1:'+addr.port+'/api';
async function post(path:string,body:unknown){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};}
const token=(i:number)=>String(i).padStart(64,'0');
async function createRoom(count=3){const r=await post('/rooms',{proposal:{title:'Teste sintético de usabilidade',text:'Decidir um prazo comum.',context:'Somente teste técnico, sem participantes reais.'},participantCount:count,simple:true,aiConsent:true});assert.equal(r.status,201,JSON.stringify(r.data));return r.data;}
async function join(c:any,i:number,version:string=RESEARCH_VERSION){return post('/rooms/'+c.code+'/join',{browserCredential:token(i),consent:true,version});}
async function view(c:any,key=c.moderatorCredential){const r=await post('/rooms/'+c.code+'/view',{credential:key});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
async function cast(c:any,i:number,choice:string,text=''){const v=await view(c,token(i)),r=v.state.rounds.at(-1);return post('/rooms/'+c.code+'/votes',{credential:token(i),revision:v.revision,roundId:r.id,proposalId:r.proposalId,choice,justification:text,bypassReason:text?'Teste sintético sem parecer.':undefined});}
async function waitReady(c:any,status='READY'){for(let i=0;i<60;i++){const v=await view(c);if(v.state.mediation?.status===status)return v;await new Promise(r=>setTimeout(r,20));}throw Error('Mediação não chegou a '+status);}
after(async()=>{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));await db.close();});

test('Revisão inicial antes da sala: recibo original, decisão humana e nenhuma chamada duplicada',async t=>{
 let calls=0;
 const mock=t.mock.method(ai,'analyzeProposal',async()=>{calls++;return review;});
 try{
  const original={...proposal,text:'Vamos definir juntos um prazo para a entrega.'};
  const preview=await post('/ai/proposal-review',{proposal:original,consent:true});
  assert.equal(preview.status,200);assert.equal(calls,1);
  const payload={proposal:{...original,text:review.suggestedRewrite+' Edição humana confirmada.'},reviewedProposal:original,participantCount:2,simple:true,aiConsent:true,initialReviewMode:'REVIEWED',receipt:preview.data.receipt,appliedRewrite:true,reviewChoice:'USED_REWRITE'};
  assert.equal((await post('/rooms',{...payload,receipt:undefined})).status,400);
  assert.equal((await post('/rooms',{...payload,reviewedProposal:{...original,text:'Rascunho adulterado.'}})).status,400);
  const created=await post('/rooms',payload);assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(calls,1);
  const v=await view(created.data);
  assert.equal(v.state.initialDraft.text,original.text);
  assert.equal(v.state.proposals[0].review.result.suggestedRewrite,review.suggestedRewrite);
  assert.equal(v.state.proposals[0].review.choice,'USED_REWRITE');
  assert.equal(v.state.proposals[0].intervention.original.text,review.suggestedRewrite);
  assert.equal(v.state.proposals[0].intervention.published.text,payload.proposal.text);
  assert.equal(v.state.proposals[0].intervention.kind,'EDICAO_HUMANA');
  await join(created.data,51);
  assert.equal((await view(created.data,token(51))).state.proposals[0].review.result,null);
  const archive=await post('/rooms/'+created.data.code+'/export',{credential:created.data.moderatorCredential});
  assert.equal(archive.data.state.initialDraft.text,original.text);
  const restored=await post('/import',archive.data);assert.equal(restored.status,201);
  assert.equal((await view(restored.data)).state.proposals[0].intervention.original.text,review.suggestedRewrite);
 }finally{mock.mock.restore();}
});

test('Revisão inicial: manter texto original e criação explícita sem revisão são rastreáveis',async t=>{
 let calls=0;const mock=t.mock.method(ai,'analyzeProposal',async()=>{calls++;return review;});
 try{
  const preview=await post('/ai/proposal-review',{proposal,consent:true});
  const kept=await post('/rooms',{proposal,reviewedProposal:proposal,participantCount:2,simple:true,aiConsent:true,initialReviewMode:'REVIEWED',receipt:preview.data.receipt,reviewChoice:'KEPT_ORIGINAL'});
  assert.equal(kept.status,201);assert.equal(calls,1);
  assert.equal((await view(kept.data)).state.proposals[0].review.choice,'KEPT_ORIGINAL');
  const skipped=await post('/rooms',{proposal,participantCount:2,simple:true,aiConsent:true,initialReviewMode:'BYPASSED',bypassReason:'Moderador continuou após falha da revisão inicial.'});
  assert.equal(skipped.status,201);assert.equal(calls,1);
  const s=(await view(skipped.data)).state;
  assert.equal(s.proposals[0].review.status,'IGNORADA');assert.equal(s.enrollment.mode,'SELF');assert.equal(s.enrollment.automaticMediation,true);
  assert.equal((await post('/rooms',{proposal,participantCount:2,simple:true,aiConsent:true,initialReviewMode:'BYPASSED'})).status,400);
 }finally{mock.mock.restore();}
});

test('HTTP 503: indisponibilidade persistente retorna código específico e não cria sala',async()=>{
 const failed=new GeminiAdapter('synthetic',async()=>{throw {status:503,message:'PRIVATE_PROVIDER_DETAIL'};},{sleep:async()=>{},random:()=>0,log:()=>{}});
 const api=createApp(repo,failed,'synthetic-usability-signing-not-real-credential').listen(0,'127.0.0.1');
 await new Promise<void>(r=>api.once('listening',r));const address=api.address();if(!address||typeof address==='string')throw Error('server');
 try{
  const response=await fetch('http://127.0.0.1:'+address.port+'/api/ai/proposal-review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({proposal,consent:true})});
  const body=await response.json() as {code:string;attempts:number;retryable:boolean;error:string;receipt?:string};
  assert.equal(response.status,503);assert.equal(body.code,'PROVIDER_UNAVAILABLE');assert.equal(body.attempts,3);assert.equal(body.retryable,true);
  assert.ok(body.error.includes('temporariamente indisponível'));assert.ok(!JSON.stringify(body).includes('PRIVATE_PROVIDER_DETAIL'));
  assert.equal(body.receipt,undefined);
 }finally{await new Promise<void>((r,j)=>api.close(e=>e?j(e):r()));}
});
