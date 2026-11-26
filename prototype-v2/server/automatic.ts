import type {Repository,Identity} from './db.js';
import type {AIAdapter} from './ai.js';
import {AIUnavailable,PROMPT_VERSION} from './ai.js';
import {withAIQueueStatus} from './gemini-queue.js';
import {DomainError,currentRound,currentProposal,latestVotes,manifestations,sourceFingerprint,addAnalysis,addSynthesis,reconcileSynthesisLinks,event,type State} from './domain.js';

export function automaticMediation(repo:Repository,ai:AIAdapter){
 const running=new Set<string>();
 return async function prepare(identity:Identity,retry=false){
  if(running.has(identity.roomId))return;running.add(identity.roomId);
  const moderator:Identity={roomId:identity.roomId,code:identity.code,role:'moderator'};
  let fingerprint='',roundId='',stage='ELIGIBILITY';
  const change=async(work:(s:State)=>void)=>{
   for(let attempt=0;attempt<12;attempt++){
    const x=await repo.read(moderator);
    if(x.state.decision.status!=='OPEN'||sourceFingerprint(x.state)!==fingerprint)throw new DomainError('A rodada mudou durante a preparação.',409);
    try{return await repo.mutate(moderator,x.revision,work);}catch(e){if(e instanceof DomainError&&e.status===409)continue;throw e;}
   }throw new DomainError('Conflito ao salvar mediação.',409);
  };
  const setStage=async(value:string,detail:string)=>{stage=value;await change(s=>{if(s.mediation){s.mediation.stage=value;s.mediation.detail=detail;}});};
  const queued=async(waiting:boolean)=>{try{await change(s=>{if(s.mediation)s.mediation.detail=waiting?'Aguardando capacidade do Gemini. Os votos estão preservados; a preparação continuará automaticamente.':'Preparando análise e síntese para revisão do moderador.';});}catch{/* A change of round cancels application of the result below. */}};
  try{
   const x=await repo.read(moderator),s=x.state,votes=latestVotes(s);
   const round=currentRound(s);
   const ready=round.voting?round.status==='CLOSED':votes.length===s.participants.length;
   if(!s.enrollment?.automaticMediation||s.decision.status!=='OPEN'||!ready||!manifestations(s).some(m=>m.text.trim()))return;
   fingerprint=sourceFingerprint(s);roundId=currentRound(s).id;
   if(s.mediation?.fingerprint===fingerprint){
    if(s.mediation.status==='READY'||s.mediation.status==='FAILED'&&!retry)return;
    if(s.mediation.status==='RUNNING'&&Date.now()-Date.parse(s.mediation.startedAt)<900000)return;
   }
   await change(state=>{state.mediation={roundId,fingerprint,status:'RUNNING',startedAt:new Date().toISOString(),detail:'Preparando análise e síntese para revisão do moderador.',stage:'ANALYSIS_REQUEST'};event(state,'system','AUTO_MEDIATION_STARTED',roundId);});
   let current=await repo.read(moderator);
   let analysis=[...current.state.analyses].reverse().find(a=>a.roundId===roundId&&a.sourceFingerprint===fingerprint&&a.promptVersion===PROMPT_VERSION&&a.model===ai.model);
   if(!analysis){
    await setStage('ANALYSIS_REQUEST','Analisando as manifestações do grupo.');
    const result=await withAIQueueStatus(queued,()=>ai.analyzeObjections(currentProposal(s).content,votes.map(({id,choice,justification})=>({id,choice,justification})),
     s.contributions.filter(c=>c.roundId===roundId).map(c=>({id:c.id,text:c.text})),manifestations(s)));
    stage='ANALYSIS_VALIDATION';
    const saved=await change(state=>addAnalysis(state,result,ai.model,PROMPT_VERSION));analysis=saved.state.analyses.at(-1)!;
   }
   await setStage('SYNTHESIS_REQUEST','Preparando a sugestão de nova proposta.');
   current=await repo.read(moderator);const draft=current.state;
   const result=await withAIQueueStatus(queued,()=>ai.synthesizeProposal(currentProposal(draft).content,analysis!.result,manifestations(draft),draft.proposals[0].content));
   stage='SYNTHESIS_VALIDATION';const verified=reconcileSynthesisLinks(draft,result);
   // Validate before persistence, then append privately. Publication remains human.
   const validation=structuredClone(draft);addSynthesis(validation,analysis.id,verified,ai.model,PROMPT_VERSION);
   stage='PERSISTENCE';
   await change(state=>{
    addSynthesis(state,analysis!.id,verified,ai.model,PROMPT_VERSION);
    state.mediation={roundId,fingerprint,status:'READY',startedAt:state.mediation!.startedAt,detail:'Rascunho pronto. Revise e publique para abrir a próxima rodada.',stage:'READY'};
    event(state,'system','AUTO_MEDIATION_READY',roundId);
   });
  }catch(e){
   const code=e instanceof AIUnavailable?e.code:e instanceof DomainError?(e.code??(e.status===502?'INVALID_SOURCE_LINKS':e.status===409?'STATE_CHANGED':'DOMAIN_VALIDATION')):e instanceof Error&&e.name==='ZodError'?'INVALID_STATE':'INTERNAL_FAILURE';
   const safe={event:'AUTO_MEDIATION_FAILURE',stage,code,status:e instanceof AIUnavailable?e.httpStatus??null:e instanceof DomainError?e.status:null,attempts:e instanceof AIUnavailable?e.attempts:0,model:ai.model,promptVersion:PROMPT_VERSION};
   console.warn(JSON.stringify(safe));
   if(fingerprint&&code!=='STATE_CHANGED')try{await change(state=>{
    if(state.mediation?.fingerprint!==fingerprint)return;
    state.mediation.status='FAILED';state.mediation.stage=stage;state.mediation.failureCode=code;
    state.mediation.detail='Não foi possível preparar a síntese. Etapa: '+stage+'. Código: '+code+'. Seus votos estão preservados. Tente novamente ou revise manualmente.';
    event(state,'system','AUTO_MEDIATION_FAILED',JSON.stringify({roundId,...safe}));
   });}catch{/* Preserve the original failure when persistence is unavailable. */}
  }finally{running.delete(identity.roomId);}
 };
}
