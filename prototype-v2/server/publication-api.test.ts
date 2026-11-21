import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { Repository, type SQLPool } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
import { FakeAI,proposal } from './fixtures.js';
import { INSTRUMENT_VERSION } from '../shared/contracts.js';
const db=new PGlite();
const query=async(sql:string,values?:any[]):Promise<{rows:any[]}>=>{
 if(sql.includes('CREATE TABLE')){await db.exec(sql);return {rows:[]};}
 return db.query(sql,values);
};
let tail=Promise.resolve();
const pool:SQLPool={query,async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;return {query,release};}};
await migrate({query});await migrate({query});
const repo=new Repository(pool,'auth-pepper-synthetic-not-used-outside-tests'),ai=new FakeAI();
const app=createApp(repo,ai,'signing-key-synthetic-not-used-outside-tests');
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const address=server.address();if(!address||typeof address==='string')throw new Error('server');const base='http://127.0.0.1:'+address.port+'/api';
async function post(url:string,body:unknown){const r=await fetch(base+url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};}
async function view(c:any,credential=c.moderatorCredential){const r=await post('/rooms/'+c.code+'/view',{credential});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
async function action(c:any,endpoint:string,body:any={},credential=c.moderatorCredential){const v=await view(c,credential);return post('/rooms/'+c.code+endpoint,{credential,revision:v.revision,...body});}
async function cast(c:any,n:number,choice:string,justification=''){const v=await view(c,c.participants[n].credential),r=v.state.rounds.at(-1);return action(c,'/votes',{proposalId:r.proposalId,roundId:r.id,choice,justification,bypassReason:justification?'Participante decide enviar sem parecer.':undefined},c.participants[n].credential);}
after(async()=>{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await db.close();});
test('Publication without changes needs no typed reason; moderator edits require one and are visible to participants',async()=>{
 const created=await post('/rooms',{proposal,participantCount:2,bypassReason:'Synthetic publication regression'}),c=created.data;
 assert.equal(created.status,201);
 assert.equal((await cast(c,0,'REJEITO','Synthetic access concern')).status,201);
 assert.equal((await cast(c,1,'ACEITO')).status,201);
 assert.equal((await action(c,'/analyze-objections',{consent:true})).status,200);
 assert.equal((await action(c,'/synthesize',{analysisId:(await view(c)).state.analyses.at(-1).id,consent:true})).status,200);
 let v=await view(c),syn=v.state.syntheses.at(-1),sourceId=v.state.proposals.at(-1).id;
 const edited={...syn.result.revisedProposal,context:'Moderator changed context only'};
 const rejected=await action(c,'/publish',{sourceId,synthesisId:syn.id,proposal:edited,confirm:true});
 assert.equal(rejected.status,400);assert.equal((await view(c)).state.proposals.length,1);
 assert.equal((await action(c,'/publish',{sourceId,synthesisId:syn.id,proposal:syn.result.revisedProposal,confirm:true})).status,200);
 v=await view(c,c.participants[0].credential);let published=v.state.proposals.at(-1);
 assert.equal(published.intervention.kind,'APROVACAO_HUMANA');assert.match(published.intervention.reason,/registro autom/);
 assert.equal((await cast(c,0,'REJEITO','Synthetic remaining concern')).status,201);
 assert.equal((await cast(c,1,'ACEITO')).status,201);
 assert.equal((await action(c,'/analyze-objections',{consent:true})).status,200);assert.equal((await action(c,'/synthesize',{analysisId:(await view(c)).state.analyses.at(-1).id,consent:true})).status,200);
 v=await view(c);syn=v.state.syntheses.at(-1);sourceId=v.state.proposals.at(-1).id;
 const changed={...syn.result.revisedProposal,text:'Moderator revised the proposal to include an access review.'};
 assert.equal((await action(c,'/publish',{sourceId,synthesisId:syn.id,proposal:changed,reason:'Included an access review after considering the objection.',confirm:true})).status,200);
 v=await view(c,c.participants[1].credential);published=v.state.proposals.at(-1);
 assert.equal(published.intervention.kind,'EDICAO_HUMANA');assert.equal(published.intervention.original.text,syn.result.revisedProposal.text);
 assert.equal(published.intervention.published.text,changed.text);assert.ok(published.intervention.reason.includes('access review'));
 assert.equal(published.intervention.changes[0].field,'text');
});
