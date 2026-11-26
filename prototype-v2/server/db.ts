import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type pg from 'pg';
import { DomainError, createState, validateState, event, currentRound, enableRoundVoting, expireRound, roundExpiration, startParticipantVoting, ROUND_DURATION_MS, type State, type ReviewRecordType } from './domain.js';
import { RESEARCH_VERSION, RESEARCH_TEXT, RESEARCH_SOURCE, RESEARCH_SHORT_TEXT } from '../shared/research.js';
import type { ProposalContent } from '../shared/contracts.js';

type QueryResult={rows:any[]};
export interface SQLClient {query(text:string,values?:any[]):Promise<QueryResult>;release():void;}
export interface SQLPool {query(text:string,values?:any[]):Promise<QueryResult>;connect():Promise<SQLClient>;}
export type Identity={roomId:string;code:string;role:'moderator'|'participant';participantId?:string;alias?:string};
export class Repository {
 constructor(private pool:SQLPool,private pepper:string,private clock:()=>number=Date.now){if(pepper.length<32)throw new Error('AUTH_PEPPER forte obrigatório.');}
 private hash(token:string){return createHmac('sha256',this.pepper).update(token).digest('hex');}
 private token(){return randomBytes(32).toString('base64url');}
 private equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
 async healthy(){await this.pool.query('SELECT 1');}
 async create(proposal:ProposalContent,count:number,review:ReviewRecordType,imported?:State,initialDraft?:ProposalContent,selfEnrollment=false){
  const roomId=randomUUID(),code=randomBytes(5).toString('hex').toUpperCase(),moderatorCredential=this.token();
  const people=Array.from({length:count},(_,i)=>({id:randomUUID(),alias:'P'+String(i+1).padStart(2,'0'),credential:this.token()}));
  let state=createState(roomId,proposal,people.map(({id,alias})=>({id,alias})),review,initialDraft,new Date(this.clock()).toISOString());
  if(!imported){state.votingMode='BINARY';enableRoundVoting(state,selfEnrollment);}
  if(imported){
   const mapping=new Map<string,string>([[imported.decision.id,roomId],...imported.participants.map((p,i)=>[p.id,people[i].id] as [string,string])]);
   function remap(value:any):any{if(typeof value==='string')return mapping.get(value)??value;if(Array.isArray(value))return value.map(remap);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='originId'?v:remap(v)]));return value;}
   state=validateState(remap(imported));delete state.reviewRequests;delete state.enrollment;delete state.mediation;for(const f of state.factualChecks)f.provenance='IMPORTED_UNAUTHENTICATED';event(state,'moderator','IMPORTED','Cópia restaurada em sala nova; credenciais reemitidas. Proveniência do arquivo não autenticada.');
  }
  if(selfEnrollment){state.research={version:RESEARCH_VERSION,text:RESEARCH_TEXT,source:RESEARCH_SOURCE,shortText:RESEARCH_SHORT_TEXT};state.enrollment={mode:'SELF',claims:[],automaticMediation:true};}
  const c=await this.pool.connect();try{
   await c.query('BEGIN');
   await c.query('INSERT INTO dc2_rooms(id,code,topic,proposal,proposal_review,moderator_hash) VALUES($1,$2,$3,$4,$5,$6)',[roomId,code,proposal.title,proposal.text,JSON.stringify(review.result??{}),this.hash(moderatorCredential)]);
   for(const p of selfEnrollment?[]:people)await c.query('INSERT INTO dc2_participants(id,room_id,alias,secret_hash) VALUES($1,$2,$3,$4)',[p.id,roomId,p.alias,this.hash(p.credential)]);
   await c.query('INSERT INTO dc2_snapshots(room_id,revision,state) VALUES($1,1,$2)',[roomId,JSON.stringify(state)]);
   await c.query('COMMIT');return {code,moderatorCredential,participants:selfEnrollment?[]:people.map(({alias,credential})=>({alias,credential}))};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async join(code:string,token:string,version:string){
  if(!/^[A-F0-9]{10}$/.test(code)||!/^[a-f0-9]{64}$/.test(token))throw new DomainError('Convite ou identificação inválidos.');
  const c=await this.pool.connect();try{
   await c.query('BEGIN');
   const room=(await c.query('SELECT id FROM dc2_rooms WHERE code=$1 FOR UPDATE',[code])).rows[0];
   if(!room)throw new DomainError('Sala não encontrada.',404);
   const row=(await c.query('SELECT revision,state FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[room.id])).rows[0];
   const s=validateState(row?.state);
   if(!s.enrollment||!s.research)throw new DomainError('Esta sala usa credencial individual. Solicite seu acesso ao moderador.',409);
   if(version!==s.research.version)throw new DomainError('O termo mudou. Leia a versão atual antes de continuar.',409);
   const hash=this.hash(token);
   const existing=(await c.query('SELECT id,alias FROM dc2_participants WHERE room_id=$1 AND secret_hash=$2',[room.id,hash])).rows[0];
   if(existing&&s.enrollment.claims.includes(existing.id)){
    if(s.participants.some(p=>p.id===existing.id&&p.departure))throw new DomainError('Sua saída desta sessão foi registrada.',403);
    await c.query('COMMIT');return {alias:existing.alias};
   }
   if(s.decision.status!=='OPEN')throw new DomainError('Esta discussão já foi encerrada.',409);
   const p=s.participants.find(p=>!s.enrollment!.claims.includes(p.id));
   if(!p)throw new DomainError('Todas as vagas previstas para esta sala já foram ocupadas.',409);
   const at=this.clock();
   expireRound(s,at);
   await c.query('INSERT INTO dc2_participants(id,room_id,alias,secret_hash) VALUES($1,$2,$3,$4)',[p.id,room.id,p.alias,hash]);
   s.enrollment.claims.push(p.id);
   startParticipantVoting(s,p.id,at);
   s.researchConsents.push({participantId:p.id,response:'SIM',at:new Date(at).toISOString(),version,actor:'participant'});
   event(s,p.id,'RESEARCH_CONSENT_RECORDED','SIM; '+version,new Date(at).toISOString());
   event(s,p.id,'PARTICIPANT_ENROLLED',p.alias,new Date(at).toISOString());
   validateState(s);
   await c.query('INSERT INTO dc2_snapshots(room_id,revision,state) VALUES($1,$2,$3)',[room.id,row.revision+1,JSON.stringify(s)]);
   await c.query('COMMIT');return {alias:p.alias};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async invitation(code:string){
  const room=(await this.pool.query('SELECT id FROM dc2_rooms WHERE code=$1',[code])).rows[0];
  if(!room)throw new DomainError('Sala não encontrada.',404);
  const row=(await this.pool.query('SELECT state FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[room.id])).rows[0];
  const s=validateState(row?.state);
  if(!s.enrollment||!s.research)throw new DomainError('Esta sala utiliza acesso individual.',409);
  return {research:s.research,participantCount:s.participants.length,open:s.decision.status==='OPEN'};
 }
 async authorize(code:string,token:string):Promise<Identity|null>{
  if(!/^[A-F0-9]{10}$/.test(code)||token.length<20||token.length>128)return null;
  const r=(await this.pool.query('SELECT id,moderator_hash FROM dc2_rooms WHERE code=$1',[code])).rows[0];if(!r)return null;
  const hash=this.hash(token);if(this.equal(hash,r.moderator_hash))return {roomId:r.id,code,role:'moderator'};
  const p=(await this.pool.query('SELECT id,alias FROM dc2_participants WHERE room_id=$1 AND secret_hash=$2',[r.id,hash])).rows[0];
  return p?{roomId:r.id,code,role:'participant',participantId:p.id,alias:p.alias}:null;
 }
 async read(identity:Identity){
  const row=(await this.pool.query('SELECT revision,state FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[identity.roomId])).rows[0];
  if(!row)throw new DomainError('Sala anterior à migração. Exporte-a pela versão original; não foi alterada.',409);
  const state=validateState(row.state),r=currentRound(state);
  const expiration=roundExpiration(r);
  if(r.status==='OPEN'&&expiration&&this.clock()>=Date.parse(expiration))return this.mutate(identity,null,()=>false);
  if(r.status==='OPEN'&&!state.enrollment&&identity.participantId&&r.voting?.participantStarts&&!r.voting.participantStarts.some(start=>start.participantId===identity.participantId)){
   const participantId=identity.participantId;
   return this.mutate(identity,null,(current,at)=>startParticipantVoting(current,participantId,at));
  }
  return {revision:row.revision as number,state};
 }
 async sweepExpiredRounds(){
  const at=this.clock();
  const {rows}=await this.pool.query(`
   SELECT r.id AS "roomId",r.code
   FROM dc2_rooms r
   CROSS JOIN LATERAL (
    SELECT state->'rounds'->-1 AS round FROM dc2_snapshots
    WHERE room_id=r.id ORDER BY revision DESC LIMIT 1
   ) latest
   WHERE latest.round->>'status'='OPEN'
   AND CASE WHEN latest.round->'voting' ? 'participantStarts' THEN
    jsonb_array_length(latest.round->'voting'->'participantStarts')=jsonb_array_length(latest.round->'voting'->'eligibleIds')
    AND (SELECT max((entry->>'at')::timestamptz) FROM jsonb_array_elements(latest.round->'voting'->'participantStarts') entry) <= $2::timestamptz
   ELSE (latest.round->'voting'->>'deadlineAt')::timestamptz <= $1::timestamptz END
  `,[new Date(at).toISOString(),new Date(at-ROUND_DURATION_MS).toISOString()]);
  for(const row of rows)await this.mutate({...row,role:'moderator'},null,()=>false);
 }
 async mutate(identity:Identity,expectedRevision:number|null,fn:(s:State,at:number)=>unknown){
  const c=await this.pool.connect();
  let committed=false;
  try{
   await c.query('BEGIN');
   await c.query('SELECT id FROM dc2_rooms WHERE id=$1 FOR UPDATE',[identity.roomId]);
   const row=(await c.query('SELECT revision,state FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[identity.roomId])).rows[0];
   if(!row)throw new DomainError('Estado da sala indisponível.',409);
   const at=this.clock(),s=validateState(row.state),expired=expireRound(s,at);
   const next=expired?structuredClone(s):s;
   let changed=false,failed=false,failure:unknown;
   try{
    if(expectedRevision!==null&&(row.revision!==expectedRevision||expired))throw new DomainError('A sala mudou. Atualize antes de continuar.',409);
    changed=fn(next,at)!==false;
   }catch(e){
    if(!expired)throw e;
    // Expiration is authoritative even when the attempted action is too late.
    failed=true;failure=e;
   }
   const state=failed?s:next,revision=row.revision+(changed||expired?1:0);
   if(changed||expired){
    validateState(state);
    await c.query('INSERT INTO dc2_snapshots(room_id,revision,state) VALUES($1,$2,$3)',[identity.roomId,revision,JSON.stringify(state)]);
   }
   await c.query('COMMIT');committed=true;
   if(failed)throw failure;
   return {revision,state};
  }catch(e){if(!committed)await c.query('ROLLBACK');throw e;}finally{c.release();}
 }

}
export function postgresRepository(pool:pg.Pool,pepper:string){return new Repository(pool as unknown as SQLPool,pepper);}

