import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createState,vote,currentRound,currentProposal,addAnalysis,addSynthesis,assertSynthesis,reconcileSynthesisLinks,validateState,exportState} from './domain.js';
import {FakeAI,proposal} from './fixtures.js';
import {GeminiAdapter,AIUnavailable} from './ai.js';
const fresh=()=>createState(randomUUID(),proposal,[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}],{result:null,status:'IGNORADA',model:'none',promptVersion:'test',reason:'Synthetic technical test'});
test('Unconditional acceptance rejects justification before writing; historical accepted text remains readable',()=>{
 const s=fresh(),r=currentRound(s);s.votingMode='BINARY';
 assert.throws(()=>vote(s,s.participants[0].id,r.id,r.proposalId,'ACEITO','Only if the date is fixed'));
 assert.equal(s.votes.length,0);vote(s,s.participants[0].id,r.id,r.proposalId,'ACEITO','');
 const legacy=fresh(),lr=currentRound(legacy);vote(legacy,legacy.participants[0].id,lr.id,lr.proposalId,'ACEITO','Historical supporting statement');legacy.votingMode='BINARY';
 assert.equal(validateState(exportState(legacy).state).votes[0].justification,'Historical supporting statement');
});
test('Weekend without exact date cannot be fully addressed when exact date is still pending; no date is invented',async()=>{
 const s=fresh(),r=currentRound(s);vote(s,s.participants[0].id,r.id,r.proposalId,'REJEITO','I need an exact date, and can only attend on weekends.');
 const ai=new FakeAI(),analysis=addAnalysis(s,await ai.analyzeObjections(proposal,s.votes),'synthetic','test');
 const result=await ai.synthesizeProposal(proposal,analysis.result),id=s.votes[0].id;
 result.revisedProposal.text='Organize the event on a weekend, with exact date still to be agreed.';
 result.addressedObjections=[id];result.partiallyAddressedObjections=[];
 result.resolutionChecks=[{voteId:id,satisfiedRequirements:['Weekend restriction included'],remainingRequirements:['Exact date and time not defined']}];
 result.decisionProgress={defined:['Weekends in the draft'],suggested:[],pending:['Exact date and time'],questions:['Which weekend date and time can each person attend?']};
 assert.throws(()=>assertSynthesis(s,result));
 const fixed=reconcileSynthesisLinks(s,result);assert.deepEqual(fixed.addressedObjections,[]);assert.deepEqual(fixed.partiallyAddressedObjections,[id]);
 assert.deepEqual(fixed.resolutionChecks,result.resolutionChecks);assert.equal(fixed.revisedProposal.text,result.revisedProposal.text);
 assert.ok(fixed.feasibilityWarnings.some(x=>x.includes('PEND')));addSynthesis(s,analysis.id,fixed,'synthetic','test');
 assert.equal(validateState(exportState(s).state).syntheses.length,1);assert.equal(s.proposals.length,1);
});
test('Unaddressed requirement stays unresolved; unknown requirement IDs are rejected',async()=>{
 const s=fresh(),r=currentRound(s);vote(s,s.participants[0].id,r.id,r.proposalId,'REJEITO','Exact time needed.');
 const ai=new FakeAI(),a=await ai.analyzeObjections(proposal,s.votes),x=await ai.synthesizeProposal(proposal,a),id=s.votes[0].id;
 x.addressedObjections=[id];x.partiallyAddressedObjections=[];x.resolutionChecks=[{voteId:id,satisfiedRequirements:[],remainingRequirements:['Time missing']}];
 const fixed=reconcileSynthesisLinks(s,x);assert.deepEqual(fixed.unresolvedObjections,[id]);assertSynthesis(s,fixed);
 assert.throws(()=>assertSynthesis(s,{...fixed,resolutionChecks:[{...fixed.resolutionChecks![0],voteId:randomUUID()}]}));
});
test('Live synthesis requires progress and resolution checks while old archives without them remain readable',async()=>{
 const ai=new FakeAI(),a=await ai.analyzeObjections(proposal,[]),x=await ai.synthesizeProposal(proposal,a);let grammar:any;
 await new GeminiAdapter('synthetic',async(_m,_i,s)=>{grammar=s;return JSON.stringify(x);}).synthesizeProposal(proposal,a);
 assert.ok(grammar.required.includes('decisionProgress'));assert.ok(grammar.required.includes('resolutionChecks'));
 const old={...x};delete old.decisionProgress;delete old.resolutionChecks;
 await assert.rejects(new GeminiAdapter('synthetic',async()=>JSON.stringify(old)).synthesizeProposal(proposal,a),AIUnavailable);
 const s=fresh(),analysis=addAnalysis(s,a,'synthetic','test');addSynthesis(s,analysis.id,old,'synthetic','historical');validateState(s);
});
