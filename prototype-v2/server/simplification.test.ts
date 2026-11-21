import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {GeminiQueue,withAIQueueStatus} from './gemini-queue.js';
import {MemoryProviderBudget} from './budget.js';
import {reserveReview,finishReview,ReviewWait} from './review-requests.js';
import {createState,currentRound,vote,exportState,validateState,type State} from './domain.js';
import {automaticMediation} from './automatic.js';
import {GeminiAdapter,AIUnavailable} from './ai.js';
import type {Repository,Identity} from './db.js';
import {FakeAI,proposal,review} from './fixtures.js';

function fixture(n=10){
 let state=createState(randomUUID(),proposal,Array.from({length:n},(_,i)=>({id:randomUUID(),alias:'P'+String(i+1).padStart(2,'0')})),{result:null,status:'IGNORADA',model:'none',promptVersion:'test',reason:'Synthetic'});
 state.votingMode='BINARY';let revision=1;
 const repo={async read(){return {state:structuredClone(state),revision};},async mutate(_i:unknown,expected:number,work:(s:State)=>void){if(expected!==revision)throw Error('Concurrent test mutation');const draft=structuredClone(state);work(draft);state=validateState(draft);revision++;return {state:structuredClone(state),revision};}} as unknown as Repository;
 const i:Identity={roomId:state.decision.id,code:'ABCDEF1234',role:'participant',participantId:state.participants[0].id};
 return {repo,i,get state(){return state;},set state(s:State){state=s;}};
}
test('Global queue: every rolling 60s has at most 14 starts, mediation precedes optional queued calls',async()=>{
 let clock=100000;const starts:number[]=[],order:string[]=[],budget=new MemoryProviderBudget(()=>clock);
 const queue=new GeminiQueue(budget,{now:()=>clock,sleep:async n=>{clock+=n;},daily:1000});
 const jobs=Array.from({length:20},(_,i)=>queue.run(10,async()=>{starts.push(clock);order.push('optional'+i);}));
 jobs.push(queue.run(0,async()=>{starts.push(clock);order.push('analysis');}));
 await Promise.all(jobs);
 for(const t of starts)assert.ok(starts.filter(x=>x>t-60000&&x<=t).length<=14);
 assert.ok(order.indexOf('analysis')<order.indexOf('optional2'));
 assert.equal(starts.length,21);
});
test('Queue reservations survive queue recreation and count failures, wait without losing tasks',async()=>{
 let clock=100000;const budget=new MemoryProviderBudget(()=>clock);
 for(let n=0;n<14;n++)await (await budget.reserve('gemini',{minute:14,daily:100,concurrent:10}))();
 const queue=new GeminiQueue(budget,{now:()=>clock,sleep:async n=>{clock+=n;}});
 let waiting=false;
 await withAIQueueStatus(async x=>{waiting ||= x;},()=>queue.run(0,async()=>{assert.ok(clock>=160000);}));
 assert.equal(waiting,true);
});
test('Individual cooldown: participant isolation, 60s boundary, cache, no reset across rounds, in-flight guard',async()=>{
 const f=fixture(),i=f.i;
 const a=await reserveReview(f.repo,i,'First synthetic argument',100000);
 await assert.rejects(reserveReview(f.repo,i,'another',100001),(e:unknown)=>e instanceof ReviewWait&&e.code==='REVIEW_IN_PROGRESS');
 await finishReview(f.repo,i,a.requestId,review);
 assert.deepEqual((await reserveReview(f.repo,i,'First synthetic argument',100002)).cached,review);
 await assert.rejects(reserveReview(f.repo,i,'changed',159999),(e:unknown)=>e instanceof ReviewWait&&e.retryAfterSeconds===1);
 const other={...i,participantId:f.state.participants[1].id};
 await reserveReview(f.repo,other,'independent',100003);
 const next=await reserveReview(f.repo,i,'changed',160000);assert.ok(next.requestId!==a.requestId);
 await finishReview(f.repo,i,next.requestId);
 assert.equal(f.state.reviewRequests?.find(x=>x.participantId===i.participantId)?.status,'FAILED');
 assert.equal(exportState(f.state).state.reviewRequests,undefined);
});
test('Binary sessions reject removed categories while historical JSON remains readable',()=>{
 const f=fixture(2),s=f.state,r=currentRound(s);
 assert.throws(()=>vote(s,s.participants[0].id,r.id,r.proposalId,'ABSTENHO','legacy'));
 assert.throws(()=>vote(s,s.participants[0].id,r.id,r.proposalId,'ACEITO_COM_RESSALVAS','legacy'));
 assert.throws(()=>vote(s,s.participants[0].id,r.id,r.proposalId,'REJEITO',''));
 delete s.votingMode;vote(s,s.participants[0].id,r.id,r.proposalId,'ABSTENHO','Historical only');
 assert.equal(validateState(exportState(s).state).votes[0].choice,'ABSTENHO');
});
test('Ten participants: failed synthesis exposes safe stage, analysis remains private and is reused on retry',async()=>{
 const f=fixture(),s=f.state,r=currentRound(s);s.enrollment={mode:'SELF',claims:s.participants.map(x=>x.id),automaticMediation:true};
 s.researchConsents=s.participants.map(p=>({participantId:p.id,response:'SIM' as const,at:new Date().toISOString(),version:'test',actor:'participant' as const}));
 for(let n=0;n<10;n++)vote(s,s.participants[n].id,r.id,r.proposalId,n%2?'REJEITO':'ACEITO',n%2?'Synthetic concern '+n:'');
 f.state=s;
 const ai=new FakeAI();let analyses=0,syntheses=0;
 const originalAnalyze=ai.analyzeObjections.bind(ai),originalSynthesize=ai.synthesizeProposal.bind(ai);
 ai.analyzeObjections=async(...args)=>{analyses++;return originalAnalyze(...args);};
 ai.synthesizeProposal=async(...args)=>{syntheses++;if(syntheses===1)throw new AIUnavailable('PROVIDER_UNAVAILABLE',503,3);return originalSynthesize(...args);};
 const prepare=automaticMediation(f.repo,ai);await prepare(f.i);
 assert.equal(f.state.mediation?.status,'FAILED');assert.equal(f.state.mediation?.stage,'SYNTHESIS_REQUEST');
 assert.equal(f.state.mediation?.failureCode,'PROVIDER_UNAVAILABLE');assert.equal(f.state.analyses.length,1);
 assert.equal(f.state.proposals.length,1);assert.equal(f.state.syntheses.length,0);
 await prepare(f.i,true);
 assert.equal(analyses,1);assert.equal(syntheses,2);assert.equal(f.state.mediation?.status,'READY');assert.equal(f.state.proposals.length,1);
});
test('Gemini analysis receives canonical sources once and live grammar requires source coverage',async()=>{
 let seen:any,schema:any;const fake=new FakeAI();
 const ai=new GeminiAdapter('synthetic',async(mode,input,grammar)=>{seen=input;schema=grammar;return JSON.stringify(await fake.analyzeObjections(proposal,[],[],[]));});
 await ai.analyzeObjections(proposal,[{id:'vote-id',choice:'ACEITO',justification:'synthetic'}],[{id:'duplicate',text:'synthetic'}],[{id:'vote-id',kind:'APOIO',text:'synthetic'}]);
 assert.equal(seen.votes,undefined);assert.equal(seen.contributions,undefined);assert.equal(seen.manifestations.length,1);assert.ok(schema.required.includes('manifestationAssessments'));
});
