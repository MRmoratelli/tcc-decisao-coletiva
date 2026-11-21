import { useState,useEffect,useRef,type FormEvent } from 'react';
import { request,type CreatedRoom,type RoomView,type RoomSyncResponse } from './api';
import { emptyProposal } from './components/ProposalEditor';
import { ReviewCard } from './components/ReviewCard';
import { RoomWorkspace } from './components/RoomWorkspace';
import { ProposalSchema } from '../shared/contracts';

type Session={code:string;credential:string;view:RoomView};
type Invitation={research:{version:string;text:string;source:string};participantCount:number;open:boolean};
const sessionKey=(code:string)=>'dc2-access-'+code;
function savedCredential(code:string){try{return localStorage.getItem(sessionKey(code))??'';}catch{return '';}}
function persist(code:string,credential:string){
 // Verify durable storage before requesting a slot: a failed write must not
 // silently consume another participant identity on the next visit.
 localStorage.setItem(sessionKey(code),credential);
 if(localStorage.getItem(sessionKey(code))!==credential)throw new Error('Permita o armazenamento neste navegador para guardar seu acesso.');
}
function browserCredential(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
function initialCode(){if(typeof window==='undefined')return '';return new URLSearchParams(window.location.search).get('sala')?.trim().toUpperCase()??'';}

export default function App(){
 const inviteCode=initialCode();
 const [tab,setTab]=useState<'create'|'join'>(inviteCode?'join':'create');
 const [proposal,setProposal]=useState(emptyProposal),[count,setCount]=useState(5);
 const [created,setCreated]=useState<CreatedRoom|null>(null);
 const [code,setCode]=useState(inviteCode),[credential,setCredential]=useState('');
 const [invitation,setInvitation]=useState<Invitation|null>(null),[accepted,setAccepted]=useState(false);
 const [session,setSession]=useState<Session|null>(null);
 const sessionRef=useRef(session);sessionRef.current=session;
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[syncError,setSyncError]=useState('');
 const booted=useRef(false);
 const message=(e:unknown)=>setError(e instanceof Error?e.message:'Erro inesperado.');
 async function openRoom(codeValue:string,tokenValue:string){
  const normalized=codeValue.trim().toUpperCase();
  const view=await request<RoomView>('/rooms/'+normalized+'/view',{credential:tokenValue.trim()});
  persist(normalized,tokenValue.trim());
  setSession({code:normalized,credential:tokenValue.trim(),view});setInvitation(null);setCredential('');setNotice('');
 }
 async function inspectInvitation(codeValue:string){
  setError('');setBusy(true);setInvitation(null);setAccepted(false);
  const normalized=codeValue.trim().toUpperCase();setCode(normalized);
  try{
   const saved=savedCredential(normalized);
   if(saved){
    // A pending identity is also saved before joining. Only a valid existing
    // session resumes; otherwise the term is shown again.
    try{await openRoom(normalized,saved);return;}catch{}
   }
   setInvitation(await request<Invitation>('/rooms/'+normalized+'/invitation',{}));
  }catch(e){message(e);}finally{setBusy(false);}
 }
 useEffect(()=>{if(!booted.current){booted.current=true;if(inviteCode)void inspectInvitation(inviteCode);}},[]);
 useEffect(()=>{
  if(!session||busy)return;
  const {code,credential}=session;let cancelled=false;let timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{try{
   if(typeof document==='undefined'||document.visibilityState!=='hidden'){
    const view=await request<RoomSyncResponse>('/rooms/'+code+'/view',{credential,knownRevision:sessionRef.current?.view.revision});
    if(!cancelled){if(!('unchanged' in view))setSession(previous=>previous?.code===code&&view.revision>previous.view.revision?{...previous,view}:previous);setSyncError('');}
   }
  }catch{if(!cancelled)setSyncError('Atualização automática temporariamente indisponível. Seus rascunhos foram mantidos.');}
  finally{if(!cancelled)timer=setTimeout(poll,4000);}};
  timer=setTimeout(poll,4000);return()=>{cancelled=true;clearTimeout(timer);};
 },[session?.code,session?.credential,busy]);
 async function createRoom(e:FormEvent){
  e.preventDefault();setError('');setBusy(true);
  try{
   const result=await request<CreatedRoom>('/rooms',{proposal:ProposalSchema.parse(proposal),participantCount:count,simple:true,aiConsent:true});
   setCreated(result);setCode(result.code);setTab('join');persist(result.code,result.moderatorCredential);
   setNotice('Sala criada. Compartilhe o link único com o grupo e guarde seu acesso de moderador.');
  }catch(e){message(e);}finally{setBusy(false);}
 }
 async function enroll(){
  if(!invitation||!accepted)return;
  setError('');setBusy(true);
  try{
   let token=savedCredential(code);if(!/^[a-f0-9]{64}$/.test(token))token=browserCredential();
   persist(code,token);
   await request('/rooms/'+code+'/join',{browserCredential:token,consent:true,version:invitation.research.version});
   await openRoom(code,token);
  }catch(e){message(e);}finally{setBusy(false);}
 }
 async function refreshRoom(){
  const current=sessionRef.current;if(!current)return;
  const view=await request<RoomView>('/rooms/'+current.code+'/view',{credential:current.credential});
  setSession(previous=>previous?.code===current.code?{...previous,view}:previous);
 }
 async function act(work:()=>Promise<void>){setError('');setBusy(true);try{await work();}catch(e){try{await refreshRoom();}catch{}message(e);}finally{setBusy(false);}}
 async function join(e:FormEvent){e.preventDefault();await inspectInvitation(code);}
 async function importFile(file:File){await act(async()=>{
  if(file.size>8*1024*1024)throw new Error('Arquivo excede 8 MB.');
  const result=await request<CreatedRoom>('/import',JSON.parse(await file.text()));
  setCreated(result);setCode(result.code);setTab('join');setNotice('Cópia restaurada em sala nova. Guarde as novas credenciais individuais.');
 });}
 const link=typeof window==='undefined'?'':window.location.origin+'/?sala='+code;
 return <div className="shell">
 <header className="topbar"><div className="brand"><span className="mark">◇</span><div><b>Decisão Coletiva</b><small>Consenso assistido · Versão 2</small></div></div><span className="pill">Decisão humana · IA consultiva</span></header>
 <main className="content">
 <section className="intro"><span className="eyebrow">Colaboração estruturada</span><h1>{inviteCode&&!session?'Participe da discussão do seu grupo.':'Decisões melhores começam com ideias bem discutidas.'}</h1><p>A IA oferece apoio à discussão. A decisão pertence às pessoas.</p></section>
 {error&&<div className="alert error" role="alert">{error}</div>}
 {notice&&<div className="alert" role="status">{notice}</div>}
 {session&&syncError&&<p className="alert" role="status">{syncError}</p>}
 {!session&&<>
 {!inviteCode&&<nav className="tabs" aria-label="Acesso"><button className={tab==='create'?'active':''} onClick={()=>{setTab('create');setInvitation(null);}}>Criar nova sala</button><button className={tab==='join'?'active':''} onClick={()=>setTab('join')}>Participar de uma sala</button></nav>}
 {tab==='create'?<section className="card">
 <h2>Apresente o desafio ao grupo</h2>
 <form onSubmit={createRoom}>
 <label>Título da discussão<input required minLength={3} maxLength={180} value={proposal.title} onChange={e=>setProposal({...proposal,title:e.target.value})}/></label>
 <label>Quantidade de participantes<input required type="number" min={2} max={15} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
 <p className="muted">De 2 a 15 pessoas que votarão. O consenso exige ACEITO de todas elas na mesma rodada.</p>
 <label>Proposta inicial<textarea required minLength={4} maxLength={5000} rows={5} value={proposal.text} onChange={e=>setProposal({...proposal,text:e.target.value})}/></label>
 <label>Contexto ou complemento (opcional)<textarea maxLength={5000} rows={3} value={proposal.context} onChange={e=>setProposal({...proposal,context:e.target.value})}/></label>
 <p className="muted">Ao criar a sala, você autoriza o envio da proposta e das manifestações pseudonimizadas ao Gemini para apoio consultivo. A análise e a síntese serão preparadas automaticamente após as respostas do grupo, quando houver divergência. Revise e publique a próxima proposta. Evite dados pessoais ou sensíveis.</p>
 <button className="primary" disabled={busy}>{busy?'Criando sala…':'Criar sala'}</button>
 </form>
 <details><summary>Restaurar processo de arquivo JSON</summary><label>Arquivo exportado da V2<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f);}}/></label><p>Cria uma cópia em outra sala e preserva a sala original.</p></details>
 </section>:!created&&<section className="card">
 <h2>{invitation?'Informação e concordância para a pesquisa':'Entrar em uma discussão'}</h2>
 {!invitation&&<><p>Abra o link enviado pelo moderador ou informe o código. Seu acesso será criado e salvo automaticamente neste navegador.</p><form onSubmit={join}><label>Código da sala<input required maxLength={10} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label><button className="primary" disabled={busy}>{busy?'Consultando sala…':'Continuar'}</button></form></>}
 {invitation&&<>
 <p>Leia o termo completo antes de entrar. Concordância com a pesquisa e posição sobre a proposta são registros separados.</p>
 <article className="research-information" aria-label="Termo completo de informação e concordância">{invitation.research.text.split('\n\n').map((paragraph,index)=><p key={index}>{paragraph}</p>)}</article>
 <p><a href={invitation.research.source} target="_blank" rel="noreferrer">Consultar documento de origem</a> · Versão exibida: {invitation.research.version}</p>
 <label className="check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Li e compreendi as informações e concordo voluntariamente em participar da avaliação acadêmica descrita.</label>
 <button className="primary" disabled={busy||!accepted||!invitation.open} onClick={()=>void enroll()}>{busy?'Registrando concordância…':'Concordar e continuar'}</button>
 {!invitation.open&&<p className="alert">Esta discussão foi encerrada. Participantes já inscritos podem retornar pelo mesmo navegador.</p>}
 <p className="muted">Se não concordar, não prossiga. Para dúvidas ou retirada, utilize o contato informado no termo. Volte pelo mesmo navegador para recuperar seu acesso.</p>
 </>}
 <details><summary>Acesso de moderador ou credencial já existente</summary><form onSubmit={e=>{e.preventDefault();void act(()=>openRoom(code,credential));}}><label>Código da sala<input required value={code} maxLength={10} onChange={e=>setCode(e.target.value.toUpperCase())}/></label><label>Credencial individual<input required type="password" value={credential} onChange={e=>setCredential(e.target.value)}/></label><button disabled={busy}>Entrar com credencial</button></form></details>
 </section>}
 {created&&<section className="card credentials">
 <h2>Sala {created.code} criada</h2>
 {created.participants.length===0&&<><p>Envie este mesmo link a todos os participantes:</p><p><a href={link}>{link}</a></p><button onClick={()=>void navigator.clipboard.writeText(link)}>Copiar link do grupo</button><p>Não compartilhe sua credencial de moderador. Cada participante recebe seu acesso automaticamente.</p></>}
 <details><summary>Guardar credencial do moderador</summary><code>{created.moderatorCredential}</code><button onClick={()=>void navigator.clipboard.writeText(created.moderatorCredential)}>Copiar credencial do moderador</button></details>
 {created.participants.map(p=><div className="secret" key={p.alias}><span>{p.alias}</span><code>{p.credential}</code><button onClick={()=>void navigator.clipboard.writeText(p.credential)}>Copiar</button></div>)}
 <button className="primary" disabled={busy} onClick={()=>void act(()=>openRoom(created.code,created.moderatorCredential))}>Abrir sala como moderador</button>
 </section>}
 </>}
 {session&&<section className="card room">
 <div className="row-between"><div><span className="eyebrow">Sala {session.code} · {session.view.role==='moderator'?'Moderador':session.view.alias}</span><h2>{session.view.room.topic}</h2></div><button className="secondary" onClick={()=>void act(refreshRoom)} disabled={busy}>Atualizar</button></div>
 {session.view.role==='moderator'&&session.view.state.enrollment&&<details><summary>Link de acesso do grupo</summary><p><a href={link}>{link}</a></p><button onClick={()=>void navigator.clipboard.writeText(link)}>Copiar link único</button><p>{session.view.state.enrollment.claims.length} de {session.view.state.participants.length} participantes inscritos.</p></details>}
 <div className="proposal"><h3>Proposta atual</h3><p>{session.view.room.proposal}</p></div>
 {session.view.role==='moderator'&&session.view.room.proposal_review&&<details><summary>Parecer inicial de apoio ao moderador</summary><ReviewCard review={session.view.room.proposal_review} label="Parecer inicial"/></details>}
 <RoomWorkspace session={session} busy={busy} act={act} onRefresh={refreshRoom}/>
 <button className="text-button" onClick={()=>{setSession(null);setCreated(null);setTab('join');setNotice('Seu acesso foi mantido neste navegador.');}}>Sair desta sala</button>
 </section>}
 </main><footer>A IA auxilia, mas não decide · Não utilize dados pessoais ou sensíveis.</footer>
 </div>;
}
