import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createState,currentRound,currentProposal,vote,contribute,manifestations,addAnalysis,validateState,exportState,quoteOrigin,DomainError} from './domain.js';
import {FakeAI,proposal,review} from './fixtures.js';
import {GeminiAdapter,instructions} from './ai.js';
const rr={result:review,status:'OK' as const,model:'synthetic',promptVersion:'test',reason:'Synthetic only',appliedRewrite:true,choice:'USED_REWRITE' as const};
async function fixture(){
 const s=createState(randomUUID(),proposal,[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'},{id:randomUUID(),alias:'P03'}],rr),r=currentRound(s);
 contribute(s,s.participants[0].id,r.id,r.proposalId,'Reformulated support.','I support the order.',rr,'');
 vote(s,s.participants[0].id,r.id,r.proposalId,'ACEITO','Reformulated support.');
 contribute(s,s.participants[1].id,r.id,r.proposalId,'Reformulated objection.','I need an accessible location.',rr,'');
 vote(s,s.participants[1].id,r.id,r.proposalId,'REJEITO','Reformulated objection.');
 vote(s,s.participants[2].id,r.id,r.proposalId,'REJEITO','I prefer a different activity.');
 const a=await new FakeAI().analyzeObjections(proposal,s.votes,[],manifestations(s));
 a.manifestationAssessments![0].quotedExcerpt='I support the order.';
 a.manifestationAssessments![1].quotedExcerpt='accessible location';
 a.individualAssessments[0].quotedExcerpt='I need an accessible location.';
 return {s,a,r};
}
test('Accepted rewrites: literal original quotes stay linked to the same vote, survive export and import',async()=>{
 const {s,a}=await fixture(),saved=addAnalysis(s,a,'synthetic','test');
 assert.deepEqual(saved.result.manifestationAssessments!.map(x=>x.quoteOrigin),['ORIGINAL','ORIGINAL','SUBMITTED']);
 assert.equal(saved.result.individualAssessments[0].quoteOrigin,'ORIGINAL');
 const imported=validateState(JSON.parse(JSON.stringify(exportState(s).state)));
 assert.equal(imported.analyses[0].result.individualAssessments[0].quoteOrigin,'ORIGINAL');
 assert.equal(s.proposals.length,1);assert.equal(s.votes.length,3);assert.equal(s.decision.status,'OPEN');
});
test('Quote repair does not permit invented excerpts, foreign participants, wrong kind, missing or duplicate sources',async()=>{
 const {s,a,r}=await fixture();
 const rejects=(mutate:(x:typeof a)=>void,code:string)=>{const b=structuredClone(a);mutate(b);assert.throws(()=>addAnalysis(s,b,'synthetic','test'),(e:unknown)=>e instanceof DomainError&&e.code===code);};
 rejects(x=>{x.manifestationAssessments![0].quotedExcerpt='Invented content';},'ANALYSIS_QUOTE_MISMATCH');
 rejects(x=>{x.manifestationAssessments![0].quotedExcerpt='accessible location';},'ANALYSIS_QUOTE_MISMATCH');
 rejects(x=>{x.manifestationAssessments![0].kind='OBJECAO';},'ANALYSIS_KIND_MISMATCH');
 rejects(x=>{x.manifestationAssessments!.pop();},'ANALYSIS_SOURCE_COVERAGE');
 rejects(x=>{x.manifestationAssessments![1]=x.manifestationAssessments![0];},'ANALYSIS_SOURCE_COVERAGE');
 rejects(x=>{x.individualAssessments[0].quotedExcerpt='I support the order.';},'ANALYSIS_REJECTION_QUOTE');
 rejects(x=>{x.manifestationAssessments![0].quoteOrigin='SUBMITTED';},'ANALYSIS_QUOTE_MISMATCH');
 assert.equal(quoteOrigin(s,s.votes[0].id,randomUUID(),'I support the order.'),undefined);
 const unrelated=structuredClone(s);unrelated.contributions[0].proposalId=randomUUID();
 assert.equal(quoteOrigin(unrelated,s.votes[0].id,r.id,'I support the order.'),undefined);
 assert.equal(s.analyses.length,0);
});
test('Historical submitted quotes without origin metadata remain readable',async()=>{
 const {s}=await fixture(),ai=new FakeAI();addAnalysis(s,await ai.analyzeObjections(proposal,s.votes,[],manifestations(s)),'synthetic','test');
 for(const x of s.analyses[0].result.manifestationAssessments!)delete x.quoteOrigin;
 for(const x of s.analyses[0].result.individualAssessments)delete x.quoteOrigin;
 assert.equal(validateState(s).analyses.length,1);
});
test('Live grammar excludes server-derived quote metadata; individual mode keeps personal argument separate',async()=>{
 assert.ok(instructions.includes('analyzeContribution'));assert.ok(instructions.includes('EXCLUSIVAMENTE contribution'));
 const {s,a}=await fixture();let saw=false;
 const ai=new GeminiAdapter('synthetic',async(mode,input,schema)=>{assert.equal(mode,'analyzeObjections');assert.ok(!JSON.stringify(schema).includes('quoteOrigin'));saw=true;return JSON.stringify(a);});
 await ai.analyzeObjections(currentProposal(s).content,s.votes,[],manifestations(s));assert.ok(saw);
});
