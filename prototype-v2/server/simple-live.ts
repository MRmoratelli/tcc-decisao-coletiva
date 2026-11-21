import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {validateState} from './domain.js';
const origin='https://tcc-decisao-v2-test.onrender.com',expected=process.env.FROZEN_COMMIT!;
const evidence='simple-evidence';await mkdir(evidence,{recursive:true});
const report:any={kind:'SYNTHETIC_TECHNICAL_TEST_NOT_SCIENTIFIC_DATA',expectedCommit:expected,startedAt:new Date().toISOString(),checks:[]};
let room:any;
async function raw(path:string,body:unknown){const response=await fetch(origin+'/api'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(300000)});return {status:response.status,data:await response.json() as any};}
async function post(path:string,body:unknown){const r=await raw(path,body);if(r.status>=400)throw Error('HTTP '+r.status+' code '+(r.data.code??'none')+' at '+path.replace(/[A-F0-9]{10}/g,'ROOM'));return r.data;}
const check=(name:string)=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const view=(credential=room.moderatorCredential)=>post('/rooms/'+room.code+'/view',{credential});
async function cast(credential:string,choice:string,text='',review?:any){
 for(let n=0;n<10;n++){const v=await view(credential),r=v.state.rounds.at(-1);
  const out=await raw('/rooms/'+room.code+'/votes',{credential,revision:v.revision,roundId:r.id,proposalId:r.proposalId,choice,justification:text,...(review?{receipt:review.receipt,reviewChoice:'KEPT_ORIGINAL',originalText:text}:text?{bypassReason:'Synthetic technical statement, no real participants.'}:{})});
  if(out.status===201)return;if(out.status!==409)throw Error('Synthetic vote HTTP '+out.status);
 }throw Error('Synthetic vote concurrency recovery exhausted');
}
try{
 const health:any=await (await fetch(origin+'/api/health')).json();assert.equal(health.status,'ok');assert.equal(health.commit,expected);
 assert.deepEqual(health.geminiPolicy,{maxCalls:14,windowSeconds:60,participantIntervalSeconds:60});check('exact-commit-and-global-policy');
 const proposal={title:'TESTE TÉCNICO SINTÉTICO — DEZ IDENTIDADES — SEM COLETA',text:'Organizar um encontro fictício na data de maior disponibilidade, com aceitação da decisão por todos, inclusive ausentes. Local, custos e responsabilidades serão definidos pelo grupo.',context:'Somente validação automática de software. Nenhuma pessoa real. Não inventar datas, valores ou condições.'};
 const initial=await post('/ai/proposal-review',{proposal,consent:true});assert.ok(initial.review.summary);
 room=await post('/rooms',{proposal,reviewedProposal:proposal,participantCount:10,simple:true,aiConsent:true,initialReviewMode:'REVIEWED',receipt:initial.receipt,reviewChoice:'KEPT_ORIGINAL'});report.roomCode=room.code;
 const invite=await post('/rooms/'+room.code+'/invitation',{});assert.equal(invite.research.version,'1.2-2026-11-21');
 const people=Array.from({length:10},()=>randomBytes(32).toString('hex'));
 const entered=await Promise.all(people.map(browserCredential=>post('/rooms/'+room.code+'/join',{browserCredential,consent:true,version:invite.research.version})));
 assert.equal(new Set(entered.map(p=>p.alias)).size,10);check('ten-distinct-enrollments-and-current-term');
 const v=await view(),binding={proposalId:v.state.proposals[0].id,roundId:v.state.rounds[0].id};
 for(const choice of ['ABSTENHO','ACEITO_COM_RESSALVAS'])assert.equal((await raw('/rooms/'+room.code+'/votes',{credential:people[0],revision:(await view()).revision,...binding,choice,justification:'Synthetic removed option.',bypassReason:'Technical only'})).status,400);
 assert.equal((await raw('/rooms/'+room.code+'/fact-check',{credential:people[0],...binding,text:'Pergunta pública sintética.',consent:true})).status,403);check('binary-request-contract-and-moderator-only-factual');
 const comments=[
  'Concordo com buscar a data de maior disponibilidade e posso ajudar na organização fictícia.',
  'Não aceito sem definir antes um teto de gasto por pessoa, sem inventar agora um valor.',
  'Concordo com consultar o grupo antes de escolher a data e preservar a aceitação de todos.',
  'Não aceito dividir bebidas alcoólicas com quem não as consumir; proponho separar esse custo.',
  'Concordo com manter local e responsabilidades pendentes para definição conjunta.',
  'Não aceito escolher local sem verificar acessibilidade para todos os presentes.',
  'Concordo com registrar as responsabilidades de organização antes do encontro.',
  'Não aceito um rateio aberto; proponho avaliar uma contribuição fixa ou divisão prévia de itens.',
  'Concordo com que a presença no evento seja diferente da aceitação da decisão.',
  'Não aceito avançar sem consultar restrições alimentares dos presentes.'
 ];
 const reviews=await Promise.all(people.map((credential,n)=>post('/rooms/'+room.code+'/contribution-review',{credential,...binding,text:comments[n],consent:true})));
 assert.ok(reviews.every(r=>r.review.summary&&r.receipt));check('ten-individual-real-gemini-reviews-through-shared-queue');
 const last=people[9],lastReview=reviews[9];
 const cached=await post('/rooms/'+room.code+'/contribution-review',{credential:last,...binding,text:comments[9],consent:true});assert.equal(cached.cached,true);
 const blocked=await raw('/rooms/'+room.code+'/contribution-review',{credential:last,...binding,text:comments[9]+' Outra condição fictícia.',consent:true});
 assert.equal(blocked.status,429);assert.equal(blocked.data.code,'REVIEW_COOLDOWN');check('same-review-reused-and-individual-cooldown-enforced');
 for(let n=0;n<10;n++)await cast(people[n],n%2?'REJEITO':'ACEITO',comments[n],reviews[n]);
 let ready:any;
 for(let n=0;n<100;n++){ready=await view();if(ready.state.mediation?.status==='READY')break;if(ready.state.mediation?.status==='FAILED')throw Error('Mediation '+ready.state.mediation.stage+': '+ready.state.mediation.failureCode);await new Promise(r=>setTimeout(r,3000));}
 assert.equal(ready.state.mediation?.status,'READY');assert.equal(ready.state.proposals.length,1);
 const synthesis=ready.state.syntheses.at(-1);assert.equal(synthesis.result.consideredSourceIds.length,10);
 const hidden=await view(people[0]);assert.equal(hidden.state.analyses.length,0);assert.equal(hidden.state.syntheses.length,0);check('real-mediation-covers-ten-sources-and-keeps-draft-private');
 await post('/rooms/'+room.code+'/publish',{credential:room.moderatorCredential,revision:ready.revision,sourceId:ready.state.proposals[0].id,synthesisId:synthesis.id,proposal:synthesis.result.revisedProposal,reason:'TESTE TÉCNICO: aprovação humana simulada, sem dados científicos.',confirm:true});
 const next=await view(people[0]);assert.equal(next.state.rounds.length,2);assert.ok(next.positions.every((p:any)=>p.choice==='PENDENTE'));check('human-publication-opens-second-round-with-no-transferred-votes');
 for(let n=0;n<9;n++)await cast(people[n],'ACEITO');assert.equal((await view()).state.decision.status,'OPEN');await cast(people[9],'ACEITO');
 const exported=await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential}),valid=validateState(exported.state);
 assert.equal(valid.decision.status,'CONSENSUS');assert.equal(valid.votes.length,20);assert.equal(valid.researchConsents.length,10);assert.equal(exported.state.reviewRequests,undefined);
 const text=JSON.stringify(exported,null,2);assert.ok(!text.includes(room.moderatorCredential));for(const p of people)assert.ok(!text.includes(p));
 await writeFile(evidence+'/SYNTHETIC_SESSION.json',text);report.sha256=createHash('sha256').update(text).digest('hex');report.votes=20;report.rounds=2;
 assert.equal((await (await fetch(origin+'/api/health')).json() as any).commit,expected);check('unanimity-complete-export-and-no-operational-cache');
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e instanceof Error?e.message:'Unknown';if(room)try{await writeFile(evidence+'/FAILURE.json',JSON.stringify(await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential}),null,2));}catch{}process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await writeFile(evidence+'/VALIDATION_REPORT.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
