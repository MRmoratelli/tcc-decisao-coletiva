// Synthetic UI tests; no real participants or provider calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {randomUUID} from 'node:crypto';
import App from './App';
import {RoomWorkspace} from './components/RoomWorkspace';
import {createState,publish,currentProposal,closeWithoutConsensus} from '../server/domain';
import {proposal} from '../server/fixtures';
import type {RoomView} from './api';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const state=()=>createState(randomUUID(),proposal,[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}],{result:null,status:'IGNORADA',model:'none',promptVersion:'test',reason:'Teste sintético'});
const view=(s:ReturnType<typeof state>,revision:number):RoomView=>({revision,state:structuredClone(s),room:{id:s.decision.id,code:'A123456789',topic:proposal.title,proposal:s.proposals.at(-1)!.content.text,proposal_review:null},role:'participant',alias:'P01',participantId:s.participants[0].id,canViewGroup:false,positions:[],contributions:[],metrics:null});

test('Pré-teste 5 React: polling recebe V2 sem Atualizar, mantém rascunho, exige confirmação e recupera conexão',async t=>{
 const s=state();let remote=view(s,1),fail=false;let rendered!:ReactTestRenderer;
 const fetchMock=t.mock.method(globalThis,'fetch',async(_url:RequestInfo|URL,init?:RequestInit)=>{if(fail)throw Error('synthetic network failure');const body=JSON.parse(String(init?.body));return {ok:true,json:async()=>body.knownRevision===remote.revision?{revision:remote.revision,unchanged:true}:structuredClone(remote)} as Response;});
 t.mock.timers.enable({apis:['setTimeout']});
 try{
  await act(async()=>{rendered=create(<App/>);});
  await act(async()=>rendered.root.findAllByType('button').find(b=>b.children.includes('Entrar com código'))!.props.onClick());
  const inputs=rendered.root.findAllByType('input');
  await act(async()=>{inputs[0].props.onChange({target:{value:remote.room.code}});inputs[1].props.onChange({target:{value:'synthetic-participant-access-not-a-real-secret'}});});
  await act(async()=>rendered.root.findByType('form').props.onSubmit({preventDefault(){}}));
  const manifest=()=>rendered.root.findAllByType('textarea').find(x=>x.props.rows===5)!;
  await act(async()=>manifest().props.onChange({target:{value:'Rascunho humano ainda não enviado.'}}));
  await act(async()=>{t.mock.timers.tick(4000);});assert.equal(manifest().props.value,'Rascunho humano ainda não enviado.');
  publish(s,{...proposal,text:'Segunda proposta sintética publicada.'},currentProposal(s).id,'Revisão humana sintética');remote=view(s,2);
  await act(async()=>{t.mock.timers.tick(4000);});
  assert.equal(manifest().props.value,'Rascunho humano ainda não enviado.');
  assert.ok(JSON.stringify(rendered.toJSON()).includes('Nova rodada publicada'));
  assert.ok(JSON.stringify(rendered.toJSON()).includes('Segunda proposta sintética publicada.'));
  const register=()=>rendered.root.findAllByType('button').find(b=>b.children.join('').startsWith('Registrar '))!;
  assert.equal(register().props.disabled,true);
  await act(async()=>rendered.root.findAllByType('button').find(b=>b.children.includes('Confirmar reutilização do meu texto na rodada atual'))!.props.onClick());assert.equal(register().props.disabled,false);assert.equal(manifest().props.value,'Rascunho humano ainda não enviado.');
  fail=true;await act(async()=>{t.mock.timers.tick(4000);});assert.ok(JSON.stringify(rendered.toJSON()).includes('temporariamente indisponível'));assert.equal(manifest().props.value,'Rascunho humano ainda não enviado.');
  fail=false;closeWithoutConsensus(s,'Encerramento sintético legítimo');remote=view(s,3);await act(async()=>{t.mock.timers.tick(4000);});
  const html=JSON.stringify(rendered.toJSON());assert.ok(html.includes('Encerrado sem consenso'));assert.ok(html.includes('Rascunho humano ainda não enviado.'));assert.ok(!html.includes('temporariamente indisponível'));assert.equal(fetchMock.mock.callCount(),5);
 }finally{if(rendered)await act(async()=>rendered.unmount());t.mock.timers.reset();}
});

test('Pré-teste 1/4 React: opção com ressalvas e comparação humana aparecem ao participante',async()=>{
 const s=state();publish(s,{...proposal,text:'Texto efetivamente publicado pelo moderador.'},currentProposal(s).id,'Esclarecer o escopo.');let rendered!:ReactTestRenderer;
 await act(async()=>{rendered=create(<RoomWorkspace session={{code:'A123456789',credential:'synthetic-token',view:view(s,2)}} busy={false} act={async f=>{await f();}} onRefresh={async()=>{}}/>);});
 const output=JSON.stringify(rendered.toJSON());assert.ok(output.includes('ACEITO COM RESSALVAS'));assert.ok(output.includes('Proposta revisada pelo moderador'));assert.ok(output.includes('Comparar versão original e publicada'));assert.ok(output.includes('Esclarecer o escopo.'));assert.ok(output.includes('Texto efetivamente publicado pelo moderador.'));
 const position=rendered.root.findAllByType('select')[0];await act(async()=>position.props.onChange({target:{value:'ACEITO_COM_RESSALVAS'}}));assert.ok(JSON.stringify(rendered.toJSON()).includes('(obrigatória)'));
 await act(async()=>rendered.unmount());
});

test('Parecer inicial: somente moderador; aprovação simples discreta; edição e reformulação rastreáveis',async t=>{
 const {review}=await import('../server/fixtures');
 const initial={...review,summary:'PARECER_PRELIMINAR_RESERVADO',suggestedRewrite:'Reformulação sintética adotada.'};
 for(const role of ['participant','moderator'] as const){
  const s=state();s.proposals[0].review={result:initial,status:'OK',model:'synthetic',promptVersion:'test',reason:'Auditoria inicial.'};
  const remote={...view(s,1),role,room:{...view(s,1).room,proposal_review:initial}};
  const mock=t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>remote}) as Response);
  let rendered!:ReactTestRenderer;
  try{
   await act(async()=>{rendered=create(<App/>);});
   await act(async()=>rendered.root.findAllByType('button').find(b=>b.children.includes('Entrar com código'))!.props.onClick());
   const inputs=rendered.root.findAllByType('input');
   await act(async()=>{inputs[0].props.onChange({target:{value:remote.room.code}});inputs[1].props.onChange({target:{value:'synthetic-access-not-a-real-secret'}});});
   await act(async()=>rendered.root.findByType('form').props.onSubmit({preventDefault(){}}));
   assert.equal(JSON.stringify(rendered.toJSON()).includes('PARECER_PRELIMINAR_RESERVADO'),role==='moderator');
  }finally{if(rendered)await act(async()=>rendered.unmount());mock.mock.restore();}
 }
 const approved=state(),p=approved.proposals[0];
 p.intervention={kind:'APROVACAO_HUMANA',source:'RASCUNHO_INICIAL',sourceId:p.id,original:p.content,published:p.content,changes:[],reason:'Aprovação inicial simples.',at:p.createdAt,actor:'moderator'};
 const edited=createState(randomUUID(),{...proposal,text:'Edição efetiva inicial.'},approved.participants,{result:initial,status:'OK',model:'synthetic',promptVersion:'test',reason:'Ajuste humano.'},proposal);
 const rewritten=createState(randomUUID(),{...proposal,text:initial.suggestedRewrite},approved.participants,{result:initial,status:'OK',model:'synthetic',promptVersion:'test',reason:'Reformulação adotada.',appliedRewrite:true},proposal);
 for(const [s,visible,expected] of [[approved,false,''],[edited,true,'Proposta revisada pelo moderador'],[rewritten,true,'Texto sugerido pela IA e aprovado sem alteração.']] as const){
  let rendered!:ReactTestRenderer;
  try{
   await act(async()=>{rendered=create(<RoomWorkspace session={{code:'A123456789',credential:'synthetic-token',view:view(s,1)}} busy={false} act={async f=>{await f();}} onRefresh={async()=>{}}/>);});
   const output=JSON.stringify(rendered.toJSON());
   assert.equal(output.includes('Comparar versão original e publicada'),visible);
   assert.equal(output.includes('Comparar revisão humana desta versão'),visible);
   if(expected)assert.ok(output.includes(expected));
  }finally{if(rendered)await act(async()=>rendered.unmount());}
 }
});
