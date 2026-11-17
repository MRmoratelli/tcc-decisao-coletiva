import test from 'node:test';
import assert from 'node:assert/strict';
import { makeReceipt, verifyReceipt } from './receipts.js';

const key = 'segredo-de-teste-bastante-longo-e-exclusivo';
test('comprovante exige texto original sem modificação', () => {
  const receipt = makeReceipt(key, 'proposal', {topic: 'projeto', proposal: 'ideia'}, {summary: 'revisão'});
  assert.deepEqual(verifyReceipt(key, receipt, 'proposal', {topic: 'projeto', proposal: 'ideia'}), {summary: 'revisão'});
  assert.throws(() => verifyReceipt(key, receipt, 'proposal', {topic: 'projeto', proposal: 'ideia alterada'}));
  assert.throws(() => verifyReceipt(key, receipt, 'contribution', {topic: 'projeto', proposal: 'ideia'}));
});
test('comprovante recusa assinatura adulterada', () => {
  const original = makeReceipt(key, 'contribution', {code:'123', text:'olá'}, {summary: 'revisão'});
  assert.throws(() => verifyReceipt(key, original.slice(0,-1) + (original.endsWith('a') ? 'b':'a'), 'contribution', {code:'123', text:'olá'}));
});
