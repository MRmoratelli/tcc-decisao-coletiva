import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {validateState} from './domain.js';
const origin='https://tcc-decisao-v2-test.onrender.com',expected=process.env.FROZEN_COMMIT!,folder='rc4-evidence';
await mkdir(folder,{recursive:true});
const report:any={kind:'SYNTHETIC_TECHNICAL_TEST_NOT_SCIENTIFIC_DATA',expectedCommit:expected,startedAt:new Date().toISOString(),checks:[]};let room:any;
const check=(name:string)=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
async function raw(path:string,body:unknown){const r=await fetch(origin+'/api'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(300000)});return {status:r.status,data:await r.json() as any};}
async function post(path:string,body:unknown){const r=await raw(path,body);if(r.status>=400)throw Error('HTTP '+r.status+' '+(r.data.code??'')+' '+path.replace(/[A-F0-9]{10}/g,'ROOM'));return r.data;}
const view=(credential=room.moderatorCredential)=>post('/rooms/'+room.code+'/view',{credential});
async function cast(credential:string,choice:string,text='',review?:any,original=''){
 for(let n=0;n<8;n++){const v=await view(credential),r=v.state.rounds.at(-1);
 const out=await raw('/rooms/'+room.code+'/votes',{credential,revision:v.revision,roundId:r.id,proposalId:r.proposalId,choice,justification:text,...(review?{receipt:review.rewriteReceipt,appliedRewrite:true,reviewChoice:'USED_REWRITE',originalText:original}:text?{bypassReason:'Synthetic technical test, no research participants.'}:{})});
 if(out.status===201)return;if(out.status!==409)throw Error('Synthetic vote HTTP '+out.status);
 }throw Error('Vote concurrency retries exhausted');
}
try{
 let health:any;for(let n=0;n<30;n++){try{health=await (await fetch(origin+'/api/health')).json();if(health.commit===expected)break;}catch{}await new Promise(r=>setTimeout(r,3000));}
 assert.equal(health.commit,expected);assert.deepEqual(health.geminiPolicy,{maxCalls:14,windowSeconds:60,participantIntervalSeconds:60});check('exact-commit-and-existing-provider-limits');
 const proposal={title:'TESTE SINTETICO RC4 - SEM COLETA',text:'Organizar um encontro ficticio de estudos. Data, horario, local e responsabilidades ainda nao foram definidos. O grupo precisa definir essas condicoes antes de fechar a decisao.',context:'Ensaio automatizado com identidades sinteticas. Nenhum dado cientifico. Nao inventar datas, valores, locais, concessoes ou acordos.'};
 const initial=await post('/ai/proposal-review',{proposal,consent:true});
 room=await post('/rooms',{proposal,reviewedProposal:proposal,participantCount:3,simple:true,aiConsent:true,initialReviewMode:'REVIEWED',receipt:initial.receipt,reviewChoice:'KEPT_ORIGINAL'});report.roomCode=room.code;
 const invite=await post('/rooms/'+room.code+'/invitation',{});assert.equal(invite.research.version,'1.3-2026-11-21');
 const people=Array.from({length:3},()=>randomBytes(32).toString('hex'));
 for(const browserCredential of people)await post('/rooms/'+room.code+'/join',{browserCredential,consent:true,version:invite.research.version});
 const v=await view(),r=v.state.rounds[0],binding={proposalId:r.proposalId,roundId:r.id};
 const invalid=await raw('/rooms/'+room.code+'/votes',{credential:people[0],revision:(await view()).revision,...binding,choice:'ACEITO',justification:'Aceito somente se a data for definida.',bypassReason:'Synthetic invalid request.'});
 assert.equal(invalid.status,400);assert.equal((await view()).state.votes.length,0);assert.equal((await view()).state.contributions.length,0);check('conditional-text-with-acceptance-is-rejected-without-writing');
 const original='nao aceito sem uma data e horario exatos, so posso no fim de semana';
 const review=await post('/rooms/'+room.code+'/contribution-review',{credential:people[1],...binding,text:original,consent:true});
 assert.ok(review.review.suggestedRewrite?.trim());assert.ok(review.rewriteReceipt);
 await cast(people[0],'ACEITO');
 await cast(people[1],'REJEITO',review.review.suggestedRewrite,review,original);
 await cast(people[2],'REJEITO','Preciso que se defina o que cada pessoa vai preparar ou levar; nao ha divisao de responsabilidades ainda.');
 let ready:any;for(let n=0;n<100;n++){ready=await view();if(ready.state.mediation?.status==='READY')break;if(ready.state.mediation?.status==='FAILED')throw Error('Mediation '+ready.state.mediation.stage+' '+ready.state.mediation.failureCode);await new Promise(r=>setTimeout(r,3000));}
 assert.equal(ready.state.mediation.status,'READY');assert.equal(ready.state.proposals.length,1);
 const syn=ready.state.syntheses.at(-1),progress=syn.result.decisionProgress;
 assert.equal(syn.promptVersion,'consensus-consultive-v2.9-decision-progress');assert.equal(syn.result.consideredSourceIds.length,3);
 assert.ok(progress.pending.length>0);assert.ok(progress.questions.length>0);
 assert.equal(syn.result.resolutionChecks.length,2);assert.ok(syn.result.resolutionChecks.every((x:any)=>x.remainingRequirements.length>0));assert.equal(syn.result.addressedObjections.length,0);
 assert.ok(!/\b\d{1,2}[\/-]\d{1,2}\b/.test(syn.result.revisedProposal.text));
 const participant=await view(people[0]);assert.equal(participant.state.syntheses.length,0);check('real-synthesis-keeps-missing-date-and-responsibilities-pending-with-questions-and-private-draft');
 const finalProposal={...syn.result.revisedProposal,text:'Realizar encontro ficticio de estudos em 12/12/2026 as 18h na sala virtual de ensaio. P01 prepara o roteiro, P02 leva material de leitura e P03 registra o resumo. Nao havera custos. Estas condicoes sao exclusivamente sinteticas para o teste tecnico.'};
 const body={credential:room.moderatorCredential,sourceId:ready.state.proposals[0].id,synthesisId:syn.id,proposal:finalProposal,confirm:true};
 assert.equal((await raw('/rooms/'+room.code+'/publish',{...body,revision:(await view()).revision})).status,400);
 await post('/rooms/'+room.code+'/publish',{...body,revision:(await view()).revision,reason:'TESTE TECNICO: moderador simulado fornece condicoes ficticias explicitas para testar a segunda rodada.'});
 const after=await view(people[0]);assert.ok(after.positions.every((x:any)=>x.choice==='PENDENTE'));assert.equal(after.state.proposals.at(-1).intervention.kind,'EDICAO_HUMANA');check('moderator-edits-require-reason-and-new-round-restarts-voting');
 for(let n=0;n<3;n++)await cast(people[n],'ACEITO');
 const archive=await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential}),valid=validateState(archive.state);
 assert.equal(valid.decision.status,'CONSENSUS');assert.equal(valid.votes.length,6);assert.ok(valid.votes.filter(x=>x.choice==='ACEITO').every(x=>x.justification===''));
 assert.equal(archive.state.reviewRequests,undefined);const text=JSON.stringify(archive,null,2);assert.ok(!text.includes(room.moderatorCredential));for(const p of people)assert.ok(!text.includes(p));
 await writeFile(folder+'/SYNTHETIC_SESSION.json',text);report.sha256=createHash('sha256').update(text).digest('hex');report.votes=6;report.rounds=2;check('unconditional-unanimity-export-import-and-preserved-provenance');
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e instanceof Error?e.message:'Unknown';if(room)try{await writeFile(folder+'/FAILURE.json',JSON.stringify(await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential}),null,2));}catch{}process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await writeFile(folder+'/VALIDATION_REPORT.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
