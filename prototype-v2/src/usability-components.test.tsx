import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {randomUUID} from 'node:crypto';
import App from './App';
import {RoomWorkspace} from './components/RoomWorkspace';
import {createState} from '../server/domain';
import {proposal,review} from '../server/fixtures';
import {RESEARCH_TEXT,RESEARCH_VERSION} from '../shared/research';
import type {RoomView} from './api';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const storage=new Map<string,string>();
Object.assign(globalThis,{localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});
const state=()=>createState(randomUUID(),proposal,[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}],{result:null,status:'IGNORADA',promptVersion:'test',model:'none',reason:'Teste'});
function view():RoomView{const s=state();return {revision:1,state:s,room:{id:s.decision.id,code:'A123456789',topic:proposal.title,proposal:proposal.text,proposal_review:null},role:'participant',participantId:s.participants[0].id,alias:'P01',canViewGroup:false,positions:[],contributions:[],metrics:null};}

test('Acesso: termo integral e caixa desmarcada; concordância vem antes da entrada e não cria voto',async t=>{
 storage.clear();const requests:any[]=[];const v=view();
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{
  const path=String(url),body=JSON.parse(String(init?.body));requests.push({path,body});
  return {ok:true,json:async()=>path.endsWith('/invitation')?{research:{version:RESEARCH_VERSION,text:RESEARCH_TEXT,source:'https://example.test/term'},participantCount:2,open:true}:path.endsWith('/join')?{alias:'P01'}:v} as Response;
 });
 let ui!:ReactTestRenderer;
 try{
  await act(async()=>{ui=create(<App/>);});
  assert.equal(ui.root.findAllByType('input').filter(i=>i.props.required).length,2); // title + count; proposal is textarea
  await act(async()=>ui.root.findAllByType('button').find(b=>b.children.includes('Participar de uma sala'))!.props.onClick());
  await act(async()=>ui.root.findAllByType('input')[0].props.onChange({target:{value:v.room.code}}));
  await act(async()=>ui.root.findAllByType('form')[0].props.onSubmit({preventDefault(){}}));
  assert.ok(JSON.stringify(ui.toJSON()).includes('Prazo de guarda'));
  assert.ok(!JSON.stringify(ui.toJSON()).includes('Sua manifestação'));
  const checkbox=ui.root.findAllByType('input').find(i=>i.props.type==='checkbox')!;
  assert.equal(checkbox.props.checked,false);
  const agree=()=>ui.root.findAllByType('button').find(b=>b.children.includes('Concordar e continuar'))!;
  assert.equal(agree().props.disabled,true);
  assert.ok(!requests.some(r=>r.path.endsWith('/join')));
  await act(async()=>checkbox.props.onChange({target:{checked:true}}));
  await act(async()=>agree().props.onClick());
  assert.ok(JSON.stringify(ui.toJSON()).includes('Sua manifestação'));
  const joined=requests.find(r=>r.path.endsWith('/join'));assert.equal(joined.body.consent,true);assert.equal(joined.body.version,RESEARCH_VERSION);
  assert.ok(storage.has('dc2-access-'+v.room.code));assert.ok(!requests.some(r=>r.path.endsWith('/votes')));
 }finally{await act(async()=>ui.unmount());}
});

test('Revisão: reformulação e descarte são escolhas anteriores ao único registro de posição',async t=>{
 const v=view(),requests:any[]=[];
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{
  requests.push({path:String(url),body:JSON.parse(String(init?.body))});
  return {ok:true,json:async()=>String(url).endsWith('/contribution-review')?{review,receipt:'original-receipt',rewriteReceipt:'rewrite-receipt'}:{saved:true}} as Response;
 });
 let ui!:ReactTestRenderer;
 const button=(label:string)=>ui.root.findAllByType('button').find(b=>b.children.join('')===label)!;
 try{
  await act(async()=>{ui=create(<RoomWorkspace session={{code:v.room.code,credential:'synthetic',view:v}} busy={false} act={async f=>{await f();}} onRefresh={async()=>{}}/>);});
  const text=()=>ui.root.findAllByType('textarea').find(t=>t.props.rows===5)!;
  await act(async()=>text().props.onChange({target:{value:'Precisamos rever o prazo.'}}));
  await act(async()=>ui.root.findAllByType('input').find(i=>i.props.type==='checkbox')!.props.onChange({target:{checked:true}}));
  await act(async()=>button('Revisar meu argumento com IA').props.onClick());
  await act(async()=>button('Usar reformulação da IA').props.onClick());
  assert.equal(text().props.value,review.suggestedRewrite);assert.equal(requests.length,1);
  await act(async()=>button('Descartar parecer da IA').props.onClick());
  assert.equal(text().props.value,'Precisamos rever o prazo.');assert.equal(requests.length,1);
  await act(async()=>button('Registrar ACEITO').props.onClick());
  assert.equal(requests.filter(r=>r.path.endsWith('/votes')).length,1);
  assert.equal(requests.at(-1).body.reviewChoice,'DISCARDED');assert.equal(requests.at(-1).body.justification,'Precisamos rever o prazo.');
 }finally{await act(async()=>ui.unmount());}
});

test('Revisão: editar argumento após o parecer exige nova análise e exibe rótulo correto',async t=>{
 const v=view();let ui!:ReactTestRenderer;
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({review,receipt:'test',rewriteReceipt:'rewrite'})}) as Response);
 try{
  await act(async()=>{ui=create(<RoomWorkspace session={{code:v.room.code,credential:'synthetic',view:v}} busy={false} act={async f=>{await f();}} onRefresh={async()=>{}}/>);});
  const text=()=>ui.root.findAllByType('textarea').find(t=>t.props.rows===5)!;
  await act(async()=>text().props.onChange({target:{value:'Primeiro argumento.'}}));
  await act(async()=>ui.root.findAllByType('input').find(i=>i.props.type==='checkbox')!.props.onChange({target:{checked:true}}));
  await act(async()=>ui.root.findAllByType('button').find(b=>b.children.join('')==='Revisar meu argumento com IA')!.props.onClick());
  await act(async()=>text().props.onChange({target:{value:'Argumento modificado.'}}));
  assert.ok(JSON.stringify(ui.toJSON()).includes('Revisar novamente com IA'));
  assert.ok(!JSON.stringify(ui.toJSON()).includes('Usar reformulação da IA'));
 }finally{await act(async()=>ui.unmount());}
});
