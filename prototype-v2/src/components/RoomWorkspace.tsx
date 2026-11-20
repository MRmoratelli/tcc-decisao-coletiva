import { useState, useEffect, useRef } from 'react';
import type { RoomView,ReviewResult } from '../api';
import { request,downloadJSON } from '../api';
import { ProposalEditor } from './ProposalEditor';
import { ReviewCard } from './ReviewCard';
import { FactualPanel } from './FactualPanel';
import { EvaluationForm } from './EvaluationForm';
import type { ProposalContent,Choice,EvaluationInput } from '../../shared/contracts';
type Session={code:string;credential:string;view:RoomView};
export function RoomWorkspace({session,busy,act,onRefresh}:{session:Session;busy:boolean;act:(work:()=>Promise<void>)=>Promise<void>;onRefresh:()=>Promise<void>}){
 const {view,code,credential}=session,s=view.state,r=s.rounds[s.rounds.length-1],p=s.proposals[s.proposals.length-1];
 const [text,setText]=useState(''),[original,setOriginal]=useState(''),[review,setReview]=useState<ReviewResult|null>(null),[choice,setChoice]=useState<Choice>('ACEITO');
 const [contestText,setContest]=useState(''),[consent,setConsent]=useState(false),[bypass,setBypass]=useState(false);
 const [revisionDraft,setDraft]=useState<ProposalContent>(p.content),[reason,setReason]=useState(''),[sourceSynthesis,setSynthesis]=useState<string|undefined>(),[closeReason,setCloseReason]=useState('');
 const [coverage,setCoverage]=useState<Record<string,{status:'ATENDIDA'|'PARCIAL'|'NAO_ATENDIDA';faithful:boolean|null;note:string}>>({});
 const [staleDraft,setStaleDraft]=useState(false),[roundNotice,setRoundNotice]=useState('');
 const draftRound=useRef(p.id);
 const [target,setTarget]=useState(''),[contestLater,setContestLater]=useState('');
 useEffect(()=>{if(draftRound.current!==p.id){setRoundNotice('Nova rodada publicada. Confira a proposta antes de se manifestar.');setStaleDraft(true);setReview(null);setSynthesis(undefined);setCoverage({});} },[p.id]);
 const base={credential,revision:view.revision},binding={roundId:r.id,proposalId:p.id};
 const post=(suffix:string,data:object)=>request('/rooms/'+code+suffix,{...base,...data});
 const mutate=async(suffix:string,data:object)=>{await post(suffix,data);await onRefresh();};
 async function analyze(){await act(async()=>{if(!consent)throw new Error('Confirme o envio do texto ao Gemini.');setReview(await post('/contribution-review',{...binding,text,consent:true}) as ReviewResult);});}
 async function send(kind:'vote'|'contribution'){
  await act(async()=>{
   if(staleDraft||draftRound.current!==p.id)throw new Error('Confirme a reutilização do rascunho na nova rodada.');
   if(text&&!review&&!bypass)throw new Error('Solicite parecer ou marque continuar sem parecer.');
   if(['REJEITO','ACEITO_COM_RESSALVAS'].includes(choice)&&!text.trim()&&kind==='vote')throw new Error('Rejeição e aceite com ressalvas exigem justificativa.');
   const payload={...binding,receipt:review?.receipt,bypassReason:!review?'Autor optou por continuar sem parecer consultivo.':undefined,contest:contestText,originalText:original||text};
   await mutate(kind==='vote'?'/votes':'/contributions',kind==='vote'?{...payload,choice,justification:text}:{...payload,text});
   setText('');setOriginal('');setReview(null);setContest('');
  });
 }
 const analysis=s.analyses.filter(a=>a.proposalId===p.id).slice(-1)[0];
 const syntheses=s.syntheses.filter(x=>x.proposalId===p.id);
 const isOpen=s.decision.status==='OPEN';
 const ownVotes=s.votes.filter(v=>v.participantId===view.participantId&&v.roundId===r.id);
 const submitted=s.evaluations.some(e=>e.participantId===view.participantId);
 return <div className="workspace">
 {!isOpen&&text&&<details><summary>Seu rascunho não enviado, preservado após o encerramento</summary><p className="preserve">{text}</p></details>}
 {roundNotice&&<p className="alert" role="status">{roundNotice}</p>}
 {staleDraft&&<section className="alert"><p>Rascunhos preservados da versão anterior. Revise o conteúdo; nenhum voto foi transferido.</p><button onClick={()=>{draftRound.current=p.id;setStaleDraft(false);if(view.role!=='moderator')setDraft(p.content);setReason('');setChoice('ACEITO');setBypass(false);}}>Confirmar reutilização do meu texto na rodada atual</button><button onClick={()=>{draftRound.current=p.id;setStaleDraft(false);setText('');setOriginal('');setContest('');setDraft(p.content);setReason('');setChoice('ACEITO');setBypass(false);}}>Descartar rascunho anterior e iniciar novamente</button></section>}
 {p.intervention&&<section className="review"><h3>{p.intervention.kind==='EDICAO_HUMANA'?'Proposta revisada pelo moderador':'Proposta aprovada pelo moderador sem alteração'}</h3>{['SINTESE_IA','PARECER_INICIAL_IA'].includes(p.intervention.source)&&<p>{p.intervention.kind==='EDICAO_HUMANA'?'Texto sugerido pela IA e posteriormente modificado pelo moderador.':'Texto sugerido pela IA e aprovado sem alteração.'}</p>}<p>Responsável funcional: moderador · {new Date(p.intervention.at).toLocaleString('pt-BR')}</p><p>Justificativa: {p.intervention.reason}</p><details><summary>Comparar versão original e publicada</summary>{p.intervention.changes.map(c=><article key={c.field}><h4>{c.field}</h4><p>Original</p><blockquote className="preserve">{c.before}</blockquote><p>Revisado e publicado</p><blockquote className="preserve">{c.after}</blockquote></article>)}{!p.intervention.changes.length&&<p>Não houve alteração efetiva.</p>}</details></section>}

 <div className="status-strip" role="status"><b>Rodada {r.number} · Proposta V{p.version}</b><span>{s.decision.status==='CONSENSUS'?'Consenso unânime registrado':s.decision.status==='CLOSED_WITHOUT_CONSENSUS'?'Encerrado sem consenso':'Deliberação aberta'}</span></div>
 <p>Consenso exige ACEITO de todos os habilitados na mesma versão. Aceite com ressalvas, abstenção e silêncio não são aceitação incondicional.</p>
 {s.decision.closureReason&&<p className="alert">{s.decision.closureReason}</p>}
 <details><summary>Problema e contexto da versão atual</summary><dl>{Object.entries(p.content).filter(([key,value])=>!['title','text'].includes(key)&&value).map(([key,value])=><div key={key}><dt>{{problem:'Problema',decision:'Decisão pretendida',goals:'Objetivos',alternatives:'Alternativas',constraints:'Restrições',successCriteria:'Critérios de sucesso',context:'Contexto'}[key]}</dt><dd>{value}</dd></div>)}</dl></details>
 <ul className="positions">{view.positions.map(pos=><li key={pos.id}><b>{pos.alias}</b> {pos.choice.replaceAll('_',' ')}</li>)}</ul>
 {view.role==='participant'&&isOpen&&<section className="entry"><h3>Sua manifestação sobre V{p.version}</h3>
 <p>{ownVotes.length?'Você já se manifestou nesta versão. Uma nova manifestação preserva a anterior e passa a ser sua posição vigente.':'Registre sua posição explicitamente.'}</p>
 <label>Posição<select value={choice} onChange={e=>setChoice(e.target.value as Choice)}><option>ACEITO</option><option value="ACEITO_COM_RESSALVAS">ACEITO COM RESSALVAS</option><option>REJEITO</option><option>ABSTENHO</option></select></label>
 <label>Justificativa, objeção ou sugestão {['REJEITO','ACEITO_COM_RESSALVAS'].includes(choice)?'(obrigatória)':'(opcional)'}<textarea rows={5} maxLength={5000} value={text} onChange={e=>{setText(e.target.value);setReview(null);}}/></label>
 <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo enviar este texto e o contexto da proposta ao Gemini. Evite dados pessoais ou sensíveis.</label>
 <button className="secondary" disabled={busy||!consent||!text.trim()} onClick={()=>{if(!original)setOriginal(text);void analyze();}}>Analisar ou analisar novamente</button>
 {review&&<><ReviewCard review={review.review} label="Parecer da manifestação"/>{review.review.suggestedRewrite&&<button className="secondary" onClick={()=>{setText(review.review.suggestedRewrite);setReview(null);}}>Usar reformulação sugerida e revisar</button>}</>}
 <label>Contestação ao parecer (opcional)<textarea maxLength={2000} rows={2} value={contestText} onChange={e=>setContest(e.target.value)}/></label>
 <label className="check"><input type="checkbox" checked={bypass} onChange={e=>setBypass(e.target.checked)}/> Continuar com meu texto sem parecer da IA.</label>
 <div className="actions"><button className="primary" disabled={busy||staleDraft} onClick={()=>void send('vote')}>Registrar {choice}</button><button className="secondary" disabled={busy||!text.trim()} onClick={()=>void send('contribution')}>Enviar apenas contribuição</button></div>
 </section>}
 <section><h3>Manifestações registradas</h3>{!view.canViewGroup?<p>As manifestações alheias ficam ocultas até seu primeiro registro nesta versão.</p>:view.contributions.map(c=><article className="entry-card" key={c.id}><b>{c.alias}</b><p>{c.text}</p><small>{c.review?'Parecer consultivo registrado':'Enviada sem parecer'} · {c.user_choice==='ENVIAR_COM_RESSALVA'?'Parecer contestado':''}</small></article>)}
 {view.canViewGroup&&s.votes.filter(v=>v.roundId===r.id).map(v=><article className="entry-card" key={v.id}><b>{s.participants.find(p=>p.id===v.participantId)?.alias}: {v.choice.replaceAll('_',' ')}</b><p>{v.justification}</p></article>)}</section>
 <FactualPanel checks={s.factualChecks} busy={busy} isOpen={isOpen} onVerify={(value,mode)=>act(()=>mutate('/fact-check',{...binding,text:value,mode,consent:true}))}/>
 {view.role==='moderator'&&isOpen&&<section className="entry"><h3>Facilitação e revisão humana</h3>
 <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo enviar proposta e justificativas pseudonimizadas ao Gemini.</label>
 <div className="actions"><button className="secondary" disabled={busy||!consent} onClick={()=>void act(()=>mutate('/analyze-objections',{consent:true}))}>Analisar manifestações do grupo</button><button className="secondary" disabled={busy||!analysis||!consent} onClick={()=>void act(()=>mutate('/synthesize',{consent:true,analysisId:analysis?.id}))}>Sugerir síntese conciliadora</button></div>
 <p>As análises não removem objeções. A síntese permanece rascunho até publicação humana.</p></section>}
 {view.canViewGroup&&s.analyses.map(a=><details className="review" key={a.id}><summary>Parecer sobre manifestações · {s.proposals.find(p=>p.id===a.proposalId)?.version} · {a.id.slice(0,8)}</summary>
 {a.result.manifestationAssessments?.map(x=><article key={x.sourceId}><b>{x.kind} · {x.sourceId.slice(0,8)}</b><blockquote>{x.quotedExcerpt||'Posição formal sem justificativa textual.'}</blockquote><p>Interpretação da IA: {x.interpretation}</p><p>Caminho sugerido: {x.suggestedPath}</p></article>)}
 {a.result.individualAssessments.map(x=><article key={x.voteId}><blockquote>{x.quotedExcerpt}</blockquote><p>{x.explanation}</p><p>Pertinência: {x.relevance}. Incerteza: {x.uncertainty}</p><p>Premissas: {x.premises.join('; ')}. Evidências: {x.evidence.join('; ')}. Riscos: {x.risks.join('; ')}</p></article>)}
 {Object.entries(a.result).filter(([key])=>!['individualAssessments','manifestationAssessments'].includes(key)).map(([key,v])=><p key={key}><b>{({sharedInterests:'Interesses comuns',convergences:'Convergências',conflicts:'Conflitos',incompatibleObjections:'Objeções incompatíveis',nonNegotiableConditions:'Condições inegociáveis',uncertainties:'Incertezas'} as Record<string,string>)[key]}</b>: {(v as string[]).join('; ')}</p>)}</details>)}
 {view.canViewGroup&&s.syntheses.map(x=><details className="review" key={x.id}><summary>Síntese consultiva · {x.id.slice(0,8)} · {x.publishedProposalId?'Publicada após revisão humana':'Rascunho'}</summary><p>{x.result.revisedProposal.text}</p><ul>{x.result.changeLog.map((c,i)=><li key={i}>{c.change} — {c.reason} (manifestações: {c.sourceIds?.join(', ')||c.voteIds.join(', ')||'nenhuma'})</li>)}</ul><p>Atendidas sugeridas: {x.result.addressedObjections.join(', ')||'nenhuma'}</p><p>Parcialmente atendidas: {x.result.partiallyAddressedObjections.join(', ')||'nenhuma'}</p><p>Não atendidas: {x.result.unresolvedObjections.join(', ')||'nenhuma'}</p><p>Impasses: {x.result.remainingImpasses.join('; ')||'não informados'}</p><p>Viabilidade: {x.result.feasibilityWarnings.join('; ')||'não informada'}</p>
 {view.role==='moderator'&&isOpen&&x.proposalId===p.id&&!x.publishedProposalId&&<button className="secondary" onClick={()=>{setDraft(x.result.revisedProposal);setSynthesis(x.id);setCoverage({});}}>Carregar rascunho para revisão humana</button>}</details>)}
 {view.role==='moderator'&&isOpen&&<section className="entry"><h3>Publicar V{p.version+1}</h3><p>Edite todos os campos antes de confirmar. Nova versão exige novas posições de todos. A revisão manual continua disponível se a IA falhar.</p>
 <ProposalEditor value={revisionDraft} onChange={setDraft}/>
 {sourceSynthesis&&<><h4>Avaliação humana da síntese (opcional)</h4>{s.votes.filter(v=>syntheses.find(x=>x.id===sourceSynthesis)?.result.changeLog.some(c=>c.voteIds.includes(v.id))||syntheses.find(x=>x.id===sourceSynthesis)?.result.unresolvedObjections.includes(v.id)||syntheses.find(x=>x.id===sourceSynthesis)?.result.partiallyAddressedObjections.includes(v.id)||syntheses.find(x=>x.id===sourceSynthesis)?.result.addressedObjections.includes(v.id)).map(v=><fieldset key={v.id}><legend>Objeção: {v.justification}</legend>
 <label>Cobertura julgada pelo moderador<select value={coverage[v.id]?.status??''} onChange={e=>setCoverage({...coverage,[v.id]:{status:e.target.value as 'ATENDIDA'|'PARCIAL'|'NAO_ATENDIDA',faithful:coverage[v.id]?.faithful??null,note:coverage[v.id]?.note??''}})}><option value="">Não avaliada</option><option value="ATENDIDA">Atendida</option><option value="PARCIAL">Parcialmente atendida</option><option value="NAO_ATENDIDA">Não atendida</option></select></label>
 {coverage[v.id]?.status&&<><label>Representação fiel?<select value={coverage[v.id]?.faithful===null?'':String(coverage[v.id]?.faithful)} onChange={e=>setCoverage({...coverage,[v.id]:{...coverage[v.id],faithful:e.target.value===''?null:e.target.value==='true'}})}><option value="">Não avaliada</option><option value="true">Sim</option><option value="false">Não</option></select></label><label>Justificativa humana<textarea value={coverage[v.id]?.note??''} maxLength={2000} onChange={e=>setCoverage({...coverage,[v.id]:{...coverage[v.id],note:e.target.value}})}/></label></>}</fieldset>)}</>}
 <label>Justificativa da revisão humana<textarea maxLength={5000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <button className="primary" disabled={busy||staleDraft||!reason.trim()} onClick={()=>void act(()=>mutate('/publish',{proposal:revisionDraft,sourceId:p.id,synthesisId:sourceSynthesis,reason,coverage:Object.entries(coverage).filter(([,v])=>v.status).map(([voteId,v])=>({voteId,...v})),confirm:true}))}>Confirmar revisão e publicar nova rodada</button>
 <hr/><label>Razão para encerrar sem consenso<textarea value={closeReason} maxLength={5000} onChange={e=>setCloseReason(e.target.value)}/></label><button className="secondary" disabled={busy||!closeReason.trim()} onClick={()=>void act(()=>mutate('/close',{reason:closeReason}))}>Encerrar sem consenso</button>
 </section>}
 {view.role==='participant'&&(view.canViewGroup||s.factualChecks.some(f=>f.participantId===view.participantId))&&<section><h3>Contestar análise da IA</h3><label>Parecer<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Selecione</option>{[...s.analyses,...s.syntheses,...s.factualChecks,...s.contributions.filter(c=>c.participantId===view.participantId)].map(x=><option key={x.id} value={x.id}>{x.id.slice(0,8)}</option>)}</select></label><label>Explique sua contestação<textarea maxLength={2000} value={contestLater} onChange={e=>setContestLater(e.target.value)}/></label><button disabled={busy||!target||!contestLater.trim()} onClick={()=>void act(()=>mutate('/contest',{targetId:target,text:contestLater}))}>Registrar contestação</button></section>}
 {s.contests.length>0&&<details><summary>Contestações preservadas</summary>{s.contests.map(c=><p key={c.id}>{s.participants.find(p=>p.id===c.participantId)?.alias}: {c.text}</p>)}</details>}
 <details><summary>Histórico de propostas e rodadas</summary><h4>Rascunho inicial preservado</h4><p className="preserve">{s.initialDraft.text}</p>{s.proposals.map(x=><article key={x.id}><h4>V{x.version} · {new Date(x.createdAt).toLocaleString('pt-BR')}</h4><p className="preserve">{x.content.text}</p><p>Revisão humana: {x.review.reason||x.approvedBy}</p></article>)}{s.events.map(e=><p key={e.id}><time>{new Date(e.at).toLocaleString('pt-BR')}</time> · {e.type} · {e.detail}</p>)}</details>
 {view.role==='participant'&&!isOpen&&(submitted?<p className="alert">Sua avaliação individual foi registrada.</p>:<EvaluationForm busy={busy} onSubmit={(input:EvaluationInput)=>act(()=>mutate('/evaluation',{input}))}/>)}
 {view.role==='moderator'&&<section className="entry"><h3>Exportação e avaliação exploratória</h3><div className="actions"><button className="secondary" disabled={busy} onClick={()=>void act(async()=>downloadJSON(await post('/export',{}),'decisao-'+code+'.json'))}>Exportar processo JSON</button><button className="secondary" disabled={busy} onClick={()=>void act(async()=>downloadJSON(await post('/evaluation-results',{}),'avaliacao-'+code+'.json'))}>Exportar respostas e estatísticas DSR</button></div><details><summary>Indicadores desta sessão</summary><pre>{JSON.stringify(view.metrics,null,2)}</pre></details><p>Não há resultados científicos neste ambiente por padrão. Cobertura e fidelidade dependem de avaliação humana. Respostas abertas exigem codificação temática.</p></section>}
 </div>;
}

