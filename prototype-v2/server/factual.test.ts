// Every provider response in this suite is synthetic. No network or paid usage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FactualService,interpretEvidence,type GeminiFactualTransport} from './factual.js';
import {TavilySearchAdapter,SearchFailure,normalizeTavily,type SearchAdapter} from './tavily.js';
import {FACTUAL_MODEL,FACTUAL_VERSION,FactualReportSchema,soundEvidence} from '../shared/factual.js';
import {fact,excerpt,syntheticNow,rawResults,retrieved,verdict} from './factual-fixtures.js';
const at=new Date(syntheticNow).toISOString();
const service=(extra:object={})=>new FactualService({enabled:true,freeTierConfirmed:true,now:()=>syntheticNow,maxDailyGeminiCalls:100,maxMinuteGeminiCalls:100,maxDailySearches:100,maxMinuteSearches:100,search:{configured:true,synthetic:true,async search(){return retrieved();}},geminiTransport:async mode=>mode==='classify'?{text:JSON.stringify({claims:[fact]}),modelVersion:FACTUAL_MODEL}:verdict(),...extra});
test('Tavily: apenas Search básica fixa, três resultados, usage e nenhum segredo no registro',async()=>{
 let calls=0;const key='tvly-synthetic-secret-never-real';const adapter=new TavilySearchAdapter({apiKey:key,freePlanConfirmed:true,now:()=>syntheticNow,fetcher:async(url,init)=>{calls++;assert.equal(url,'https://api.tavily.com/search');assert.equal(init?.redirect,'error');assert.equal((init?.headers as any).Authorization,'Bearer '+key);const b=JSON.parse(init?.body as string);assert.equal(b.search_depth,'basic');assert.equal(b.auto_parameters,false);assert.equal(b.include_answer,false);assert.equal(b.include_raw_content,false);assert.equal(b.max_results,3);assert.equal(b.include_usage,true);assert.equal(b.include_published_date,true);return new Response(JSON.stringify(rawResults()),{status:200});}});
 const result=await adapter.search(fact.query,false);assert.equal(calls,1);assert.equal(result.retrieval.creditsUsed,1);assert.equal(result.sources[0].excerpt,excerpt);assert.equal(result.sources[0].score,0.95);assert.ok(!JSON.stringify(result).includes(key));assert.ok(!JSON.stringify(result).includes('groundingSupports'));assert.ok(!JSON.stringify(result).includes('searchEntryPoint'));
});
test('Tavily: URL interna, dados inválidos, duplicatas e data ausente não viram fontes inventadas',()=>{
 const raw=rawResults('Thu, 19 Nov 2026 12:00:00 GMT');raw.results.push({...raw.results[0],url:'https://127.0.0.1/private'});raw.results.push({...raw.results[0]});const r=normalizeTavily(raw,fact.query,at);assert.equal(r.sources.length,1);assert.equal(r.sources[0].publishedAtRaw,'Thu, 19 Nov 2026 12:00:00 GMT');assert.equal(r.sources[0].publishedAt,'2026-11-19T12:00:00.000Z');assert.equal(retrieved().sources[0].publishedAt,null);
});
test('Tavily: falhas, créditos e limite de tamanho são saneados e não repetem a chamada',async()=>{
 for(const status of [401,402,429,432,433,500]){let calls=0;const adapter=new TavilySearchAdapter({apiKey:'synthetic',freePlanConfirmed:true,fetcher:async()=>{calls++;return new Response('sensitive fake upstream body',{status});}});await assert.rejects(()=>adapter.search(fact.query,false),(e:unknown)=>e instanceof SearchFailure&&!e.message.includes('sensitive')&&(status!==432||e.code==='TAVILY_CREDIT_LIMIT'));assert.equal(calls,1);}
 const huge=new TavilySearchAdapter({apiKey:'synthetic',freePlanConfirmed:true,fetcher:async()=>new Response('x'.repeat(256001))});await assert.rejects(()=>huge.search(fact.query,false),/TAVILY_INVALID_OR_OVERSIZED_RESPONSE/);
 let calls=0;const off=new TavilySearchAdapter({apiKey:'synthetic',freePlanConfirmed:false,fetcher:async()=>{calls++;return new Response('{}');}});await assert.rejects(()=>off.search(fact.query,false),/TAVILY_FREE_PLAN_NOT_CONFIRMED/);assert.equal(calls,0);await assert.rejects(()=>off.search('https://localhost/private',false),/PRIVATE_OR_URL_QUERY_REJECTED/);
});
test('Factual 01/02/03: apoio, contradição e insuficiência dependem de interpretação e trechos',()=>{
 for(const status of ['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE']){const r=interpretEvidence(fact,retrieved(),verdict(status),at);assert.equal(r.status,status);assert.equal(r.sources[0].provider,'TAVILY');assert.equal(r.responseModel,FACTUAL_MODEL);}
 const bad=interpretEvidence(fact,retrieved(),verdict('EVIDENCIA_FAVORAVEL',{evidenceLinks:[{sourceId:'S99',quote:'Trecho inventado pelo modelo',relation:'SUPPORTS',explanation:'Inventado'}]}),at);assert.equal(bad.status,'EVIDENCIA_INSUFICIENTE');assert.equal(bad.evidenceLinks.length,0);
 assert.equal(interpretEvidence(fact,retrieved(),verdict('EVIDENCIA_FAVORAVEL',{scopeMatches:false}),at).status,'EVIDENCIA_INSUFICIENTE');
 assert.equal(interpretEvidence(fact,retrieved(),verdict('EVIDENCIA_FAVORAVEL',{evidenceLinks:[]}),at).status,'EVIDENCIA_INSUFICIENTE');
});
test('Factual: Gemini 3.5 classifica e interpreta resultados Tavily sem campos Google',async()=>{
 const r=await service().check(fact.text,'room');assert.equal(r.version,FACTUAL_VERSION);assert.equal(r.model,FACTUAL_MODEL);assert.equal(r.classificationModel,FACTUAL_MODEL);assert.equal(r.retrievalProvider,'TAVILY');assert.equal(r.provenance,'SYNTHETIC_TEST');assert.ok(soundEvidence(r));assert.equal(r.claims[0].status,'EVIDENCIA_FAVORAVEL');assert.ok(!('searchSuggestionHtml' in r.claims[0]));assert.ok(!('supports' in r.claims[0]));
});
test('Factual 04: preferência e restrição individual não são transmitidas nem pesquisadas',async()=>{
 let calls=0;const s=service({geminiTransport:async()=>{calls++;throw Error();},search:{configured:true,async search(){calls++;throw Error();}}});for(const text of ['Prefiro legumes grelhados.','Eu não posso comer este alimento.','Meu contato é pessoa@example.org.']){assert.equal((await s.check(text,'r')).claims[0].status,'NAO_VERIFICAVEL');assert.equal(calls,0);}
});
test('Factual: opinião e hipótese classificadas não acionam Tavily',async()=>{
 for(const kind of ['OPINIAO','HIPOTESE','INFORMACAO_INSUFICIENTE']){let searches=0;const s=service({geminiTransport:async()=>({text:JSON.stringify({claims:[{...fact,kind,query:''}]})}),search:{configured:true,async search(){searches++;throw Error();}}});assert.equal((await s.check(fact.text,'r')).claims[0].status,'NAO_VERIFICAVEL');assert.equal(searches,0);}
});
test('Factual 05: evento, preço e nexo causal têm consultas e interpretações independentes',async()=>{
 const text='O dólar subiu e por isso o preço da carne aumentou.',claims=[{...fact,text:'O dólar subiu.',originalExcerpt:'O dólar subiu'},{...fact,text:'O preço da carne aumentou.',originalExcerpt:'o preço da carne aumentou'},{...fact,text:'O dólar causou o aumento.',originalExcerpt:'por isso'}];let searches=0,interpretations=0;
 const s=service({search:{configured:true,async search(){searches++;return retrieved();}},geminiTransport:async(mode:'classify'|'interpret')=>mode==='classify'?{text:JSON.stringify({claims})}:verdict(['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE'][interpretations++])});const r=await s.check(text,'r');assert.equal(searches,3);assert.equal(interpretations,3);assert.deepEqual(r.claims.map(c=>c.status),['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE']);
});
test('Factual 06: fonte antiga ou sem data não comprova preço atual; data não é inventada',()=>{
 const claim={...fact,timeSensitive:true};for(const date of ['2020-01-01T00:00:00Z',undefined])assert.equal(interpretEvidence(claim,retrieved(date),verdict(),at).status,'EVIDENCIA_INSUFICIENTE');assert.equal(interpretEvidence(claim,retrieved('2026-11-19T12:00:00Z'),verdict(),at).status,'EVIDENCIA_FAVORAVEL');
});
test('Factual 07: nenhuma fonte encontrada não aciona interpretação nem gera confirmação',async()=>{
 let interpretations=0;const s=service({search:{configured:true,async search(){return normalizeTavily({results:[],usage:{credits:1}},fact.query,at);}},geminiTransport:async(mode:'classify'|'interpret')=>{if(mode==='interpret')interpretations++;return {text:JSON.stringify({claims:[fact]})};}});const r=await s.check(fact.text,'r');assert.equal(r.claims[0].status,'EVIDENCIA_INSUFICIENTE');assert.equal(r.claims[0].retrieval?.creditsUsed,1);assert.equal(interpretations,0);
});
test('Factual 08/09: falha Tavily, créditos, limites locais e falha Gemini não simulam sucesso',async()=>{
 for(const code of ['TAVILY_API_FAILURE','TAVILY_CREDIT_LIMIT','TAVILY_RATE_LIMIT']){const s=service({search:{configured:true,async search(){throw new SearchFailure(code);}}});assert.equal((await s.check(fact.text,'r')).claims[0].failureCode,code);}
 assert.equal((await service({maxDailySearches:0}).check(fact.text,'r')).claims[0].failureCode,'LOCAL_SEARCH_LIMIT');
 const quota=await service({maxDailyGeminiCalls:1}).check(fact.text,'r');assert.equal(quota.claims[0].failureCode,'LOCAL_GEMINI_LIMIT');assert.equal(quota.claims[0].sources.length,1);assert.equal(quota.claims[0].retrieval?.creditsUsed,1);
 const off=await service({freeTierConfirmed:false}).check(fact.text,'r');assert.equal(off.claims[0].failureCode,'FREE_TIER_NOT_CONFIRMED');
});
test('Factual: cache de dez consultas simultâneas usa uma busca e não cruza salas',async()=>{
 let searches=0,gemini=0;const s=service({search:{configured:true,async search(){searches++;return retrieved();}},geminiTransport:async(mode:'classify'|'interpret')=>{gemini++;return mode==='classify'?{text:JSON.stringify({claims:[fact]})}:verdict();}});await Promise.all(Array.from({length:10},()=>s.check(fact.text,'room-one')));assert.equal(searches,1);assert.equal(gemini,2);await s.check(fact.text,'room-two');assert.equal(searches,2);assert.equal(gemini,4);
});
test('Factual: trechos originais ou consultas privadas inventados são recusados antes de Tavily',async()=>{
 for(const change of [{originalExcerpt:'Texto inexistente'},{query:'contato pessoa@example.org'}]){let calls=0;const s=service({geminiTransport:async()=>({text:JSON.stringify({claims:[{...fact,...change}]})}),search:{configured:true,async search(){calls++;throw Error();}}});assert.equal((await s.check(fact.text,'r')).claims[0].failureCode,'INVALID_CLAIM_PLAN');assert.equal(calls,0);}
});
test('Factual: registros Google históricos continuam legíveis sem conversão artificial para Tavily',async()=>{
 const exported=JSON.parse(await readFile(new URL('../docs/evidence/FACTUAL_SESSION_SYNTHETIC.json',import.meta.url),'utf8'));for(const legacy of exported.state.factualChecks){const parsed=FactualReportSchema.parse(legacy);assert.equal(parsed.version,'factual-grounding-v1.0');assert.equal(parsed.model,'gemini-2.5-flash-lite');assert.ok(soundEvidence(parsed));assert.ok(!('retrievalProvider' in parsed));}
});

test('Factual: uma preferência ou restrição misturada a causa factual não encobre o fato',async()=>{
 for(const text of ['Prefiro menos carne porque o dólar subiu.','Não posso comprar carne porque o dólar subiu.']){let searches=0;const claims=[{...fact,text:'O dólar subiu.',originalExcerpt:'o dólar subiu',query:'cotação dólar período informado'}];const s=service({geminiTransport:async(mode:'classify'|'interpret')=>mode==='classify'?{text:JSON.stringify({claims})}:verdict('EVIDENCIA_INSUFICIENTE'),search:{configured:true,async search(){searches++;return retrieved();}}});const r=await s.check(text,'room');assert.equal(searches,1);assert.equal(r.claims[0].claim.kind,'FATO_VERIFICAVEL');}
});
