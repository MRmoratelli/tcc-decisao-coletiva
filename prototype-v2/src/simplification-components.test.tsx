import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {randomUUID} from 'node:crypto';
import {RoomWorkspace} from './components/RoomWorkspace';
import {createState,currentRound,vote,addAnalysis,addSynthesis} from '../server/domain';
import {FakeAI,proposal} from '../server/fixtures';
import type {RoomView} from './api';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function fixture(role:'moderator'|'participant'='moderator'):RoomView{
 const state=createState(randomUUID(),proposal,[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}],{result:null,status:'IGNORADA',model:'none',promptVersion:'test',reason:'Synthetic'});
 state.votingMode='BINARY';state.enrollment={mode:'SELF',claims:[],automaticMediation:true};
 return {state,revision:1,role,participantId:role==='participant'?state.participants[0].id:null,alias:role==='participant'?'P01':null,room:{id:state.decision.id,code:'ABCDEF1234',topic:proposal.title,proposal:proposal.text,proposal_review:null},canViewGroup:true,positions:[],metrics:null,contributions:[]};
}
const session=(view:RoomView)=>({code:view.room.code,credential:'synthetic-private-token',view});
test('Moderator stages hide future publication until a synthesis is ready and allow explicit manual intervention',async()=>{
 const v=fixture();let ui!:ReactTestRenderer;
 await act(async()=>{ui=create(<RoomWorkspace session={session(v)} busy={false} act={async f=>f()} onRefresh={async()=>{}}/>);});
 assert.equal(ui.root.findAllByType('textarea').filter(x=>x.props.value===proposal.text).length,0);
 assert.ok(JSON.stringify(ui.toJSON()).includes('Aguardando 2'));
 await act(async()=>ui.root.findAllByType('button').find(x=>x.children.includes('Abrir revisão manual'))!.props.onClick());
 assert.ok(JSON.stringify(ui.toJSON()).includes('Publicar proposta e abrir próxima rodada'));
 await act(async()=>ui.unmount());
});
test('Participant has only two vote options and an individual cooldown survives a fresh component',async()=>{
 const v=fixture('participant');v.state.reviewRequests=[{participantId:v.participantId!,requestId:randomUUID(),at:new Date().toISOString(),textHash:'synthetic',proposalId:v.state.proposals[0].id,roundId:v.state.rounds[0].id,status:'DONE'}];
 let ui!:ReactTestRenderer;
 await act(async()=>{ui=create(<RoomWorkspace session={session(v)} busy={false} act={async f=>f()} onRefresh={async()=>{}}/>);});
 const options=ui.root.findAllByType('select')[0].findAllByType('option').map(x=>x.props.value);
 assert.deepEqual(options,['ACEITO','REJEITO']);
 assert.ok(JSON.stringify(ui.toJSON()).includes('Novo pedido de parecer disponível em'));
 assert.ok(!JSON.stringify(ui.toJSON()).includes('Pesquisa externa consultiva'));
 await act(async()=>ui.unmount());
});
