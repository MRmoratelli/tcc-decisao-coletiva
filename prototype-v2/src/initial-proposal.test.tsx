import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {InitialProposalForm,type InitialProposalInput} from './components/InitialProposalForm';
import {review} from '../server/fixtures';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
async function fill(ui:ReactTestRenderer){
 await act(async()=>ui.root.findAllByType('input')[0].props.onChange({target:{value:'Discussão sintética'}}));
 await act(async()=>ui.root.findAllByType('textarea')[0].props.onChange({target:{value:'Proposta original para revisão.'}}));
}
const button=(ui:ReactTestRenderer,label:string)=>ui.root.findAllByType('button').find(b=>b.children.join('')===label)!;
test('Criação: quatro campos, parecer antes da sala, sugestão editável e confirmação única',async t=>{
 const sent:any[]=[];const created:InitialProposalInput[]=[];
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{sent.push({url:String(url),body:JSON.parse(String(init?.body))});return {ok:true,json:async()=>({review,receipt:'signed-initial'})} as Response;});
 let ui!:ReactTestRenderer;
 try{
  await act(async()=>{ui=create(<InitialProposalForm busy={false} onCreate={async input=>{created.push(input);}}/>);});
  assert.equal(ui.root.findAllByType('input').length,2);assert.equal(ui.root.findAllByType('textarea').length,2);
  assert.ok(!button(ui,'Criar sala com esta proposta'));
  await fill(ui);await act(async()=>ui.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(created.length,0);assert.equal(sent.length,1);assert.equal(sent[0].url,'/api/ai/proposal-review');
  assert.ok(JSON.stringify(ui.toJSON()).includes(review.summary));
  await act(async()=>button(ui,'Usar sugestão da IA').props.onClick());
  assert.equal(ui.root.findAllByType('textarea')[0].props.value,review.suggestedRewrite);
  await act(async()=>ui.root.findAllByType('textarea')[0].props.onChange({target:{value:review.suggestedRewrite+' Ajuste humano.'}}));
  await act(async()=>button(ui,'Criar sala com esta proposta').props.onClick());
  assert.equal(created.length,1);assert.equal(sent.length,1);
  assert.equal(created[0].reviewedProposal?.text,'Proposta original para revisão.');assert.equal(created[0].proposal.text,review.suggestedRewrite+' Ajuste humano.');
  assert.equal(created[0].receipt,'signed-initial');assert.equal(created[0].appliedRewrite,true);
 }finally{await act(async()=>ui.unmount());}
});
test('Criação: manter proposta restaura texto original e conserva o parecer',async t=>{
 let created:InitialProposalInput|undefined;
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({review,receipt:'test'})}) as Response);
 let ui!:ReactTestRenderer;
 try{
  await act(async()=>{ui=create(<InitialProposalForm busy={false} onCreate={async input=>{created=input;}}/>);});
  await fill(ui);await act(async()=>ui.root.findByType('form').props.onSubmit({preventDefault(){}}));
  await act(async()=>button(ui,'Usar sugestão da IA').props.onClick());
  await act(async()=>button(ui,'Manter minha proposta').props.onClick());
  assert.equal(ui.root.findAllByType('textarea')[0].props.value,'Proposta original para revisão.');
  await act(async()=>button(ui,'Criar sala com esta proposta').props.onClick());
  assert.equal(created?.reviewChoice,'KEPT_ORIGINAL');assert.equal(created?.appliedRewrite,false);assert.equal(created?.receipt,'test');
 }finally{await act(async()=>ui.unmount());}
});
test('Criação: processamento explícito, falha conserva texto e oferece continuação sem revisão',async t=>{
 let reject!:()=>void;const created:InitialProposalInput[]=[];
 t.mock.method(globalThis,'fetch',()=>new Promise((_r,j)=>{reject=()=>j(Error('Synthetic failure'));}));
 let ui!:ReactTestRenderer;
 try{
  await act(async()=>{ui=create(<InitialProposalForm busy={false} onCreate={async input=>{created.push(input);}}/>);});
  await fill(ui);
  let pending:Promise<void>;
  await act(async()=>{pending=ui.root.findByType('form').props.onSubmit({preventDefault(){}});});
  assert.ok(button(ui,'Revisando proposta inicial…'));assert.ok(ui.root.findAllByType('textarea')[0].props.disabled);
  await act(async()=>{reject();await pending;});
  assert.equal(created.length,0);assert.equal(ui.root.findAllByType('textarea')[0].props.value,'Proposta original para revisão.');
  await act(async()=>button(ui,'Criar sala sem revisão da IA').props.onClick());
  assert.equal(created[0].initialReviewMode,'BYPASSED');assert.ok(created[0].bypassReason);assert.equal(created[0].receipt,undefined);
 }finally{await act(async()=>ui.unmount());}
});

test('Revisão inicial: informa indisponibilidade do Gemini após as tentativas e conserva o rascunho',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:false,status:503,json:async()=>({error:'O serviço Gemini está temporariamente indisponível após as tentativas automáticas. Seu texto foi mantido.',code:'PROVIDER_UNAVAILABLE',attempts:3})}) as Response);
 let rendered!:ReactTestRenderer;
 try{
  await act(async()=>{rendered=create(<InitialProposalForm busy={false} onCreate={async()=>{throw Error('Must not create');}}/>);});
  await fill(rendered);await act(async()=>rendered.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.ok(JSON.stringify(rendered.toJSON()).includes('temporariamente indisponível após as tentativas automáticas'));
  assert.equal(rendered.root.findAllByType('textarea')[0].props.value,'Proposta original para revisão.');
  assert.ok(button(rendered,'Criar sala sem revisão da IA'));
 }finally{await act(async()=>rendered.unmount());}
});
