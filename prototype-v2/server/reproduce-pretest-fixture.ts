// Explicit, offline technical fixture. No external provider call or scientific data.
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createState,vote,contribute,contest,manifestations,currentRound,currentProposal,addAnalysis,addSynthesis,publish,exportState,validateState} from './domain.js';
import {FakeAI,proposal,review} from './fixtures.js';
if(!process.argv.includes('--run'))throw Error('Explicit --run required; technical synthetic fixture only.');
const record={result:review,status:'OK' as const,model:'synthetic-test-only',promptVersion:'synthetic-only',reason:'Fixture técnica sem participantes ou provedor real.'};
const p={...proposal,title:'[SINTÉTICO — IA SIMULADA] Revisão humana rastreável',text:'SIMULAÇÃO TÉCNICA: preparar nota com fontes e limitações, sem eficácia científica presumida.'};
const s=createState(randomUUID(),p,Array.from({length:10},(_,i)=>({id:randomUUID(),alias:'P'+String(i+1).padStart(2,'0')})),record),ai=new FakeAI(),r=currentRound(s);
const choices=['ACEITO','ACEITO_COM_RESSALVAS','REJEITO','ABSTENHO'] as const;
for(let i=0;i<10;i++){const text='Manifestação fictícia '+i+': preservar fontes, condições e limites.';vote(s,s.participants[i].id,r.id,r.proposalId,choices[i%4],text);contribute(s,s.participants[i].id,r.id,r.proposalId,text,text,record,'');}
const c=contribute(s,s.participants[0].id,r.id,r.proposalId,'Sugestão independente: apresentar limites.','Sugestão independente: apresentar limites.',record,'');
contest(s,s.participants[0].id,c.id,'Contestação sintética: preservar o sentido da condição.');
const a=addAnalysis(s,await ai.analyzeObjections(p,s.votes,s.contributions,manifestations(s)),ai.model,'synthetic-only');
const syn=addSynthesis(s,a.id,await ai.synthesizeProposal(p,a.result),ai.model,'synthetic-only');
publish(s,{...syn.result.revisedProposal,text:syn.result.revisedProposal.text+' EDIÇÃO HUMANA SINTÉTICA: explicitar incertezas na nota.'},currentProposal(s).id,'Ensaio exclusivamente sintético: moderador alterou uma saída de IA SIMULADA por fixture; não é uma resposta Gemini real.',syn.id);
const r2=currentRound(s);for(const person of s.participants)vote(s,person.id,r2.id,r2.proposalId,'ACEITO','Aceitação sintética explícita da V2.');
assert.equal(s.decision.status,'CONSENSUS');assert.equal(s.proposals[1].intervention?.source,'SINTESE_IA');validateState(s);
await mkdir(new URL('../docs/evidence/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/evidence/PRETESTE_FLUXO_IA_SIMULADA.json',import.meta.url),JSON.stringify(exportState(s),null,2));
console.log(JSON.stringify({syntheticOnly:true,realProvider:false,participants:10,rounds:2,manifestationsAnalyzed:a.result.manifestationAssessments?.length,intervention:s.proposals[1].intervention?.kind,result:s.decision.status}));
