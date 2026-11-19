// Entire file uses synthetic provider responses. No external API calls or user data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FactualService,normalizeGrounding,type FactualTransport } from './factual.js';
import { FACTUAL_MODEL,type AtomicClaim } from '../shared/factual.js';
export const syntheticNow=Date.parse('2026-11-19T03:00:00Z');
export const fact:AtomicClaim={text:'A afirmação pública de teste é correta.',originalExcerpt:'A afirmação pública de teste é correta.',kind:'FATO_VERIFICAVEL',query:'Afirmação pública de teste',timeSensitive:false,reason:'Fato público sintético.'};
export function grounded(status='EVIDENCIA_FAVORAVEL',date?:string){
 const text='ESTADO: '+status+'\nEXPLICAÇÃO: Evidência inteiramente sintética vinculada à alegação de teste.';
 return {text,modelVersion:FACTUAL_MODEL,candidates:[{groundingMetadata:{groundingChunks:[{web:{uri:'https://example.org/synthetic-source',title:'Fonte fictícia para teste automatizado',...(date?{publicationTime:date}:{})}}],groundingSupports:[{segment:{text:'Evidência inteiramente sintética vinculada à alegação de teste.'},groundingChunkIndices:[0]}],webSearchQueries:['consulta sintética sem rede'],searchEntryPoint:{renderedContent:'<div>Google Search suggestions — fixture sintética sem rede</div>'}}}]};
}
const service=(transport:FactualTransport,extra:object={})=>new FactualService({enabled:true,freeTierConfirmed:true,transport,now:()=>syntheticNow,maxDailyCalls:40,maxMinuteCalls:40,...extra});
test('Factual 01/02: suporte favorável e contrário exige vínculos reais de metadados (fixtures)',()=>{
 for(const status of ['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA']){const r=normalizeGrounding(fact,grounded(status),new Date(syntheticNow).toISOString());assert.equal(r.status,status);assert.equal(r.sources.length,1);assert.equal(r.supports[0].sourceIds[0],r.sources[0].id);assert.equal(r.sources[0].publishedAt,null);}
});
test('Factual 03/07: fonte escrita pelo modelo, sem metadados, não confirma alegação',()=>{
 const r=normalizeGrounding(fact,{text:'ESTADO: EVIDENCIA_FAVORAVEL\nFonte alegada: https://example.org/model-invention'});assert.equal(r.status,'EVIDENCIA_INSUFICIENTE');assert.equal(r.sources.length,0);
 const bad=grounded();bad.candidates[0].groundingMetadata.groundingSupports[0].segment.text='Trecho que não pertence à resposta';assert.equal(normalizeGrounding(fact,bad).status,'EVIDENCIA_INSUFICIENTE');
});
test('Factual 04: preferência e restrição pessoal não disparam rede nem classificação',async()=>{
 let calls=0;const s=service(async()=>{calls++;throw Error();});
 for(const text of ['Eu prefiro churrasco no sábado.','Eu não posso comer este alimento.']){const r=await s.check(text,'room');assert.equal(r.claims[0].status,'NAO_VERIFICAVEL');assert.equal(calls,0);}
});
test('Factual 05: evento, preço efetivo e nexo causal são resultados independentes',async()=>{
 const text='O dólar subiu e por isso o preço da carne aumentou.';
 const claims=[{...fact,text:'O dólar subiu.',originalExcerpt:'O dólar subiu'},{...fact,text:'O preço da carne aumentou.',originalExcerpt:'o preço da carne aumentou'},{...fact,text:'O dólar causou o aumento da carne.',originalExcerpt:'por isso'}];let searches=0;
 const s=service(async mode=>mode==='classify'?{text:JSON.stringify({claims})}:grounded(['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE'][searches++]));
 const r=await s.check(text,'room');assert.equal(r.claims.length,3);assert.deepEqual(r.claims.map(c=>c.status),['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE']);assert.equal(searches,3);
});
test('Factual 06: data antiga ou ausente não comprova atualidade; data não é inventada',()=>{
 const claim={...fact,timeSensitive:true},at=new Date(syntheticNow).toISOString();
 assert.equal(normalizeGrounding(claim,grounded('EVIDENCIA_FAVORAVEL','2020-01-01T00:00:00Z'),at).status,'EVIDENCIA_INSUFICIENTE');
 assert.equal(normalizeGrounding(claim,grounded(),at).status,'EVIDENCIA_INSUFICIENTE');
 assert.equal(normalizeGrounding(claim,grounded('EVIDENCIA_FAVORAVEL','2026-11-19T00:00:00Z'),at).status,'EVIDENCIA_FAVORAVEL');
});
test('Factual 08/09: falha, quota e desativação não viram sucesso',async()=>{
 for(const status of [429,403,404,503]){const s=service(async mode=>{if(mode==='classify')return {text:JSON.stringify({claims:[fact]})};throw {status};});assert.equal((await s.check(fact.text,'r')).claims[0].status,'VERIFICACAO_INDISPONIVEL');}
 const s=service(async()=>({text:JSON.stringify({claims:[fact]})}),{maxDailyCalls:1});assert.equal((await s.check(fact.text,'r')).claims[0].failureCode,'LOCAL_QUOTA_LIMIT');
 const off=service(async()=>{throw Error('Must not call');},{freeTierConfirmed:false});assert.equal((await off.check(fact.text,'r')).claims[0].failureCode,'FREE_TIER_NOT_CONFIRMED');
});
test('Factual: cache deduplica consultas simultâneas sem cruzar salas',async()=>{
 let calls=0;const s=service(async mode=>{calls++;await new Promise(r=>setTimeout(r,5));return mode==='classify'?{text:JSON.stringify({claims:[fact]})}:grounded();});
 const rows=await Promise.all(Array.from({length:10},()=>s.check(fact.text,'room-one')));assert.equal(calls,2);assert.equal(rows[0].provenance,'SYNTHETIC_TEST');
 await s.check(fact.text,'room-two');assert.equal(calls,4);
});
test('Factual: recusas de URL interna, identificação privada e omissão das sugestões obrigatórias',async()=>{
 const bad=grounded();bad.candidates[0].groundingMetadata.groundingChunks[0].web.uri='https://127.0.0.1/private';assert.equal(normalizeGrounding(fact,bad).sources.length,0);
 const missing=grounded();missing.candidates[0].groundingMetadata.searchEntryPoint.renderedContent='';assert.equal(normalizeGrounding(fact,missing).status,'EVIDENCIA_INSUFICIENTE');
 let calls=0;const s=service(async()=>{calls++;throw Error();});await s.check('Meu contato é pessoa@example.org.','r');assert.equal(calls,0);
});
test('Factual: plano com trecho inventado não é enviado ao mecanismo de pesquisa',async()=>{
 let calls=0;const s=service(async()=>{calls++;return {text:JSON.stringify({claims:[{...fact,originalExcerpt:'Texto inexistente'}]})};});const r=await s.check(fact.text,'r');assert.equal(r.claims[0].failureCode,'INVALID_CLAIM_PLAN');assert.equal(calls,1);
});

test('Factual: preferência longa respeita os limites de armazenamento sem pesquisa',async()=>{let calls=0;const s=service(async()=>{calls++;throw Error();});const r=await s.check('Prefiro '+'carne '.repeat(180),'r');assert.equal(r.claims[0].status,'NAO_VERIFICAVEL');assert.equal(calls,0);assert.equal(r.provenance,'LOCAL_CLASSIFICATION');assert.ok(r.claims[0].claim.text.length<=700);});
