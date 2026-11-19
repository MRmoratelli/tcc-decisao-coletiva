// Synthetic fixtures only. No provider calls and no real source attribution.
import {FACTUAL_MODEL,FACTUAL_VERSION,type AtomicClaim,type TavilyReport} from '../shared/factual.js';
import {normalizeTavily} from './tavily.js';
import {interpretEvidence} from './factual.js';
export const syntheticNow=Date.parse('2026-11-19T15:00:00Z');
export const fact:AtomicClaim={text:'A Lua é um satélite natural da Terra.',originalExcerpt:'A Lua é um satélite natural da Terra.',kind:'FATO_VERIFICAVEL',query:'Lua satélite natural Terra NASA',timeSensitive:false,reason:'Fato público de teste.'};
export const excerpt='FONTE EXCLUSIVAMENTE SINTÉTICA: A Lua é um satélite natural da Terra. Não é uma estrela.';
export const rawResults=(date?:string)=>({request_id:'synthetic-tavily-request',response_time:0.01,usage:{credits:1},results:[{title:'Fonte fictícia para teste sem rede',url:'https://example.org/synthetic-source',content:excerpt,score:0.95,...(date?{published_date:date}:{})}]});
export const retrieved=(date?:string)=>normalizeTavily(rawResults(date),fact.query,new Date(syntheticNow).toISOString());
export const verdict=(status='EVIDENCIA_FAVORAVEL',extra:object={})=>({text:JSON.stringify({status,explanation:'Interpretação exclusivamente sintética dos trechos de teste.',scopeMatches:true,evidenceLinks:[{sourceId:'S1',quote:'A Lua é um satélite natural da Terra.',relation:status==='EVIDENCIA_CONTRARIA'?'CONTRADICTS':'SUPPORTS',explanation:'Relação simulada apenas para validar o contrato.'}],uncertainties:['Fixture sem recuperação real.'],...extra}),modelVersion:FACTUAL_MODEL});
export function syntheticReport(text=fact.text):TavilyReport{return {originalText:text,model:FACTUAL_MODEL,version:FACTUAL_VERSION,retrievalProvider:'TAVILY',classificationModel:FACTUAL_MODEL,createdAt:new Date().toISOString(),provenance:'SYNTHETIC_TEST',claims:[interpretEvidence({...fact,text,originalExcerpt:text},retrieved(),verdict(),new Date(syntheticNow).toISOString())]};}
