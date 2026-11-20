import { useState } from 'react';
import { publicSourceUrl,isTavilyCheck,type FactualCheck,type ResearchMode,type LegacyFactualCheck } from '../../shared/factual';

const labels={EVIDENCIA_FAVORAVEL:'Evidência favorável',EVIDENCIA_CONTRARIA:'Evidência contrária',EVIDENCIA_INSUFICIENTE:'Evidência insuficiente',NAO_VERIFICAVEL:'Não verificável',VERIFICACAO_INDISPONIVEL:'Verificação indisponível'};
function LegacyFactualResult({check}:{check:LegacyFactualCheck}){
 return <article className="factual-result">
  <p className="alert">Registro histórico do mecanismo Google anterior. Não representa uma consulta Tavily.</p><h4>Consulta original deste registro histórico</h4><blockquote>{check.originalText}</blockquote>
  {check.provenance==='SYNTHETIC_TEST'&&<p className="alert">Teste técnico sintético. Não representa pesquisa real nem resultado científico.</p>}
  {check.provenance==='IMPORTED_UNAUTHENTICATED'&&<p className="alert">Registro importado sem proveniência autenticada. Não utilizado como evidência pela mediação até nova consulta.</p>}
  {check.claims.map((c,i)=><section key={i} className="factual-claim">
   <h4>{c.claim.text}</h4><p><strong>{labels[c.status]}</strong> · {c.claim.kind.replaceAll('_',' ').toLowerCase()}</p>
   <h5>O que a IA interpreta a partir da consulta</h5><p className="preserve">{c.explanation}</p>
   {c.supports.length>0&&<><h5>Trechos vinculados pelo provedor às fontes recuperadas</h5><ul>{c.supports.map((s,j)=><li key={j}><q>{s.text}</q> [{s.sourceIds.join(', ')}]</li>)}</ul></>}
   <h5>Fontes externas retornadas pelo mecanismo de pesquisa</h5>
   {c.sources.length?<ul>{c.sources.map(s=><li key={s.id}><span>{s.id}: </span>{publicSourceUrl(s.url)?<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>:<span>Link não disponível</span>}<p className="source-url">{s.url}</p><small>Data da fonte: {s.publishedAt?new Date(s.publishedAt).toLocaleString('pt-BR'):'não informada nos metadados'}</small></li>)}</ul>:<p>Nenhuma fonte rastreável neste registro. Consulte o estado da consulta para distinguir dispensa, falha e busca sem resultados.</p>}
   {c.searchSuggestionHtml&&<iframe className="search-suggestions" title={'Sugestões de pesquisa Google '+check.id+' '+i} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={c.searchSuggestionHtml}/>}
   <h5>Incertezas e limitações</h5><ul>{c.limitations.map((v,j)=><li key={j}>{v}</li>)}</ul>
   {c.failureCode&&<p className="muted">Motivo operacional: {c.failureCode}</p>}
   <small>Consulta: {new Date(c.queriedAt).toLocaleString('pt-BR')} · Modelo retornado: {c.responseModel??'sem resposta do provedor'}</small>
  </section>)}
  <p className="disclaimer">Versão {check.version} · Modelo solicitado {check.model} · Registro {check.id.slice(0,8)}. Evidência não é comprovação absoluta. Você pode manter sua posição, contestar o parecer e apresentar novas informações.</p>
 </article>;
}

export function FactualResult({check}:{check:FactualCheck}){
 if(!isTavilyCheck(check))return <LegacyFactualResult check={check}/>;
 return <article className="factual-result">
  <h4>Consulta original deste registro</h4><blockquote>{check.originalText}</blockquote>
  <p>Modalidade: {check.modality==='RESEARCH'?'Pesquisar informações para a decisão':'Verificar afirmação'}</p>
  {check.classificationSourceCheckId&&<p className="muted">Classificação reutilizada do registro {check.classificationSourceCheckId.slice(0,8)}; não houve nova classificação nesta tentativa.</p>}
  {check.provenance==='SYNTHETIC_TEST'&&<p className="alert">Teste técnico sintético. Não representa pesquisa real nem resultado científico.</p>}
  {check.provenance==='IMPORTED_UNAUTHENTICATED'&&<p className="alert">Registro importado sem proveniência autenticada. Não utilizado como evidência pela mediação até nova consulta.</p>}
  {check.claims.map((c,i)=><section key={i} className="factual-claim">
   <h4>{c.claim.text}</h4><p><strong>{labels[c.status]}</strong> · {c.claim.kind.replaceAll('_',' ').toLowerCase()}</p>
   <h5>{check.provenance==='LOCAL_CLASSIFICATION'?'Classificação local, sem envio externo':c.responseModel?'Interpretação consultiva do Gemini':'Estado da consulta'}</h5><p className="preserve">{c.explanation}</p>
   {c.evidenceLinks.length>0&&<><h5>Trechos recuperados vinculados à interpretação</h5><ul>{c.evidenceLinks.map((link,j)=><li key={j}><q>{link.quote}</q> [{link.sourceId}]<p>{link.relation==='SUPPORTS'?'Apoio':link.relation==='CONTRADICTS'?'Contradição':'Contexto'}: {link.explanation}</p></li>)}</ul></>}
   <h5>{c.retrieval?'Fontes recuperadas pela Tavily Search':'Pesquisa externa não executada ou não concluída'}</h5>
   <p>Estado: {c.failureCode==='CLARIFICATION_REQUIRED'?'Necessidade de esclarecimento':c.failureCode==='NOT_APPLICABLE'?'Pesquisa não aplicável':c.failureCode?.includes('LIMIT')?'Quota ou limite excedido':c.failureStage==='CLASSIFICATION'||c.failureStage==='INTERPRETATION'||c.failureCode==='INVALID_INTERPRETATION'||c.failureCode?.startsWith('GEMINI')?'Falha Gemini':c.failureCode==='NO_SOURCES'?'Pesquisa executada sem fontes':c.failureCode==='EXTERNAL_API_FAILURE'||c.failureCode?.startsWith('TAVILY')?'Falha ou indisponibilidade Tavily':c.retrieval?(c.status==='EVIDENCIA_INSUFICIENTE'?'Pesquisa concluída; evidência insuficiente':'Pesquisa concluída'):'Pesquisa não executada'}. Chamada Tavily executada: {c.searchAttempted===undefined?(c.retrieval?'sim; registro anterior':'não registrado'):c.searchAttempted?'sim':'não'}. Busca externa com resposta registrada: {c.retrieval?'sim':'não'}. Termos recuperados: {c.retrieval?.query||c.attemptedQuery||'nenhum; consulta não concluída ou dispensada'}.</p>
   {c.sources.length?<ul>{c.sources.map(s=><li key={s.id}><b>{s.id}: </b><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a><p className="source-url">{s.url}</p><details><summary>Trecho retornado pela Tavily</summary><blockquote className="preserve">{s.excerpt}</blockquote>{s.excerptTruncated&&<small>Trecho limitado a 3.500 caracteres na aplicação.</small>}</details><p><small>Relevância da busca: {s.score===null?'não informada':s.score.toFixed(3)}; não é probabilidade de verdade.</small></p><p><small>Data estimada de publicação/atualização: {s.publishedAtRaw??'não informada nos metadados'}</small></p></li>)}</ul>:<p>Nenhuma fonte rastreável neste registro. Consulte o estado da consulta para distinguir dispensa, falha e busca sem resultados.</p>}
   {c.retrieval?.reusedFromCheckId&&<p className="muted">Trechos reutilizados do registro {c.retrieval.reusedFromCheckId.slice(0,8)}; nenhuma nova busca Tavily nesta tentativa. Créditos abaixo referem-se à recuperação original.</p>}
   {c.retrieval&&<p className="muted">Tavily Search básica · Consulta: {c.retrieval.query} · Créditos informados: {c.retrieval.creditsUsed??'não informado'} · Requisição: {c.retrieval.requestId??'não informado'}</p>}
   <h5>Incertezas e limitações</h5><ul>{c.limitations.map((v,j)=><li key={j}>{v}</li>)}</ul>
   {c.failureCode&&<p className="muted">Motivo operacional: {c.failureCode}</p>}
   <small>Consulta: {new Date(c.queriedAt).toLocaleString('pt-BR')} · Modelo de interpretação retornado: {c.responseModel??'sem resposta do provedor'}</small>
  </section>)}
  <p className="disclaimer">Versão {check.version} · Mecanismo Tavily · Classificação {check.classificationModel??(check.provenance==='LOCAL_CLASSIFICATION'?'local, sem envio externo':'modelo não informado')} · Modelo solicitado {check.model} · Registro {check.id.slice(0,8)}. Evidência não é comprovação absoluta. Você pode manter sua posição, contestar o parecer e apresentar novas informações.</p>
 </article>;
}
export function FactualPanel({checks,busy,isOpen,onVerify}:{checks:FactualCheck[];busy:boolean;isOpen:boolean;onVerify:(text:string,mode:ResearchMode)=>Promise<void>}){
 const [mode,setMode]=useState<ResearchMode>('VERIFY');
 const [claim,setClaim]=useState(''),[consent,setConsent]=useState(false);
 return <section className="review factual-panel" aria-label="Parecer consultivo de verificação factual">
  <h3>Pesquisa externa consultiva</h3>
  <p>Separe um fato público de preferências e restrições pessoais. Somente o texto público abaixo será enviado ao Gemini e, quando cabível, à Tavily Search. Não inclua nomes, contatos, endereços privados ou URLs. O resultado não altera sua manifestação.</p>
  {isOpen&&<><label>Modalidade<select value={mode} onChange={e=>setMode(e.target.value as ResearchMode)}><option value="VERIFY">Verificar afirmação</option><option value="RESEARCH">Pesquisar informações para a decisão</option></select></label><label>{mode==='RESEARCH'?'Pergunta pública para pesquisar':'Alegação pública para verificar'}<textarea rows={3} maxLength={1200} value={claim} onChange={e=>setClaim(e.target.value)}/></label>
   <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Concordo com o envio desta alegação mínima ao Gemini e à Tavily Search, se necessária.</label>
   <button className="secondary" disabled={busy||!consent||claim.trim().length<4} onClick={()=>void onVerify(claim,mode)}>{mode==='RESEARCH'?'Pesquisar informações para a decisão':'Verificar afirmação'}</button>
   <p className="muted">Pesquisa opcional, sujeita a quotas gratuitas. Preferências e restrições não são pesquisadas. Fatos atuais podem permanecer sem confirmação quando a atualidade da fonte não for comprovada.</p></>}
  <h4>Histórico de consultas — independente do texto digitado acima</h4>
  {[...checks].reverse().map((c,i)=><details key={c.id} open={i===0}><summary>{c.originalText.slice(0,100)} · {c.id.slice(0,8)}</summary><FactualResult check={c}/></details>)}
 </section>;
}

