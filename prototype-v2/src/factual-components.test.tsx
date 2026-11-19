import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {FactualPanel,FactualResult} from './components/FactualPanel';
import {randomUUID} from 'node:crypto';
import {FACTUAL_MODEL,FACTUAL_VERSION,type FactualCheck} from '../shared/factual';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const check:FactualCheck={id:randomUUID(),proposalId:randomUUID(),roundId:randomUUID(),participantId:null,originalText:'Texto público sintético',model:FACTUAL_MODEL,version:FACTUAL_VERSION,createdAt:'2026-11-19T00:00:00Z',provenance:'SYNTHETIC_TEST',claims:[{claim:{text:'Alegação sintética',originalExcerpt:'Texto público sintético',kind:'FATO_VERIFICAVEL',query:'Consulta sintética',timeSensitive:false,reason:'Teste'},status:'EVIDENCIA_FAVORAVEL',explanation:'Interpretação sintética',providerText:'Texto vinculado sintético',responseModel:FACTUAL_MODEL,sources:[{id:'S1',title:'Fonte fictícia',url:'https://example.org/synthetic',publishedAt:null,dateOrigin:'PROVIDER_METADATA_OR_UNAVAILABLE'}],supports:[{text:'Texto vinculado sintético',sourceIds:['S1']}],searchQueries:['Consulta sintética'],searchSuggestionHtml:'<div>HTML EXATO DO PROVEDOR SINTÉTICO</div>',queriedAt:'2026-11-19T00:00:00Z',limitations:['Sem comprovação absoluta'],failureCode:null}]};
test('React factual: fontes, incertezas e sugestões originais em iframe isolado',async()=>{
 let r!:ReactTestRenderer;await act(async()=>{r=create(<FactualResult check={check}/>);});
 const text=JSON.stringify(r.toJSON());assert.ok(text.includes('Evidência favorável'));assert.ok(text.includes('Teste técnico sintético'));assert.ok(text.includes('não informada nos metadados'));
 const iframe=r.root.findByType('iframe');assert.equal(iframe.props.srcDoc,check.claims[0].searchSuggestionHtml);assert.ok(!iframe.props.sandbox.includes('allow-scripts'));assert.ok(!iframe.props.sandbox.includes('allow-same-origin'));
 assert.equal(r.root.findByType('a').props.rel,'noopener noreferrer');await act(async()=>r.unmount());
});
test('React factual: pesquisa exige alegação mínima e concordância, sem alterar manifestação',async()=>{
 let r!:ReactTestRenderer,value='';await act(async()=>{r=create(<FactualPanel checks={[]} busy={false} isOpen={true} onVerify={async s=>{value=s;}}/>);});
 assert.equal(r.root.findByType('button').props.disabled,true);
 await act(async()=>r.root.findByType('textarea').props.onChange({target:{value:'Uma alegação pública'}}));assert.equal(r.root.findByType('button').props.disabled,true);
 await act(async()=>r.root.findByType('input').props.onChange({target:{checked:true}}));assert.equal(r.root.findByType('button').props.disabled,false);
 await act(async()=>r.root.findByType('button').props.onClick());assert.equal(value,'Uma alegação pública');await act(async()=>r.unmount());
});
