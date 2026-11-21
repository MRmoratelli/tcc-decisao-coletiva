import type { Repository,Identity } from './db.js';
import type { AIAdapter } from './ai.js';
import { PROMPT_VERSION } from './ai.js';
import { currentRound,currentProposal,latestVotes,manifestations,factualContext,sourceFingerprint,addAnalysis,addSynthesis,reconcileSynthesisLinks,event } from './domain.js';

// The persisted lease survives process restarts; publication is never automated.
export function automaticMediation(repo:Repository,ai:AIAdapter){
 const running=new Set<string>();
 return async function prepare(identity:Identity,retry=false){
  if(running.has(identity.roomId))return;
  running.add(identity.roomId);
  const moderator:Identity={roomId:identity.roomId,code:identity.code,role:'moderator'};
  let fingerprint='',roundId='';
  try{
   const x=await repo.read(moderator),s=x.state;
   if(!s.enrollment?.automaticMediation||s.decision.status!=='OPEN')return;
   const votes=latestVotes(s);
   if(votes.length!==s.participants.length||votes.every(v=>v.choice==='ACEITO'))return;
   fingerprint=sourceFingerprint(s);roundId=currentRound(s).id;
   if(s.mediation?.fingerprint===fingerprint){
    if(s.mediation.status==='READY'||s.mediation.status==='FAILED'&&!retry)return;
    if(s.mediation.status==='RUNNING'&&Date.now()-Date.parse(s.mediation.startedAt)<180000)return;
   }
   await repo.mutate(moderator,x.revision,state=>{
    state.mediation={roundId,fingerprint,status:'RUNNING',startedAt:new Date().toISOString(),detail:'Preparando análise e síntese para revisão do moderador.'};
    event(state,'system','AUTO_MEDIATION_STARTED',roundId);
   });
   const result=await ai.analyzeObjections(currentProposal(s).content,votes.map(({id,choice,justification})=>({id,choice,justification})),
    [...s.contributions.filter(c=>c.roundId===roundId).map(c=>({id:c.id,text:c.text})),...factualContext(s).map(f=>({type:'EXTERNAL_EVIDENCE_CONSULTIVE',...f}))],manifestations(s));
   let current=await repo.read(moderator);
   if(current.state.decision.status!=='OPEN'||sourceFingerprint(current.state)!==fingerprint)return;
   // Build privately and persist analysis + synthesis together. A failed provider
   // call cannot leave a public partial draft or publish a new proposal.
   const draft=structuredClone(current.state);
   const analysis=addAnalysis(draft,result,ai.model,PROMPT_VERSION);
   const synthesis=await ai.synthesizeProposal(currentProposal(draft).content,{...result,uncertainties:[...result.uncertainties,...factualContext(draft).map(f=>'EVIDÊNCIA EXTERNA CONSULTIVA: '+JSON.stringify(f))]},manifestations(draft));
   const verified=reconcileSynthesisLinks(draft,synthesis);
   addSynthesis(draft,analysis.id,verified,ai.model,PROMPT_VERSION);
   for(let attempt=0;attempt<5;attempt++){
    current=await repo.read(moderator);
    if(current.state.decision.status!=='OPEN'||sourceFingerprint(current.state)!==fingerprint)return;
    try{
     await repo.mutate(moderator,current.revision,state=>{
      state.analyses.push(draft.analyses.at(-1)!);state.syntheses.push(draft.syntheses.at(-1)!);
      state.mediation={roundId,fingerprint,status:'READY',startedAt:state.mediation!.startedAt,detail:'Rascunho pronto. Revise e publique para abrir a próxima rodada.'};
      event(state,'system','AUTO_MEDIATION_READY',roundId);
     });return;
    }catch(e){if(attempt===4)throw e;}
   }
  }catch{
   if(fingerprint)try{const current=await repo.read(moderator);
    if(current.state.mediation?.fingerprint===fingerprint&&current.state.mediation.status==='RUNNING'){
     await repo.mutate(moderator,current.revision,state=>{
      state.mediation!.status='FAILED';state.mediation!.detail='Não foi possível preparar a síntese. O moderador pode tentar novamente ou revisar manualmente.';
      event(state,'system','AUTO_MEDIATION_FAILED',roundId);
     });
    }
   }catch{/* a concurrent change is handled by the next view */}
  }finally{running.delete(identity.roomId);}
 };
}
