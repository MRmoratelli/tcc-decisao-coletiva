import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiAdapter,AIUnavailable } from './ai.js';
import { proposal,review,FakeAI,jsonAdapter } from './fixtures.js';
test('02 parecer de proposta validado e consultivo, sem alegar fonte externa',async()=>{const ai=jsonAdapter(review),result=await ai.analyzeProposal(proposal);assert.equal(result.assertions[0].status,'COMPATIVEL_COM_CONTEXTO');assert.ok(result.limitations.length);});
test('06 analyzeContribution identifica alegação sem checagem factual',async()=>{const result=await jsonAdapter({...review,assertions:[{text:'Ganhará 80% de eficiência',status:'PRECISA_DE_FONTE',note:'Solicite evidência'}]}).analyzeContribution(proposal,'Ganhará 80% de eficiência');assert.equal(result.assertions[0].status,'PRECISA_DE_FONTE');});
test('17 adaptador rejeita JSON inválido, campos ausentes, fatos falsamente confirmados e erro de transporte',async()=>{for(const body of ['{invalido','{}',JSON.stringify({...review,assertions:[{text:'Fato',status:'CONFIRMADO_POR_FONTE',note:'inventada'}]})]){await assert.rejects(new GeminiAdapter('fake',async()=>body).analyzeProposal(proposal),AIUnavailable);}await assert.rejects(new GeminiAdapter('fake',async()=>{throw new Error('privado');}).analyzeProposal(proposal),AIUnavailable);});
test('12-13 contratos de análise e síntese passam por schema',async()=>{const fake=new FakeAI(),a=await fake.analyzeObjections(proposal,[]),s=await fake.synthesizeProposal(proposal,a);assert.deepEqual(await jsonAdapter(a).analyzeObjections(proposal,[]),a);assert.deepEqual(await jsonAdapter(s).synthesizeProposal(proposal,a),s);});

test('integração: códigos HTTP são categorizados com falhas simuladas sem expor mensagem privada',async()=>{
 for(const [status,code] of [[400,'REQUEST_REJECTED'],[429,'RATE_LIMIT'],[403,'AUTHENTICATION'],[404,'MODEL_UNAVAILABLE'],[504,'TIMEOUT']] as const){
  const ai=new GeminiAdapter('synthetic',async()=>{throw {status,message:'SECRET_MUST_NOT_APPEAR'};});
  await assert.rejects(ai.analyzeProposal(proposal),(e:unknown)=>e instanceof AIUnavailable&&e.code===code&&e.httpStatus===status&&!e.message.includes('SECRET_MUST_NOT_APPEAR'));
 }
});
test('Gramática simplificada preserva limites completos do contrato após geração',async()=>{
 const fake=new FakeAI(),valid=await fake.analyzeObjections(proposal,[]);
 assert.deepEqual(await jsonAdapter(valid).analyzeObjections(proposal,[]),valid);
 await assert.rejects(jsonAdapter({...valid,sharedInterests:Array(51).fill('excesso')}).analyzeObjections(proposal,[]),(e:unknown)=>e instanceof AIUnavailable&&e.code==='INVALID_SCHEMA');
 await assert.rejects(new GeminiAdapter('synthetic',async()=>{throw {status:400,message:'schema produces a constraint with too many states for serving PRIVATE_DATA'};}).analyzeProposal(proposal),(e:unknown)=>e instanceof AIUnavailable&&e.code==='SCHEMA_COMPLEXITY'&&!e.message.includes('PRIVATE_DATA'));
});
