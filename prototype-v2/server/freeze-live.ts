import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {validateState} from './domain.js';
const origin='https://tcc-decisao-v2-test.onrender.com';
const expected=process.env.FROZEN_COMMIT!;
assert.match(expected,/^[a-f0-9]{40}$/);
const evidence='freeze-evidence';await mkdir(evidence,{recursive:true});
const report:any={kind:'SYNTHETIC_TECHNICAL_TEST_NOT_SCIENTIFIC_DATA',startedAt:new Date().toISOString(),expectedCommit:expected,checks:[],model:'gemini-3.5-flash-lite'};
let room:any;
async function post(path:string,body:unknown){
 const response=await fetch(origin+'/api'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(70000)});
 const data:any=await response.json();
 if(!response.ok)throw new Error('HTTP '+response.status+' at '+path.replace(/[A-F0-9]{10}/g,'ROOM')+'; code='+(data.code??'none')+'; '+(data.error??''));
 return data;
}
const check=(name:string)=>{report.checks.push({name,status:'PASS',at:new Date().toISOString()});console.log('PASS '+name);};
async function view(credential=room.moderatorCredential){return post('/rooms/'+room.code+'/view',{credential});}
async function cast(credential:string,choice:string,text='',review?:any,originalText?:string){
 const v=await view(credential),r=v.state.rounds.at(-1);
 return post('/rooms/'+room.code+'/votes',{credential,revision:v.revision,roundId:r.id,proposalId:r.proposalId,choice,justification:text,originalText:originalText??text,...(review?{receipt:review.rewriteReceipt,appliedRewrite:true,reviewChoice:'USED_REWRITE'}:text?{bypassReason:'Teste técnico sintético: manifestação mantida sem parecer individual.'}:{})});
}
try{
 const health:any=await (await fetch(origin+'/api/health',{signal:AbortSignal.timeout(60000)})).json();
 assert.equal(health.status,'ok');assert.equal(health.commit,expected);assert.equal(health.aiConfigured,true);report.health=health;check('health-and-exact-deployed-commit');
 const proposal={title:'TESTE TÉCNICO — CONGELAMENTO — SEM DADOS CIENTÍFICOS',text:'Organizar um encontro em uma data viável para todos os três integrantes fictícios. Local e orçamento serão definidos pelo grupo.',context:'Sessão inteiramente sintética para validação de software. Nenhuma pessoa real participa. Preservar a disponibilidade de todos e não inventar datas, custos ou locais.'};
 const reviewed=await post('/ai/proposal-review',{proposal,consent:true});assert.ok(reviewed.review.summary);assert.ok(reviewed.receipt);check('real-gemini-initial-review-before-room');
 const initialText=reviewed.review.suggestedRewrite||proposal.text;
 const final={...proposal,text:initialText+' Confirmação técnica do moderador: todos os integrantes precisam poder participar.'};
 room=await post('/rooms',{proposal:final,reviewedProposal:proposal,participantCount:3,simple:true,aiConsent:true,initialReviewMode:'REVIEWED',receipt:reviewed.receipt,appliedRewrite:!!reviewed.review.suggestedRewrite,reviewChoice:reviewed.review.suggestedRewrite?'USED_REWRITE':'KEPT_ORIGINAL'});
 report.roomCode=room.code;assert.deepEqual(room.participants,[]);check('simplified-room-and-single-link');
 const invitation=await post('/rooms/'+room.code+'/invitation',{});assert.ok(invitation.research.text.includes('Prazo de guarda'));assert.equal(invitation.participantCount,3);
 const people=Array.from({length:3},()=>randomBytes(32).toString('hex'));
 const aliases=await Promise.all(people.map(browserCredential=>post('/rooms/'+room.code+'/join',{browserCredential,consent:true,version:invitation.research.version})));
 assert.equal(new Set(aliases.map(p=>p.alias)).size,3);
 await post('/rooms/'+room.code+'/join',{browserCredential:people[0],consent:true,version:invitation.research.version});
 const entered=await view();assert.equal(entered.state.researchConsents.length,3);assert.equal(entered.state.votes.length,0);check('consent-enrollment-concurrency-and-idempotent-return');
 assert.equal(entered.state.initialDraft.text,proposal.text);assert.equal(entered.state.proposals[0].intervention.published.text,final.text);check('original-ai-suggestion-and-human-publication-preserved');
 await cast(people[0],'ACEITO');
 const p2=await view(people[1]),r=p2.state.rounds.at(-1),original='Aceito com ressalvas: o local precisa permitir o acesso de todos os integrantes.';
 const ownReview=await post('/rooms/'+room.code+'/contribution-review',{credential:people[1],roundId:r.id,proposalId:r.proposalId,text:original,consent:true});
 assert.ok(ownReview.review.summary);
 if(ownReview.review.suggestedRewrite)await cast(people[1],'ACEITO_COM_RESSALVAS',ownReview.review.suggestedRewrite,ownReview,original);
 else await cast(people[1],'ACEITO_COM_RESSALVAS',original);
 await cast(people[2],'REJEITO','Não concordo com uma data escolhida antes de consultar a disponibilidade de cada integrante fictício.');
 check('real-argument-review-and-three-distinct-positions');
 let ready:any;
 for(let n=0;n<55;n++){
  ready=await view();
  if(ready.state.mediation?.status==='READY')break;
  if(ready.state.mediation?.status==='FAILED')throw new Error('Automatic mediation failed; human draft was not published.');
  await new Promise(r=>setTimeout(r,4000));
 }
 assert.equal(ready.state.mediation?.status,'READY');assert.equal(ready.state.proposals.length,1);
 assert.equal(ready.state.analyses.length,1);assert.equal(ready.state.syntheses.length,1);
 const hidden=await view(people[0]);assert.equal(hidden.state.syntheses.length,0);assert.equal(hidden.state.analyses.length,0);
 check('real-gemini-automatic-analysis-synthesis-and-private-draft');
 const synthesis=ready.state.syntheses[0],draft=synthesis.result.revisedProposal;
 await post('/rooms/'+room.code+'/publish',{credential:room.moderatorCredential,revision:ready.revision,proposal:draft,sourceId:ready.state.proposals[0].id,synthesisId:synthesis.id,reason:'TESTE TÉCNICO: aprovação humana simulada da síntese, sem coleta científica.',confirm:true});
 const next=await view(people[0]);assert.equal(next.state.rounds.length,2);assert.equal(next.state.syntheses.length,1);assert.equal(next.positions[0].choice,'PENDENTE');
 check('human-publication-and-new-round-without-transferred-votes');
 await cast(people[0],'ACEITO');await cast(people[1],'ACEITO');assert.equal((await view()).state.decision.status,'OPEN');
 await cast(people[2],'ACEITO');
 const exported=await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential});
 const validated=validateState(exported.state);assert.equal(validated.decision.status,'CONSENSUS');assert.equal(validated.votes.length,6);assert.equal(validated.researchConsents.length,3);
 const raw=JSON.stringify(exported,null,2);assert.ok(!raw.includes(room.moderatorCredential));for(const p of people)assert.ok(!raw.includes(p));
 await writeFile(evidence+'/SYNTHETIC_SESSION.json',raw);
 report.exportSha256=createHash('sha256').update(raw).digest('hex');report.rounds=2;report.votes=6;report.consentVersion=invitation.research.version;
 const finalHealth:any=await (await fetch(origin+'/api/health')).json();assert.equal(finalHealth.commit,expected);
 report.promptVersions=[...new Set([...validated.analyses,...validated.syntheses].map(x=>x.promptVersion))];
 check('unanimous-consensus-and-validated-complete-json-export');
 report.result='PASS';
}catch(e){
 report.result='FAIL';report.error=e instanceof Error?e.message:'unknown';
 if(room)try{await writeFile(evidence+'/SYNTHETIC_FAILURE.json',JSON.stringify(await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential}),null,2));}catch{}
 process.exitCode=1;
}finally{
 report.finishedAt=new Date().toISOString();await writeFile(evidence+'/VALIDATION_REPORT.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}
