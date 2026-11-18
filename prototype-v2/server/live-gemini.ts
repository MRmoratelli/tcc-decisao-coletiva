import 'dotenv/config';
import { mkdir,writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { GeminiAdapter,AIUnavailable,PROMPT_VERSION } from './ai.js';
import { ProposalSchema } from '../shared/contracts.js';
import { createState,addAnalysis,addSynthesis,vote,currentRound,currentProposal } from './domain.js';
const report:any={type:'TESTE_TECNICO_SINTETICO',at:new Date().toISOString(),providerTarget:'Gemini',validationMode:'LIVE_ONLY_NO_MOCK',model:process.env.GEMINI_MODEL??'gemini-3.5-flash-lite',promptVersion:PROMPT_VERSION,calls:[],scientificResults:false};
const directory=new URL('../docs/evidence/',import.meta.url);await mkdir(directory,{recursive:true});
if(!process.env.GEMINI_API_KEY){report.status='BLOQUEADO';report.reason='NEW_API_KEY_NOT_CONFIGURED';}
else if(process.env.ALLOW_LIVE_GEMINI_TEST!=='true'){report.status='BLOQUEADO';report.reason='EXPLICIT_LIVE_TEST_FLAG_REQUIRED';}
else{
 const adapter=new GeminiAdapter(report.model);
 async function observed(name:string,work:()=>Promise<unknown>){const start=Date.now();try{const result=await work();report.calls.push({contract:name,status:'OK',durationMs:Date.now()-start});return result;}catch(e){report.calls.push({contract:name,status:'FAIL',durationMs:Date.now()-start,code:e instanceof AIUnavailable?e.code:'UNEXPECTED',httpStatus:e instanceof AIUnavailable?e.httpStatus:undefined});throw e;}}
 try{
  const client=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{timeout:30000}});
  await client.models.get({model:report.model});report.modelMetadataAvailable=true;
  const proposal=ProposalSchema.parse({title:'[SINTÉTICO] Prioridades de projeto colaborativo',problem:'Um projeto fictício possui prazos, capacidade e interesses divergentes.',decision:'Definir prioridades provisórias com revisão de prazo.',text:'Priorizar acessibilidade e depois avaliar novas funcionalidades.',goals:'Verificar quatro contratos reais, sem participantes ou resultados científicos.',constraints:'Somente dados fictícios; cenário científico não definido.'});
  const initial=await observed('analyzeProposal',()=>adapter.analyzeProposal(proposal)) as Awaited<ReturnType<typeof adapter.analyzeProposal>>;
  const contribution=await observed('analyzeContribution',()=>adapter.analyzeContribution(proposal,'A dependência externa pode levar quinze dias, mas não apresentei uma fonte para essa estimativa.'));
  const participants=Array.from({length:3},(_,i)=>({id:randomUUID(),alias:'P0'+(i+1)})),state=createState(randomUUID(),proposal,participants,{result:initial,status:'OK',promptVersion:PROMPT_VERSION,model:adapter.model,reason:'Teste técnico real com dados sintéticos.'});
  const r=currentRound(state),p=currentProposal(state);
  vote(state,participants[0].id,r.id,p.id,'REJEITO','Solicito uma etapa explícita de validação de acessibilidade antes da entrega.');
  vote(state,participants[1].id,r.id,p.id,'REJEITO','Uma dependência externa possui prazo incerto; solicito um marco de revisão antes de avançar.');
  const assessment=await observed('analyzeObjections',()=>adapter.analyzeObjections(proposal,state.votes)) as Awaited<ReturnType<typeof adapter.analyzeObjections>>;
  const analysis=addAnalysis(state,assessment,adapter.model,PROMPT_VERSION);
  const synthesis=await observed('synthesizeProposal',()=>adapter.synthesizeProposal(proposal,assessment)) as Awaited<ReturnType<typeof adapter.synthesizeProposal>>;
  addSynthesis(state,analysis.id,synthesis,adapter.model,PROMPT_VERSION);
  report.status='VALIDADO';report.results={initial,contribution,assessment,synthesis};report.publicationPerformed=false;report.caveat='Cobertura e estrutura validadas; avaliação semântica humana independente e cotas futuras não foram certificadas.';
 }catch(e){report.status=report.calls.some((c:any)=>c.status==='OK')?'PARCIAL':'BLOQUEADO';report.failure=e instanceof AIUnavailable?e.code:'MODEL_METADATA_OR_TRANSPORT_FAILURE';}
}
await writeFile(new URL('GEMINI_REAL.json',directory),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:undefined}));
if(report.status!=='VALIDADO')process.exitCode=2;
