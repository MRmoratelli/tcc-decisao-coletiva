import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {randomUUID} from 'node:crypto';
import {RoomWorkspace} from './components/RoomWorkspace';
import {createState,currentRound,currentProposal,vote,addAnalysis,addSynthesis,publish} from '../server/domain';
import {FakeAI,proposal} from '../server/fixtures';
import type {RoomView} from './api';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function fixture(role:'participant'|'moderator'):RoomView{
 const state=createState(randomUUID(),proposal,[{id:randomUUID(),alias:'P01'},{id:randomUUID(),alias:'P02'}],{result:null,status:'IGNORADA',model:'none',promptVersion:'test',reason:'Synthetic'});state.votingMode='BINARY';
 return {state,revision:1,role,participantId:role==='participant'?state.participants[0].id:null,alias:role==='participant'?'P01':null,room:{id:state.decision.id,code:'ABCDEF1234',topic:proposal.title,proposal:proposal.text,proposal_review:null},canViewGroup:role==='moderator',positions:[],metrics:null,contributions:[]};
}
const session=(view:RoomView)=>({view,code:view.room.code,credential:'synthetic-private-test'});
const labelText=(n:any):string=>typeof n==='string'?n:(n.children??[]).map(labelText).join(' ');
test('Acceptance has no argument, consent or AI controls and sends only an unconditional vote',async t=>{
 const v=fixture('participant'),calls:any[]=[];
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL,init?:RequestInit)=>{calls.push({url:String(url),body:JSON.parse(String(init?.body))});return {ok:true,json:async()=>({saved:true})} as Response;});
 let ui!:ReactTestRenderer;await act(async()=>{ui=create(<RoomWorkspace session={session(v)} busy={false} act={async f=>f()} onRefresh={async()=>{}}/>);});
 assert.equal(ui.root.findAllByType('textarea').length,0);assert.equal(ui.root.findAllByType('input').filter(x=>x.props.type==='checkbox').length,0);
 await act(async()=>ui.root.findAllByType('select')[0].props.onChange({target:{value:'REJEITO'}}));
 const argument=ui.root.findAllByType('textarea').find(x=>x.props.rows===5)!;
 await act(async()=>argument.props.onChange({target:{value:'My rejection draft remains private.'}}));
 await act(async()=>ui.root.findAllByType('select')[0].props.onChange({target:{value:'ACEITO'}}));
 assert.equal(ui.root.findAllByType('textarea').filter(x=>x.props.rows===5).length,0);
 await act(async()=>ui.root.findAllByType('button').find(x=>x.children.join('')==='Registrar ACEITO')!.props.onClick());
 assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/votes'));assert.equal(calls[0].body.justification,'');assert.equal(calls[0].body.receipt,undefined);assert.equal(calls[0].body.originalText,undefined);
 await act(async()=>ui.unmount());
});
test('Current vote V2, summary round2 and draft V3 are labelled separately; past synthesis stays in history; editor and comparison are unique',async()=>{
 const v=fixture('moderator'),s=v.state,ai=new FakeAI();
 for(let n=0;n<2;n++){
  const r=currentRound(s);vote(s,s.participants[0].id,r.id,r.proposalId,'REJEITO','Synthetic deadline objection '+n);vote(s,s.participants[1].id,r.id,r.proposalId,'ACEITO','');
  const a=addAnalysis(s,await ai.analyzeObjections(currentProposal(s).content,s.votes.filter(x=>x.roundId===r.id)),'synthetic','test');
  const x=addSynthesis(s,a.id,await ai.synthesizeProposal(currentProposal(s).content,a.result),'synthetic','test');
  if(n===0)publish(s,{...x.result.revisedProposal,text:'Current published proposal with a moderator adjustment.'},currentProposal(s).id,'Explained moderator adjustment.',x.id);
 }
 let ui!:ReactTestRenderer;await act(async()=>{ui=create(<RoomWorkspace session={session(v)} busy={false} act={async f=>f()} onRefresh={async()=>{}}/>);});
 const active=ui.root.findByProps({'aria-label':'Proposta vigente e votação'}),next=ui.root.findByProps({'aria-label':'Próxima proposta'});
 assert.match(labelText(active).replace(/\s+/g,' '),/Proposta em votação.*V 2.*Rodada 2/);assert.match(labelText(next).replace(/\s+/g,' '),/rascunho V 3/);
 assert.ok(labelText(next).includes('P01 — rejeição'));assert.ok(!labelText(next).includes(s.votes[0].id));assert.ok(!labelText(next).includes(s.syntheses[0].id));
 assert.equal(ui.root.findAllByType('button').filter(x=>x.children.includes('Revisar nova proposta')).length,1);
 assert.ok(!JSON.stringify(ui.toJSON()).includes('Avaliação humana da síntese'));
 const original=s.proposals[1].intervention!.changes[0].before;
 assert.equal(active.findAllByType('blockquote').filter(x=>labelText(x)===original).length,1);
 await act(async()=>ui.root.findAllByType('button').find(x=>x.children.includes('Revisar nova proposta'))!.props.onClick());
 assert.equal(ui.root.findAllByType('textarea').filter(x=>x.props.value===s.syntheses[1].result.revisedProposal.text).length,1);
 await act(async()=>ui.unmount());
});
