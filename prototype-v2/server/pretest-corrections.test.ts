// Technical synthetic tests. No research participants or external provider charges.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createState,vote,contribute,contest,manifestations,currentRound,currentProposal,addAnalysis,addSynthesis,publish,validateState,exportState,unanimous} from './domain.js';
import {FakeAI,proposal,review} from './fixtures.js';
import {FactualService} from './factual.js';
import {FACTUAL_MODEL,type AtomicClaim} from '../shared/factual.js';
import {fact,retrieved,verdict,syntheticNow} from './factual-fixtures.js';
const record={result:review,status:'OK' as const,model:'synthetic',promptVersion:'test',reason:'Teste sintético.'};
const fresh=()=>createState(randomUUID(),proposal,Array.from({length:10},(_,i)=>({id:randomUUID(),alias:'P'+String(i+1).padStart(2,'0')})),record);

test('Pré-teste 1/2/4: dez identidades, quatro posições, síntese rastreável, revisão humana e consenso na V2',async()=>{
 const s=fresh(),r=currentRound(s),ai=new FakeAI();
 const choices=['ACEITO','ACEITO_COM_RESSALVAS','REJEITO','ABSTENHO'] as const;
 assert.throws(()=>vote(s,s.participants[1].id,r.id,r.proposalId,'ACEITO_COM_RESSALVAS','  '));
 for(let i=0;i<10;i++){const text='Manifestação sintética '+i;vote(s,s.participants[i].id,r.id,r.proposalId,choices[i%4],text);contribute(s,s.participants[i].id,r.id,r.proposalId,text,text,record,'');}
 contribute(s,s.participants[0].id,r.id,r.proposalId,'Sugestão independente: prazo maior.','Sugestão independente: prazo maior.',record,'');
 const sources=manifestations(s);assert.equal(sources.length,11);assert.deepEqual(new Set(sources.map(x=>x.kind)),new Set(['APOIO','RESSALVA','OBJECAO','ABSTENCAO','CONTRIBUICAO']));
 const a=await ai.analyzeObjections(proposal,s.votes,s.contributions,sources);
 assert.equal(a.individualAssessments.length,2);
 assert.throws(()=>addAnalysis(s,{...a,manifestationAssessments:a.manifestationAssessments!.slice(1)},'fake','test'));
 assert.throws(()=>addAnalysis(s,{...a,manifestationAssessments:[{...a.manifestationAssessments![0],kind:'OBJECAO'},...a.manifestationAssessments!.slice(1)]},'fake','test'));
 assert.throws(()=>addAnalysis(s,{...a,manifestationAssessments:[{...a.manifestationAssessments![0],quotedExcerpt:'Nunca foi dito'},...a.manifestationAssessments!.slice(1)]},'fake','test'));
 const analysis=addAnalysis(s,a,'fake','test'),result=await ai.synthesizeProposal(proposal,a);
 assert.throws(()=>addSynthesis(s,analysis.id,{...result,consideredSourceIds:[]},'fake','test'));
 const syn=addSynthesis(s,analysis.id,result,'fake','test'),original=JSON.stringify(syn.result);
 publish(s,{...result.revisedProposal,text:result.revisedProposal.text+' Intervenção humana explícita.'},currentProposal(s).id,'Justificativa sintética do moderador.',syn.id);
 const p=currentProposal(s);assert.equal(p.intervention?.kind,'EDICAO_HUMANA');assert.equal(p.intervention?.source,'SINTESE_IA');assert.equal(p.intervention?.original.text,result.revisedProposal.text);assert.equal(p.intervention?.published.text,p.content.text);assert.equal(p.intervention?.actor,'moderator');assert.ok(p.intervention?.at);assert.equal(p.intervention?.changes.length,1);assert.equal(JSON.stringify(syn.result),original);assert.equal(s.votes.length,10);assert.equal(unanimous(s),false);
 assert.throws(()=>vote(s,s.participants[0].id,r.id,r.proposalId,'ACEITO',''));
 const r2=currentRound(s);for(let i=0;i<9;i++)vote(s,s.participants[i].id,r2.id,r2.proposalId,'ACEITO','');
 assert.throws(()=>vote(s,s.participants[9].id,r2.id,r2.proposalId,'ACEITO_COM_RESSALVAS','  '));assert.equal(s.decision.status,'OPEN');
 vote(s,s.participants[9].id,r2.id,r2.proposalId,'ACEITO','');assert.equal(s.decision.status,'CONSENSUS');
 const archive=exportState(s);assert.deepEqual(validateState(JSON.parse(JSON.stringify(archive.state))),s);
 const tampered=structuredClone(s);tampered.proposals[1].intervention!.original.text='Origem inventada';assert.throws(()=>validateState(tampered));
});

test('Pré-teste 2: contestação posterior invalida análise e requer inclusão na nova análise',async()=>{
 const s=fresh(),r=currentRound(s),ai=new FakeAI();vote(s,s.participants[0].id,r.id,r.proposalId,'ACEITO','Apoio condicionado ao acesso.');
 const a=addAnalysis(s,await ai.analyzeObjections(proposal,s.votes,[],manifestations(s)),'fake','test');contest(s,s.participants[0].id,a.id,'A síntese precisa preservar acesso.');
 assert.throws(()=>addSynthesis(s,a.id,{} as any,'fake','test'));
 assert.ok(manifestations(s).some(x=>x.kind==='CONTESTACAO'));
});

test('Pré-teste 4: aprovação sem edição e sugestão inicial editada são distintas; estados históricos continuam legíveis',()=>{
 const s=fresh();publish(s,proposal,currentProposal(s).id,'Aprovação explícita.');assert.equal(currentProposal(s).intervention?.kind,'APROVACAO_HUMANA');assert.deepEqual(currentProposal(s).intervention?.changes,[]);validateState(s);
 const old=structuredClone(s);delete old.proposals[1].intervention;assert.equal(validateState(old).proposals[1].intervention,undefined);
 const initial=createState(randomUUID(),{...proposal,text:'Texto final humano.'},s.participants,{...record,appliedRewrite:true},proposal);assert.equal(initial.proposals[0].intervention?.source,'PARECER_INICIAL_IA');assert.equal(initial.proposals[0].intervention?.original.text,review.suggestedRewrite);validateState(initial);
});

const research='Quais hospedagens existem em Búzios e Ilha Grande de 25 a 31 de dezembro de 2026?';
function service(claim:AtomicClaim,options:object={}){return new FactualService({enabled:true,freeTierConfirmed:true,now:()=>syntheticNow,search:{configured:true,synthetic:true,async search(){return retrieved();}},geminiTransport:async mode=>mode==='classify'?{text:JSON.stringify({claims:[claim]}),modelVersion:FACTUAL_MODEL}:verdict('EVIDENCIA_INSUFICIENTE'),...options});}
test('Pré-teste 3: pesquisa pública aciona Tavily; preferência e viagem sem ano não consomem busca; cache não duplica',async()=>{
 let searches=0;const claim={...fact,text:research,originalExcerpt:research,kind:'SOLICITACAO_PESQUISA' as const,query:'hospedagens Búzios Ilha Grande 25 31 dezembro 2026',timeSensitive:true};
 const api=service(claim,{search:{configured:true,synthetic:true,async search(){searches++;return retrieved();}}});
 const report=await api.check(research,'room',undefined,'RESEARCH');assert.equal(searches,1);assert.equal(report.modality,'RESEARCH');assert.equal(report.claims[0].searchAttempted,true);assert.ok(report.claims[0].retrieval);assert.ok(report.claims[0].sources.length);assert.equal(report.claims[0].status,'EVIDENCIA_INSUFICIENTE');
 await api.check(research,'room',undefined,'RESEARCH');assert.equal(searches,1);
 const missing=await api.check('Quais hospedagens existem entre Búzios e Ilha Grande de 25 a 31 de dezembro?','room',undefined,'RESEARCH');assert.equal(missing.claims[0].failureCode,'CLARIFICATION_REQUIRED');assert.equal(missing.claims[0].retrieval,null);assert.equal(searches,1);
 const preference=await api.check('Prefiro viajar para Búzios.','room',undefined,'RESEARCH');assert.equal(preference.claims[0].failureCode,'NOT_APPLICABLE');assert.equal(searches,1);
});

test('Pré-teste 3: pergunta causal tem fontes consultivas e não presume causalidade; falhas distinguem etapas',async()=>{
 const text='A alta do dólar aumenta o custo de uma viagem a Búzios?';const claim={...fact,text,originalExcerpt:text,kind:'SOLICITACAO_PESQUISA' as const,query:'relação câmbio custos locais viagem Búzios',timeSensitive:false};
 const r=await service(claim).check(text,'room',undefined,'RESEARCH');assert.equal(r.claims[0].status,'EVIDENCIA_INSUFICIENTE');assert.ok(r.claims[0].retrieval);
 const searchFailure=await service(fact,{search:{configured:true,async search(){throw new Error('PRIVATE_PROVIDER_ERROR');}}}).check(fact.text,'room');assert.equal(searchFailure.claims[0].failureStage,'SEARCH');assert.equal(searchFailure.claims[0].searchAttempted,true);assert.ok(!JSON.stringify(searchFailure).includes('PRIVATE_PROVIDER_ERROR'));
 const interpretFailure=await service(fact,{geminiTransport:async(mode:string)=>{if(mode==='classify')return {text:JSON.stringify({claims:[fact]})};throw {status:503};}}).check(fact.text,'room');assert.equal(interpretFailure.claims[0].failureStage,'INTERPRETATION');assert.ok(interpretFailure.claims[0].sources.length);
});
