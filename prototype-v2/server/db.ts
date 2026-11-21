import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type pg from 'pg';
import { DomainError, createState, validateState, event, type State, type ReviewRecordType } from './domain.js';
import { RESEARCH_VERSION, RESEARCH_TEXT, RESEARCH_SOURCE } from '../shared/research.js';
import type { ProposalContent } from '../shared/contracts.js';

type QueryResult={rows:any[]};
export interface SQLClient {query(text:string,values?:any[]):Promise<QueryResult>;release():void;}
export interface SQLPool {query(text:string,values?:any[]):Promise<QueryResult>;connect():Promise<SQLClient>;}
export type Identity={roomId:string;code:string;role:'moderator'|'participant';participantId?:string;alias?:string};
export class Repository {
 constructor(private pool:SQLPool,private pepper:string){if(pepper.length<32)throw new Error('AUTH_PEPPER forte obrigatório.');}
 private hash(token:string){return createHmac('sha256',this.pepper).update(token).digest('hex');}
 private token(){return randomBytes(32).toString('base64url');}
 private equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
 async healthy(){await this.pool.query('SELECT 1');}
 async create(proposal:ProposalContent,count:number,review:ReviewRecordType,imported?:State,initialDraft?:ProposalContent,selfEnrollment=false){
  const roomId=randomUUID(),code=randomBytes(5).toString('hex').toUpperCase(),moderatorCredential=this.token();
  const people=Array.from({length:count},(_,i)=>({id:randomUUID(),alias:'P'+String(i+1).padStart(2,'0'),credential:this.token()}));
  let state=createState(roomId,proposal,people.map(({id,alias})=>({id,alias})),review,initialDraft);
  if(imported){
   const mapping=new Map<string,string>([[imported.decision.id,roomId],...imported.participants.map((p,i)=>[p.id,people[i].id] as [string,string])]);
   function remap(value:any):any{if(typeof value==='string')return mapping.get(value)??value;if(Array.isArray(value))return value.map(remap);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='originId'?v:remap(v)]));return value;}
   state=validateState(remap(imported));delete state.enrollment;delete state.mediation;for(const f of state.factualChecks)f.provenance='IMPORTED_UNAUTHENTICATED';event(state,'moderator','IMPORTED','Cópia restaurada em sala nova; credenciais reemitidas. Proveniência do arquivo não autenticada.');
  }
  if(selfEnrollment){state.research={version:RESEARCH_VERSION,text:RESEARCH_TEXT,source:RESEARCH_SOURCE};state.enrollment={mode:'SELF',claims:[],automaticMediation:true};}
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
   if(existing&&s.enrollment.claims.includes(existing.id)){await c.query('COMMIT');return {alias:existing.alias};}
   if(s.decision.status!=='OPEN')throw new DomainError('Esta discussão já foi encerrada.',409);
   const p=s.participants.find(p=>!s.enrollment!.claims.includes(p.id));
   if(!p)throw new DomainError('Todas as vagas previstas para esta sala já foram ocupadas.',409);
   await c.query('INSERT INTO dc2_participants(id,room_id,alias,secret_hash) VALUES($1,$2,$3,$4)',[p.id,room.id,p.alias,hash]);
   s.enrollment.claims.push(p.id);
   s.researchConsents.push({participantId:p.id,response:'SIM',at:new Date().toISOString(),version,actor:'participant'});
   event(s,p.id,'RESEARCH_CONSENT_RECORDED','SIM; '+version);
   event(s,p.id,'PARTICIPANT_ENROLLED',p.alias);
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
 async read(identity:Identity){const row=(await this.pool.query('SELECT revision,state FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[identity.roomId])).rows[0];if(!row)throw new DomainError('Sala anterior à migração. Exporte-a pela versão original; não foi alterada.',409);return {revision:row.revision as number,state:validateState(row.state)};}
 async latestRevision(identity:Identity){const row=(await this.pool.query('SELECT revision FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[identity.roomId])).rows[0];if(!row)throw new DomainError('Estado da sala indisponível.',409);return row.revision as number;}
 async mutate(identity:Identity,expectedRevision:number,fn:(s:State)=>void){
  const c=await this.pool.connect();try{
   await c.query('BEGIN');
   await c.query('SELECT id FROM dc2_rooms WHERE id=$1 FOR UPDATE',[identity.roomId]);
   const row=(await c.query('SELECT revision,state FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[identity.roomId])).rows[0];
   if(!row||row.revision!==expectedRevision)throw new DomainError('A sala mudou. Atualize antes de continuar.',409);
   const s=validateState(row.state);fn(s);validateState(s);
   await c.query('INSERT INTO dc2_snapshots(room_id,revision,state) VALUES($1,$2,$3)',[identity.roomId,row.revision+1,JSON.stringify(s)]);
   await c.query('COMMIT');return {revision:row.revision+1,state:s};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
export function postgresRepository(pool:pg.Pool,pepper:string){return new Repository(pool as unknown as SQLPool,pepper);}

