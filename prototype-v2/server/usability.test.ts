import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { Repository,type SQLPool } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
import { FakeAI,proposal,review } from './fixtures.js';
import {GeminiAdapter,instructions,type AIAdapter} from './ai.js';
import type {Assessment,ProposalContent,SynthesisResult} from '../shared/contracts.js';
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

test('Entrada por link: aceite explícito, limite, inscrição concorrente e retorno idempotente',async()=>{
 assert.equal((await post('/rooms',{proposal,participantCount:16,simple:true,aiConsent:true})).status,400);
 assert.equal((await post('/rooms',{proposal,participantCount:3,simple:true,aiConsent:false})).status,400);
 const c=await createRoom();assert.deepEqual(c.participants,[]);
 const invitation=await post('/rooms/'+c.code+'/invitation',{});assert.equal(invitation.status,200);
 assert.equal(invitation.data.research.version,RESEARCH_VERSION);assert.ok(invitation.data.research.text.includes('Prazo de guarda'));assert.ok(!invitation.data.state);
 assert.equal((await post('/rooms/'+c.code+'/join',{browserCredential:token(1),consent:false,version:RESEARCH_VERSION})).status,400);
 assert.equal((await join(c,1,'incorrect')).status,409);
 const entries=await Promise.all([join(c,1),join(c,2),join(c,3)]);
 assert.ok(entries.every(r=>r.status===200));assert.equal(new Set(entries.map(r=>r.data.alias)).size,3);
 const before=await view(c);assert.equal(before.state.researchConsents.length,3);assert.equal(before.state.votes.length,0);
 assert.equal((await join(c,1)).status,200);
 assert.equal((await view(c)).state.researchConsents.length,3);
 assert.equal((await join(c,4)).status,409);
 const own=await view(c,token(1));assert.equal(own.state.researchConsents.length,1);assert.equal(own.canViewGroup,false);
 assert.equal((await post('/rooms/'+c.code+'/export',{credential:token(1)})).status,403);
});

test('Mediação automática privada, publicação humana, nova rodada, consenso e JSON',async()=>{
 const c=await createRoom();for(const i of [11,12,13])assert.equal((await join(c,i)).status,200);
 assert.equal((await cast(c,11,'ACEITO')).status,201);
 assert.equal((await cast(c,12,'REJEITO','Precisamos confirmar a disponibilidade.')).status,201);
 assert.equal((await view(c)).state.syntheses.length,0);
 assert.equal((await cast(c,13,'REJEITO','O prazo é curto para todos.')).status,201);
 const ready=await waitReady(c);assert.equal(ready.state.proposals.length,1);assert.equal(ready.state.analyses.length,1);assert.equal(ready.state.syntheses.length,1);
 const hidden=await view(c,token(11));assert.equal(hidden.state.syntheses.length,0);assert.equal(hidden.state.analyses.length,0);assert.equal(hidden.state.mediation,undefined);
 await view(c);await view(c);assert.equal((await view(c)).state.syntheses.length,1);
 const syn=ready.state.syntheses[0],published={...syn.result.revisedProposal,text:syn.result.revisedProposal.text+' Ajuste humano.'};
 assert.equal((await post('/rooms/'+c.code+'/publish',{credential:c.moderatorCredential,revision:ready.revision,sourceId:ready.state.proposals[0].id,synthesisId:syn.id,proposal:published,reason:'Ajustado após revisão humana sintética.',confirm:true})).status,200);
 const next=await view(c,token(11));assert.equal(next.state.rounds.length,2);assert.equal(next.state.syntheses.length,1);assert.equal(next.state.proposals[1].intervention.original.text,syn.result.revisedProposal.text);
 assert.equal(next.positions[0].choice,'PENDENTE');
 assert.equal((await cast(c,11,'ACEITO')).status,201);
 assert.equal((await cast(c,11,'ACEITO')).status,409);
 assert.equal((await cast(c,12,'ACEITO')).status,201);assert.equal((await view(c)).state.decision.status,'OPEN');
 assert.equal((await cast(c,13,'ACEITO')).status,201);
 const exported=await post('/rooms/'+c.code+'/export',{credential:c.moderatorCredential});
 assert.equal(exported.data.state.decision.status,'CONSENSUS');assert.equal(exported.data.state.researchConsents.length,3);
 assert.equal(exported.data.state.votes.length,6);assert.equal(exported.data.state.enrollment.claims.length,3);
});

test('Falha automática mantém proposta, registra falha e permite recuperação explícita',async()=>{
 const c=await createRoom(2);for(const i of [21,22])await join(c,i);
 ai.fail=true;await cast(c,21,'REJEITO','Falta tempo para executar.');await cast(c,22,'ACEITO');
 const failed=await waitReady(c,'FAILED');assert.equal(failed.state.proposals.length,1);assert.equal(failed.state.syntheses.length,0);
 ai.fail=false;await post('/rooms/'+c.code+'/prepare-mediation',{credential:c.moderatorCredential});
 assert.equal((await waitReady(c)).state.syntheses.length,1);
});

test('Escolhas da revisão: reformulação e descarte preservados, sem registrar voto ao revisar',async()=>{
 const c=await createRoom(2);await join(c,31);await join(c,32);
 const v=await view(c,token(31)),r=v.state.rounds[0],original='O prazo precisa ser combinado.';
 const result=await post('/rooms/'+c.code+'/contribution-review',{credential:token(31),text:original,roundId:r.id,proposalId:r.proposalId,consent:true});
 assert.equal(result.status,200);assert.equal((await view(c)).state.votes.length,0);
 const saved=await post('/rooms/'+c.code+'/votes',{credential:token(31),revision:(await view(c,token(31))).revision,roundId:r.id,proposalId:r.proposalId,choice:'REJEITO',justification:review.suggestedRewrite,originalText:original,appliedRewrite:true,reviewChoice:'USED_REWRITE',receipt:result.data.rewriteReceipt});
 assert.equal(saved.status,201,JSON.stringify(saved.data));
 const m=await view(c);assert.equal(m.state.votes.length,1);assert.equal(m.state.contributions.length,1);assert.equal(m.state.contributions[0].review.choice,'USED_REWRITE');assert.equal(m.state.contributions[0].originalText,original);
 const p2=await view(c,token(32));
 const res2=await post('/rooms/'+c.code+'/contribution-review',{credential:token(32),text:original,roundId:r.id,proposalId:r.proposalId,consent:true});
 const disc=await post('/rooms/'+c.code+'/votes',{credential:token(32),revision:(await view(c,token(32))).revision,roundId:r.id,proposalId:r.proposalId,choice:'REJEITO',justification:original,originalText:original,reviewChoice:'DISCARDED',receipt:res2.data.receipt});
 assert.equal(disc.status,201,JSON.stringify(disc.data));
 const after=await view(c);assert.equal(after.state.contributions[1].review.choice,'DISCARDED');assert.equal(after.state.contributions[1].review.result.suggestedRewrite,review.suggestedRewrite);
});

test('Importar sala de inscrição automática emite acessos novos e conserva concordâncias como histórico',async()=>{
 const c=await createRoom();await join(c,41);
 const archive=await post('/rooms/'+c.code+'/export',{credential:c.moderatorCredential});
 const restored=await post('/import',archive.data);
 assert.equal(restored.status,201);assert.equal(restored.data.participants.length,3);
 const copied=await view(restored.data,restored.data.participants[0].credential);
 assert.equal(copied.state.enrollment,undefined);assert.equal(copied.state.researchConsents.length,1);
 assert.equal((await post('/rooms/'+restored.data.code+'/invitation',{})).status,409);
 assert.equal((await view(c)).state.enrollment.claims.length,1);
});

test('Churrasco sintético: síntese automática completa, com escolhas vinculadas e quantidades pendentes',async()=>{
 const initial={title:'Churrasco do grupo',text:'Organizar o churrasco de confraternização no salão do prédio.'};
 const created=await post('/rooms',{proposal:initial,participantCount:2,simple:true,aiConsent:true});
 assert.equal(created.status,201);const c=created.data;
 for(const n of [51,52])assert.equal((await join(c,n)).status,200);
 const first=await view(c),r=first.state.rounds[0];
 assert.equal((await post('/rooms/'+c.code+'/round-close',{credential:c.moderatorCredential,roundId:r.id,pendingCount:2,confirm:true})).status,200);
 const closed=await view(c);
 const latest={...closed.state.proposals[0].content,text:'Realizar o churrasco no sábado às 13h no salão do prédio. Cada pessoa levará seu prato e talheres. Ainda faltam cardápio e quantidades.'};
 assert.equal((await post('/rooms/'+c.code+'/publish',{credential:c.moderatorCredential,revision:closed.revision,sourceId:r.proposalId,proposal:latest,reason:'O grupo definiu horário e utensílios.',confirm:true})).status,200);
 const meat='Rejeito até incluir cortes sem carne suína. Proponho fraldinha e peito de frango.';
 const drinks='Rejeito sem bebidas sem álcool. Proponho água e suco de laranja. Precisamos confirmar o número de pessoas antes de calcular as quantidades.';
 const adapter:AIAdapter=ai,previous=adapter.synthesizeProposal;
 let called=false;
 const gemini=new GeminiAdapter('synthetic-barbecue',async(mode,input,grammar)=>{
  called=true;assert.equal(mode,'synthesizeProposal');
  const data=input as {initialProposal:ProposalContent;publishedProposal:ProposalContent;assessments:Assessment;manifestations:{id:string;text:string}[]};
  assert.equal(data.initialProposal.text,initial.text);
  assert.deepEqual(data.publishedProposal,latest);
  assert.deepEqual(data.manifestations.map(m=>m.text),[meat,drinks]);
  assert.match(instructions,/revisedProposal\.text a proposta completa/);
  assert.match(instructions,/cortes de carne e bebidas concretos/);
  assert.match(instructions,/mantenha apenas as quantidades pendentes/);
  assert.match(instructions,/changeLog\.sourceIds/);
  assert.ok((grammar.required as string[]).includes('resolutionChecks'));
  const [meatId,drinksId]=data.manifestations.map(m=>m.id);
  const response:SynthesisResult={
   revisedProposal:{...data.publishedProposal,text:'Realizar o churrasco no sábado às 13h no salão do prédio. Cada pessoa levará seu prato e talheres. Servir fraldinha e peito de frango, sem carne suína, e oferecer água e suco de laranja. Confirmar o número de pessoas para calcular as quantidades de carnes e bebidas.'},
   decisionProgress:{defined:['Sábado às 13h no salão do prédio','Cada pessoa leva prato e talheres'],suggested:['Fraldinha e peito de frango','Água e suco de laranja'],pending:['Número de pessoas e quantidades de carnes e bebidas'],questions:['Quantas pessoas participarão?']},
   consideredSourceIds:[meatId,drinksId],
   changeLog:[
    {change:'Servir fraldinha e peito de frango',reason:'Atender à exigência de cortes sem carne suína.',sourceIds:[meatId],voteIds:[meatId]},
    {change:'Oferecer água e suco de laranja',reason:'Atender ao pedido de bebidas sem álcool.',sourceIds:[drinksId],voteIds:[drinksId]}
   ],
   resolutionChecks:[
    {voteId:meatId,satisfiedRequirements:['Cortes sem carne suína definidos.'],remainingRequirements:[]},
    {voteId:drinksId,satisfiedRequirements:['Bebidas sem álcool definidas.'],remainingRequirements:['Quantidade para compra.']}
   ],
   addressedObjections:[meatId],partiallyAddressedObjections:[drinksId],unresolvedObjections:[],
   remainingImpasses:['Quantidades dependem da confirmação do número de pessoas.'],feasibilityWarnings:[]
  };
  return JSON.stringify(response);
 });
 adapter.synthesizeProposal=gemini.synthesizeProposal.bind(gemini);
 try{
  assert.equal((await cast(c,51,'REJEITO',meat)).status,201);
  assert.equal((await cast(c,52,'REJEITO',drinks)).status,201);
  const ready=await waitReady(c);
  assert.equal(called,true);
  const draft=ready.state.syntheses[0];
  assert.match(draft.result.revisedProposal.text,/fraldinha e peito de frango/);
  assert.match(draft.result.revisedProposal.text,/água e suco de laranja/);
  assert.match(draft.result.revisedProposal.text,/sábado às 13h no salão/);
  assert.deepEqual(draft.result.decisionProgress.pending,['Número de pessoas e quantidades de carnes e bebidas']);
  assert.deepEqual(draft.result.changeLog.map((x:{sourceIds:string[]})=>x.sourceIds),ready.state.votes.map((v:{id:string})=>[v.id]));
  assert.equal(draft.publishedProposalId,null);
  assert.equal(ready.state.proposals.length,2);
  assert.equal((await view(c,token(51))).state.syntheses.length,0);
  const publication=await post('/rooms/'+c.code+'/publish',{credential:c.moderatorCredential,revision:ready.revision,sourceId:ready.state.proposals.at(-1).id,synthesisId:draft.id,proposal:draft.result.revisedProposal,confirm:true});
  assert.equal(publication.status,200);
  const participant=await view(c,token(51));
  assert.equal(participant.state.proposals.at(-1).content.text,draft.result.revisedProposal.text);
  assert.equal(participant.state.proposals.at(-1).approvedBy,'moderator');
 }finally{adapter.synthesizeProposal=previous;}
});

test('Parecer de REJEITO preserva restrição e pedido de mudança, com edição assinada pelo original',async()=>{
 const c=await createRoom(2);assert.equal((await join(c,61)).status,200);
 const v=await view(c,token(61)),r=v.state.rounds[0];
 const original='Rejeito o cardápio atual porque não como carne suína. Peço incluir fraldinha e manter o custo em até R$ 50 por pessoa.';
 const suggestion='Rejeito o cardápio atual. Não como carne suína e peço incluir fraldinha, com limite de R$ 50 por pessoa.';
 const gemini=new GeminiAdapter('synthetic-individual',async(mode,input)=>{
  assert.equal(mode,'analyzeContribution');
  assert.deepEqual(input,{proposal:v.state.proposals[0].content,contribution:original,position:'REJEITO'});
  assert.match(instructions,/mantenha explícita a rejeição/);
  assert.match(instructions,/limites numéricos, condições obrigatórias/);
  assert.match(instructions,/pedido concreto de mudança/);
  return JSON.stringify({...review,suggestedRewrite:suggestion});
 });
 const adapter:AIAdapter=ai,previous=adapter.analyzeContribution;
 adapter.analyzeContribution=gemini.analyzeContribution.bind(gemini);
 try{
  const result=await post('/rooms/'+c.code+'/contribution-review',{credential:token(61),text:original,roundId:r.id,proposalId:r.proposalId,position:'REJEITO',consent:true});
  assert.equal(result.status,200);
  assert.equal(result.data.review.suggestedRewrite,suggestion);
  const justification=suggestion.replace('peço incluir','solicito incluir');
  const payload={credential:token(61),revision:v.revision,roundId:r.id,proposalId:r.proposalId,choice:'REJEITO',justification,originalText:original,reviewChoice:'EDITED_REWRITE',receipt:result.data.receipt};
  assert.equal((await post('/rooms/'+c.code+'/votes',{...payload,originalText:'Original alterado.'})).status,400);
  assert.equal((await post('/rooms/'+c.code+'/votes',payload)).status,201);
  const saved=(await view(c)).state.contributions[0];
  assert.equal(saved.originalText,original);
  assert.equal(saved.text,justification);
  assert.equal(saved.review.choice,'EDITED_REWRITE');
  assert.equal(saved.review.result.suggestedRewrite,suggestion);
 }finally{adapter.analyzeContribution=previous;}
});
