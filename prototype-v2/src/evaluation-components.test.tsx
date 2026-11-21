import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {EvaluationForm} from './components/EvaluationForm.js';
import {NATURALISTIC_VERSION} from '../shared/instrument.js';
test('React DSR: all 22 items, four open questions, voluntary omissions and explicit N/A; no neutral defaults',async()=>{
 let tree!:ReactTestRenderer,submitted:any;
 await act(async()=>{tree=create(<EvaluationForm busy={false} onSubmit={async value=>{submitted=value;}}/>);});
 const selects=tree.root.findAllByType('select');assert.equal(selects.length,22);assert.equal(tree.root.findAllByType('textarea').length,4);assert.ok(selects.every(s=>s.props.value===''));
 const text=JSON.stringify(tree.toJSON());assert.match(text,/canal oficial/);assert.match(text,/voluntário/);assert.doesNotMatch(text,/sujeita à revisão/);assert.match(text,/usos futuros/);assert.match(text,/N\/A/);
 await act(async()=>{selects[4].props.onChange({target:{value:'N/A'}});});await act(async()=>{tree.root.findAllByType('input')[0].props.onChange({target:{checked:true}});});
 await act(async()=>{await tree.root.findByType('form').props.onSubmit({preventDefault(){}});});
 assert.equal(submitted.instrumentVersion,NATURALISTIC_VERSION);assert.equal(submitted.answers[4],'N/A');assert.equal(submitted.answers[0],null);assert.equal(submitted.open[3],'');await act(async()=>tree.unmount());
});
