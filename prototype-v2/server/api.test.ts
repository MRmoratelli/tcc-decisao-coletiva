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
test('Integração HTTP + PostgreSQL embarcado: fluxo remoto sintético de três participantes',async t=>{
 let room:any,other:any,analysis:any,synthesis:any,originalRound:any,archive:any;
 await t.test('03 criação com análise inicial e autenticação; recibo adulterado recusado',async()=>{
  const review=await post('/ai/proposal-review',{proposal,consent:true});assert.equal(review.status,200);
  const invalid=await post('/rooms',{proposal:{...proposal,text:'Texto adulterado'},participantCount:3,receipt:review.data.receipt});assert.equal(invalid.status,400);
  const created=await post('/rooms',{proposal,participantCount:3,receipt:review.data.receipt});assert.equal(created.status,201);room=created.data;assert.equal(room.participants.length,3);
  const fallback=await post('/rooms',{proposal,participantCount:2,bypassReason:'Criação deliberada sem análise.'});assert.equal(fallback.status,201);other=fallback.data;
  const state=await view(room);originalRound=state.state.rounds[0];assert.equal(state.state.proposals[0].review.status,'OK');
 });
 await t.test('04-05 credenciais, permissões, origem e isolamento entre salas',async()=>{
  assert.equal((await post('/rooms/'+room.code+'/view',{credential:other.participants[0].credential})).status,401);
  assert.equal((await post('/rooms/'+room.code+'/view',{credential:'x'.repeat(43)})).status,401);
  assert.equal((await action(room,'/close',{reason:'Sem permissão'},room.participants[0].credential)).status,403);
  assert.equal((await action(room,'/export',{},room.participants[0].credential)).status,403);
  const v=await view(room,room.participants[0].credential);assert.equal(v.canViewGroup,false);assert.equal(v.positions.length,1);
  const unchanged=await post('/rooms/'+room.code+'/view',{credential:room.participants[0].credential,knownRevision:v.revision});assert.equal(unchanged.status,200);assert.deepEqual(unchanged.data,{revision:v.revision,unchanged:true});
  const changed=await post('/rooms/'+room.code+'/view',{credential:room.participants[0].credential,knownRevision:v.revision+1});assert.equal(changed.status,200);assert.equal(changed.data.revision,v.revision);assert.ok(changed.data.state);assert.equal(changed.data.canViewGroup,false);
  const serialized=JSON.stringify(v);for(const p of room.participants)assert.ok(!serialized.includes(p.credential));assert.ok(!serialized.includes(room.moderatorCredential));assert.ok(!serialized.includes('secret_hash'));
  const csrf=await fetch(base+'/rooms/'+room.code+'/view',{method:'POST',headers:{'content-type':'application/json',origin:'https://unexpected.invalid'},body:JSON.stringify({credential:room.moderatorCredential})});assert.equal(csrf.status,403);
 });
 await t.test('06-08 parecer consultivo e contestação; rejeição exige justificativa',async()=>{
  assert.equal((await cast(room,0,'REJEITO')).status,400);
  const v=await view(room,room.participants[0].credential),r=v.state.rounds.at(-1);
  const reviewed=await action(room,'/contribution-review',{text:'O prazo precisa de revisão.',roundId:r.id,proposalId:r.proposalId,consent:true},room.participants[0].credential);assert.equal(reviewed.status,200);
  const send=await action(room,'/votes',{roundId:r.id,proposalId:r.proposalId,choice:'REJEITO',justification:'O prazo precisa de revisão.',originalText:'Prazo muito curto.',receipt:reviewed.data.receipt,contest:'Discordo do grau de certeza.'},room.participants[0].credential);assert.equal(send.status,201);
  const saved=await view(room);assert.equal(saved.state.contributions[0].originalText,'Prazo muito curto.');assert.equal(saved.state.contributions[0].contest,'Discordo do grau de certeza.');
  const hidden=await view(room,room.participants[1].credential);assert.equal(hidden.state.contributions.length,0);assert.equal(hidden.state.votes.length,0);
 });
 await t.test('09 abstenção e ausência mantêm processo aberto',async()=>{
  assert.equal((await cast(room,1,'ABSTENHO')).status,201);
  const v=await view(room);assert.equal(v.state.decision.status,'OPEN');assert.ok(v.positions.some((p:any)=>p.choice==='PENDENTE'));
 });
 await t.test('12 análise de objeções e contestação posterior preservadas',async()=>{
  const a=await action(room,'/analyze-objections',{consent:true});assert.equal(a.status,200,JSON.stringify(a.data));analysis=(await view(room)).state.analyses.at(-1);
  assert.equal((await action(room,'/contest',{targetId:analysis.id,text:'A incerteza merece mais destaque.'},room.participants[0].credential)).status,201);
 });
 await t.test('13 síntese conciliadora é rascunho e mantém impasse',async()=>{
  assert.equal((await action(room,'/synthesize',{analysisId:analysis.id,consent:true})).status,409);
  assert.equal((await action(room,'/analyze-objections',{consent:true})).status,200);
  analysis=(await view(room)).state.analyses.at(-1);
  assert.equal((await action(room,'/synthesize',{analysisId:analysis.id,consent:true})).status,200);
  const v=await view(room);synthesis=v.state.syntheses.at(-1);assert.equal(v.state.proposals.length,1);assert.equal(synthesis.publishedProposalId,null);assert.ok(synthesis.result.remainingImpasses.length);
 });
 await t.test('14 revisão humana obrigatória antes de publicar V2',async()=>{
  const proposed={...synthesis.result.revisedProposal,text:synthesis.result.revisedProposal.text+' Revisado pelo moderador.'};
  assert.equal((await action(room,'/publish',{proposal:proposed,sourceId:originalRound.proposalId,synthesisId:synthesis.id,reason:'',confirm:true})).status,400);
  const publish=await action(room,'/publish',{proposal:proposed,sourceId:originalRound.proposalId,synthesisId:synthesis.id,reason:'Incorporada preocupação de prazo.',coverage:[{voteId:analysis.result.individualAssessments[0].voteId,status:'PARCIAL',faithful:true,note:'Julgamento humano sintético.'}],confirm:true});assert.equal(publish.status,200,JSON.stringify(publish.data));
 });
 await t.test('10-11 novas manifestações por versão; recibo antigo e revisão concorrente recusados',async()=>{
  const v=await view(room);assert.equal(v.state.rounds.length,2);assert.equal(v.state.votes.length,2);assert.ok(v.positions.every((p:any)=>p.choice==='PENDENTE'));
  assert.equal((await action(room,'/votes',{choice:'ACEITO',proposalId:originalRound.proposalId,roundId:originalRound.id},room.participants[0].credential)).status,409);
  const before=await view(room),r=before.state.rounds.at(-1);
  const first=await cast(room,0,'ACEITO');assert.equal(first.status,201);
  const stale=await post('/rooms/'+room.code+'/votes',{credential:room.participants[1].credential,revision:before.revision,proposalId:r.proposalId,roundId:r.id,choice:'ACEITO'});assert.equal(stale.status,409);
 });
 await t.test('15 consenso somente com os três aceites explícitos na V2',async()=>{
  assert.equal((await cast(room,1,'ACEITO')).status,201);assert.equal((await view(room)).state.decision.status,'OPEN');
  assert.equal((await cast(room,2,'ACEITO')).status,201);const v=await view(room);assert.equal(v.state.decision.status,'CONSENSUS');assert.ok(v.state.events.some((e:any)=>e.type==='CONSENSUS_RECORDED'));
 });
 await t.test('20 DSR individual pós-sessão; ausência e N/A distintos; exportação restrita',async()=>{
  const answers=[5,'N/A',null,...Array(19).fill(4)],input={instrumentVersion:INSTRUMENT_VERSION,answers,open:['Contribuiu','Interpretou prazo','Não observei','Melhorar exemplos'],consent:true};
  const sent=await action(room,'/evaluation',{input},room.participants[0].credential);assert.equal(sent.status,201);
  assert.equal((await action(room,'/evaluation',{input},room.participants[0].credential)).status,409);
  const result=await action(room,'/evaluation-results');assert.equal(result.status,200);assert.equal(result.data.items[1].na,1);assert.equal(result.data.items[1].missing,0);
  const p2=await view(room,room.participants[1].credential);assert.equal(p2.state.evaluations.length,0);
 });
 await t.test('18 exportação JSON não inclui segredos e preserva o histórico',async()=>{
  const exported=await action(room,'/export');assert.equal(exported.status,200);archive=exported.data;assert.equal(archive.version,2);assert.equal(archive.state.proposals.length,2);
  const data=JSON.stringify(archive);assert.ok(!data.includes(room.moderatorCredential));assert.ok(!data.includes('secret_hash'));assert.equal(archive.metrics.human.partial,1);
 });
 await t.test('19 importação recupera dados em sala nova, sem sobrescrever origem; formato inválido rejeitado',async()=>{
  const restored=await post('/import',archive);assert.equal(restored.status,201,JSON.stringify(restored.data));assert.notEqual(restored.data.code,room.code);
  const v=await view(restored.data);assert.equal(v.state.proposals.length,2);assert.equal(v.state.decision.status,'CONSENSUS');assert.equal(v.state.evaluations.length,0); // responses remain private even to moderator view; export retains them
  const reexport=await action(restored.data,'/export');assert.equal(reexport.data.state.evaluations.length,1);assert.ok(reexport.data.state.events.some((e:any)=>e.type==='IMPORTED'));
  assert.equal((await post('/import',{...archive,version:99})).status,400);
  const broken=structuredClone(archive);broken.state.votes[0].participantId='00000000-0000-4000-8000-000000000000';assert.equal((await post('/import',broken)).status,400);
  assert.equal((await view(room)).state.proposals.length,2);
 });
 await t.test('17 falhas Gemini são auditadas e não bloqueiam manifestações ou revisões humanas',async()=>{
  const temp=(await post('/rooms',{proposal,participantCount:2,bypassReason:'Teste de falha com sala isolada.'})).data;const v=await view(temp,temp.participants[0].credential),r=v.state.rounds.at(-1);ai.fail=true;
  assert.equal((await action(temp,'/contribution-review',{text:'Objeção legítima ao prazo.',roundId:r.id,proposalId:r.proposalId,consent:true},temp.participants[0].credential)).status,502);
  assert.equal((await cast(temp,0,'REJEITO','Objeção legítima ao prazo.')).status,201);
  assert.equal((await action(temp,'/analyze-objections',{consent:true})).status,502);ai.fail=false;
  const state=(await view(temp)).state;assert.equal(state.decision.status,'OPEN');assert.ok(state.events.filter((e:any)=>e.type==='AI_FAILURE').length>=2);
  assert.equal((await action(temp,'/publish',{proposal,sourceId:r.proposalId,reason:'Revisão humana diante de falha Gemini.',confirm:true})).status,200);
 });
 await t.test('16 encerramento sem consenso independente da IA e sem alterar outra sala',async()=>{
  assert.equal((await action(other,'/close',{reason:''})).status,400);assert.equal((await action(other,'/close',{reason:'Condições incompatíveis.'})).status,200);
  assert.equal((await view(other)).state.decision.status,'CLOSED_WITHOUT_CONSENSUS');assert.equal((await view(room)).state.decision.status,'CONSENSUS');
 });
 await t.test('persistência append-only, migração idempotente e nenhuma alteração de dados históricos',async()=>{
  const snapshots=await query('SELECT revision FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision',[(await view(room)).room.id]);assert.ok(snapshots.rows.length>10);assert.equal(snapshots.rows[0].revision,1);
  const legacy=await query('SELECT count(*)::int AS count FROM dc2_contributions');assert.equal(legacy.rows[0].count,0);
  const migrations=await query('SELECT version FROM dc2_migrations');assert.equal(migrations.rows.length,3);
 });
});

