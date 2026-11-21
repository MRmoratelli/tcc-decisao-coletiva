import { useState, useEffect, useRef } from 'react';
import type { RoomView,ReviewResult } from '../api';
import { request,downloadJSON } from '../api';
import { ProposalEditor } from './ProposalEditor';
import { ReviewCard } from './ReviewCard';
import { FactualPanel } from './FactualPanel';
import { EvaluationForm } from './EvaluationForm';
import type { ProposalContent,Choice,EvaluationInput } from '../../shared/contracts';
type Session={code:string;credential:string;view:RoomView};
const proposalLabels:Record<string,string>={title:'Título',problem:'Problema',decision:'Decisão pretendida',goals:'Objetivos',alternatives:'Alternativas',constraints:'Restrições',successCriteria:'Critérios de sucesso',context:'Contexto',text:'Texto da proposta'};
function publicIntervention(item:RoomView['state']['proposals'][number]){
 return item.version!==1||item.intervention?.kind==='EDICAO_HUMANA'||item.intervention?.source==='PARECER_INICIAL_IA';
}
function RevisionHistory({item}:{item:RoomView['state']['proposals'][number]}){
 const i=item.intervention;if(!i)return null;
 return <details><summary>Comparar revisão humana desta versão</summary><p>{i.kind==='EDICAO_HUMANA'?'Edição humana':'Aprovação humana sem alteração'} · Moderador · {new Date(i.at).toLocaleString('pt-BR')}</p><p>{i.reason}</p>{i.changes.map(c=><article key={c.field}><h5>{proposalLabels[c.field]??c.field}</h5><p>Original</p><blockquote className="preserve">{c.before}</blockquote><p>Revisado e publicado</p><blockquote className="preserve">{c.after}</blockquote></article>)}{!i.changes.length&&<p>Não houve alteração efetiva do conteúdo.</p>}</details>;
}
export function RoomWorkspace({session,busy,act,onRefresh}:{session:Session;busy:boolean;act:(work:()=>Promise<void>)=>Promise<void>;onRefresh:()=>Promise<void>}){
 const {view,code,credential}=session,s=view.state,r=s.rounds[s.rounds.length-1],p=s.proposals[s.proposals.length-1];
 const [text,setText]=useState(''),[original,setOriginal]=useState(''),[review,setReview]=useState<ReviewResult|null>(null),[choice,setChoice]=useState<Choice>('ACEITO'),[rewriteApplied,setRewriteApplied]=useState(false);
 const [analyzing,setAnalyzing]=useState(false),[hasAnalyzed,setHasAnalyzed]=useState(false),[reviewChoice,setReviewChoice]=useState<'USED_REWRITE'|'KEPT_ORIGINAL'|'DISCARDED'>('KEPT_ORIGINAL');
 const [contestText,setContest]=useState(''),[consent,setConsent]=useState(false),[bypass,setBypass]=useState(false);
 const [moderatorEdited,setModeratorEdited]=useState(false),[manual,setManual]=useState(false),[reviewingSynthesis,setReviewingSynthesis]=useState(false);
 const [clock,setClock]=useState(Date.now()),[availableAt,setAvailableAt]=useState(0);
 useEffect(()=>{if(view.role!=='participant')return;const timer=setInterval(()=>setClock(Date.now()),1000);(timer as unknown as {unref?:()=>void}).unref?.();return()=>clearInterval(timer);},[view.role]);
 const ownReview=s.reviewRequests?.find(x=>x.participantId===view.participantId);
 const reviewWait=Math.max(0,Math.ceil((Math.max(availableAt,ownReview?Date.parse(ownReview.at)+60000:0)-clock)/1000));
 const [revisionDraft,setDraft]=useState<ProposalContent>(p.content),[reason,setReason]=useState(''),[sourceSynthesis,setSynthesis]=useState<string|undefined>(),[closeReason,setCloseReason]=useState('');
 const [coverage,setCoverage]=useState<Record<string,{status:'ATENDIDA'|'PARCIAL'|'NAO_ATENDIDA';faithful:boolean|null;note:string}>>({});
 const [staleDraft,setStaleDraft]=useState(false),[roundNotice,setRoundNotice]=useState('');
 const draftRound=useRef(p.id);
 const [target,setTarget]=useState(''),[contestLater,setContestLater]=useState('');
 useEffect(()=>{if(draftRound.current!==p.id){
  const needsDraftReview=view.role==='moderator'?moderatorEdited&&JSON.stringify(revisionDraft)!==JSON.stringify(p.content):Boolean(text.trim()||original.trim()||contestText.trim());
  setRoundNotice('Nova rodada publicada. Confira a proposta antes de se manifestar.');
  setStaleDraft(needsDraftReview);if(!needsDraftReview){draftRound.current=p.id;setDraft(p.content);setModeratorEdited(false);setReason('');}
  setReview(null);setHasAnalyzed(false);setRewriteApplied(false);setSynthesis(undefined);setCoverage({});
  setChoice('ACEITO');setConsent(false);setBypass(false);setManual(false);setReviewingSynthesis(false);
 }},[p.id]);
 const base={credential,revision:view.revision},binding={roundId:r.id,proposalId:p.id};
 const post=(suffix:string,data:object)=>request('/rooms/'+code+suffix,{...base,...data});
 const mutate=async(suffix:string,data:object)=>{await post(suffix,data);await onRefresh();};
 async function analyze(){setAnalyzing(true);try{await act(async()=>{if(!consent)throw new Error('Confirme o envio do texto ao Gemini.');setOriginal(text);const result=await post('/contribution-review',{...binding,text,consent:true}) as ReviewResult;setReview(result);setAvailableAt(result.availableAt?Date.parse(result.availableAt):Date.now()+60000);await onRefresh();setHasAnalyzed(true);setReviewChoice('KEPT_ORIGINAL');setRewriteApplied(false);setBypass(false);});}finally{setAnalyzing(false);}}
 async function send(kind:'vote'|'contribution'){
  await act(async()=>{
   if(kind==='vote'&&ownVotes.length)throw new Error('Seu voto nesta rodada já foi registrado. Aguarde uma nova rodada.');
   if(staleDraft||draftRound.current!==p.id)throw new Error('Confirme a reutilização do rascunho na nova rodada.');
   if(text&&!review&&!bypass)throw new Error('Solicite parecer ou marque continuar sem parecer.');
   if(rewriteApplied&&!review?.rewriteReceipt)throw new Error('Comprovante de reformulação indisponível. Analise novamente.');
   if(choice==='REJEITO'&&!text.trim()&&kind==='vote')throw new Error('Rejeição exige justificativa.');
   const payload={...binding,receipt:rewriteApplied?review?.rewriteReceipt:review?.receipt,appliedRewrite:rewriteApplied||undefined,reviewChoice:review?reviewChoice:undefined,bypassReason:!review?'Autor optou por continuar sem parecer consultivo.':undefined,contest:contestText,originalText:original||text};
   await mutate(kind==='vote'?'/votes':'/contributions',kind==='vote'?{...payload,choice,justification:text}:{...payload,text});
   setText('');setOriginal('');setReview(null);setHasAnalyzed(false);setRewriteApplied(false);setBypass(false);setContest('');
  });
 }
 const analysis=s.analyses.filter(a=>a.proposalId===p.id).slice(-1)[0];
 const syntheses=s.syntheses.filter(x=>x.proposalId===p.id);
 const isOpen=s.decision.status==='OPEN';
 const pendingCount=s.participants.length-latestCount();
 function latestCount(){return new Set(s.votes.filter(v=>v.roundId===r.id).map(v=>v.participantId)).size;}
 const newestSynthesis=syntheses.filter(x=>!x.publishedProposalId).at(-1);
 const loadedSynthesis=useRef<string|undefined>(undefined);
 useEffect(()=>{
  if(view.role==='moderator'&&newestSynthesis&&!moderatorEdited&&loadedSynthesis.current!==newestSynthesis.id){
   loadedSynthesis.current=newestSynthesis.id;
   setDraft(newestSynthesis.result.revisedProposal);setSynthesis(newestSynthesis.id);setCoverage({});
   setReason('');setStaleDraft(false);draftRound.current=p.id;
  }
 },[newestSynthesis?.id,view.role]);
 const ownVotes=s.votes.filter(v=>v.participantId===view.participantId&&v.roundId===r.id);
 const submitted=s.evaluations.some(e=>e.participantId===view.participantId);
 const roundVotes=s.votes.filter(v=>v.roundId===r.id);
 const latestByPerson=new Map<string,(typeof roundVotes)[number]>();for(const v of roundVotes)latestByPerson.set(v.participantId,v);
 const latestRoundVotes=[...latestByPerson.values()];
 const earlierRoundVotes=roundVotes.filter(v=>latestByPerson.get(v.participantId)?.id!==v.id);
 const roundContributions=s.contributions.filter(c=>c.roundId===r.id);
 // Pair the contribution and vote written in the same operation. Keep history in storage.
 const linkedVote=(c:(typeof roundContributions)[number])=>roundVotes.find(v=>v.participantId===c.participantId&&v.justification===c.text&&Math.abs(Date.parse(v.createdAt)-Date.parse(c.createdAt))<2000);
 const independentContributions=roundContributions.filter(c=>!linkedVote(c));
 return <div className="workspace"><small>RC3 · parecer v2.8</small>
 {!isOpen&&text&&<details><summary>Seu rascunho não enviado, preservado após o encerramento</summary><p className="preserve">{text}</p></details>}
 {roundNotice&&<p className="alert" role="status">{roundNotice}</p>}
 {staleDraft&&<section className="alert"><p>Rascunhos preservados da versão anterior. Revise o conteúdo; nenhum voto foi transferido.</p><button onClick={()=>{draftRound.current=p.id;setStaleDraft(false);if(view.role!=='moderator')setDraft(p.content);setReason('');setChoice('ACEITO');setBypass(false);}}>Confirmar reutilização do meu texto na rodada atual</button><button onClick={()=>{draftRound.current=p.id;setStaleDraft(false);setText('');setOriginal('');setContest('');setDraft(p.content);setReason('');setChoice('ACEITO');setBypass(false);}}>Descartar rascunho anterior e iniciar novamente</button></section>}
 {p.intervention&&(view.role==='moderator'||publicIntervention(p))&&<details className="review"><summary>Revisão humana da proposta publicada</summary><h3>{p.intervention.kind==='EDICAO_HUMANA'?'Proposta revisada pelo moderador':'Proposta aprovada pelo moderador sem alteração'}</h3>{['SINTESE_IA','PARECER_INICIAL_IA'].includes(p.intervention.source)&&<p>{p.intervention.kind==='EDICAO_HUMANA'?'Texto sugerido pela IA e posteriormente modificado pelo moderador.':'Texto sugerido pela IA e aprovado sem alteração.'}</p>}<p>Responsável funcional: moderador · {new Date(p.intervention.at).toLocaleString('pt-BR')}</p><p>Justificativa: {p.intervention.reason}</p><details><summary>Comparar versão original e publicada</summary><h4>Texto original {p.intervention.source==='SINTESE_IA'?'da IA':''}</h4><p className="preserve">{p.intervention.original.text}</p><h4>Texto publicado</h4><p className="preserve">{p.intervention.published.text}</p>{p.intervention.changes.map(c=><article key={c.field}><h4>{proposalLabels[c.field]??c.field}</h4><p>Original</p><blockquote className="preserve">{c.before}</blockquote><p>Revisado e publicado</p><blockquote className="preserve">{c.after}</blockquote></article>)}{!p.intervention.changes.length&&<p>Não houve alteração efetiva.</p>}</details></details>}

 <div className="status-strip" role="status"><b>Rodada {r.number} · Proposta V{p.version}</b><span>{s.decision.status==='CONSENSUS'?'Consenso unânime registrado':s.decision.status==='CLOSED_WITHOUT_CONSENSUS'?'Encerrado sem consenso':'Deliberação aberta'}</span></div>
 <p>Consenso exige Aceito de todos na mesma rodada. Quem não respondeu permanece pendente. Se precisar de ajustes para aceitar, escolha Rejeito e explique.</p>
 {s.decision.closureReason&&<p className="alert">{s.decision.closureReason}</p>}
 <details><summary>Problema e contexto da versão atual</summary><dl>{Object.entries(p.content).filter(([key,value])=>!['title','text'].includes(key)&&value).map(([key,value])=><div key={key}><dt>{{problem:'Problema',decision:'Decisão pretendida',goals:'Objetivos',alternatives:'Alternativas',constraints:'Restrições',successCriteria:'Critérios de sucesso',context:'Contexto'}[key]}</dt><dd>{value}</dd></div>)}</dl></details>
 <ul className="positions">{view.positions.map(pos=><li key={pos.id}><b>{pos.alias}</b> {pos.choice.replaceAll('_',' ')}</li>)}</ul>
 {view.role==='participant'&&isOpen&&ownVotes.length>0&&<section className="entry" role="status"><h3>Voto registrado nesta rodada</h3><p>Sua posição foi registrada. Aguarde o moderador publicar uma nova rodada para votar novamente. A tela será atualizada automaticamente.</p></section>}
 {view.role==='participant'&&isOpen&&ownVotes.length===0&&<section className="entry"><h3>Sua manifestação sobre V{p.version}</h3>
 <p>Registre sua posição explicitamente. Cada participante pode votar uma única vez por rodada.</p>
 <label>Posição<select value={choice} onChange={e=>setChoice(e.target.value as Choice)}><option value="ACEITO">Aceito</option><option value="REJEITO">Rejeito</option></select></label>
 <label>Justificativa, objeção ou sugestão {choice==='REJEITO'?'(obrigatória)':'(opcional)'}<textarea rows={5} maxLength={5000} value={text} onChange={e=>{setText(e.target.value);setReview(null);setRewriteApplied(false);}}/></label>
 <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo enviar este texto e o contexto da proposta ao Gemini. Evite dados pessoais ou sensíveis.</label>
 <button className="secondary" disabled={busy||analyzing||reviewWait>0||(ownReview?.status==='RUNNING'&&clock-Date.parse(ownReview.at)<900000)||!consent||!text.trim()} onClick={()=>{void analyze();}}>{analyzing?'Analisando seu argumento…':hasAnalyzed?'Revisar novamente com IA':'Revisar meu argumento com IA'}</button>
 {reviewWait>0&&<p role="status">Novo pedido de parecer disponível em {reviewWait} segundos. O intervalo é individual; seu texto e o parecer recebido permanecem disponíveis.</p>}
 {analyzing&&<p role="status">Pedido em andamento. Se houver fila, aguarde; você não precisa enviar novamente.</p>}
 <p className="muted">A IA analisa sua justificativa e oferece observações para ajudar na discussão. Você decide se deseja ajustar o texto antes de registrar sua posição.</p>
 {review&&<><ReviewCard review={review.review} label="Parecer da manifestação"/>{review.review.suggestedRewrite&&!rewriteApplied&&<button className="secondary" disabled={busy||!review.rewriteReceipt} onClick={()=>{setText(review.review.suggestedRewrite);setRewriteApplied(true);setReviewChoice('USED_REWRITE');setBypass(false);}}>Usar reformulação da IA</button>}<button className="text-button" disabled={busy||reviewChoice==='DISCARDED'} onClick={()=>{setText(original);setRewriteApplied(false);setReviewChoice('DISCARDED');setBypass(false);}}>Descartar parecer da IA</button>{reviewChoice==='DISCARDED'&&<p role="status">Seu texto original foi mantido. Registre sua posição quando estiver pronto.</p>}{rewriteApplied&&<p className="alert" role="status">Reformulação da IA selecionada. Revise o texto e clique em Registrar para confirmar que ele representa sua posição. O parecer será preservado; não é necessário marcar “sem parecer”.</p>}</>}
 {review&&<details><summary>Contestar este parecer (opcional)</summary><label>Explique sua contestação<textarea maxLength={2000} rows={2} value={contestText} onChange={e=>setContest(e.target.value)}/></label></details>}
 {!review&&<label className="check"><input type="checkbox" checked={bypass} onChange={e=>setBypass(e.target.checked)}/> Continuar com meu texto sem parecer da IA.</label>}
 <div className="actions"><button className="primary" disabled={busy||staleDraft} onClick={()=>void send('vote')}>Registrar {choice.replaceAll("_"," ")}</button><button className="secondary" disabled={busy||!text.trim()} onClick={()=>void send('contribution')}>Enviar apenas contribuição</button></div>
 </section>}
 <section><h3>Manifestações registradas · posições vigentes</h3>
  {!view.canViewGroup&&<p>As manifestações alheias ficam ocultas até seu primeiro registro nesta versão.</p>}
  {view.canViewGroup&&latestRoundVotes.map(v=>{const c=roundContributions.find(c=>linkedVote(c)?.id===v.id);return <article className="entry-card" key={v.id}>
   <b>{s.participants.find(p=>p.id===v.participantId)?.alias}: {v.choice.replaceAll('_',' ')}</b>
   {v.justification&&<p>{v.justification}</p>}
   {c?.review.appliedRewrite&&<small>Reformulação sugerida pela IA aceita e enviada pelo participante.</small>}
   {c&&c.originalText.trim()!==c.text.trim()&&<details><summary>Texto original antes da revisão</summary><p className="preserve">{c.originalText}</p></details>}
  </article>})}
  {view.canViewGroup&&independentContributions.map(c=><article className="entry-card" key={c.id}><b>{s.participants.find(p=>p.id===c.participantId)?.alias}: contribuição adicional</b><p>{c.text}</p><small>{c.review.status==='OK'?'Parecer consultivo registrado':'Enviada sem parecer'}</small></article>)}
  {view.canViewGroup&&earlierRoundVotes.length>0&&<details><summary>Histórico de atualizações de voto nesta rodada ({earlierRoundVotes.length})</summary>
   {earlierRoundVotes.map(v=><article className="entry-card" key={v.id}><b>{s.participants.find(p=>p.id===v.participantId)?.alias}: {v.choice.replaceAll('_',' ')} (substituído)</b>{v.justification&&<p>{v.justification}</p>}</article>)}
  </details>}
 </section>
 {view.role==='moderator'&&<details><summary>Pesquisa externa consultiva (opcional)</summary><FactualPanel checks={s.factualChecks} busy={busy} isOpen={isOpen} onVerify={(value,mode)=>act(()=>mutate('/fact-check',{...binding,text:value,mode,consent:true}))}/></details>}
 {view.role==='moderator'&&isOpen&&<section className="entry"><h3>Revisão da próxima proposta</h3>
 {s.enrollment?.automaticMediation?<><p>{pendingCount>0?'Aguardando '+pendingCount+' manifestação(ões). A análise e a síntese serão preparadas automaticamente se houver divergência.':s.mediation?.detail??'Preparando a análise e a síntese do grupo.'}</p>
 {s.mediation?.status==='RUNNING'&&<p role="status">A IA está preparando o rascunho. Você poderá revisá-lo antes de publicar.</p>}
 {s.mediation?.status==='FAILED'&&<button disabled={busy} onClick={()=>void act(()=>mutate('/prepare-mediation',{}))}>Tentar preparar síntese novamente</button>}
 </>:<><label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo enviar proposta e justificativas pseudonimizadas ao Gemini.</label>
 <div className="actions"><button className="secondary" disabled={busy||!consent} onClick={()=>void act(()=>mutate('/analyze-objections',{consent:true}))}>Analisar manifestações do grupo</button><button className="secondary" disabled={busy||!analysis||!consent} onClick={()=>void act(()=>mutate('/synthesize',{consent:true,analysisId:analysis?.id}))}>Sugerir síntese conciliadora</button></div></>}
 <p>A síntese permanece rascunho privado do moderador até a publicação humana.</p></section>}
 {view.canViewGroup&&s.analyses.map(a=><details className="review" key={a.id}><summary>Parecer sobre manifestações · {s.proposals.find(p=>p.id===a.proposalId)?.version} · {a.id.slice(0,8)}</summary>
 {a.result.manifestationAssessments?.map(x=><article key={x.sourceId}><b>{x.kind} · {x.sourceId.slice(0,8)}</b><blockquote>{x.quotedExcerpt||'Posição formal sem justificativa textual.'}</blockquote><p>Interpretação da IA: {x.interpretation}</p><p>Caminho sugerido: {x.suggestedPath}</p></article>)}
 {a.result.individualAssessments.map(x=><article key={x.voteId}><small>{x.quoteOrigin==='ORIGINAL'?'Trecho do texto original do participante':'Trecho da manifestação enviada'}</small><blockquote>{x.quotedExcerpt}</blockquote><p>{x.explanation}</p><p>Pertinência: {x.relevance}. Incerteza: {x.uncertainty}</p><p>Premissas: {x.premises.join('; ')}. Evidências: {x.evidence.join('; ')}. Riscos: {x.risks.join('; ')}</p></article>)}
 {Object.entries(a.result).filter(([key])=>!['individualAssessments','manifestationAssessments'].includes(key)).map(([key,v])=><p key={key}><b>{({sharedInterests:'Interesses comuns',convergences:'Convergências',conflicts:'Conflitos',incompatibleObjections:'Objeções incompatíveis',nonNegotiableConditions:'Condições inegociáveis',uncertainties:'Incertezas'} as Record<string,string>)[key]}</b>: {(v as string[]).join('; ')}</p>)}</details>)}
 {view.canViewGroup&&s.syntheses.map(x=><details className="review" key={x.id}><summary>Síntese consultiva · {x.id.slice(0,8)} · {x.publishedProposalId?'Publicada após revisão humana':'Rascunho'}</summary><p>{x.result.revisedProposal.text}</p><ul>{x.result.changeLog.map((c,i)=><li key={i}>{c.change} — {c.reason} (manifestações: {c.sourceIds?.join(', ')||c.voteIds.join(', ')||'nenhuma'})</li>)}</ul><p>Atendidas sugeridas: {x.result.addressedObjections.join(', ')||'nenhuma'}</p><p>Parcialmente atendidas: {x.result.partiallyAddressedObjections.join(', ')||'nenhuma'}</p><p>Não atendidas: {x.result.unresolvedObjections.join(', ')||'nenhuma'}</p><p>Impasses: {x.result.remainingImpasses.join('; ')||'não informados'}</p><p>Viabilidade: {x.result.feasibilityWarnings.join('; ')||'não informada'}</p>
 {view.role==='moderator'&&isOpen&&x.proposalId===p.id&&!x.publishedProposalId&&<button className="secondary" onClick={()=>{setReviewingSynthesis(true);setDraft(x.result.revisedProposal);setModeratorEdited(false);loadedSynthesis.current=x.id;setSynthesis(x.id);setCoverage({});setReason('');}}>Carregar rascunho para revisão humana</button>}</details>)}
 {view.role==='moderator'&&isOpen&&!newestSynthesis&&!manual&&<details><summary>Intervir na rodada (opcional)</summary><p>Você pode revisar manualmente, sem apresentar o texto como síntese da IA.</p><button disabled={busy} onClick={()=>{setManual(true);setDraft(p.content);setSynthesis(undefined);setReason('');}}>Abrir revisão manual</button></details>}
 {view.role==='moderator'&&isOpen&&newestSynthesis&&!reviewingSynthesis&&!manual&&<button disabled={busy} onClick={()=>setReviewingSynthesis(true)}>Revisar nova proposta</button>}
 {view.role==='moderator'&&isOpen&&(reviewingSynthesis||manual)&&<section className="entry"><h3>Publicar proposta e abrir próxima rodada</h3><p>Revise o rascunho preparado pela IA. Ao publicar, todos deverão se manifestar novamente. Você também pode editar a proposta manualmente.</p>
 <label>Proposta revisada<textarea maxLength={5000} minLength={4} rows={6} value={revisionDraft.text} onChange={e=>{setDraft({...revisionDraft,text:e.target.value});setModeratorEdited(true);}}/></label>
 <details><summary>Editar título, contexto e demais campos (opcional)</summary><ProposalEditor value={revisionDraft} onChange={value=>{setDraft(value);setModeratorEdited(true);}}/></details>
 {sourceSynthesis&&<details><summary>Avaliação humana da síntese (opcional)</summary>{s.votes.filter(v=>syntheses.find(x=>x.id===sourceSynthesis)?.result.changeLog.some(c=>c.voteIds.includes(v.id))||syntheses.find(x=>x.id===sourceSynthesis)?.result.unresolvedObjections.includes(v.id)||syntheses.find(x=>x.id===sourceSynthesis)?.result.partiallyAddressedObjections.includes(v.id)||syntheses.find(x=>x.id===sourceSynthesis)?.result.addressedObjections.includes(v.id)).map(v=><fieldset key={v.id}><legend>Objeção: {v.justification}</legend>
 <label>Cobertura julgada pelo moderador<select value={coverage[v.id]?.status??''} onChange={e=>setCoverage({...coverage,[v.id]:{status:e.target.value as 'ATENDIDA'|'PARCIAL'|'NAO_ATENDIDA',faithful:coverage[v.id]?.faithful??null,note:coverage[v.id]?.note??''}})}><option value="">Não avaliada</option><option value="ATENDIDA">Atendida</option><option value="PARCIAL">Parcialmente atendida</option><option value="NAO_ATENDIDA">Não atendida</option></select></label>
 {coverage[v.id]?.status&&<><label>Representação fiel?<select value={coverage[v.id]?.faithful===null?'':String(coverage[v.id]?.faithful)} onChange={e=>setCoverage({...coverage,[v.id]:{...coverage[v.id],faithful:e.target.value===''?null:e.target.value==='true'}})}><option value="">Não avaliada</option><option value="true">Sim</option><option value="false">Não</option></select></label><label>Justificativa humana<textarea value={coverage[v.id]?.note??''} maxLength={2000} onChange={e=>setCoverage({...coverage,[v.id]:{...coverage[v.id],note:e.target.value}})}/></label></>}</fieldset>)}</details>}
 <label>Justificativa da revisão humana<textarea maxLength={5000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <button className="primary" disabled={busy||staleDraft||!reason.trim()} onClick={()=>void act(()=>mutate('/publish',{proposal:revisionDraft,sourceId:p.id,synthesisId:sourceSynthesis,reason,coverage:Object.entries(coverage).filter(([,v])=>v.status).map(([voteId,v])=>({voteId,...v})),confirm:true}))}>Confirmar revisão e publicar nova rodada</button>
 </section>}
 {view.role==='moderator'&&isOpen&&<details><summary>Encerrar sem consenso</summary><label>Razão para encerrar sem consenso<textarea value={closeReason} maxLength={5000} onChange={e=>setCloseReason(e.target.value)}/></label><button className="secondary" disabled={busy||!closeReason.trim()} onClick={()=>void act(()=>mutate('/close',{reason:closeReason}))}>Encerrar sem consenso</button>
 </details>}
 {view.role==='participant'&&(view.canViewGroup||s.factualChecks.some(f=>f.participantId===view.participantId))&&<section><h3>Contestar análise da IA</h3><label>Parecer<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Selecione</option>{[...s.analyses,...s.syntheses,...s.factualChecks,...s.contributions.filter(c=>c.participantId===view.participantId)].map(x=><option key={x.id} value={x.id}>{x.id.slice(0,8)}</option>)}</select></label><label>Explique sua contestação<textarea maxLength={2000} value={contestLater} onChange={e=>setContestLater(e.target.value)}/></label><button disabled={busy||!target||!contestLater.trim()} onClick={()=>void act(()=>mutate('/contest',{targetId:target,text:contestLater}))}>Registrar contestação</button></section>}
 {s.contests.length>0&&<details><summary>Contestações preservadas</summary>{s.contests.map(c=><p key={c.id}>{s.participants.find(p=>p.id===c.participantId)?.alias}: {c.text}</p>)}</details>}
 <details><summary>Histórico de propostas e rodadas</summary><h4>Rascunho inicial preservado</h4><p className="preserve">{s.initialDraft.text}</p>{s.proposals.map(x=><article key={x.id}><h4>V{x.version} · {new Date(x.createdAt).toLocaleString('pt-BR')}</h4><p className="preserve">{x.content.text}</p><p>Revisão humana: {x.review.reason||x.approvedBy}</p>{(view.role==='moderator'||publicIntervention(x))&&<RevisionHistory item={x}/>}</article>)}{s.events.map(e=><p key={e.id}><time>{new Date(e.at).toLocaleString('pt-BR')}</time> · {e.type} · {e.detail}</p>)}</details>
 {view.role==='participant'&&!isOpen&&(submitted?<p className="alert">Sua avaliação individual foi registrada.</p>:<EvaluationForm busy={busy} onSubmit={(input:EvaluationInput)=>act(()=>mutate('/evaluation',{input}))}/>)}
 {view.role==='moderator'&&<details open={!isOpen}><summary>Exportações e avaliação exploratória</summary><div className="actions"><button className="secondary" disabled={busy} onClick={()=>void act(async()=>downloadJSON(await post('/export',{}),'decisao-'+code+'.json'))}>Exportar processo JSON</button><button className="secondary" disabled={busy} onClick={()=>void act(async()=>downloadJSON(await post('/evaluation-results',{}),'avaliacao-'+code+'.json'))}>Exportar respostas e estatísticas DSR</button></div><details><summary>Indicadores desta sessão</summary><pre>{JSON.stringify(view.metrics,null,2)}</pre></details><p>Não há resultados científicos neste ambiente por padrão. Cobertura e fidelidade dependem de avaliação humana. Respostas abertas exigem codificação temática.</p></details>}
 </div>;
}

