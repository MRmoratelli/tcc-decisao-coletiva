// Technical synthetic demonstration only. No real participants or scientific observations.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ProposalSchema,ReviewSchema,INSTRUMENT_VERSION} from '../shared/contracts.js';
import {ImportSchema,validateState,assertAssessment,assertSynthesis} from './domain.js';
const base=process.env.V2_REMOTE_ORIGIN;
if(process.env.ALLOW_LIVE_REMOTE_TEST!=='true'||!base||!/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(base))throw Error('Explicit opt-in and HTTPS Render V2 origin required.');
const checkpoint=new URL('../.private/remote-validation-access.json',import.meta.url);
const evidenceDir=new URL('../docs/evidence/',import.meta.url);
await mkdir(new URL('../.private/',import.meta.url),{recursive:true});await mkdir(evidenceDir,{recursive:true});
let saved:any;try{saved=JSON.parse(await readFile(checkpoint,'utf8'));assert.equal(saved.origin,base);}catch(e:any){if(e.code!=='ENOENT')throw e;saved={origin:base,at:new Date().toISOString(),calls:[],checks:[]};}
async function save(){await writeFile(checkpoint,JSON.stringify(saved,null,2));}
async function post(route:string,body:unknown,expected=200){const started=Date.now();const r=await fetch(base+'/api'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base!},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});const data=await r.json() as any;assert.equal(r.status,expected,'HTTP '+route+' expected '+expected+'; response body omitted');return {data,elapsedMs:Date.now()-started};}
async function view(room=saved.room,credential=room.moderatorCredential){return (await post('/rooms/'+room.code+'/view',{credential})).data;}
async function action(route:string,data:object={},credential=saved.room.moderatorCredential,expected=200){const v=await view(saved.room,credential);return post('/rooms/'+saved.room.code+route,{credential,revision:v.revision,...data},expected);}
async function callAI(mode:string,fn:()=>Promise<any>){const response=await fn();saved.calls.push({contract:mode,status:'PASS',at:new Date().toISOString(),elapsedMs:response.elapsedMs,provider:'Gemini real',commit:saved.health.commit,mock:false});await save();return response.data;}
const proposal=ProposalSchema.parse({title:'[SINTÉTICO] Prioridades de projeto colaborativo',problem:'O grupo fictício precisa conciliar prazo de entrega, acessibilidade e validação.',decision:'Definir prioridades provisórias para um projeto colaborativo fictício.',goals:'Entregar uma demonstração utilizável com responsabilidades e revisão explícitas.',alternatives:'Priorizar entrega rápida ou reservar etapas de acessibilidade e validação.',constraints:'Capacidade ainda não medida. Não assumir duração nem recursos adicionais.',successCriteria:'Prioridades e condições de revisão explícitas, sem unanimidade presumida.',context:'TESTE TÉCNICO SINTÉTICO. Não é cenário científico oficial nem coleta com pessoas reais.',text:'Priorizar uma demonstração rápida. Acessibilidade e validação serão consideradas depois da primeira entrega.'});
try{
 const health=await fetch(base+'/api/health',{signal:AbortSignal.timeout(90000)});assert.equal(health.status,200);saved.health=await health.json();assert.equal(saved.health.status,'ok');assert.equal(saved.health.aiConfigured,true);
 if(saved.completedAt){
  const exported=(await action('/export')).data;const original=JSON.parse(await readFile(new URL('REMOTE_SESSION_SYNTHETIC.json',evidenceDir),'utf8'));assert.deepEqual(exported.state,original.state);assert.equal(exported.state.rounds.length,2);assert.equal(exported.state.decision.status,'CONSENSUS');
  const report=JSON.parse(await readFile(new URL('REMOTE_REAL.json',evidenceDir),'utf8'));
  report.redeployVerification={at:new Date().toISOString(),commit:saved.health.commit,persistence:true,unchangedState:true};
  if(process.argv.includes('--probe-ai')){const result=await callAI('analyzeProposal',()=>post('/ai/proposal-review',{proposal,consent:true}));ReviewSchema.parse(result.review);report.activeCredentialProbe={status:'PASS',at:new Date().toISOString(),contract:'analyzeProposal',privateBackendOnly:true};}
  await writeFile(new URL('REMOTE_REAL.json',evidenceDir),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'PASS',phase:'REDEPLOY_PERSISTENCE',...report.redeployVerification,activeCredentialProbe:report.activeCredentialProbe??null}));process.exit(0);
 }
 if(!saved.proposalReview){saved.proposalReview=await callAI('analyzeProposal',()=>post('/ai/proposal-review',{proposal,consent:true}));ReviewSchema.parse(saved.proposalReview.review);await save();}
 if(!saved.room){saved.room=(await post('/rooms',{proposal,participantCount:3,receipt:saved.proposalReview.receipt},201)).data;await save();}
 const texts=['Rejeito adiar acessibilidade. Precisamos de critérios de acesso antes da demonstração.','Rejeito entregar sem validação. Reservar uma revisão de riscos antes de divulgar.','A estimativa de quinze dias ainda não tem fonte nem levantamento de capacidade.'];
 saved.reviews??=[];
 for(let i=0;i<3;i++){
  const credential=saved.room.participants[i].credential;
  if(!saved.reviews[i]){const v=await view(saved.room,credential),r=v.state.rounds.at(-1);saved.reviews[i]=await callAI('analyzeContribution',()=>post('/rooms/'+saved.room.code+'/contribution-review',{credential,text:texts[i],proposalId:r.proposalId,roundId:r.id,consent:true}));ReviewSchema.parse(saved.reviews[i].review);await save();}
  let v=await view(saved.room,credential),r=v.state.rounds[0];
  if(!v.state.contributions.some((c:any)=>c.roundId===r.id&&c.text===texts[i])){await action('/votes',{proposalId:r.proposalId,roundId:r.id,choice:i===2?'ABSTENHO':'REJEITO',justification:texts[i],originalText:texts[i],receipt:saved.reviews[i].receipt,contest:i===0?'[SINTÉTICO] O parecer é consultivo; mantenho minha objeção original.':''},credential,201);}
 }
 let v=await view();assert.equal(v.state.decision.status,'OPEN');
 if(!v.state.analyses.length){await callAI('analyzeObjections',()=>action('/analyze-objections',{consent:true}));}
 v=await view();assertAssessment(validateState(v.state),v.state.analyses.at(-1).result);
 if(!v.state.contests.length){await action('/contest',{targetId:v.state.analyses.at(-1).id,text:'[SINTÉTICO] A aceitação exige revisão dos participantes; a análise não comprova viabilidade.'},saved.room.participants[0].credential,201);}
 v=await view();
 if(!v.state.syntheses.length){await callAI('synthesizeProposal',()=>action('/synthesize',{consent:true,analysisId:v.state.analyses.at(-1).id}));}
 v=await view();const synthesis=v.state.syntheses.at(-1);assertSynthesis(validateState(v.state),synthesis.result);
 if(process.argv.includes('--finish')){
  const approved=JSON.parse(await readFile(new URL('../.private/remote-approved-proposal.json',import.meta.url),'utf8'));
  assert.equal(approved.synthesisId,synthesis.id);assert.equal(approved.confirm,true);ProposalSchema.parse(approved.proposal);
  if(v.state.proposals.length===1){await action('/publish',{proposal:approved.proposal,sourceId:v.state.proposals[0].id,synthesisId:synthesis.id,reason:approved.reason,confirm:true,coverage:[]});saved.checks.push('Moderator review explicitly confirmed by technical operator; no scientific human rating');await save();assert.ok((await view()).positions.every((p:any)=>p.choice==='PENDENTE'));}
  for(let i=0;i<3;i++){v=await view();if(v.state.decision.status==='CONSENSUS')break;const r=v.state.rounds.at(-1);const credential=saved.room.participants[i].credential;const pv=await view(saved.room,credential);if(!pv.positions.some((p:any)=>p.choice==='ACEITO'))await action('/votes',{proposalId:r.proposalId,roundId:r.id,choice:'ACEITO',justification:''},credential,201);if(i<2)assert.equal((await view()).state.decision.status,'OPEN');}
  v=await view();assert.equal(v.state.decision.status,'CONSENSUS');assert.equal(v.state.rounds.length,2);
  const input={instrumentVersion:INSTRUMENT_VERSION,answers:Array(22).fill('N/A'),open:Array(4).fill('[SINTÉTICO] Teste de armazenamento; nenhuma percepção de pessoa real foi coletada.'),consent:true};
  for(const p of saved.room.participants){const pv=await view(saved.room,p.credential);if(!pv.state.evaluations.length)await action('/evaluation',{input},p.credential,201);}
  const exported=(await action('/export')).data;ImportSchema.parse(exported);validateState(exported.state);
  const json=JSON.stringify(exported);for(const token of [saved.room.moderatorCredential,...saved.room.participants.map((p:any)=>p.credential)])assert.ok(!json.includes(token));
  if(!saved.restored){saved.restored=(await post('/import',exported,201)).data;await save();}
  assert.notEqual(saved.restored.code,saved.room.code);assert.equal((await view(saved.restored)).state.decision.status,'CONSENSUS');
  await post('/rooms/'+saved.room.code+'/view',{credential:saved.restored.participants[0].credential},401);
  await action('/close',{reason:'[SINTÉTICO] Tentativa sem permissão'},saved.room.participants[0].credential,403);
  const stats=(await action('/evaluation-results')).data;
  saved.exportHash=createHash('sha256').update(json).digest('hex');saved.completedAt=new Date().toISOString();await save();
  await writeFile(new URL('REMOTE_SESSION_SYNTHETIC.json',evidenceDir),JSON.stringify(exported,null,2));
  await writeFile(new URL('REMOTE_DSR_SYNTHETIC.json',evidenceDir),JSON.stringify(stats,null,2));
  const report={type:'TESTE_TECNICO_SINTETICO',status:'PASS',at:saved.completedAt,origin:base,commit:saved.health.commit,neonReal:true,geminiReal:true,mock:false,roomCode:saved.room.code,restoredCode:saved.restored.code,participants:3,rounds:2,result:'CONSENSUS',humanScientificEvaluation:false,questionnaire:'22 N/A + 4 synthetic open texts per identity; no scientific opinions',calls:saved.calls,checks:[...saved.checks,'HTTPS health and database','3 individual credentials','reject with justification','abstention does not imply acceptance','analysis and synthesis cover every rejection','original texts and contest preserved','new round requires new positions','unanimous explicit acceptance','JSON export/import with new credentials','isolation and moderator permission','DSR storage and descriptive export'],exportSha256:saved.exportHash,limitations:['Operational moderator role performed by technical operator; no independent human study','Scientific scenario and protocol ratification pending','Free-tier service may sleep and quotas may change']};
  await writeFile(new URL('REMOTE_REAL.json',evidenceDir),JSON.stringify(report,null,2));await writeFile(new URL('GEMINI_REAL.json',evidenceDir),JSON.stringify({type:report.type,status:'PASS',mode:'HTTPS backend only',model:'gemini-3.5-flash-lite',promptVersion:'consensus-consultive-v2.0',origin:base,commit:saved.health.commit,calls:saved.calls},null,2));console.log(JSON.stringify(report));
 }else{await writeFile(new URL('../.private/remote-synthesis-review.json',import.meta.url),JSON.stringify({synthesisId:synthesis.id,result:synthesis.result},null,2));console.log(JSON.stringify({status:'AWAITING_TECHNICAL_MODERATOR_REVIEW',roomCode:saved.room.code,commit:saved.health.commit,calls:saved.calls,synthesis:synthesis.result}));}
}catch(e){const error={type:'TESTE_TECNICO_SINTETICO',status:'FAIL',at:new Date().toISOString(),origin:base,commit:saved.health?.commit??null,roomCode:saved.room?.code??null,calls:saved.calls,message:e instanceof Error?e.message:'Failure'};await writeFile(new URL(saved.completedAt?'REMOTE_RECONNECT.json':'REMOTE_REAL.json',evidenceDir),JSON.stringify(error,null,2));console.log(JSON.stringify(error));process.exitCode=1;}
