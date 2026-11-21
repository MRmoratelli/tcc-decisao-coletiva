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

test('503: duas falhas transitórias são recuperadas com backoff limitado e sem vazamento',async()=>{
 let calls=0;const delays:number[]=[],logs:unknown[]=[];
 const ai=new GeminiAdapter('synthetic',async()=>{calls++;if(calls<3)throw {status:503,message:'PRIVATE_PROVIDER_DETAIL'};return JSON.stringify(review);},{sleep:async ms=>{delays.push(ms);},random:()=>0,log:e=>logs.push(e)});
 assert.deepEqual(await ai.analyzeProposal(proposal),review);assert.equal(calls,3);
 assert.deepEqual(delays,[1000,2000]);assert.ok(JSON.stringify(logs).includes('AI_RECOVERED'));assert.ok(!JSON.stringify(logs).includes('PRIVATE_PROVIDER_DETAIL'));
});
test('503 persistente: três chamadas no máximo, status preservado e erro específico',async()=>{
 let calls=0;const ai=new GeminiAdapter('synthetic',async()=>{calls++;throw {status:503,message:'PRIVATE_PROVIDER_DETAIL'};},{sleep:async()=>{},random:()=>0,log:()=>{}});
 await assert.rejects(ai.analyzeProposal(proposal),(e:unknown)=>e instanceof AIUnavailable&&e.code==='PROVIDER_UNAVAILABLE'&&e.httpStatus===503&&e.attempts===3&&!e.message.includes('PRIVATE_PROVIDER_DETAIL'));
 assert.equal(calls,3);
});
test('Retry: erros de contrato, autenticação e quota não geram chamadas repetidas',async()=>{
 for(const status of [400,401,403,404,429]){
  let calls=0;const ai=new GeminiAdapter('synthetic',async()=>{calls++;throw {status,message:'PRIVATE'};},{sleep:async()=>{throw Error('should not wait');},log:()=>{}});
  await assert.rejects(ai.analyzeProposal(proposal),AIUnavailable);assert.equal(calls,1);
 }
 let calls=0;await assert.rejects(new GeminiAdapter('synthetic',async()=>{calls++;return '{}';}).analyzeProposal(proposal),AIUnavailable);assert.equal(calls,1);
});
test('Retry: orçamento total impede iniciar nova tentativa quando o prazo foi consumido',async()=>{
 let time=0,calls=0;const ai=new GeminiAdapter('synthetic',async()=>{calls++;time=59500;throw {status:503};},{now:()=>time,sleep:async()=>{throw Error('No retry budget');},random:()=>0,log:()=>{}});
 await assert.rejects(ai.analyzeProposal(proposal),(e:unknown)=>e instanceof AIUnavailable&&e.attempts===1);assert.equal(calls,1);
});
test('SDK real com HTTP simulado: 503 seguido de sucesso usa mesmo modelo e valida JSON',async t=>{
 const previous=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='synthetic-sdk-test-not-a-real-key';
 let calls=0;const urls:string[]=[];
 t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0])=>{
  calls++;urls.push(String(url));
  return new Response(JSON.stringify(calls===1?{error:{code:503,message:'synthetic outage',status:'UNAVAILABLE'}}:{candidates:[{content:{role:'model',parts:[{text:JSON.stringify(review)}]},finishReason:'STOP'}]}),{status:calls===1?503:200,headers:{'content-type':'application/json'}});
 });
 try{
  const ai=new GeminiAdapter('gemini-3.5-flash-lite',undefined,{sleep:async()=>{},random:()=>0,log:()=>{}});
  assert.deepEqual(await ai.analyzeProposal(proposal),review);assert.equal(calls,2);
  assert.ok(urls.every(u=>u.includes('gemini-3.5-flash-lite')));
 }finally{if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;}
});
