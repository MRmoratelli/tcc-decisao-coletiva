import { useState, useEffect, type FormEvent } from 'react';
import { request, type CreatedRoom, type ReviewResult, type RoomView } from './api';
import { ProposalEditor,emptyProposal } from './components/ProposalEditor';
import { ReviewCard } from './components/ReviewCard';
import { RoomWorkspace } from './components/RoomWorkspace';
import { ProposalSchema } from '../shared/contracts';

export default function App(){
  const [tab,setTab]=useState<'create'|'join'>('create');
  const [proposal,setProposal]=useState(emptyProposal);
  const [aiConsent,setAiConsent]=useState(false);
  const [bypass,setBypass]=useState(false);
  const [reviewedProposal,setReviewedProposal]=useState<typeof emptyProposal|null>(null);
  const [appliedRewrite,setAppliedRewrite]=useState(false);
  const [initialReceipt,setInitialReceipt]=useState<string|undefined>();
  const [count,setCount]=useState(5);
  const [proposalReview,setProposalReview]=useState<ReviewResult|null>(null);
  const [created,setCreated]=useState<CreatedRoom|null>(null);
  const [code,setCode]=useState('');
  const [credential,setCredential]=useState('');
  const [session,setSession]=useState<{code:string;credential:string;view:RoomView}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [syncError,setSyncError]=useState('');
  useEffect(()=>{
    if(!session||busy)return;
    const {code,credential}=session;let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{
      if(typeof document==='undefined'||document.visibilityState!=='hidden'){
       const view=await request<RoomView>('/rooms/'+code+'/view',{credential});
       if(!cancelled){setSession(previous=>previous?.code===code&&previous.credential===credential&&view.revision>previous.view.revision?{...previous,view}:previous);setSyncError('');}
      }
    }catch{if(!cancelled)setSyncError('Atualização automática temporariamente indisponível. Seus rascunhos foram mantidos; use Atualizar ou aguarde a reconexão.');}
    finally{if(!cancelled)timer=setTimeout(poll,4000);}};
    timer=setTimeout(poll,4000);return()=>{cancelled=true;clearTimeout(timer);};
  },[session?.code,session?.credential,busy]);
  const message=(e:unknown)=>setError(e instanceof Error?e.message:'Erro inesperado.');

  async function previewProposal(e:FormEvent){
    e.preventDefault();setError('');setNotice('');setBusy(true);
    try{if(!aiConsent)throw new Error('Confirme o envio da proposta ao Gemini.');const validated=ProposalSchema.parse(proposal);const result=await request<ReviewResult>('/ai/proposal-review',{proposal:validated,consent:true});setProposalReview(result);if(!reviewedProposal){setReviewedProposal(validated);setInitialReceipt(result.receipt);}}
    catch(e){message(e);}finally{setBusy(false);}
  }
  async function createRoom(){
    if(!proposalReview&&!bypass)return;
    setError('');setBusy(true);
    try{
      const result=await request<CreatedRoom>('/rooms',{proposal:ProposalSchema.parse(proposal),participantCount:count,appliedRewrite,receipt:proposalReview?.receipt??initialReceipt,reviewedProposal:proposalReview?proposal:reviewedProposal??undefined,bypassReason:!proposalReview?'Moderador optou por criar a sala sem parecer consultivo.':undefined});
      setCreated(result);setCode(result.code);setTab('join');
      setNotice('Sala criada. Guarde e distribua as credenciais individualmente; elas só aparecem nesta tela.');
    }catch(e){message(e);}finally{setBusy(false);}
  }
  async function openRoom(codeValue:string,tokenValue:string){
    setError('');setNotice('');setBusy(true);
    try{
      const normalized=codeValue.trim().toUpperCase();
      const view=await request<RoomView>('/rooms/'+normalized+'/view',{credential:tokenValue.trim()});
      setCreated(null);setCredential('');setSession({code:normalized,credential:tokenValue.trim(),view});

    }catch(e){message(e);}finally{setBusy(false);}
  }
  async function join(e:FormEvent){e.preventDefault();await openRoom(code,credential);}
  async function refreshRoom(){
    if(!session)return;
    setError('');setBusy(true);
    try{
      const view=await request<RoomView>('/rooms/'+session.code+'/view',{credential:session.credential});
      setSession({...session,view});
    }catch(e){message(e);}finally{setBusy(false);}
  }
  async function act(work:()=>Promise<void>){setError('');setBusy(true);try{await work();}catch(e){await refreshRoom();message(e);}finally{setBusy(false);}}
  async function importFile(file:File){await act(async()=>{if(file.size>8*1024*1024)throw new Error('Arquivo excede 8 MB.');const value=JSON.parse(await file.text());const result=await request<CreatedRoom>('/import',value);setCreated(result);setCode(result.code);setTab('join');setNotice('Cópia restaurada em sala nova. Guarde as novas credenciais.');});}
  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span className="mark">◇</span><div><b>Decisão Coletiva</b><small>Consenso assistido · Versão 2</small></div></div>
      <span className="pill">Decisão humana · IA consultiva</span>
    </header>
    <main className="content">
      <section className="intro">
        <span className="eyebrow">Colaboração estruturada</span>
        <h1>Decisões melhores começam com ideias bem discutidas.</h1>
        <p>Crie uma discussão sobre qualquer tema, receba observações construtivas da IA e mantenha a palavra final com as pessoas.</p>
      </section>
      {session&&syncError&&<p className="alert" role="status">{syncError}</p>}
      {error&&<div className="alert error" role="alert">{error}</div>}
      {notice&&<div className="alert" role="status">{notice}</div>}
      {!session&&<>
        <nav className="tabs" aria-label="Acesso"><button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>Criar nova sala</button><button className={tab==='join'?'active':''} onClick={()=>setTab('join')}>Entrar com código</button></nav>
        {tab==='create'?<div className="card">
          <h2>Apresente o desafio ao grupo</h2><p className="muted">O parecer é exibido antes da criação e não aprova nem rejeita automaticamente sua proposta.</p>
          <form onSubmit={previewProposal}>
            <ProposalEditor value={proposal} onChange={value=>{setProposal(value);setProposalReview(null);}}/>
            <label className="check"><input type="checkbox" checked={aiConsent} onChange={e=>setAiConsent(e.target.checked)}/> Autorizo enviar a proposta ao Gemini para parecer consultivo. Evite dados pessoais ou sensíveis.</label>
            <label>Participantes<input type="number" min={2} max={30} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
            <button className="primary" type="submit" disabled={busy||!aiConsent}>{busy?'Analisando...':'1. Solicitar parecer da IA'}</button>
          </form>
          {proposalReview&&<div className="review-follow">
            <ReviewCard review={proposalReview.review} label="Parecer da proposta"/>
            {proposalReview.review.suggestedRewrite&&<button className="secondary" onClick={()=>{setAppliedRewrite(true);setProposal({...proposal,text:proposalReview.review.suggestedRewrite});setProposalReview(null);setBypass(true);}}>Aceitar reformulação para editar e confirmar</button>}
            <button className="primary" disabled={busy} onClick={createRoom}>{busy?'Criando sala...':'2. Criar sala com esta proposta'}</button>
            <p className="muted">O responsável pode seguir com a proposta mesmo que o parecer identifique dúvidas ou pontos de atenção.</p>
          </div>}
          {!proposalReview&&<div className="review-follow"><label className="check"><input type="checkbox" checked={bypass} onChange={e=>setBypass(e.target.checked)}/> Criar sala com minha versão sem parecer da IA.</label><button className="secondary" disabled={busy||!bypass} onClick={createRoom}>Confirmar proposta e criar sala</button></div>}
          <details><summary>Restaurar processo de arquivo JSON</summary><label>Arquivo exportado da V2<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void importFile(file);}}/></label><p>Cria sala nova e novas credenciais; preserva a sala de origem.</p></details>
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
        <div className="proposal"><h3>Proposta atual</h3><p>{session.view.room.proposal}</p></div>
        {session.view.room.proposal_review&&<ReviewCard review={session.view.room.proposal_review} label="Parecer inicial"/>}
        <RoomWorkspace session={session} busy={busy} act={act} onRefresh={refreshRoom}/>
        <button className="text-button" onClick={()=>{setSession(null);setNotice('');}}>Sair desta sala</button>
      </section>}
    </main>
    <footer>Versão 2 em desenvolvimento · A IA auxilia, mas não decide · Não utilize dados pessoais ou sensíveis.</footer>
  </div>;
}

