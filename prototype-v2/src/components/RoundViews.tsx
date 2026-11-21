import {ReviewCard} from './ReviewCard';
import type {RoomView} from '../api';
type State=RoomView['state'];
type Analysis=State['analyses'][number];
type Synthesis=State['syntheses'][number];
export const proposalLabels:Record<string,string>={title:'Título',problem:'Problema',decision:'Decisão pretendida',goals:'Objetivos',alternatives:'Alternativas',constraints:'Restrições',successCriteria:'Critérios de sucesso',context:'Contexto',text:'Texto da proposta'};
export function sourceLabel(s:State,id:string){
 const item=[...s.votes,...s.contributions,...s.contests].find(x=>x.id===id);
 if(!item)return 'Registro da rodada';
 const alias=s.participants.find(p=>p.id===item.participantId)?.alias??'Participante';
 return alias+('choice' in item?' — '+({ACEITO:'apoio',REJEITO:'rejeição',ACEITO_COM_RESSALVAS:'ressalva',ABSTENHO:'abstenção'}[item.choice]):' — contribuição');
}
function Lines({title,items}:{title:string;items:string[]}){return items.length?<div><h4>{title}</h4><ul>{items.map((text,n)=><li key={n}>{text}</li>)}</ul></div>:null;}
export function RevisionHistory({item}:{item:State['proposals'][number]}){
 const i=item.intervention;if(!i||item.version===1&&i.kind==='APROVACAO_HUMANA'&&i.source!=='PARECER_INICIAL_IA')return null;
 return <details><summary>Alterações do moderador nesta versão</summary><p>{i.kind==='EDICAO_HUMANA'?'Proposta alterada pelo moderador':'Sugestão aprovada sem alterações'} · {new Date(i.at).toLocaleString('pt-BR')}</p><p>Justificativa: {i.reason}</p>{i.changes.map(c=><article key={c.field}><h4>{proposalLabels[c.field]??c.field}</h4><p>{i.source==='SINTESE_IA'?'Sugestão original da IA':'Texto anterior'}</p><blockquote className="preserve">{c.before}</blockquote><p>Versão publicada</p><blockquote className="preserve">{c.after}</blockquote></article>)}{!i.changes.length&&<p>O texto foi publicado sem alterações.</p>}</details>;
}
export function RoundAnalysis({state:s,analysis:a}:{state:State;analysis:Analysis}){
 const keys={sharedInterests:'Interesses comuns',convergences:'Acordos e aproximações',conflicts:'Divergências',incompatibleObjections:'Incompatibilidades',nonNegotiableConditions:'Condições apontadas',uncertainties:'Informações ainda incertas'} as const;
 return <section className="review"><h3>Resumo da rodada {s.rounds.find(r=>r.id===a.roundId)?.number} pela IA</h3><p>Parecer consultivo. As interpretações precisam ser conferidas pelo grupo.</p>{Object.entries(keys).map(([key,title])=><Lines key={key} title={title} items={a.result[key as keyof typeof keys]}/>)}<details><summary>Ver análise por participante</summary>{a.result.manifestationAssessments?.map(x=>{
 const detail=a.result.individualAssessments.find(v=>v.voteId===x.sourceId);
 return <article key={x.sourceId}><h4>{sourceLabel(s,x.sourceId)}</h4><small>{x.quoteOrigin==='ORIGINAL'?'Trecho do texto original':'Trecho da manifestação enviada'}</small><blockquote>{x.quotedExcerpt||'Aceitação registrada sem justificativa.'}</blockquote><p>Interpretação: {x.interpretation}</p><p>Caminho sugerido: {x.suggestedPath}</p>{detail&&<details><summary>Fundamentação da análise</summary><p>{detail.explanation}</p><p>Incerteza: {detail.uncertainty}</p><Lines title="Premissas" items={detail.premises}/><Lines title="Evidências informadas" items={detail.evidence}/><Lines title="Riscos" items={detail.risks}/></details>}</article>;
 })}{!a.result.manifestationAssessments&&a.result.individualAssessments.map(x=><article key={x.voteId}><h4>{sourceLabel(s,x.voteId)}</h4><blockquote>{x.quotedExcerpt}</blockquote><p>{x.explanation}</p></article>)}</details></section>;
}
export function SynthesisDetails({state:s,synthesis:x,showText=false}:{state:State;synthesis:Synthesis;showText?:boolean}){
 const progress=x.result.decisionProgress;
 return <>{showText&&<p className="preserve">{x.result.revisedProposal.text}</p>}{progress&&<section aria-label="Definições e pendências da proposta"><Lines title="Definições já presentes na proposta" items={progress.defined}/><Lines title="Alternativas sugeridas — ainda sem acordo" items={progress.suggested}/><Lines title="Pendências para fechar a proposta" items={progress.pending}/><Lines title="Perguntas para o grupo" items={progress.questions}/></section>}
 <details><summary>O que a IA mudou e o que continua pendente</summary><ul>{x.result.changeLog.map((c,n)=><li key={n}>{c.change} — {c.reason}<br/>Origem: {(c.sourceIds??c.voteIds).map(id=>sourceLabel(s,id)).join('; ')}</li>)}</ul>
 <p>Objeções consideradas atendidas pela IA: {x.result.addressedObjections.map(id=>sourceLabel(s,id)).join('; ')||'nenhuma'}</p><p>Parcialmente atendidas: {x.result.partiallyAddressedObjections.map(id=>sourceLabel(s,id)).join('; ')||'nenhuma'}</p><p>Não atendidas: {x.result.unresolvedObjections.map(id=>sourceLabel(s,id)).join('; ')||'nenhuma'}</p><Lines title="Impasses" items={x.result.remainingImpasses}/><Lines title="Limites e pontos de atenção" items={x.result.feasibilityWarnings}/><p>A classificação é consultiva e não substitui o novo voto de cada participante.</p></details></>;
}
export function RoundHistory({state:s,showInitialReview=false}:{state:State;showInitialReview?:boolean}){
 return <details><summary>Histórico de rodadas</summary>{showInitialReview&&s.proposals[0].review.result&&<details><summary>Parecer inicial de apoio ao moderador</summary><ReviewCard review={s.proposals[0].review.result} label="Parecer inicial"/></details>}<details><summary>Rascunho inicial do moderador</summary><p>{s.initialDraft.text}</p></details>{s.rounds.map(r=>{
 const p=s.proposals.find(p=>p.id===r.proposalId)!;
 return <details key={r.id}><summary>Rodada {r.number} · Proposta V{p.version} · {r.status==='CLOSED'?'Encerrada':'Atual'}</summary><h4>Proposta publicada</h4><p>{p.content.text}</p><RevisionHistory item={p}/><details><summary>Votos e manifestações desta rodada</summary>{s.votes.filter(v=>v.roundId===r.id).map(v=><article key={v.id}><b>{sourceLabel(s,v.id)}</b><p>{v.choice.replaceAll('_',' ')}</p>{v.justification&&<p>{v.justification}</p>}</article>)}{s.contributions.filter(c=>c.roundId===r.id&&!s.votes.some(v=>v.roundId===r.id&&v.participantId===c.participantId&&v.justification===c.text)).map(c=><article key={c.id}><b>{sourceLabel(s,c.id)}</b><p>{c.text}</p></article>)}</details>{s.analyses.filter(a=>a.roundId===r.id&&r.status==='CLOSED').map(a=><details key={a.id}><summary>Análise da IA desta rodada</summary><RoundAnalysis state={s} analysis={a}/></details>)}{s.syntheses.filter(x=>x.roundId===r.id&&(x.publishedProposalId||r.status==='CLOSED')).map(x=><details key={x.id}><summary>Sugestão da IA para V{p.version+1} · {x.publishedProposalId?'Publicada após revisão humana':'Rascunho anterior'}</summary><SynthesisDetails state={s} synthesis={x} showText/></details>)}</details>;
 })}<details><summary>Registro técnico de eventos</summary>{s.events.map(e=><p key={e.id}>{new Date(e.at).toLocaleString('pt-BR')} · {e.type} · {e.detail}</p>)}</details></details>;
}
