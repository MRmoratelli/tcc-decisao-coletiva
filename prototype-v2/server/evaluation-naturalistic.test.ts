// Synthetic questionnaire records only; not scientific responses or psychometric validation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createState,vote,currentRound,publish,currentProposal,closeWithoutConsensus,evaluate,validateState,statistics,exportState} from './domain.js';
import {proposal} from './fixtures.js';
import {EvaluationSchema,INSTRUMENT_VERSION} from '../shared/contracts.js';
import {NATURALISTIC_VERSION,APPLICATION_VARIANT,items,openItems,naturalisticOpenItems} from '../shared/instrument.js';
const fresh=()=>createState(randomUUID(),proposal,Array.from({length:10},(_,i)=>({id:randomUUID(),alias:'P'+String(i+1).padStart(2,'0')})),{result:null,status:'IGNORADA',model:'none',promptVersion:'synthetic',reason:'Technical test'});
const input=()=>EvaluationSchema.parse({instrumentVersion:NATURALISTIC_VERSION,baseInstrumentVersion:INSTRUMENT_VERSION,applicationVariant:APPLICATION_VARIANT,answers:[5,'N/A',null,...Array(19).fill(null)],open:['[SINTÉTICO]','','',''],consent:true});
function acceptAll(s:ReturnType<typeof fresh>){for(const p of s.participants){const r=currentRound(s);vote(s,p.id,r.id,r.proposalId,'ACEITO','');}}
test('DSR A/D: one-round consensus unlocks variant; N/A and missing stay distinct; metadata server-derived',()=>{
 const s=fresh();assert.throws(()=>evaluate(s,s.participants[0].id,input()),/encerramento/);acceptAll(s);assert.equal(s.rounds.length,1);
 evaluate(s,s.participants[0].id,input());assert.equal(s.evaluations[0].applicationContext?.rounds,1);assert.equal(s.evaluations[0].applicationContext?.processResult,'CONSENSUS');
 const stats=statistics(s);assert.equal(stats.items[0].mean,5);assert.equal(stats.items[1].na,1);assert.equal(stats.items[1].missing,0);assert.equal(stats.items[2].missing,1);assert.equal(stats.nonrespondents,9);assert.equal(stats.psychometricValidation,false);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(exportState(s).state))),s);const bad=structuredClone(s);bad.evaluations[0].applicationContext!.rounds=2;assert.throws(()=>validateState(bad));
 assert.throws(()=>evaluate(s,s.participants[0].id,input()),/já registrada/);
});
test('DSR B/E: two-round variant works; original historical response and version remain byte-equivalent',()=>{
 const s=fresh();publish(s,{...proposal,text:'[SINTÉTICO] Revisão solicitada pelo grupo.'},currentProposal(s).id,'Revisão técnica explícita');acceptAll(s);
 const legacy=EvaluationSchema.parse({instrumentVersion:INSTRUMENT_VERSION,answers:Array(22).fill(4),open:['','','','A4 original sintética'],consent:true});evaluate(s,s.participants[0].id,legacy);
 const before=JSON.stringify(s.evaluations[0]);evaluate(s,s.participants[1].id,input());const restored=validateState(JSON.parse(JSON.stringify(exportState(s).state)));
 assert.equal(JSON.stringify(restored.evaluations[0]),before);assert.ok(!('applicationContext' in restored.evaluations[0]));assert.equal(statistics(restored).groups.length,2);assert.equal(statistics(restored).mixedVersions,true);
});
test('DSR C: one-round closure without consensus unlocks variant; original retains two-round condition',()=>{
 const s=fresh();closeWithoutConsensus(s,'[SINTÉTICO] Encerramento legítimo por impasse.');evaluate(s,s.participants[0].id,input());assert.equal(s.evaluations[0].applicationContext?.processResult,'CLOSED_WITHOUT_CONSENSUS');
 const legacy={instrumentVersion:INSTRUMENT_VERSION,answers:Array(22).fill(null),open:Array(4).fill(''),consent:true} as const;assert.throws(()=>evaluate(s,s.participants[1].id,EvaluationSchema.parse(legacy)),/original/);validateState(s);
});
test('DSR: 22 items and A1–A3 unchanged; A4 adaptation explicit; omission never becomes neutral',()=>{
 assert.equal(items.length,22);assert.equal(openItems.length,4);assert.deepEqual(naturalisticOpenItems.slice(0,3),openItems.slice(0,3));assert.match(openItems[3],/antes do uso real/);assert.match(naturalisticOpenItems[3],/usos futuros/);assert.notEqual(openItems[3],naturalisticOpenItems[3]);
 assert.equal(input().answers[2],null);assert.equal(input().answers[1],'N/A');
});
