import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createApp } from './app.js';
import { postgresRepository } from './db.js';
import { GeminiAdapter } from './ai.js';
import { ProposalSchema,INSTRUMENT_VERSION } from '../shared/contracts.js';
if(process.env.V2_DATABASE_ISOLATED!=='true'||!process.env.DATABASE_URL_V2)throw new Error('Banco V2 isolado obrigatório.');
function canonical(value:any):string{return JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
const privateDir=new URL('../.private/',import.meta.url),checkpoint=new URL('neon-validation-access.json',privateDir),evidenceDir=new URL('../docs/evidence/',import.meta.url);
await mkdir(privateDir,{recursive:true});await mkdir(evidenceDir,{recursive:true});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL_V2,max:3,connectionTimeoutMillis:10000});
const repo=postgresRepository(pool,process.env.AUTH_PEPPER??'');
if(process.argv.includes('--verify-restart')){
 try{
  const saved=JSON.parse(await readFile(checkpoint,'utf8'));
  const identity=await repo.authorize(saved.room.code,saved.room.moderatorCredential);assert.ok(identity);
  const current=await repo.read(identity);assert.equal(current.state.decision.status,'CONSENSUS');assert.equal(current.state.rounds.length,2);
  assert.equal(createHash('sha256').update(canonical(current.state)).digest('hex'),saved.stateHash);
  const evidence=JSON.parse(await readFile(new URL('NEON_REAL.json',evidenceDir),'utf8'));
  evidence.restartVerified=true;evidence.restartVerifiedAt=new Date().toISOString();await writeFile(new URL('NEON_REAL.json',evidenceDir),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({stage:'NEW_PROCESS_RECONNECT',status:'PASS',code:saved.room.code,rounds:2,persistence:true,geminiReal:false}));
 }finally{await pool.end();}
}else{
 const app=createApp(repo,new GeminiAdapter(),process.env.REVIEW_SIGNING_KEY??'');const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const a=server.address();if(!a||typeof a==='string')throw new Error('server');const base='http://127.0.0.1:'+a.port+'/api';
 async function post(endpoint:string,body:unknown){const r=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json() as any;return {status:r.status,data};}
 async function view(room:any,credential=room.moderatorCredential){const r=await post('/rooms/'+room.code+'/view',{credential});assert.equal(r.status,200);return r.data;}
 async function action(room:any,route:string,data:object={},credential=room.moderatorCredential){const v=await view(room,credential);return post('/rooms/'+room.code+route,{credential,revision:v.revision,...data});}
 async function vote(room:any,n:number,choice:string,text=''){const v=await view(room,room.participants[n].credential),r=v.state.rounds.at(-1);return action(room,'/votes',{roundId:r.id,proposalId:r.proposalId,choice,justification:text,bypassReason:'Teste técnico explícito do Neon, sem uso de IA.'},room.participants[n].credential);}
 try{
  const metadata=(await pool.query("SELECT current_user AS role,current_database() AS database,has_table_privilege(current_user,'dc2_snapshots','UPDATE') AS can_update_history,has_table_privilege(current_user,'dc2_snapshots','DELETE') AS can_delete_history")).rows[0];
  assert.equal(metadata.role,'dc2_app');assert.equal(metadata.database,'decisao_v2');assert.equal(metadata.can_update_history,false);assert.equal(metadata.can_delete_history,false);
  const proposal=ProposalSchema.parse({title:'[SINTÉTICO] Prioridades de projeto colaborativo',problem:'Prazo, capacidade e interesses diferentes precisam ser conciliados.',decision:'Estabelecer prioridades provisórias de um projeto colaborativo fictício.',text:'Priorizar acessibilidade e organizar as demais atividades após revisar capacidade e dependências.',goals:'Exercitar infraestrutura da V2, sem coleta científica.',constraints:'Somente dados fictícios. Cenário científico pendente.',successCriteria:'Persistência, versão e unanimidade tecnicamente verificáveis.',context:'TESTE TÉCNICO SINTÉTICO. Não é cenário oficial do experimento.'});
  const created=await post('/rooms',{proposal,participantCount:3,bypassReason:'Teste técnico do banco Neon real, sem executar Gemini.'});assert.equal(created.status,201);const room=created.data;
  const other=(await post('/rooms',{proposal,participantCount:2,bypassReason:'Sala sintética adicional para isolamento.'})).data;
  assert.equal((await post('/rooms/'+room.code+'/view',{credential:other.participants[0].credential})).status,401);
  assert.equal((await action(room,'/close',{reason:'Tentativa sem permissão'},room.participants[0].credential)).status,403);
  assert.equal((await vote(room,0,'REJEITO','Reservar uma etapa de validação antes da entrega.')).status,201);
  assert.equal((await vote(room,1,'ABSTENHO')).status,201);
  const before=await view(room);assert.equal(before.state.decision.status,'OPEN');assert.ok(before.positions.some((p:any)=>p.choice==='PENDENTE'));
  const published=await action(room,'/publish',{proposal:{...proposal,text:proposal.text+' Reservar uma etapa de validação e registrar um marco de revisão.'},sourceId:before.state.proposals.at(-1).id,reason:'Revisão operacional sintética manual para testar persistência; não representa avaliação humana científica.',confirm:true});assert.equal(published.status,200);
  assert.ok((await view(room)).positions.every((p:any)=>p.choice==='PENDENTE'));
  for(let i=0;i<3;i++)assert.equal((await vote(room,i,'ACEITO')).status,201);
  assert.equal((await view(room)).state.decision.status,'CONSENSUS');
  const input={instrumentVersion:INSTRUMENT_VERSION,answers:Array(22).fill('N/A'),open:Array(4).fill('[SINTÉTICO] Registro de teste de armazenamento, sem opinião de participante real.'),consent:true};
  for(let i=0;i<3;i++)assert.equal((await action(room,'/evaluation',{input},room.participants[i].credential)).status,201);
  const exported=await action(room,'/export');assert.equal(exported.status,200);const serialized=JSON.stringify(exported.data);
  for(const p of room.participants)assert.ok(!serialized.includes(p.credential));assert.ok(!serialized.includes(room.moderatorCredential));
  const restored=await post('/import',exported.data);assert.equal(restored.status,201);assert.notEqual(restored.data.code,room.code);assert.equal((await view(restored.data)).state.decision.status,'CONSENSUS');
  assert.equal((await action(other,'/close',{reason:'Encerramento sintético sem consenso para verificar estado persistente.'})).status,200);
  const final=await view(room),stateHash=createHash('sha256').update(canonical(exported.data.state)).digest('hex');
  await writeFile(checkpoint,JSON.stringify({room,restored:restored.data,other,stateHash}));
  await writeFile(new URL('NEON_SESSION_SYNTHETIC.json',evidenceDir),JSON.stringify(exported.data,null,2));
  const evidence={type:'TESTE_TECNICO_SINTETICO',at:new Date().toISOString(),commit:process.env.APP_COMMIT??'5aa0fd2a085233abc2c42c6ad823928f2d356a7e',project:'polished-star-08552333',branch:'br-nameless-bird-bdw8qntw',database:metadata.database,runtimeRole:metadata.role,api:'HTTP local real',neonReal:true,geminiReal:false,publicRemoteSession:false,roomCode:room.code,restoredCode:restored.data.code,participants:3,rounds:2,result:'CONSENSUS',checks:['creation','credentials','permissions','room isolation','reject with justification','abstention','pending','versioning','new votes','unanimity','close without consensus','export','import','DSR persistence','no runtime update/delete on history'],restartVerified:false};
  await writeFile(new URL('NEON_REAL.json',evidenceDir),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
 }finally{await new Promise<void>(r=>server.close(()=>r()));await pool.end();}
}
