import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createState,vote,currentRound,closeWithoutConsensus } from './domain.js';
import { cohortReport } from './cohort.js';
import { proposal } from './fixtures.js';
const fresh=()=>createState(randomUUID(),proposal,[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}],{result:null,status:'IGNORADA',promptVersion:'test',model:'none',reason:'Synthetic'});
test('indicadores de coorte usam apenas processos concluídos e deduplicam restaurações',()=>{
 const a=fresh(),b=fresh(),c=fresh();const r=currentRound(a);for(const p of a.participants)vote(a,p.id,r.id,r.proposalId,'ACEITO','');closeWithoutConsensus(b,'Impasse');const copy=structuredClone(a);copy.decision.id=randomUUID();
 const report=cohortReport([a,b,c,copy]);assert.equal(report.processes,3);assert.equal(report.completed,2);assert.equal(report.duplicatesExcluded,1);assert.equal(report.consensusRate,.5);assert.equal(report.openCoding.length,4);assert.equal(cohortReport([c]).consensusRate,null);
});
