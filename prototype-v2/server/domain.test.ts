import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createState,vote,currentRound,currentProposal,unanimous,publish,closeWithoutConsensus,validateState,exportState,metrics,evaluate,statistics,addAnalysis,addSynthesis,reconcileSynthesisLinks,manifestations,contest,contribute } from './domain.js';
import { proposal,review,FakeAI } from './fixtures.js';
import { ProposalSchema,EvaluationSchema,INSTRUMENT_VERSION } from '../shared/contracts.js';
import { items,openItems,dimensions } from '../shared/instrument.js';
const reviewRecord={result:review,status:'OK' as const,model:'synthetic',promptVersion:'test',reason:''};
const fresh=()=>createState(randomUUID(),proposal,Array.from({length:3},(_,i)=>({id:randomUUID(),alias:'P0'+(i+1)})),reviewRecord);
function cast(s:ReturnType<typeof fresh>,i:number,choice:'ACEITO'|'REJEITO'|'ABSTENHO',text=''){vote(s,s.participants[i].id,currentRound(s).id,currentProposal(s).id,choice,text);}
test('01 proposta genérica e campos opcionais; sem orçamento nem taxonomia',()=>{assert.ok(ProposalSchema.safeParse(proposal).success);assert.equal(proposal.constraints,'');assert.ok(!ProposalSchema.safeParse({...proposal,problem:''}).success);});
test('08-09 rejeição fundamentada; abstenção e silêncio não são aceite',()=>{const s=fresh();assert.throws(()=>cast(s,0,'REJEITO'));cast(s,0,'ACEITO');cast(s,1,'ABSTENHO');assert.equal(unanimous(s),false);assert.equal(s.decision.status,'OPEN');});
test('10-11 histórico de versões; nova versão exige novas posições',()=>{const s=fresh();cast(s,0,'ACEITO');const old=currentRound(s);publish(s,{...proposal,text:'Revisar as prioridades com prazo.'},currentProposal(s).id,'Revisão humana');assert.equal(s.proposals.length,2);assert.equal(s.votes.length,1);assert.equal(unanimous(s),false);assert.throws(()=>vote(s,s.participants[1].id,old.id,old.proposalId,'ACEITO',''));});
test('15 aceitação explícita unânime na mesma versão encerra; IA não declara',()=>{const s=fresh();cast(s,0,'ACEITO');cast(s,1,'ACEITO');assert.equal(s.decision.status,'OPEN');cast(s,2,'ACEITO');assert.equal(s.decision.status,'CONSENSUS');assert.ok(unanimous(s));assert.throws(()=>cast(s,1,'REJEITO','Mudar'));});
test('16 encerramento sem consenso requer razão e não força aceite',()=>{const s=fresh();assert.throws(()=>closeWithoutConsensus(s,''));closeWithoutConsensus(s,'Impasse de prazo');assert.equal(s.decision.status,'CLOSED_WITHOUT_CONSENSUS');assert.ok(!unanimous(s));assert.equal(metrics(s).automatic.consensus,false);});
test('12-14 análise e síntese cobrem todas objeções; revisão humana explícita',async()=>{const s=fresh(),ai=new FakeAI();cast(s,0,'REJEITO','Prazo inviável');const result=await ai.analyzeObjections(proposal,s.votes);assert.throws(()=>addAnalysis(s,{...result,individualAssessments:[]},'fake','test'));assert.throws(()=>addAnalysis(s,{...result,individualAssessments:[{...result.individualAssessments[0],quotedExcerpt:'citação inventada'}]},'fake','test'));
 const a=addAnalysis(s,result,'fake','test'),syn=await ai.synthesizeProposal(proposal,result);assert.throws(()=>addSynthesis(s,a.id,{...syn,partiallyAddressedObjections:[]},'fake','test'));const draft=addSynthesis(s,a.id,syn,'fake','test');assert.equal(s.proposals.length,1);assert.throws(()=>publish(s,syn.revisedProposal,currentProposal(s).id,'',draft.id));publish(s,syn.revisedProposal,currentProposal(s).id,'Moderador revisou',draft.id,[{voteId:s.votes[0].id,status:'PARCIAL',faithful:true,note:'Avaliação humana sintética'}]);assert.equal(metrics(s).human.partial,1);assert.equal(metrics(s).human.faithful,1);});
test('07 contribuições originais e contestações são preservadas',()=>{const s=fresh(),pid=s.participants[0].id,r=currentRound(s);const c=contribute(s,pid,r.id,r.proposalId,'Texto editado','Texto original',reviewRecord,'Discordo do parecer');contest(s,pid,c.id,'Interpretou mal');assert.equal(c.originalText,'Texto original');assert.equal(c.contest,'Discordo do parecer');assert.equal(s.contests.length,1);assert.throws(()=>contest(s,s.participants[1].id,c.id,'Alheia'));});
test('18-19 JSON versionado valida encadeamento, participantes e consenso',()=>{const s=fresh(),ex=exportState(s);assert.deepEqual(validateState(JSON.parse(JSON.stringify(ex.state))),s);assert.throws(()=>validateState({...s,decision:{...s.decision,status:'CONSENSUS'}}));assert.throws(()=>validateState({...s,votes:[{id:randomUUID(),participantId:randomUUID(),roundId:currentRound(s).id,proposalId:currentProposal(s).id,choice:'ACEITO',justification:'',createdAt:new Date().toISOString()}]}));assert.throws(()=>validateState({...s,proposals:[{...s.proposals[0],version:3}]}));});
test('20 instrumento integral, ausências e N/A; aplicação após duas rodadas',()=>{const s=fresh(),pid=s.participants[0].id;assert.equal(items.length,22);assert.equal(openItems.length,4);assert.equal(dimensions.length,6);const input=EvaluationSchema.parse({instrumentVersion:INSTRUMENT_VERSION,answers:[5,'N/A',null,...Array(19).fill(4)],open:['Contribuição','Interpretação','Favorecimento','Mudança'],consent:true});assert.throws(()=>evaluate(s,pid,input));publish(s,proposal,currentProposal(s).id,'Reavaliar divergências');closeWithoutConsensus(s,'Impasse registrado');evaluate(s,pid,input);const stats=statistics(s);assert.equal(stats.items[0].mean,5);assert.equal(stats.items[1].na,1);assert.equal(stats.items[1].missing,0);assert.equal(stats.items[2].n,0);assert.equal(stats.items[2].missing,1);assert.equal(stats.nonrespondents,2);assert.equal(stats.psychometricValidation,false);assert.throws(()=>evaluate(s,pid,input));});

test('rascunho original, repetições e alteração após análise permanecem rastreáveis',async()=>{
 const s=fresh(),ai=new FakeAI();cast(s,0,'REJEITO','Mesmo prazo');cast(s,1,'REJEITO','Mesmo prazo');
 assert.equal(metrics(s).automatic.repeatedObjections.length,1);assert.equal(s.initialDraft.text,proposal.text);
 const result=await ai.analyzeObjections(proposal,s.votes),analysis=addAnalysis(s,result,'fake','test');
 const r=currentRound(s);contribute(s,s.participants[0].id,r.id,r.proposalId,'Nova sugestão','Nova sugestão',reviewRecord,'');
 const draft=await ai.synthesizeProposal(proposal,result);assert.throws(()=>addSynthesis(s,analysis.id,draft,'fake','test'));
});

test('Síntese: ressalvas não são rejeições; correção conserva classificação cautelosa e vínculo real',async()=>{
 const s=fresh(),ai=new FakeAI(),r=currentRound(s),pid0=s.participants[0].id,pid1=s.participants[1].id;
 vote(s,pid0,r.id,r.proposalId,'REJEITO','Local de difícil acesso');
 vote(s,pid1,r.id,r.proposalId,'ACEITO_COM_RESSALVAS','Prefiro levar bebidas separadamente');
 const assessment=await ai.analyzeObjections(proposal,latestForTest(s),[],manifestations(s));
 const a=addAnalysis(s,assessment,'synthetic','test');
 const valid=await ai.synthesizeProposal(proposal,assessment);
 const malformed={...valid,partiallyAddressedObjections:[pid1],changeLog:valid.changeLog.map(c=>({...c,voteIds:[pid1]}))};
 const fixed=reconcileSynthesisLinks(s,malformed);
 assert.deepEqual(fixed.addressedObjections,[]);
 assert.deepEqual(fixed.partiallyAddressedObjections,[]);
 assert.deepEqual(fixed.unresolvedObjections,[s.votes[0].id]);
 assert.deepEqual(fixed.changeLog[0].voteIds,[]);
 assert.ok(fixed.feasibilityWarnings.some(w=>w.includes('AJUSTE DE VÍNCULOS')));
 assert.ok(fixed.consideredSourceIds?.includes(s.votes[1].id));
 assert.throws(()=>addSynthesis(s,a.id,malformed,'synthetic','test'));
 const saved=addSynthesis(s,a.id,fixed,'synthetic','test');
 assert.equal(saved.result.unresolvedObjections.length,1);
 const tampered={...fixed,consideredSourceIds:['não-existente']};
 assert.throws(()=>addSynthesis(s,a.id,tampered,'synthetic','test'));
});
function latestForTest(s:ReturnType<typeof fresh>){return s.votes.map(v=>({id:v.id,choice:v.choice,justification:v.justification}));}

test('Voto único por rodada: repetir ou alterar posição é recusado; histórico antigo continua legível',()=>{
 const s=fresh(),pid=s.participants[0].id,r1=currentRound(s);
 vote(s,pid,r1.id,r1.proposalId,'ACEITO_COM_RESSALVAS','Exijo acesso por rampa.');
 const before=JSON.stringify(s);
 for(const choice of ['ACEITO','ACEITO_COM_RESSALVAS','REJEITO','ABSTENHO'] as const){
  assert.throws(()=>vote(s,pid,r1.id,r1.proposalId,choice,'Tentativa de substituir posição.'),(e:unknown)=>e instanceof Error&&'status' in e&&e.status===409);
  assert.equal(JSON.stringify(s),before);
 }
 const legacy=structuredClone(s);
 legacy.votes.push({...legacy.votes[0],id:randomUUID(),choice:'REJEITO',justification:'Atualização histórica anterior à regra de voto único.'});
 assert.equal(validateState(legacy).votes.length,2);
 publish(s,{...proposal,text:'Proposta nova com acesso por rampa.'},currentProposal(s).id,'Revisão humana para nova votação.');
 const r2=currentRound(s);vote(s,pid,r2.id,r2.proposalId,'ACEITO','');
 assert.equal(s.votes.length,2);assert.equal(s.votes[0].choice,'ACEITO_COM_RESSALVAS');assert.equal(s.decision.status,'OPEN');
 assert.throws(()=>vote(s,pid,r2.id,r2.proposalId,'ABSTENHO',''),/já foi registrado/);
});
