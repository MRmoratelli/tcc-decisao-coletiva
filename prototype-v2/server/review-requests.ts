import {createHash,randomUUID} from 'node:crypto';
import {PROMPT_VERSION} from './ai.js';
import type {Review} from '../shared/contracts.js';
import {DomainError,currentProposal,currentRound} from './domain.js';
import type {Repository,Identity} from './db.js';
export const REVIEW_INTERVAL_MS=60000;
export class ReviewWait extends DomainError{
 constructor(public code:string,public retryAfterSeconds:number){super(code==='REVIEW_IN_PROGRESS'?'Seu parecer anterior ainda está em andamento.':'Aguarde '+retryAfterSeconds+' segundos antes de pedir outro parecer.',429);}
}
export async function reserveReview(repo:Repository,i:Identity,text:string,now=Date.now(),model='unspecified'){
 const hash=createHash('sha256').update(JSON.stringify({text,model,promptVersion:PROMPT_VERSION})).digest('hex');
 for(let attempt=0;attempt<12;attempt++){
  const x=await repo.read(i),s=x.state,p=currentProposal(s),r=currentRound(s);
  if(s.decision.status!=='OPEN'||s.votes.some(v=>v.participantId===i.participantId&&v.roundId===r.id))throw new DomainError('Você já votou ou a rodada foi encerrada.',409);
  const old=s.reviewRequests?.find(x=>x.participantId===i.participantId);
  if(old?.status==='RUNNING'&&now-Date.parse(old.at)<900000)throw new ReviewWait('REVIEW_IN_PROGRESS',Math.max(1,Math.ceil((900000-(now-Date.parse(old.at)))/1000)));
  if(old?.status==='DONE'&&old.textHash===hash&&old.proposalId===p.id&&old.review)return {cached:old.review,requestId:old.requestId,at:old.at,proposalId:p.id,roundId:r.id};
  const wait=old?Math.ceil((Date.parse(old.at)+REVIEW_INTERVAL_MS-now)/1000):0;
  if(wait>0)throw new ReviewWait('REVIEW_COOLDOWN',wait);
  const requestId=randomUUID(),at=new Date(now).toISOString();
  try{await repo.mutate(i,x.revision,state=>{state.reviewRequests=(state.reviewRequests??[]).filter(x=>x.participantId!==i.participantId);state.reviewRequests.push({participantId:i.participantId!,requestId,at,textHash:hash,proposalId:p.id,roundId:r.id,status:'RUNNING'});});return {requestId,at,proposalId:p.id,roundId:r.id};}
  catch(e){if(e instanceof DomainError&&e.status===409)continue;throw e;}
 }
 throw new DomainError('A sala foi atualizada. Tente novamente.',409);
}
export async function finishReview(repo:Repository,i:Identity,requestId:string,review?:Review){
 for(let attempt=0;attempt<12;attempt++){const x=await repo.read(i);
  try{await repo.mutate(i,x.revision,s=>{const row=s.reviewRequests?.find(x=>x.participantId===i.participantId&&x.requestId===requestId);if(row){row.status=review?'DONE':'FAILED';row.review=review;}});return;}
  catch(e){if(e instanceof DomainError&&e.status===409)continue;throw e;}
 }
 throw new DomainError('Não foi possível registrar o parecer. Tente recuperar a consulta.',409);
}
