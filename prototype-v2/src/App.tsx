import { useState, type FormEvent } from 'react';
import { request, type CreatedRoom, type Review, type ReviewResult, type RoomView } from './api';

const relevanceLabels:Record<Review['relevance'],string>={
  RELACIONADA:'Relacionada ao tema',PARCIAL:'Parcialmente relacionada',
  DESALINHADA:'Possivelmente fora do escopo',INDETERMINADA:'Pertinência incerta',
};

function ReviewCard({review,label}:{review:Review;label:string}){
  return <section className="review" aria-label={label}>
    <div className="review-head"><span>Parecer consultivo de IA</span><strong>{relevanceLabels[review.relevance]}</strong></div>
    <p>{review.summary}</p>
    {review.recommendations.length>0&&<><h4>Perguntas e sugestões de melhoria</h4><ul>{review.recommendations.map((x,i)=><li key={i}>{x}</li>)}</ul></>}
    {review.assertions.length>0&&<><h4>Afirmações que merecem atenção</h4><ul>{review.assertions.map((a,i)=><li key={i}><strong>{a.text}</strong> — {a.note} <span className="muted">({a.status.replaceAll('_',' ').toLowerCase()})</span></li>)}</ul></>}
    {review.limitations.length>0&&<p className="muted">Limitações: {review.limitations.join(' · ')}</p>}
    <p className="disclaimer">Este parecer não é um julgamento definitivo de pertinência ou veracidade. A IA pode errar; a decisão é das pessoas.</p>
  </section>;
}

export default function App(){
  const [tab,setTab]=useState<'create'|'join'>('create');
  const [topic,setTopic]=useState('');
  const [proposal,setProposal]=useState('');
  const [count,setCount]=useState(5);
  const [proposalReview,setProposalReview]=useState<ReviewResult|null>(null);
  const [created,setCreated]=useState<CreatedRoom|null>(null);
  const [code,setCode]=useState('');
  const [credential,setCredential]=useState('');
  const [session,setSession]=useState<{code:string;credential:string;view:RoomView}|null>(null);
  const [contribution,setContribution]=useState('');
  const [contributionReview,setContributionReview]=useState<ReviewResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const message=(e:unknown)=>setError(e instanceof Error?e.message:'Erro inesperado.');

  async function previewProposal(e:FormEvent){
    e.preventDefault();setError('');setNotice('');setBusy(true);
    try{setProposalReview(await request<ReviewResult>('/ai/proposal-review',{topic,proposal}));}
    catch(e){message(e);}finally{setBusy(false);}
  }
  async function createRoom(){
    if(!proposalReview)return;
    setError('');setBusy(true);
    try{
      const result=await request<CreatedRoom>('/rooms',{topic,proposal,participantCount:count,receipt:proposalReview.receipt});
      setCreated(result);setCode(result.code);setTab('join');
      setNotice('Sala criada. Guarde e distribua as credenciais individualmente; elas só aparecem nesta tela.');
    }catch(e){message(e);}finally{setBusy(false);}
  }
  async function openRoom(codeValue:string,tokenValue:string){
    setError('');setNotice('');setBusy(true);
    try{
      const normalized=codeValue.trim().toUpperCase();
      const view=await request<RoomView>('/rooms/'+normalized+'/view',{credential:tokenValue.trim()});
      setSession({code:normalized,credential:tokenValue.trim(),view});
      setContribution('');setContributionReview(null);
    }catch(e){message(e);}finally{setBusy(false);}
  }
  async function join(e:FormEvent){e.preventDefault();await openRoom(code,credential);}
  async function reviewContribution(e:FormEvent){
    e.preventDefault();if(!session)return;
    setError('');setBusy(true);
    try{
      const r=await request<ReviewResult>('/rooms/'+session.code+'/contribution-review',{credential:session.credential,text:contribution});
      setContributionReview(r);
    }catch(e){message(e);}finally{setBusy(false);}
  }
  async function saveContribution(userChoice:'ENVIAR'|'ENVIAR_COM_RESSALVA'){
    if(!session||!contributionReview)return;
    setError('');setBusy(true);
    try{
      await request('/rooms/'+session.code+'/contributions',{credential:session.credential,text:contribution,receipt:contributionReview.receipt,userChoice});
      const view=await request<RoomView>('/rooms/'+session.code+'/view',{credential:session.credential});
      setSession({...session,view});setContribution('');setContributionReview(null);
      setNotice('Contribuição registrada com o texto original e parecer da IA. Ela não foi alterada automaticamente.');
    }catch(e){message(e);}finally{setBusy(false);}
  }
  async function refreshRoom(){
    if(!session)return;
    setError('');setBusy(true);
    try{
      const view=await request<RoomView>('/rooms/'+session.code+'/view',{credential:session.credential});
      setSession({...session,view});
    }catch(e){message(e);}finally{setBusy(false);}
  }
  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span className="mark">◇</span><div><b>Decisão Coletiva</b><small>Ambiente de desenvolvimento · Versão 2</small></div></div>
      <span className="pill">IA consultiva · TypeScript</span>
    </header>
    <main className="content">
      <section className="intro">
        <span className="eyebrow">Colaboração estruturada</span>
        <h1>Decisões melhores começam com ideias bem discutidas.</h1>
        <p>Crie uma discussão sobre qualquer tema, receba observações construtivas da IA e mantenha a palavra final com as pessoas.</p>
      </section>
      {error&&<div className="alert error" role="alert">{error}</div>}
      {notice&&<div className="alert" role="status">{notice}</div>}
      {!session&&<>
        <nav className="tabs" aria-label="Acesso"><button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>Criar nova sala</button><button className={tab==='join'?'active':''} onClick={()=>setTab('join')}>Entrar com código</button></nav>
        {tab==='create'?<div className="card">
          <h2>Apresente o desafio ao grupo</h2><p className="muted">O parecer é exibido antes da criação e não aprova nem rejeita automaticamente sua proposta.</p>
          <form onSubmit={previewProposal}>
            <label>Tema ou problema<input value={topic} minLength={3} maxLength={180} required placeholder="Ex.: Como definir as prioridades do projeto?" onChange={e=>{setTopic(e.target.value);setProposalReview(null);}}/></label>
            <label>Proposta inicial<textarea value={proposal} minLength={4} maxLength={5000} required rows={5} placeholder="Descreva a proposta em detalhes para iniciar a discussão..." onChange={e=>{setProposal(e.target.value);setProposalReview(null);}}/></label>
            <label>Participantes<input type="number" min={2} max={30} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
            <button className="primary" type="submit" disabled={busy||!topic.trim()||!proposal.trim()}>{busy?'Analisando...':'1. Solicitar parecer da IA'}</button>
          </form>
          {proposalReview&&<div className="review-follow">
            <ReviewCard review={proposalReview.review} label="Parecer da proposta"/>
            <button className="primary" disabled={busy} onClick={createRoom}>{busy?'Criando sala...':'2. Criar sala com esta proposta'}</button>
            <p className="muted">O responsável pode seguir com a proposta mesmo que o parecer identifique dúvidas ou pontos de atenção.</p>
          </div>}
        </div>:<div className="card">
          <h2>Entrar em uma discussão</h2><p className="muted">O moderador distribui código e credencial individual. Não compartilhe sua credencial.</p>
          <form onSubmit={join}>
            <label>Código da sala<input value={code} maxLength={10} placeholder="Ex.: A4D77C2E90" onChange={e=>setCode(e.target.value.toUpperCase())} required/></label>
            <label>Credencial individual<input value={credential} type="password" placeholder="Cole a credencial recebida" onChange={e=>setCredential(e.target.value)} required/></label>
            <button className="primary" disabled={busy}>{busy?'Validando...':'Entrar na sala'}</button>
          </form>
        </div>}
        {created&&<section className="card credentials">
          <h2>Convites da sala {created.code}</h2>
          <p className="alert"><b>Guarde estes acessos agora.</b> São exibidos nesta sessão de navegador, não enviados por e-mail.</p>
          <div className="secret"><span>Moderador</span><code>{created.moderatorCredential}</code><button onClick={()=>navigator.clipboard.writeText(created.moderatorCredential)}>Copiar</button></div>
          {created.participants.map(p=><div className="secret" key={p.alias}><span>{p.alias}</span><code>{p.credential}</code><button onClick={()=>navigator.clipboard.writeText(p.credential)}>Copiar</button></div>)}
          <button className="secondary" onClick={()=>openRoom(created.code,created.moderatorCredential)}>Abrir sala como moderador</button>
        </section>}
      </>}
      {session&&<section className="card room">
        <div className="row-between"><div><span className="eyebrow">Sala {session.code} · {session.view.role==='moderator'?'Moderador':session.view.alias}</span><h2>{session.view.room.topic}</h2></div><button className="secondary" onClick={refreshRoom} disabled={busy}>Atualizar</button></div>
        <div className="proposal"><h3>Proposta inicial</h3><p>{session.view.room.proposal}</p></div>
        <ReviewCard review={session.view.room.proposal_review} label="Parecer inicial"/>
        {session.view.role==='participant'&&<div className="entry">
          <h3>Sua contribuição</h3><p className="muted">Avalie sua mensagem com a IA. Você poderá revisar o texto ou enviá-lo com ressalvas sobre o parecer.</p>
          <form onSubmit={reviewContribution}><label>Ideia, preocupação ou sugestão<textarea rows={5} value={contribution} minLength={4} maxLength={5000} required onChange={e=>{setContribution(e.target.value);setContributionReview(null);}}/></label>
          <button disabled={busy||!contribution.trim()} className="primary">{busy?'Analisando...':'Avaliar pertinência e afirmações'}</button></form>
          {contributionReview&&<div className="review-follow"><ReviewCard review={contributionReview.review} label="Parecer da contribuição"/>
            <div className="actions"><button className="primary" disabled={busy} onClick={()=>saveContribution('ENVIAR')}>Enviar minha contribuição</button><button className="secondary" disabled={busy} onClick={()=>saveContribution('ENVIAR_COM_RESSALVA')}>Enviar com ressalva ao parecer</button></div>
            <p className="muted">Nenhuma opinião é bloqueada automaticamente por discordar da IA. O texto original é mantido.</p>
          </div>}
        </div>}
        <div className="entries"><h3>Contribuições registradas</h3>
          {!session.view.canViewGroup?<p className="muted">As manifestações do grupo ficam ocultas até você registrar a sua primeira contribuição válida.</p>:
            session.view.contributions.length===0?<p className="muted">Nenhuma contribuição registrada.</p>:
            session.view.contributions.map(x=><article className="entry-card" key={x.id}><div className="row-between"><b>{x.alias}</b><time>{new Date(x.created_at).toLocaleString('pt-BR')}</time></div><p>{x.text}</p><small>Parecer IA: {relevanceLabels[x.review.relevance]} · {x.user_choice==='ENVIAR_COM_RESSALVA'?'Enviada com ressalva':'Enviada'}</small></article>)}
        </div>
        <button className="text-button" onClick={()=>{setSession(null);setNotice('');}}>Sair desta sala</button>
      </section>}
    </main>
    <footer>Versão inicial em desenvolvimento · A IA auxilia, mas não decide · Não utilize dados pessoais ou sensíveis.</footer>
  </div>;
}
