// Ten fictitious identities, synthetic AI and embedded PostgreSQL only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { Repository,type SQLPool } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
import { FakeAI } from './fixtures.js';
import {readFile} from 'node:fs/promises';
test('Pesquisa externa desativada e registros históricos preservados na exportação e restauração',async()=>{
 const db=new PGlite(),query=async(sql:string,values?:any[])=>{if(sql.includes('CREATE TABLE')){await db.exec(sql);return {rows:[]};}return db.query(sql,values);};let tail=Promise.resolve();
 const pool:SQLPool={query,async connect(){const prior=tail;let release!:()=>void;tail=new Promise<void>(r=>{release=r;});await prior;return {query,release};}};await migrate({query});
 const repo=new Repository(pool,'synthetic-pepper-for-historical-evidence'),ai=new FakeAI();
 const server=createApp(repo,ai,'synthetic-signing-for-historical-evidence').listen(0,'127.0.0.1');
 await new Promise<void>(r=>server.once('listening',r));
 const addr=server.address();assert.ok(addr&&typeof addr!=='string');
 const base='http://127.0.0.1:'+addr.port+'/api';
 const post=(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  for(const file of ['FACTUAL_SESSION_SYNTHETIC','TAVILY_SESSION_SYNTHETIC']){
   const archive=JSON.parse(await readFile(new URL('../docs/evidence/'+file+'.json',import.meta.url),'utf8'));
   const restored=await post('/import',archive);assert.equal(restored.status,201);
   const {code,moderatorCredential}=await restored.json();
   const room='/rooms/'+code;
   assert.equal((await post(room+'/fact-check',{credential:moderatorCredential,text:'Alegação pública sintética.',consent:true})).status,404);
   const exported=await (await post(room+'/export',{credential:moderatorCredential})).json();
   assert.equal(exported.format,'dc2-consensus');
   assert.equal(exported.version,2);
   assert.deepEqual(exported.state.factualChecks,archive.state.factualChecks.map((f:{participantId:string|null})=>({
    ...f,participantId:f.participantId===null?null:exported.state.participants[archive.state.participants.findIndex((p:{id:string})=>p.id===f.participantId)].id,
    provenance:'IMPORTED_UNAUTHENTICATED'
   })));
   assert.equal(exported.state.contests.length,archive.state.contests.length);
   assert.equal(exported.state.decision.status,archive.state.decision.status);
   assert.ok(!JSON.stringify(exported).includes(moderatorCredential));
  }
 }finally{await new Promise<void>(r=>server.close(()=>r()));await db.close();}
});
