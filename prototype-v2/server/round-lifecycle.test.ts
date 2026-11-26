import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createApp} from './app.js';
import {Repository,type SQLPool} from './db.js';
import {ROUND_DURATION_MS,validateState,exportState,type State} from './domain.js';
import {FakeAI,proposal,review} from './fixtures.js';
import {migrate} from './migrate.js';
import {RESEARCH_VERSION} from '../shared/research.js';

type View={state:State;revision:number;votingDeadlineAt?:string;pendingVoteCount:number;positions:{id:string;choice:string}[]};
type Room={code:string;moderatorCredential:string;participants:{credential:string}[]};
const token=(i:number)=>i.toString(16).padStart(64,'0');

test('HTTP: prazo, saídas, encerramento, concorrência e histórico de rodadas',async t=>{
 const db=new PGlite();
 const query=async(sql:string,values?:unknown[])=>{
  if(sql.includes('CREATE TABLE')){await db.exec(sql);return {rows:[]};}
  return db.query(sql,values);
 };
 let tail=Promise.resolve();
 const pool:SQLPool={query,async connect(){
  const prior=tail;let release!:()=>void;
  tail=new Promise<void>(resolve=>{release=resolve;});
  await prior;return {query,release};
 }};
 await migrate({query});
 let clock=Date.now();
 const repo=new Repository(pool,'synthetic-pepper-round-lifecycle-tests',()=>clock);
 const ai=new FakeAI();
 const server=createApp(repo,ai,'synthetic-signing-round-lifecycle-tests').listen(0,'127.0.0.1');
 await new Promise<void>(r=>server.once('listening',r));
 const addr=server.address();assert.ok(addr&&typeof addr!=='string');
 const base='http://127.0.0.1:'+addr.port+'/api';
 async function post<T=unknown>(path:string,body:unknown){
  const res=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  return {status:res.status,body:await res.json() as T};
 }
 async function create(count:number,simple=false){
  const result=await post<Room>('/rooms',{proposal,participantCount:count,simple,aiConsent:true,bypassReason:'Teste de rodada sem IA.'});
  assert.equal(result.status,201);
  return result.body;
 }
 const roomPost=<T=unknown>(room:Room,path:string,body:object,credential=room.moderatorCredential)=>post<T>('/rooms/'+room.code+path,{credential,...body});
 async function view(room:Room){const result=await roomPost<View>(room,'/view',{});assert.equal(result.status,200);return result.body;}
 const round=(v:View)=>v.state.rounds.at(-1)!;
 const vote=(room:Room,v:View,n:number,credential=room.participants[n].credential)=>roomPost(room,'/votes',{roundId:round(v).id,proposalId:round(v).proposalId,revision:v.revision,choice:'ACEITO'},credential);
 const remove=(room:Room,v:View,n:number,kind:'DESISTENCIA'|'ABANDONO')=>roomPost(room,'/participant-remove',{roundId:round(v).id,participantId:v.state.participants[n].id,kind,confirm:true});
 const close=(room:Room,v:View,pendingCount=v.pendingVoteCount)=>roomPost(room,'/round-close',{roundId:round(v).id,pendingCount,confirm:true});
 try{
  await t.test('um milissegundo antes é aceito e o instante do prazo é rejeitado sob a transação',async()=>{
   const room=await create(3),v=await view(room),opening=Date.parse(round(v).openedAt);
   assert.equal(Date.parse(round(v).voting!.deadlineAt)-opening,ROUND_DURATION_MS);
   clock=opening+ROUND_DURATION_MS-1;
   assert.equal((await vote(room,v,0)).status,201);
   clock++;
   assert.equal((await vote(room,v,1)).status,409);
   const expired=await view(room);
   assert.equal(expired.state.decision.status,'OPEN');
   assert.equal(round(expired).closedAt,round(v).voting!.deadlineAt);
   assert.deepEqual(round(expired).voting!.closure,{cause:'PRAZO_EXPIRADO',abstentions:v.state.participants.slice(1).map(p=>p.id)});
   assert.equal(expired.state.votes.length,1);
   assert.equal(Date.parse(expired.state.votes[0].createdAt),clock-1);
   assert.equal((await vote(room,v,1)).status,409);
   assert.equal((await view(room)).revision,expired.revision);
  });

  await t.test('justificativa original é persistida no limite com parecer ainda em andamento',async()=>{
   const room=await create(2),v=await view(room),r=round(v);
   const credential=room.participants[0].credential;
   const justification='Rejeito o prazo atual. Solicito mais dois dias.';
   const body={proposalId:r.proposalId,roundId:r.id,revision:v.revision};
   let started!:()=>void,release!:()=>void;
   const entered=new Promise<void>(resolve=>{started=resolve;});
   const wait=new Promise<void>(resolve=>{release=resolve;});
   const previous=ai.analyzeContribution;
   ai.analyzeContribution=async()=>{started();await wait;return review;};
   const pending=roomPost(room,'/contribution-review',{...body,text:justification,position:'REJEITO',consent:true},credential);
   try{
    await Promise.race([entered,pending.then(result=>{throw new Error('Parecer retornou antes do teste: '+result.status);})]);
    clock=Date.parse(r.voting!.deadlineAt)-1;
    const cast=await roomPost(room,'/votes',{...body,choice:'REJEITO',justification},credential);
    assert.equal(cast.status,201);
    clock++;
    release();
    assert.equal((await pending).status,409);
    const saved=await view(room);
    assert.equal(saved.state.votes[0].justification,justification);
    assert.equal(saved.state.contributions[0].review.status,'IGNORADA');
    assert.deepEqual(round(saved).voting!.closure!.abstentions,[v.state.participants[1].id]);
   }finally{release();await pending;ai.analyzeContribution=previous;}
  });

  await t.test('primeira rodada dá o prazo inteiro a cada entrada e a varredura aguarda as vagas restantes',async()=>{
   const room=await create(3,true),v=await view(room),opened=clock;
   const join=(n:number)=>roomPost(room,'/join',{browserCredential:token(n),consent:true,version:RESEARCH_VERSION});
   assert.deepEqual(v.positions.map(p=>p.choice),['AINDA_NAO_ENTROU','AINDA_NAO_ENTROU','AINDA_NAO_ENTROU']);
   clock=opened+60_000;
   assert.equal((await join(1)).status,200);
   clock=opened+120_000;
   assert.equal((await join(2)).status,200);
   assert.equal((await join(1)).status,200);
   const first=await roomPost<View>(room,'/view',{},token(1)),second=await roomPost<View>(room,'/view',{},token(2));
   assert.equal(Date.parse(first.body.votingDeadlineAt!),opened+60_000+ROUND_DURATION_MS);
   assert.equal(Date.parse(second.body.votingDeadlineAt!),opened+120_000+ROUND_DURATION_MS);
   assert.equal(first.body.state.rounds[0].voting!.participantStarts!.length,1);
   clock=opened+60_000+ROUND_DURATION_MS;
   await repo.sweepExpiredRounds();
   const before=await view(room);
   assert.equal(round(before).status,'OPEN');
   assert.equal((await vote(room,before,0,token(1))).status,409);
   assert.equal((await vote(room,before,1,token(2))).status,201);
   assert.equal((await join(3)).status,200);
   clock+=ROUND_DURATION_MS;
   await repo.sweepExpiredRounds();
   const moderator=await repo.authorize(room.code,room.moderatorCredential);
   assert.ok(moderator);
   const rows=(await pool.query('SELECT state FROM dc2_snapshots WHERE room_id=$1 ORDER BY revision DESC LIMIT 1',[moderator.roomId])).rows;
   const persisted=validateState(rows[0].state);
   assert.deepEqual(persisted.rounds[0].voting!.closure,{cause:'PRAZO_EXPIRADO',abstentions:[v.state.participants[0].id,v.state.participants[2].id]});
  });

  await t.test('moderador encerra com ausentes e a segunda rodada começa com prazo comum',async()=>{
   const room=await create(3,true);
   const join=(n:number)=>roomPost(room,'/join',{browserCredential:token(n),consent:true,version:RESEARCH_VERSION});
   assert.equal((await join(4)).status,200);
   clock+=ROUND_DURATION_MS+1;
   const before=await view(room);
   assert.equal(before.pendingVoteCount,1);
   assert.equal((await close(room,before)).status,200);
   assert.equal((await join(5)).status,200);
   const closed=await view(room);
   assert.deepEqual(closed.positions.map(p=>p.choice),['ABSTENCAO','SEM_VOTO','SEM_VOTO']);
   assert.equal((await roomPost(room,'/publish',{revision:closed.revision,sourceId:round(closed).proposalId,proposal,reason:'Revisão do grupo.',confirm:true})).status,200);
   const next=await view(room);
   assert.equal(round(next).voting!.participantStarts,undefined);
   assert.equal(Date.parse(round(next).voting!.deadlineAt),clock+ROUND_DURATION_MS);
   assert.deepEqual(round(next).voting!.eligibleIds,closed.state.participants.slice(0,2).map(p=>p.id));
   assert.equal((await join(6)).status,200);
   assert.equal((await vote(room,next,2,token(6))).status,403);
  });

  await t.test('saída antes de votar impede consenso, confirmação registra só os pendentes ativos',async()=>{
   const room=await create(4),v=await view(room);
   const one=await vote(room,v,0);assert.equal(one.status,201);
   const departure=await remove(room,v,1,'DESISTENCIA');assert.equal(departure.status,200);
   const repeated=await view(room);
   assert.equal((await remove(room,v,1,'DESISTENCIA')).status,200);
   assert.equal((await view(room)).revision,repeated.revision);
   assert.equal((await vote(room,v,1)).status,403);
   assert.equal((await close(room,v)).status,409);
   assert.equal((await close(room,repeated)).status,200);
   const closed=await view(room);
   assert.equal((await close(room,repeated)).status,200);
   assert.equal((await view(room)).revision,closed.revision);
   assert.equal(closed.state.decision.status,'OPEN');
   assert.deepEqual(round(closed).voting!.eligibleIds,round(v).voting!.eligibleIds);
   assert.deepEqual(round(closed).voting!.closure,{cause:'MODERADOR',abstentions:v.state.participants.slice(2).map(p=>p.id)});
   assert.deepEqual(closed.positions.map(p=>p.choice),['ACEITO','DESISTENCIA','ABSTENCAO','ABSTENCAO']);
   const pub=await roomPost(room,'/publish',{revision:closed.revision,sourceId:round(closed).proposalId,proposal,reason:'Revisão do grupo.',confirm:true});
   assert.equal(pub.status,200);
   const next=await view(room);
   assert.deepEqual(round(next).voting!.eligibleIds,v.state.participants.filter((_,i)=>i!==1).map(p=>p.id));
   assert.equal((await vote(room,next,1)).status,403);
   const accepts=await Promise.all([0,2,3].map(i=>vote(room,next,i)));
   assert.ok(accepts.every(r=>r.status===201));
   const final=await view(room);assert.equal(final.state.decision.status,'CONSENSUS');
   assert.equal(round(final).voting!.closure!.cause,'CONSENSO');
   assert.deepEqual(final.state.rounds[0],round(closed));
   const archive=await roomPost<{format:string;version:number;state:State}>(room,'/export',{});
   assert.equal(archive.body.format,'dc2-consensus');assert.equal(archive.body.version,2);
   assert.deepEqual(validateState(archive.body.state),exportState(final.state).state);
   const copy=await post<Room>('/import',archive.body);assert.equal(copy.status,201);
   const restored=await view(copy.body);
   assert.deepEqual(restored.state.rounds.map(r=>r.voting!.closure!.cause),['MODERADOR','CONSENSO']);
   assert.equal(restored.state.participants[1].departure?.kind,'DESISTENCIA');
   assert.equal(restored.state.votes.length,4);
  });

  await t.test('todos os restantes aceitam, mas saída sem voto impede consenso nesta rodada',async()=>{
   const room=await create(3),v=await view(room);
   assert.equal((await remove(room,v,0,'ABANDONO')).status,200);
   const votes=await Promise.all([1,2].map(n=>vote(room,v,n)));
   assert.ok(votes.every(r=>r.status===201));
   const closed=await view(room);
   assert.equal(closed.state.decision.status,'OPEN');
   assert.equal(closed.state.votes.length,2);
   assert.deepEqual(round(closed).voting!.closure,{cause:'VOTACAO_CONCLUIDA',abstentions:[]});
   assert.deepEqual(round(closed).voting!.eligibleIds,round(v).voting!.eligibleIds);
  });

  await t.test('remoção preserva voto anterior e uma corrida com a confirmação não produz inconsistência',async()=>{
   const room=await create(2),v=await view(room);
   assert.equal((await vote(room,v,0)).status,201);
   assert.equal((await remove(room,v,0,'ABANDONO')).status,200);
   assert.equal((await vote(room,v,1)).status,201);
   const accepted=await view(room);
   assert.equal(accepted.state.decision.status,'CONSENSUS');
   assert.deepEqual(accepted.positions.map(p=>p.choice),['ACEITO','ACEITO']);
   assert.equal(accepted.state.participants[0].departure?.kind,'ABANDONO');

   const race=await create(2),open=await view(race);
   const [cast,closed]=await Promise.all([vote(race,open,0),close(race,open)]);
   const result=await view(race);
   if(cast.status===201){
    assert.equal(closed.status,409);assert.equal(result.state.votes.length,1);
    assert.equal((await close(race,result)).status,200);
    assert.equal(round(await view(race)).voting!.closure!.abstentions.length,1);
   }else{
    assert.equal(cast.status,409);assert.equal(closed.status,200);assert.equal(result.state.votes.length,0);
    assert.equal(round(result).voting!.closure!.abstentions.length,2);
   }
   const removalRace=await create(3),before=await view(removalRace);
   const [voted,removed]=await Promise.all([vote(removalRace,before,0),remove(removalRace,before,0,'ABANDONO')]);
   assert.equal(removed.status,200);
   assert.ok(voted.status===201||voted.status===403);
   const after=await view(removalRace);
   assert.equal(after.state.votes.length,voted.status===201?1:0);
   assert.equal(after.state.participants[0].departure?.kind,'ABANDONO');
   assert.ok(round(after).voting!.eligibleIds.includes(after.state.participants[0].id));
  });
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();}
});
