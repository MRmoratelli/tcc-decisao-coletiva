import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {FactualPanel,FactualResult} from './components/FactualPanel';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {syntheticReport} from '../server/factual-fixtures';
import {FactualCheckSchema,type TavilyCheck} from '../shared/factual';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const check:TavilyCheck={...syntheticReport(),id:randomUUID(),proposalId:randomUUID(),roundId:randomUUID(),participantId:null};
test('React factual Tavily: trechos, relevância, datas, fontes e nenhum widget Google',async()=>{
 let r!:ReactTestRenderer;await act(async()=>{r=create(<FactualResult check={check}/>);});
 const text=JSON.stringify(r.toJSON());assert.ok(text.includes('Evidência favorável'));assert.ok(text.includes('Teste técnico sintético'));assert.ok(text.includes('não informada nos metadados'));assert.ok(text.includes('Tavily'));assert.ok(text.includes('não é probabilidade de verdade'));
 assert.equal(r.root.findAllByType('iframe').length,0);assert.equal(r.root.findByType('a').props.href,check.claims[0].sources[0].url);assert.equal(r.root.findByType('a').props.rel,'noopener noreferrer');await act(async()=>r.unmount());
});
test('React factual: registro antigo é exibido como histórico e preserva seu modelo original',async()=>{
 const raw=JSON.parse(await readFile(new URL('../docs/evidence/FACTUAL_SESSION_SYNTHETIC.json',import.meta.url),'utf8'));const legacy=FactualCheckSchema.parse(raw.state.factualChecks[0]);let r!:ReactTestRenderer;await act(async()=>{r=create(<FactualResult check={legacy}/>);});const text=JSON.stringify(r.toJSON());assert.ok(text.includes('Registro histórico do mecanismo Google'));assert.ok(text.includes('gemini-2.5-flash-lite'));assert.ok(!text.includes('Recuperação Tavily'));await act(async()=>r.unmount());
});
test('React factual: pesquisa exige alegação mínima e concordância, sem alterar manifestação',async()=>{
 let r!:ReactTestRenderer,value='';await act(async()=>{r=create(<FactualPanel checks={[]} busy={false} isOpen={true} onVerify={async s=>{value=s;}}/>);});assert.equal(r.root.findByType('button').props.disabled,true);
 await act(async()=>r.root.findByType('textarea').props.onChange({target:{value:'Uma alegação pública'}}));assert.equal(r.root.findByType('button').props.disabled,true);await act(async()=>r.root.findByType('input').props.onChange({target:{checked:true}}));assert.equal(r.root.findByType('button').props.disabled,false);await act(async()=>r.root.findByType('button').props.onClick());assert.equal(value,'Uma alegação pública');await act(async()=>r.unmount());
});
