import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create,act, type ReactTestRenderer } from 'react-test-renderer';
import { ProposalEditor,emptyProposal } from './components/ProposalEditor';
import { EvaluationForm } from './components/EvaluationForm';
import { ReviewCard } from './components/ReviewCard';
import { RoomWorkspace } from './components/RoomWorkspace';
import App from './App';
import { createState,contribute,vote,currentRound } from '../server/domain';
import { randomUUID } from 'node:crypto';
import { proposal,review } from '../server/fixtures';
import type { RoomView } from './api';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
test('React: proposta estruturada mantém campos opcionais e texto ao editar',async()=>{
 let value=emptyProposal,rendered!:ReactTestRenderer;
 await act(async()=>{rendered=create(<ProposalEditor value={value} onChange={v=>{value=v;}}/>);});
 const title=rendered.root.findByType('input');await act(async()=>title.props.onChange({target:{value:'Prioridades'}}));assert.equal(value.title,'Prioridades');assert.equal(value.constraints,'');assert.equal(rendered.root.findAllByType('textarea').length,8);await act(async()=>rendered.unmount());
});
test('React: questionário conserva 22 itens, quatro abertas e separa N/A de ausência',async()=>{
 let output:any,rendered!:ReactTestRenderer;
 await act(async()=>{rendered=create(<EvaluationForm busy={false} onSubmit={async v=>{output=v;}}/>);});
 assert.equal(rendered.root.findAllByType('select').length,22);assert.equal(rendered.root.findAllByType('textarea').length,4);
 const selects=rendered.root.findAllByType('select');
 await act(async()=>selects[0].props.onChange({target:{value:'5'}}));await act(async()=>selects[1].props.onChange({target:{value:'N/A'}}));
 await act(async()=>rendered.root.findByType('input').props.onChange({target:{checked:true}}));await act(async()=>rendered.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(output.answers[0],5);assert.equal(output.answers[1],'N/A');assert.equal(output.answers[2],null);assert.equal(output.open.length,4);await act(async()=>rendered.unmount());
});
test('React: parecer mostra incertezas e limitação factual, sem editar o texto',async()=>{
 let rendered!:ReactTestRenderer;await act(async()=>{rendered=create(<ReviewCard review={review} label="Parecer teste"/>);});const text=JSON.stringify(rendered.toJSON());assert.ok(text.includes('não é um julgamento definitivo'));assert.ok(text.includes('Sem consulta a fontes externas'));assert.ok(text.includes('Reformulação sugerida'));await act(async()=>rendered.unmount());
});
test('React: sala permite abstenção, parecer opcional e impede funções de moderador a participante',async()=>{
 const people=[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}];
 const state=createState(randomUUID(),proposal,people,{result:null,status:'IGNORADA',promptVersion:'test',model:'none',reason:'Teste'});
 const view:RoomView={revision:1,room:{id:state.decision.id,code:'A123456789',topic:proposal.title,proposal:proposal.text,proposal_review:null},role:'participant',alias:'P01',participantId:people[0].id,canViewGroup:false,state,positions:[{...people[0],choice:'PENDENTE'}],metrics:null,contributions:[]};
 let rendered!:ReactTestRenderer;await act(async()=>{rendered=create(<RoomWorkspace session={{code:view.room.code,credential:'synthetic-token',view}} busy={false} act={async f=>{await f();}} onRefresh={async()=>{}}/>);});
 assert.ok(JSON.stringify(rendered.toJSON()).includes('ABSTENHO'));assert.ok(JSON.stringify(rendered.toJSON()).includes('Continuar com meu texto sem parecer'));assert.ok(!JSON.stringify(rendered.toJSON()).includes('Confirmar revisão e publicar'));
 await act(async()=>rendered.update(<RoomWorkspace session={{code:view.room.code,credential:'synthetic-token',view}} busy={true} act={async f=>{await f();}} onRefresh={async()=>{}}/>));assert.ok(rendered.root.findAllByType('button').filter(b=>b.props.disabled===true).length>=3);await act(async()=>rendered.unmount());
});
test('React: entrada preservada com fluxo de criação e login por credenciais',async()=>{
 let rendered!:ReactTestRenderer;await act(async()=>{rendered=create(<App/>);});const text=JSON.stringify(rendered.toJSON());assert.ok(text.includes('Criar nova sala'));assert.ok(text.includes('Entrar com código'));assert.ok(text.includes('Restaurar processo'));assert.ok(!text.includes('Svelte'));await act(async()=>rendered.unmount());
});

test('React: não exibe voto justificado e sua contribuição técnica como duas manifestações',async()=>{
 const people=[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}];
 const record={result:review,status:'OK' as const,promptVersion:'test',model:'synthetic',reason:'',appliedRewrite:true};
 const state=createState(randomUUID(),proposal,people,record);
 const r=currentRound(state),phrase='Manifestação única vinculada ao voto';
 contribute(state,people[0].id,r.id,r.proposalId,phrase,'Texto original do participante',record,'');
 vote(state,people[0].id,r.id,r.proposalId,'ACEITO_COM_RESSALVAS',phrase);
 const view:RoomView={revision:3,room:{id:state.decision.id,code:'A123456789',topic:proposal.title,proposal:proposal.text,proposal_review:null},role:'moderator',alias:null,participantId:null,canViewGroup:true,state,positions:[{...people[0],choice:'ACEITO_COM_RESSALVAS'},{...people[1],choice:'PENDENTE'}],metrics:null,contributions:[]};
 let rendered!:ReactTestRenderer;
 await act(async()=>{rendered=create(<RoomWorkspace session={{code:view.room.code,credential:'synthetic-token',view}} busy={false} act={async f=>{await f();}} onRefresh={async()=>{}}/>);});
 const output=JSON.stringify(rendered.toJSON());
 assert.equal((output.match(/Manifestação única vinculada ao voto/g)??[]).length,1);
 assert.ok(output.includes('Reformulação sugerida pela IA aceita'));
 assert.ok(output.includes('Texto original do participante'));
 await act(async()=>rendered.unmount());
});
