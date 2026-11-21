import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {validateState} from './domain.js';
const origin='https://tcc-decisao-v2-test.onrender.com',expected=process.env.FROZEN_COMMIT!;
const evidence='linked-evidence';await mkdir(evidence,{recursive:true});
const report:any={kind:'SYNTHETIC_TECHNICAL_TEST_NOT_SCIENTIFIC_DATA',expectedCommit:expected,startedAt:new Date().toISOString(),checks:[]};
let room:any;
async function raw(path:string,body:unknown){const response=await fetch(origin+'/api'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(300000)});return {status:response.status,data:await response.json() as any};}
async function post(path:string,body:unknown){const r=await raw(path,body);if(r.status>=400)throw Error('HTTP '+r.status+' code '+(r.data.code??'none')+' at '+path.replace(/[A-F0-9]{10}/g,'ROOM'));return r.data;}
const check=(name:string)=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const view=(credential=room.moderatorCredential)=>post('/rooms/'+room.code+'/view',{credential});
async function cast(credential:string,choice:string,text='',review?:any,original=''){
 for(let n=0;n<10;n++){const v=await view(credential),r=v.state.rounds.at(-1);
  const out=await raw('/rooms/'+room.code+'/votes',{credential,revision:v.revision,roundId:r.id,proposalId:r.proposalId,choice,justification:text,...(review?{receipt:review.rewriteReceipt,reviewChoice:'USED_REWRITE',appliedRewrite:true,originalText:original}:text?{bypassReason:'Synthetic technical statement, no real participants.'}:{})});
  if(out.status===201)return;if(out.status!==409)throw Error('Synthetic vote HTTP '+out.status);
 }throw Error('Synthetic vote concurrency recovery exhausted');
}
try{
 const response=await fetch(origin+'/api/health'),health:any=await response.json();assert.equal(health.status,'ok');assert.equal(health.commit,expected);check('exact-live-commit');
 const home=await fetch(origin);assert.match(home.headers.get('cache-control')??'',/no-store/);check('html-cache-policy');
 const proposal={title:'TESTE SINTETICO RC3 - SEM COLETA',text:'Organizar um encontro ficticio da equipe na data de maior disponibilidade, com aceitacao da decisao por todos, inclusive ausentes. Local, custos e responsabilidades serao definidos pelo grupo.',context:'Somente validacao automatica de software. Nenhuma pessoa real. Nao inventar datas, valores ou condicoes.'};
 const initial=await post('/ai/proposal-review',{proposal,consent:true});assert.ok(initial.review.summary);
 room=await post('/rooms',{proposal,reviewedProposal:proposal,participantCount:3,simple:true,aiConsent:true,initialReviewMode:'REVIEWED',receipt:initial.receipt,reviewChoice:'KEPT_ORIGINAL'});report.roomCode=room.code;
 const invite=await post('/rooms/'+room.code+'/invitation',{}),people=Array.from({length:3},()=>randomBytes(32).toString('hex'));
 for(const browserCredential of people)await post('/rooms/'+room.code+'/join',{browserCredential,consent:true,version:invite.research.version});
 const v=await view(),binding={proposalId:v.state.proposals[0].id,roundId:v.state.rounds[0].id};
 const comments=['Concordo com o encontro e tenho disponibilidade de local e horario.','Nao aceito enquanto a data e o horario nao forem definidos; preciso dessas informacoes para decidir.','Nao quero participar desse tipo de encontro; prefiro outra atividade.'];
 const reviews=[];
 for(let n=0;n<2;n++){
  const reviewed=await post('/rooms/'+room.code+'/contribution-review',{credential:people[n],...binding,text:comments[n],consent:true});
  assert.ok(reviewed.review.suggestedRewrite?.trim());assert.ok(reviewed.rewriteReceipt);
  assert.notEqual(reviewed.review.suggestedRewrite,proposal.text);
  reviews.push(reviewed);
 }
 check('real-individual-reviews-provide-signed-rewrites');
 await cast(people[0],'ACEITO',reviews[0].review.suggestedRewrite,reviews[0],comments[0]);
 await cast(people[1],'REJEITO',reviews[1].review.suggestedRewrite,reviews[1],comments[1]);
 await cast(people[2],'REJEITO',comments[2]);
 let ready:any;
 for(let n=0;n<100;n++){ready=await view();if(ready.state.mediation?.status==='READY')break;if(ready.state.mediation?.status==='FAILED')throw Error('Mediation '+ready.state.mediation.stage+': '+ready.state.mediation.failureCode);await new Promise(r=>setTimeout(r,3000));}
 assert.equal(ready.state.mediation?.status,'READY');assert.equal(ready.state.proposals.length,1);
 const synthesis=ready.state.syntheses.at(-1),analysis=ready.state.analyses.at(-1);
 assert.equal(synthesis.result.consideredSourceIds.length,3);assert.equal(analysis.result.manifestationAssessments.length,3);
 assert.ok(ready.state.contributions.filter((c:any)=>c.review.appliedRewrite&&c.review.choice==='USED_REWRITE').length===2);
 assert.ok(analysis.result.manifestationAssessments.every((m:any)=>['ORIGINAL','SUBMITTED'].includes(m.quoteOrigin)));
 const hidden=await view(people[0]);assert.equal(hidden.state.analyses.length,0);assert.equal(hidden.state.syntheses.length,0);
 check('accepted-rewrites-retain-originals-and-real-mediation-is-ready-private-and-fully-linked');
 await post('/rooms/'+room.code+'/publish',{credential:room.moderatorCredential,revision:ready.revision,sourceId:ready.state.proposals[0].id,synthesisId:synthesis.id,proposal:synthesis.result.revisedProposal,reason:'TESTE TECNICO: aprovacao humana simulada, sem dados cientificos.',confirm:true});
 const next=await view(people[0]);assert.equal(next.state.rounds.length,2);assert.ok(next.positions.every((p:any)=>p.choice==='PENDENTE'));check('explicit-publication-opens-new-round-without-transferred-votes');
 for(let n=0;n<2;n++)await cast(people[n],'ACEITO');assert.equal((await view()).state.decision.status,'OPEN');await cast(people[2],'ACEITO');
 const exported=await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential}),valid=validateState(exported.state);
 assert.equal(valid.decision.status,'CONSENSUS');assert.equal(valid.votes.length,6);assert.equal(exported.state.reviewRequests,undefined);
 const text=JSON.stringify(exported,null,2);assert.ok(!text.includes(room.moderatorCredential));for(const p of people)assert.ok(!text.includes(p));
 await writeFile(evidence+'/SYNTHETIC_SESSION.json',text);report.sha256=createHash('sha256').update(text).digest('hex');report.votes=6;report.rounds=2;
 assert.equal((await (await fetch(origin+'/api/health')).json() as any).commit,expected);check('unanimity-export-import-and-original-quote-provenance');
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e instanceof Error?e.message:'Unknown';if(room)try{await writeFile(evidence+'/FAILURE.json',JSON.stringify(await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential}),null,2));}catch{}process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await writeFile(evidence+'/VALIDATION_REPORT.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
