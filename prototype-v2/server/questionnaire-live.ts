import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {validateState} from './domain.js';
const origin='https://tcc-decisao-v2-test.onrender.com',expected=process.env.FROZEN_COMMIT!,folder='questionnaire-evidence';
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
 const health:any=await (await fetch(origin+'/api/health',{signal:AbortSignal.timeout(60000)})).json();assert.equal(health.commit,expected);assert.deepEqual(health.geminiPolicy,{maxCalls:14,windowSeconds:60,participantIntervalSeconds:60});check('exact-live-commit-and-provider-limits');
 const proposal={title:'TESTE SINTETICO QUESTIONARIO - NAO CIENTIFICO',text:'Decisao ficticia para testar somente o envio e a exportacao do questionario integrado.',context:'Identidades e respostas sinteticas, excluir da coleta cientifica.'};
 const create=()=>post('/rooms',{proposal,participantCount:3,simple:true,aiConsent:true,initialReviewMode:'BYPASSED',bypassReason:'Teste tecnico sintetico do questionario, sem participantes reais.'});
 room=await create();report.roomCode=room.code;
 const invite=await post('/rooms/'+room.code+'/invitation',{});assert.equal(invite.research.version,'1.4-2026-11-21');assert.match(invite.research.text,/questionário.*integrado/);
 const people=Array.from({length:3},()=>randomBytes(32).toString('hex'));
 for(const browserCredential of people)await post('/rooms/'+room.code+'/join',{browserCredential,consent:true,version:invite.research.version});
 const input={instrumentVersion:'DSR-1.1-NATURALISTICO',applicationVariant:'POS_ENCERRAMENTO_NATURALISTICO',baseInstrumentVersion:'DSR-1.0-2026-11-16',answers:[5,'N/A',null,...Array(19).fill(null)],open:['TESTE SINTETICO','','',''],consent:true};
 const action=async(path:string,data:any,credential=room.moderatorCredential)=>raw('/rooms/'+room.code+path,{credential,revision:(await view(credential)).revision,...data});
 assert.equal((await action('/evaluation',{input},people[0])).status,409);
 for(const credential of people)await cast(credential,'ACEITO');
 assert.equal((await view()).state.decision.status,'CONSENSUS');check('questionnaire-unlocks-only-after-one-round-legitimate-closure');
 for(let i=0;i<3;i++){const answers=i===0?input.answers:i===1?Array(22).fill(null):Array(22).fill(4);const r=await action('/evaluation',{input:{...input,answers}},people[i]);assert.equal(r.status,201,JSON.stringify(r.data));}
 assert.equal((await action('/evaluation',{input},people[0])).status,409);
 assert.equal((await action('/evaluation-results',{},people[0])).status,403);
 for(const credential of people){const own=await view(credential);assert.equal(own.state.evaluations.length,1);assert.equal(own.state.evaluations[0].applicationContext.collectionChannel,'APPLICATION');}
 check('three-synthetic-responses-once-only-with-individual-isolation');
 const archive=await post('/rooms/'+room.code+'/export',{credential:room.moderatorCredential});
 const valid=validateState(archive.state);assert.equal(valid.evaluations.length,3);assert.equal(archive.evaluation.items[1].na,1);assert.equal(archive.evaluation.items[1].missing,1);assert.equal(archive.evaluation.items[2].missing,2);assert.equal(archive.evaluation.nonrespondents,0);
 const results=await action('/evaluation-results',{});assert.equal(results.status,200);
 const text=JSON.stringify(archive,null,2);assert.ok(!text.includes(room.moderatorCredential));for(const p of people)assert.ok(!text.includes(p));
 await writeFile(folder+'/SYNTHETIC_SESSION.json',text);report.sha256=createHash('sha256').update(text).digest('hex');report.evaluations=3;check('postgres-backed-export-and-NA-missing-denominators');
 room=await create();const person=randomBytes(32).toString('hex');await post('/rooms/'+room.code+'/join',{browserCredential:person,consent:true,version:'1.4-2026-11-21'});
 assert.equal((await action('/close',{reason:'TESTE SINTETICO: encerramento sem consenso para verificar formulario.'})).status,200);
 assert.equal((await action('/evaluation',{input},person)).status,201);assert.equal((await view(person)).state.evaluations[0].applicationContext.processResult,'CLOSED_WITHOUT_CONSENSUS');report.impasseRoomCode=room.code;check('one-round-without-consensus-also-allows-voluntary-questionnaire');
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e instanceof Error?e.message:'Unknown';process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await writeFile(folder+'/VALIDATION_REPORT.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
