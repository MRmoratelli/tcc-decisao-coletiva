import {useState,type FormEvent} from 'react';
import {request,APIError,type ReviewResult} from '../api';
import {ProposalSchema,type ProposalContent} from '../../shared/contracts';
import {emptyProposal} from './ProposalEditor';
import {ReviewCard} from './ReviewCard';

export type InitialProposalInput={
 proposal:ProposalContent;participantCount:number;simple:true;aiConsent:true;
 initialReviewMode:'REVIEWED'|'BYPASSED';reviewedProposal?:ProposalContent;
 receipt?:string;appliedRewrite?:boolean;reviewChoice?:'USED_REWRITE'|'KEPT_ORIGINAL';bypassReason?:string;
};
export function InitialProposalForm({busy,onCreate}:{busy:boolean;onCreate:(input:InitialProposalInput)=>Promise<void>}){
 const [proposal,setProposal]=useState(emptyProposal),[count,setCount]=useState(5);
 const [review,setReview]=useState<ReviewResult|null>(null),[reviewed,setReviewed]=useState<ProposalContent|null>(null);
 const [reviewing,setReviewing]=useState(false),[failure,setFailure]=useState('');
 const [usedSuggestion,setUsedSuggestion]=useState(false);
 const locked=busy||reviewing;
 const valid=proposal.title.trim().length>=3&&proposal.text.trim().length>=4&&Number.isInteger(count)&&count>=2&&count<=15;
 async function analyze(e:FormEvent){
  e.preventDefault();setFailure('');setReview(null);setReviewing(true);setUsedSuggestion(false);
  try{
   const draft=ProposalSchema.parse(proposal);
   const result=await request<ReviewResult>('/ai/proposal-review',{proposal:draft,consent:true});
   setReviewed(draft);setReview(result);
  }catch(e){setFailure(e instanceof APIError&&e.code==='PROVIDER_UNAVAILABLE'?e.message:'Não foi possível revisar a proposta com a IA. Seu texto foi mantido. Tente novamente ou crie a sala sem essa revisão.');}
  finally{setReviewing(false);}
 }
 async function create(withoutReview=false){
  if(!valid||!withoutReview&&(!review||!reviewed))return;
  await onCreate({
   proposal:ProposalSchema.parse(proposal),participantCount:count,simple:true,aiConsent:true,
   initialReviewMode:withoutReview?'BYPASSED':'REVIEWED',
   ...(withoutReview?{bypassReason:'Moderador confirmou a proposta sem revisão inicial após indisponibilidade da IA.'}:{
    reviewedProposal:reviewed!,receipt:review!.receipt,appliedRewrite:usedSuggestion,reviewChoice:usedSuggestion?'USED_REWRITE' as const:'KEPT_ORIGINAL' as const,
   }),
  });
 }
 return <form onSubmit={analyze}>
 <label>Título da discussão<input disabled={locked} required minLength={3} maxLength={180} value={proposal.title} onChange={e=>setProposal({...proposal,title:e.target.value})}/></label>
 <label>Quantidade de participantes<input disabled={locked} required type="number" min={2} max={15} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
 <p className="muted">De 2 a 15 pessoas que votarão. O consenso exige ACEITO de todas elas na mesma rodada.</p>
 <label>Proposta inicial<textarea disabled={locked} required minLength={4} maxLength={5000} rows={5} value={proposal.text} onChange={e=>setProposal({...proposal,text:e.target.value})}/></label>
 <label>Contexto ou complemento (opcional)<textarea disabled={locked} maxLength={5000} rows={3} value={proposal.context} onChange={e=>setProposal({...proposal,context:e.target.value})}/></label>
 <p className="muted">Ao solicitar a revisão, você autoriza o envio desta proposta e do contexto ao Gemini. Ao criar a sala, autoriza o apoio consultivo da IA às manifestações pseudonimizadas do grupo. Evite dados pessoais ou sensíveis. A decisão de publicar é sua.</p>
 <button type="submit" className="secondary" disabled={locked}>{reviewing?'Revisando proposta inicial…':review?'Revisar proposta novamente com IA':'Revisar proposta inicial com IA'}</button>
 {failure&&<div className="alert" role="alert"><p>{failure}</p><button type="button" disabled={locked||!valid} onClick={()=>void create(true)}>Criar sala sem revisão da IA</button></div>}
 {review&&reviewed&&<section className="review-follow" aria-label="Revisão inicial da IA">
 <h3>Sugestão da IA para sua proposta</h3><p>{review.review.summary}</p>
 {review.review.suggestedRewrite?<><blockquote className="preserve">{review.review.suggestedRewrite}</blockquote>
 <button type="button" className="secondary" disabled={locked} onClick={()=>{setProposal({...proposal,text:review.review.suggestedRewrite});setUsedSuggestion(true);}}>Usar sugestão da IA</button></>:<p>A IA não apresentou uma reformulação. Você pode revisar seu texto e manter a proposta.</p>}
 <button type="button" className="text-button" disabled={locked} onClick={()=>{setProposal({...proposal,text:reviewed.text});setUsedSuggestion(false);}}>Manter minha proposta</button>
 {usedSuggestion&&<p className="alert" role="status">Sugestão aplicada ao campo Proposta inicial. Revise o texto acima: ele será publicado ao criar a sala.</p>}
 {/\[(?:Data|Prazo|Valor|Local|Orçamento)[^\]]*\]/i.test(proposal.text)&&<p className="alert" role="alert">Há marcadores pendentes no texto. Remova-os ou substitua-os por informações definidas pelo grupo antes de publicar.</p>}
 {review.review.recommendations.length>0&&<><h4>Pontos de atenção</h4><ul>{review.review.recommendations.map((x,i)=><li key={i}>{x}</li>)}</ul></>}
 <p className="muted">O parecer se refere ao rascunho analisado, que será preservado. Você pode editar os campos acima antes de confirmar. Nenhuma sala foi criada nesta revisão.</p>
 <details><summary>Detalhes do parecer consultivo</summary><ReviewCard review={review.review} label="Parecer da proposta inicial"/></details>
 <button type="button" className="primary" disabled={locked||!valid} onClick={()=>void create()}>{busy?'Criando sala…':'Criar sala com esta proposta'}</button>
 </section>}
 </form>;
}
