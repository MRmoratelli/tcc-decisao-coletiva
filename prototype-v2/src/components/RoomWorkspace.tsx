import { useState, useEffect, useRef } from 'react';
import type { RoomView,ReviewResult } from '../api';
import { request,downloadJSON } from '../api';
import {RoundAnalysis,RoundHistory,SynthesisDetails,RevisionHistory,sourceLabel,closureLabels,departureLabels} from './RoundViews';
import { ProposalEditor } from './ProposalEditor';
import { ReviewCard } from './ReviewCard';
import { EvaluationForm } from './EvaluationForm';
import type { ProposalContent,Choice,EvaluationInput } from '../../shared/contracts';
type Session={code:string;credential:string;view:RoomView};
export function RoomWorkspace({session,busy,act,onRefresh}:{session:Session;busy:boolean;act:(work:()=>Promise<void>)=>Promise<void>;onRefresh:()=>Promise<void>}){
 const {view,code,credential}=session,s=view.state,r=s.rounds[s.rounds.length-1],p=s.proposals[s.proposals.length-1];
 const [text,setText]=useState(''),[original,setOriginal]=useState(''),[review,setReview]=useState<ReviewResult|null>(null),[choice,setChoice]=useState<Choice>('ACEITO'),[rewriteApplied,setRewriteApplied]=useState(false);
 const [analyzing,setAnalyzing]=useState(false),[hasAnalyzed,setHasAnalyzed]=useState(false),[reviewChoice,setReviewChoice]=useState<'USED_REWRITE'|'KEPT_ORIGINAL'|'DISCARDED'>('KEPT_ORIGINAL');
 const [contestText,setContest]=useState(''),[consent,setConsent]=useState(false),[bypass,setBypass]=useState(false);
 const [moderatorEdited,setModeratorEdited]=useState(false),[manual,setManual]=useState(false),[reviewingSynthesis,setReviewingSynthesis]=useState(false);
 const [clock,setClock]=useState(Date.now()),[availableAt,setAvailableAt]=useState(0);
 useEffect(()=>{
  if(!r.voting&&view.role!=='participant')return;
  const offset=view.serverNow===undefined?0:view.serverNow-Date.now();
  const updateClock=()=>setClock(Date.now()+offset);
  updateClock();
  const timer=setInterval(updateClock,1000);
  (timer as unknown as {unref?:()=>void}).unref?.();
  return()=>clearInterval(timer);
 },[view.role,view.serverNow,r.id]);
 const ownReview=s.reviewRequests?.find(x=>x.participantId===view.participantId);
 const reviewWait=Math.max(0,Math.ceil((Math.max(availableAt,ownReview?Date.parse(ownReview.at)+60000:0)-clock)/1000));
 const [revisionDraft,setDraft]=useState<ProposalContent>(p.content),[reason,setReason]=useState(''),[sourceSynthesis,setSynthesis]=useState<string|undefined>(),[closeReason,setCloseReason]=useState('');
 const [confirmClose,setConfirmClose]=useState(false);
 const [removing,setRemoving]=useState(''),[departureKind,setDepartureKind]=useState<keyof typeof departureLabels>('DESISTENCIA');
 const [staleDraft,setStaleDraft]=useState(false),[roundNotice,setRoundNotice]=useState('');
 const draftRound=useRef(p.id);
 const [target,setTarget]=useState(''),[contestLater,setContestLater]=useState('');
 useEffect(()=>{if(draftRound.current!==p.id){
  const needsDraftReview=view.role==='moderator'?moderatorEdited&&JSON.stringify(revisionDraft)!==JSON.stringify(p.content):Boolean(text.trim()||original.trim()||contestText.trim());
  setConfirmClose(false);setRemoving('');
  setRoundNotice('Nova rodada publicada. Confira a proposta antes de se manifestar.');
  setStaleDraft(needsDraftReview);if(!needsDraftReview){draftRound.current=p.id;setDraft(p.content);setModeratorEdited(false);setReason('');}
  setReview(null);setHasAnalyzed(false);setRewriteApplied(false);setSynthesis(undefined);
  setChoice(text.trim()?'REJEITO':'ACEITO');setConsent(false);setBypass(false);setManual(false);setReviewingSynthesis(false);
 }},[p.id]);
 const base={credential,revision:view.revision},binding={roundId:r.id,proposalId:p.id};
 const post=(suffix:string,data:object)=>request('/rooms/'+code+suffix,{...base,...data});
 const mutate=async(suffix:string,data:object)=>{await post(suffix,data);await onRefresh();};
 async function analyze(){setAnalyzing(true);try{await act(async()=>{if(!consent)throw new Error('Confirme o envio do texto ao Gemini.');setOriginal(text);const result=await post('/contribution-review',{...binding,text,consent:true}) as ReviewResult;setReview(result);setAvailableAt(result.availableAt?Date.parse(result.availableAt):Date.now()+60000);await onRefresh();setHasAnalyzed(true);setReviewChoice('KEPT_ORIGINAL');setRewriteApplied(false);setBypass(false);});}finally{setAnalyzing(false);}}
 async function send(kind:'vote'|'contribution'){
  await act(async()=>{
   if(kind==='vote'&&ownVotes.length)throw new Error('Seu voto nesta rodada já foi registrado. Aguarde uma nova rodada.');
   if(staleDraft||draftRound.current!==p.id)throw new Error('Confirme a reutilização do rascunho na nova rodada.');
   if(kind==='vote'&&choice==='ACEITO'){await mutate('/votes',{...binding,choice,justification:''});setText('');setOriginal('');setReview(null);setContest('');return;}
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
 const secondsLeft=r.voting?Math.max(0,Math.ceil((Date.parse(r.voting.deadlineAt)-clock)/1000)):null;
 const votingOpen=isOpen&&r.status==='OPEN'&&secondsLeft!==0;
 const ownDeparture=s.participants.find(p=>p.id===view.participantId)?.departure;
 const canVote=votingOpen&&!ownDeparture&&(!r.voting||r.voting.eligibleIds.includes(view.participantId??''));
 const pendingCount=r.voting?(view.pendingVoteCount??0):s.participants.length-latestCount();
 const selectable=s.participants.filter(p=>!p.departure&&(!s.enrollment||s.enrollment.claims.includes(p.id)));
 function latestCount(){return new Set(s.votes.filter(v=>v.roundId===r.id).map(v=>v.participantId)).size;}
 const newestSynthesis=syntheses.filter(x=>!x.publishedProposalId).at(-1);
 const loadedSynthesis=useRef<string|undefined>(undefined);
 useEffect(()=>{
  if(view.role==='moderator'&&newestSynthesis&&!moderatorEdited&&loadedSynthesis.current!==newestSynthesis.id){
   loadedSynthesis.current=newestSynthesis.id;
   setDraft(newestSynthesis.result.revisedProposal);setSynthesis(newestSynthesis.id);
   setReason('');setStaleDraft(false);draftRound.current=p.id;
  }
 },[newestSynthesis?.id,view.role]);
 const synthesisSource=syntheses.find(x=>x.id===sourceSynthesis);
 const publicationChanged=Object.keys(revisionDraft).some(k=>revisionDraft[k as keyof ProposalContent]!==(synthesisSource?.result.revisedProposal??p.content)[k as keyof ProposalContent]);
 const needsPublicationReason=!synthesisSource||publicationChanged;
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
 return <div className="workspace">
 {!isOpen&&text&&<details><summary>Seu rascunho não enviado, preservado após o encerramento</summary><p className="preserve">{text}</p></details>}
 {roundNotice&&<p className="alert" role="status">{roundNotice}</p>}
 {staleDraft&&<section className="alert"><p>Rascunhos preservados da versão anterior. Revise o conteúdo; nenhum voto foi transferido.</p><button onClick={()=>{draftRound.current=p.id;setStaleDraft(false);if(view.role!=='moderator')setDraft(p.content);setReason('');setChoice(text.trim()?'REJEITO':'ACEITO');setBypass(false);}}>Confirmar reutilização do meu texto na rodada atual</button><button onClick={()=>{draftRound.current=p.id;setStaleDraft(false);setText('');setOriginal('');setContest('');setDraft(p.content);setReason('');setChoice('ACEITO');setBypass(false);}}>Descartar rascunho anterior e iniciar novamente</button></section>}
 <section aria-label="Proposta vigente e votação"><div className="proposal"><h3>{votingOpen?'Proposta em votação':isOpen?'Proposta vigente':'Proposta final'} — V{p.version} · Rodada {r.number}</h3><p className="preserve">{p.content.text}</p></div>
 {p.intervention?.kind==='EDICAO_HUMANA'&&p.version>1&&<p className="alert"><b>Proposta alterada pelo moderador.</b> Justificativa: {p.intervention.reason}</p>}
 {p.intervention&&<RevisionHistory item={p}/>}
 <div className="status-strip" role="status"><b>Rodada {r.number} · Proposta V{p.version}</b><span>{s.decision.status==='CONSENSUS'?'Consenso unânime registrado':s.decision.status==='CLOSED_WITHOUT_CONSENSUS'?'Encerrado sem consenso':votingOpen?'Votação aberta':'Votação encerrada'}</span></div>
 {secondsLeft!==null&&r.status==='OPEN'&&<p>Tempo restante <output role="timer" aria-label="Tempo restante para votar">{Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,'0')}</output></p>}
 {r.voting?.closure&&<p>{closureLabels[r.voting.closure.cause]} · {r.voting.closure.abstentions.length} abstenção(ões)</p>}
 <p>Consenso exige Aceito de todos os habilitados para a mesma proposta. Se precisar de ajustes para aceitar, escolha Rejeito e explique.</p>
 {s.decision.closureReason&&<p className="alert">{s.decision.closureReason}</p>}
 <details><summary>Problema e contexto da versão atual</summary><dl>{Object.entries(p.content).filter(([key,value])=>!['title','text'].includes(key)&&value).map(([key,value])=><div key={key}><dt>{{problem:'Problema',decision:'Decisão pretendida',goals:'Objetivos',alternatives:'Alternativas',constraints:'Restrições',successCriteria:'Critérios de sucesso',context:'Contexto'}[key]}</dt><dd>{value}</dd></div>)}</dl></details>
 <ul className="positions">{view.positions.map(pos=>{
  const departure=s.participants.find(p=>p.id===pos.id)?.departure;
  return <li key={pos.id}><b>{pos.alias}</b> {departureLabels[pos.choice as keyof typeof departureLabels]??(pos.choice==='ABSTENCAO'?'Abstenção':pos.choice.replaceAll('_',' '))}{departure&&pos.choice!==departure.kind?' · '+departureLabels[departure.kind]:''}</li>;
 })}</ul>
 {view.role==='moderator'&&isOpen&&r.voting&&selectable.length>0&&<details><summary>Registrar saída de participante</summary>
  <label>Participante<select value={removing} onChange={e=>setRemoving(e.target.value)}><option value="">Selecione</option>{selectable.map(p=><option key={p.id} value={p.id}>{p.alias}</option>)}</select></label>
  <label>Motivo da saída<select value={departureKind} onChange={e=>setDepartureKind(e.target.value as keyof typeof departureLabels)}><option value="DESISTENCIA">Desistência comunicada</option><option value="ABANDONO">Abandono registrado pelo moderador</option></select></label>
  <p>O participante perde o direito de enviar novas manifestações. Os votos já registrados continuam válidos.</p>
  <button disabled={busy||!removing||!selectable.some(p=>p.id===removing)} onClick={()=>void act(async()=>{await mutate('/participant-remove',{roundId:r.id,participantId:removing,kind:departureKind,confirm:true});setRemoving('');})}>Confirmar saída</button>
 </details>}
 {view.role==='moderator'&&votingOpen&&r.voting&&<section>
  {!confirmClose?<button className="secondary" disabled={busy} onClick={()=>setConfirmClose(true)}>Encerrar rodada antecipadamente</button>:<>
   <p role="status">{pendingCount} voto(s) pendente(s). Estes participantes serão registrados com Abstenção.</p>
   <div className="actions"><button className="secondary" disabled={busy} onClick={()=>void act(async()=>{await mutate('/round-close',{roundId:r.id,pendingCount,confirm:true});setConfirmClose(false);})}>Confirmar encerramento da rodada</button><button disabled={busy} onClick={()=>setConfirmClose(false)}>Cancelar</button></div>
  </>}
 </section>}
 {view.role==='participant'&&ownDeparture&&<p role="status">Sua saída foi registrada como {departureLabels[ownDeparture.kind]}.</p>}
 {view.role==='participant'&&isOpen&&ownVotes.length>0&&<section className="entry" role="status"><h3>Voto registrado nesta rodada</h3><p>Sua posição foi registrada. Aguarde o moderador publicar uma nova rodada para votar novamente. A tela será atualizada automaticamente.</p></section>}
 {view.role==='participant'&&canVote&&ownVotes.length===0&&<section className="entry"><h3>Sua manifestação sobre V{p.version}</h3>
 <p>Registre sua posição explicitamente. Cada participante pode votar uma única vez por rodada.</p>
 <label>Posição<select value={choice} onChange={e=>setChoice(e.target.value as Choice)}><option value="ACEITO">Aceito a proposta como está</option><option value="REJEITO">Rejeito e proponho ajustes</option></select></label>
 {choice==='ACEITO'?<p>Ao registrar ACEITO, você aceita a proposta vigente como está, sem condições ou pedidos de mudança. Se algo impede sua aceitação, escolha REJEITO e explique.</p>:<>
 <label>Justificativa, objeção ou sugestão {choice==='REJEITO'?'(obrigatória)':'(opcional)'}<textarea rows={5} maxLength={5000} value={text} onChange={e=>{setText(e.target.value);setReview(null);setRewriteApplied(false);}}/></label>
 <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo enviar este texto e o contexto da proposta ao Gemini. Evite dados pessoais ou sensíveis.</label>
 <button className="secondary" disabled={busy||analyzing||reviewWait>0||(ownReview?.status==='RUNNING'&&clock-Date.parse(ownReview.at)<900000)||!consent||!text.trim()} onClick={()=>{void analyze();}}>{analyzing?'Analisando seu argumento…':hasAnalyzed?'Revisar novamente com IA':'Revisar meu argumento com IA'}</button>
 {reviewWait>0&&<p role="status">Novo pedido de parecer disponível em {reviewWait} segundos. O intervalo é individual; seu texto e o parecer recebido permanecem disponíveis.</p>}
 {analyzing&&<p role="status">Pedido em andamento. Se houver fila, aguarde; você não precisa enviar novamente.</p>}
 <p className="muted">A IA analisa sua justificativa e oferece observações para ajudar na discussão. Você decide se deseja ajustar o texto antes de registrar sua posição.</p>
 {review&&<><ReviewCard review={review.review} label="Parecer da manifestação"/>{review.review.suggestedRewrite&&!rewriteApplied&&<button className="secondary" disabled={busy||!review.rewriteReceipt} onClick={()=>{setText(review.review.suggestedRewrite);setRewriteApplied(true);setReviewChoice('USED_REWRITE');setBypass(false);}}>Usar reformulação da IA</button>}<button className="text-button" disabled={busy||reviewChoice==='DISCARDED'} onClick={()=>{setText(original);setRewriteApplied(false);setReviewChoice('DISCARDED');setBypass(false);}}>Descartar parecer da IA</button>{reviewChoice==='DISCARDED'&&<p role="status">Seu texto original foi mantido. Registre sua posição quando estiver pronto.</p>}{rewriteApplied&&<p className="alert" role="status">Reformulação da IA selecionada. Revise o texto e clique em Registrar para confirmar que ele representa sua posição. O parecer será preservado; não é necessário marcar “sem parecer”.</p>}</>}
 {review&&<details><summary>Contestar este parecer (opcional)</summary><label>Explique sua contestação<textarea maxLength={2000} rows={2} value={contestText} onChange={e=>setContest(e.target.value)}/></label></details>}
 {!review&&<label className="check"><input type="checkbox" checked={bypass} onChange={e=>setBypass(e.target.checked)}/> Continuar com meu texto sem parecer da IA.</label>}
 </>}
 <div className="actions"><button className="primary" disabled={busy||staleDraft||(choice==='REJEITO'&&!text.trim())} onClick={()=>void send('vote')}>Registrar {choice.replaceAll("_"," ")}</button>{choice==='REJEITO'&&<button className="secondary" disabled={busy||!text.trim()} onClick={()=>void send('contribution')}>Enviar apenas contribuição</button>}</div>
 </section>}
 <section aria-label="Manifestações da rodada atual"><h3>Manifestações registradas · posições vigentes</h3>
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
 </section>
 {view.role==='moderator'&&isOpen&&<section className="entry"><h3>Preparação da próxima proposta — V{p.version+1}</h3>
 {s.enrollment?.automaticMediation?<><p>{votingOpen?'Aguardando o encerramento da votação. '+pendingCount+' voto(s) pendente(s).':s.mediation?.detail??'A síntese automática é preparada quando há justificativas ou contribuições para revisar.'}</p>
 {s.mediation?.status==='RUNNING'&&<p role="status">A IA está preparando o rascunho. Você poderá revisá-lo antes de publicar.</p>}
 {s.mediation?.status==='FAILED'&&<button disabled={busy} onClick={()=>void act(()=>mutate('/prepare-mediation',{}))}>Tentar preparar síntese novamente</button>}
 </>:<><label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo enviar proposta e justificativas pseudonimizadas ao Gemini.</label>
 <div className="actions"><button className="secondary" disabled={busy||!consent} onClick={()=>void act(()=>mutate('/analyze-objections',{consent:true}))}>Analisar manifestações do grupo</button><button className="secondary" disabled={busy||!analysis||!consent} onClick={()=>void act(()=>mutate('/synthesize',{consent:true,analysisId:analysis?.id}))}>Sugerir síntese conciliadora</button></div></>}
 <p>A síntese permanece rascunho privado do moderador até a publicação humana.</p></section>}
 {view.canViewGroup&&isOpen&&analysis&&<RoundAnalysis state={s} analysis={analysis}/>}
 {view.role==='moderator'&&isOpen&&newestSynthesis&&<section className="entry" aria-label="Próxima proposta"><h3>Próxima proposta — rascunho V{p.version+1}</h3><p className="alert">Ainda não publicada. A proposta em votação continua sendo V{p.version}.</p>{!reviewingSynthesis&&<p className="preserve">{newestSynthesis.result.revisedProposal.text}</p>}<SynthesisDetails state={s} synthesis={newestSynthesis}/>{!reviewingSynthesis&&!manual&&<button disabled={busy} onClick={()=>setReviewingSynthesis(true)}>Revisar nova proposta</button>}</section>}
 {view.role==='moderator'&&isOpen&&!newestSynthesis&&!manual&&<details><summary>Intervir na rodada (opcional)</summary><p>Você pode revisar manualmente, sem apresentar o texto como síntese da IA.</p><button disabled={busy} onClick={()=>{setManual(true);setDraft(p.content);setSynthesis(undefined);setReason('');}}>Abrir revisão manual</button></details>}
 {view.role==='moderator'&&isOpen&&(reviewingSynthesis||manual)&&<section className="entry"><h3>Revisão e publicação de V{p.version+1}</h3><p>Revise o rascunho preparado pela IA. Ao publicar, todos deverão se manifestar novamente. Você também pode editar a proposta manualmente.</p>
 <label>Proposta revisada<textarea maxLength={5000} minLength={4} rows={6} value={revisionDraft.text} onChange={e=>{setDraft({...revisionDraft,text:e.target.value});setModeratorEdited(true);}}/></label>
 <details><summary>Editar título, contexto e demais campos (opcional)</summary><ProposalEditor hideText value={revisionDraft} onChange={value=>{setDraft(value);setModeratorEdited(true);}}/></details>
 {needsPublicationReason?<label>Justificativa das alterações do moderador<textarea name={'publicationReason'} required maxLength={5000} value={reason} onChange={e=>setReason(e.target.value)}/></label>:<p>Você está publicando a sugestão da IA sem alterações. Sua aprovação será registrada automaticamente.</p>}
 {r.voting&&r.status==='OPEN'&&<p>Encerre a rodada atual para publicar a proposta revisada.</p>}
 <button className="primary" disabled={busy||Boolean(r.voting&&r.status==='OPEN')||staleDraft||(needsPublicationReason&&!reason.trim())} onClick={()=>void act(()=>mutate('/publish',{proposal:revisionDraft,sourceId:p.id,synthesisId:sourceSynthesis,reason:needsPublicationReason?reason:'',confirm:true}))}>Confirmar revisão e publicar nova rodada</button>
 </section>}
 {view.role==='moderator'&&isOpen&&<details><summary>Encerrar sem consenso</summary><label>Razão para encerrar sem consenso<textarea value={closeReason} maxLength={5000} onChange={e=>setCloseReason(e.target.value)}/></label><button className="secondary" disabled={busy||!closeReason.trim()} onClick={()=>void act(()=>mutate('/close',{reason:closeReason}))}>Encerrar sem consenso</button>
 </details>}
 {view.role==='participant'&&!ownDeparture&&view.canViewGroup&&<section><h3>Contestar análise da IA</h3><label>Parecer<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Selecione</option>{[...s.analyses,...s.syntheses,...s.contributions.filter(c=>c.participantId===view.participantId)].map(x=><option key={x.id} value={x.id}>{s.analyses.some(a=>a.id===x.id)?'Análise da rodada ':s.syntheses.some(a=>a.id===x.id)?'Sugestão da rodada ':'Parecer da rodada '}{s.rounds.find(r=>r.id===x.roundId)?.number}</option>)}</select></label><label>Explique sua contestação<textarea maxLength={2000} value={contestLater} onChange={e=>setContestLater(e.target.value)}/></label><button disabled={busy||!target||!contestLater.trim()} onClick={()=>void act(()=>mutate('/contest',{targetId:target,text:contestLater}))}>Registrar contestação</button></section>}
 {s.contests.length>0&&<details><summary>Contestações preservadas</summary>{s.contests.map(c=><p key={c.id}>{s.participants.find(p=>p.id===c.participantId)?.alias}: {c.text}</p>)}</details>}
 <RoundHistory state={s} showInitialReview={view.role==='moderator'}/>
 {view.role==='participant'&&!ownDeparture&&!isOpen&&(submitted?<p className="alert">Sua avaliação individual foi registrada.</p>:<EvaluationForm busy={busy} onSubmit={(input:EvaluationInput)=>act(()=>mutate('/evaluation',{input}))}/>)}
 {view.role==='moderator'&&<details open={!isOpen}><summary>Exportações e avaliação exploratória</summary><div className="actions"><button className="secondary" disabled={busy} onClick={()=>void act(async()=>downloadJSON(await post('/export',{}),'decisao-'+code+'.json'))}>Exportar registros da sessão</button><button className="secondary" disabled={busy} onClick={()=>void act(async()=>downloadJSON(await post('/evaluation-results',{}),'avaliacao-'+code+'.json'))}>Exportar respostas e estatísticas</button></div><details><summary>Indicadores desta sessão</summary><p>Indicadores operacionais. Avaliações humanas de cobertura/fidelidade, quando presentes, são históricas e não são coletadas neste fluxo.</p><pre>{JSON.stringify((view.metrics as {automatic?:unknown}|null)?.automatic,null,2)}</pre></details><p>Não há resultados científicos neste ambiente por padrão. Cobertura e fidelidade dependem de avaliação humana. Respostas abertas exigem codificação temática.</p></details>}
 </div>;
}

