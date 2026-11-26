import {reserveReview,finishReview,ReviewWait,REVIEW_INTERVAL_MS} from './review-requests.js';
import { automaticMediation } from './automatic.js';
import express from 'express';
import { z, ZodError } from 'zod';
import { makeReceipt, verifyReceipt } from './receipts.js';
import { ProposalSchema, ReviewSchema, ReviewChoiceSchema, ActiveChoiceSchema, EvaluationSchema } from '../shared/contracts.js';
import { Repository, type Identity } from './db.js';
import { AIUnavailable, PROMPT_VERSION, type AIAdapter } from './ai.js';
import { DomainError,assertVoter,participantVotingDeadline,DepartureKind,pendingVoters,closeRound,removeParticipant,manifestations,currentRound,currentProposal,latestVotes,positions,contribute,vote,addAnalysis,addSynthesis,reconcileSynthesisLinks,publish,closeWithoutConsensus,contest,evaluate,event,exportState,ImportSchema,validateState,statistics,metrics,CoverageSchema, type State, type ReviewRecordType } from './domain.js';
export function createApp(repo:Repository,ai:AIAdapter,signingKey:string,options:{origin?:string;commit?:string|null;aiConfigured?:boolean}={}){
 if(signingKey.length<32)throw new Error('REVIEW_SIGNING_KEY forte obrigatório.');
 const prepare=automaticMediation(repo,ai);
 const app=express();app.disable('x-powered-by');
 app.use((_req,res,next)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});next();});
 app.use((req,res,next)=>{const origin=req.get('origin');if(origin&&origin!==(options.origin??req.protocol+'://'+req.get('host'))){res.status(403).json({error:'Origem não autorizada.'});return;}next();});
 app.use(express.json({limit:'8mb'}));
 function rateLimit(max:number){const counts=new Map<string,{n:number,until:number}>();return (req:express.Request,res:express.Response,next:express.NextFunction)=>{
  const time=Date.now();for(const [k,v] of counts)if(v.until<time)counts.delete(k);
  const key=req.ip??'unknown',v=counts.get(key)??{n:0,until:time+60000};v.n++;counts.set(key,v);
  if(v.n>max){res.status(429).json({error:'Muitas requisições. Aguarde um minuto.'});return;}next();
 };}
 app.use('/api',rateLimit(300));
 const aiLimit=rateLimit(60),creationLimit=rateLimit(10);
 const enrollmentLimit=rateLimit(90);
 const credential=z.string().min(20).max(128),revision=z.number().int().positive();
 const text=z.string().trim().min(1).max(5000);
 const reviewInput=z.object({receipt:z.string().max(1000000).optional(),bypassReason:z.string().trim().min(4).max(1000).optional(),appliedRewrite:z.boolean().optional(),reviewChoice:ReviewChoiceSchema.optional()});
 const reviewRecord=(body:z.infer<typeof reviewInput>,kind:'proposal'|'contribution',binding:unknown):ReviewRecordType=>{
  if(body.receipt){const result=ReviewSchema.parse(verifyReceipt(signingKey,body.receipt,kind,binding));
   if(kind==='contribution'&&body.appliedRewrite&&result.suggestedRewrite!==(binding as {text?:string}).text)throw new DomainError('Reformulação não corresponde ao parecer assinado. Analise novamente.');
   return {result,choice:body.reviewChoice??(body.appliedRewrite?'USED_REWRITE':'KEPT_ORIGINAL'),status:'OK',model:ai.model,promptVersion:PROMPT_VERSION,reason:'',...(kind==='contribution'&&body.appliedRewrite?{appliedRewrite:true}:{})} as ReviewRecordType;
  }
  if(body.appliedRewrite)throw new DomainError('Reformulação exige parecer de IA válido.');
  if(!body.bypassReason)throw new DomainError('Solicite parecer ou registre por que decidiu continuar sem ele.');
  return {result:null,status:'IGNORADA',model:'none',promptVersion:PROMPT_VERSION,reason:body.bypassReason};
 };
 async function auth(req:express.Request,role?:Identity['role']){
  const code=z.string().regex(/^[A-F0-9]{10}$/).parse(String(req.params.code).toUpperCase());
  const token=credential.parse(req.body?.credential);
  const identity=await repo.authorize(code,token);
  if(!identity)throw new DomainError('Código ou credencial inválidos.',401);
  if(role&&identity.role!==role)throw new DomainError('Permissão insuficiente.',403);
  if(identity.role==='participant'){
   const {state}=await repo.read(identity);
   if(state.enrollment&&!state.researchConsents.some(c=>c.participantId===identity.participantId))throw new DomainError('Registre sua concordância antes de participar.',403);
  }
  return identity;
 }
 function view(s:State,identity:Identity,revision:number){
  const r=currentRound(s),p=currentProposal(s),pid=identity.participantId;
  const visible=identity.role==='moderator'||s.votes.some(v=>v.roundId===r.id&&v.participantId===pid)||s.contributions.some(c=>c.roundId===r.id&&c.participantId===pid);
  const filtered:State={...s,
   // Role projection only: persisted initial review and moderator exports stay complete.
   proposals:s.proposals.map((p,index)=>identity.role!=='moderator'&&index===0?{...p,review:{...p.review,result:null,reason:''}}:p),
   rounds:identity.role==='moderator'?s.rounds:s.rounds.map(round=>round.voting?.participantStarts?{...round,voting:{...round.voting,participantStarts:round.voting.participantStarts.filter(start=>start.participantId===pid)}}:round),
   factualChecks:s.factualChecks.filter(f=>visible||f.participantId===pid),
   votes:s.votes.filter(v=>visible||v.participantId===pid),contributions:s.contributions.filter(c=>visible||c.participantId===pid),
   researchConsents:identity.role==='moderator'?s.researchConsents:s.researchConsents.filter(c=>c.participantId===pid),
   enrollment:s.enrollment?{...s.enrollment,claims:identity.role==='moderator'?s.enrollment.claims:s.enrollment.claims.filter(id=>id===pid)}:undefined,
   mediation:identity.role==='moderator'?s.mediation:undefined,
   reviewRequests:(s.reviewRequests??[]).filter(x=>identity.role==='participant'&&x.participantId===pid).map(({review,...x})=>x),
   analyses:identity.role==='moderator'?s.analyses:s.analyses.filter(a=>s.syntheses.some(x=>x.analysisId===a.id&&x.publishedProposalId)),
   syntheses:identity.role==='moderator'?s.syntheses:s.syntheses.filter(x=>x.publishedProposalId),contests:s.contests.filter(c=>visible||c.participantId===pid),
   events:identity.role==='moderator'?s.events:s.events.filter(e=>e.actor===pid||['PROPOSAL_PUBLISHED','CONSENSUS_RECORDED','CLOSED_WITHOUT_CONSENSUS'].includes(e.type)),
   evaluations:identity.role==='moderator'?[]:s.evaluations.filter(e=>e.participantId===pid)};
  return {revision,serverNow:Date.now(),votingDeadlineAt:pid?participantVotingDeadline(r,pid):undefined,pendingVoteCount:identity.role==='moderator'?pendingVoters(s).length:undefined,room:{id:s.decision.id,code:identity.code,topic:p.content.title,proposal:p.content.text,proposal_review:identity.role==='moderator'?s.proposals[0].review.result:null},
   role:identity.role,alias:identity.alias??null,participantId:pid??null,canViewGroup:visible,state:filtered,
   positions:(visible?positions(s):positions(s).filter(p=>p.id===pid)).map(pos=>
    identity.role==='moderator'&&r.status==='OPEN'&&r.voting?.participantStarts&&pos.choice==='PENDENTE'&&!r.voting.participantStarts.some(start=>start.participantId===pos.id)?{...pos,choice:'AINDA_NAO_ENTROU'}:pos),
   contributions:filtered.contributions.map(c=>({...c,alias:s.participants.find(p=>p.id===c.participantId)!.alias,created_at:c.createdAt,review:c.review.result,user_choice:c.contest?'ENVIAR_COM_RESSALVA':'ENVIAR'})),
   metrics:identity.role==='moderator'?metrics(s):null};
 }
 app.get('/api/health',async(_req,res)=>{await repo.healthy();res.json({status:'ok',version:2,commit:options.commit??null,aiConfigured:options.aiConfigured??false,geminiPolicy:{maxCalls:14,windowSeconds:60,participantIntervalSeconds:60}});});
 app.post('/api/ai/proposal-review',aiLimit,async(req,res)=>{
  z.literal(true).parse(req.body.consent);const proposal=ProposalSchema.parse(req.body.proposal);
  const review=await ai.analyzeProposal(proposal);res.json({review,receipt:makeReceipt(signingKey,'proposal',proposal,review)});
 });
 app.post('/api/rooms',creationLimit,async(req,res)=>{
  const b=reviewInput.extend({proposal:ProposalSchema,reviewedProposal:ProposalSchema.optional(),appliedRewrite:z.boolean().optional(),participantCount:z.number().int().min(2).max(15),simple:z.boolean().default(false),aiConsent:z.boolean().optional(),initialReviewMode:z.enum(['REVIEWED','BYPASSED']).optional()}).parse(req.body);
  let review:ReviewRecordType;
  if(b.simple){
   if(b.aiConsent!==true)throw new DomainError('Autorize o apoio consultivo da IA na criação da sala.');
   if(b.initialReviewMode==='REVIEWED'){
    if(!b.reviewedProposal||!b.receipt)throw new DomainError('Solicite a revisão inicial antes de confirmar a proposta.');
    review=reviewRecord(b,'proposal',b.reviewedProposal);
   }else if(b.initialReviewMode==='BYPASSED'){
    if(b.receipt||b.appliedRewrite)throw new DomainError('Criação sem revisão não pode adotar um parecer.');
    review=reviewRecord(b,'proposal',b.proposal);
   }else try{review={result:await ai.analyzeProposal(b.proposal),status:'OK',model:ai.model,promptVersion:PROMPT_VERSION,reason:'Parecer inicial automático, destinado ao moderador.'};}
   catch{review={result:null,status:'INDISPONIVEL',model:ai.model,promptVersion:PROMPT_VERSION,reason:'Parecer inicial indisponível. Proposta confirmada pelo moderador.'};}
  }else review=reviewRecord(b,'proposal',b.reviewedProposal??b.proposal);if(b.appliedRewrite){if(!review.result?.suggestedRewrite)throw new DomainError('Sugestão original da IA indisponível.');review.appliedRewrite=true;}review.reason=b.reviewedProposal?'Moderador confirmou a versão publicada após parecer sobre o rascunho preservado.':review.reason;
  res.status(201).json(await repo.create(b.proposal,b.participantCount,review,undefined,b.reviewedProposal,b.simple));
 });
 app.post('/api/import',creationLimit,async(req,res)=>{
  const data=ImportSchema.parse(req.body);const state=validateState(data.state);
  // Import is a new process with new access credentials; it never targets an existing room.
  res.status(201).json(await repo.create(currentProposal(state).content,state.participants.length,state.proposals[0].review,state));
 });
 app.post('/api/rooms/:code/invitation',enrollmentLimit,async(req,res)=>{
  const code=z.string().regex(/^[A-F0-9]{10}$/).parse(String(req.params.code).toUpperCase());
  res.json(await repo.invitation(code));
 });
 app.post('/api/rooms/:code/join',enrollmentLimit,async(req,res)=>{
  const code=z.string().regex(/^[A-F0-9]{10}$/).parse(String(req.params.code).toUpperCase());
  const b=z.object({browserCredential:z.string().regex(/^[a-f0-9]{64}$/),consent:z.literal(true),version:z.string()}).parse(req.body);
  res.json(await repo.join(code,b.browserCredential,b.version));
 });
 app.post('/api/rooms/:code/prepare-mediation',aiLimit,async(req,res)=>{
  const i=await auth(req,'moderator');void prepare(i,true);res.json({preparing:true});
 });
 app.post('/api/rooms/:code/view',async(req,res)=>{
  const i=await auth(req);if(i.role==='moderator')void prepare(i);const known=z.number().int().positive().optional().parse(req.body.knownRevision);
  const x=await repo.read(i);
  if(known===x.revision){res.json({revision:x.revision,unchanged:true});return;}
  res.json(view(x.state,i,x.revision));
 });
 app.post('/api/rooms/:code/contribution-review',aiLimit,async(req,res)=>{
  const i=await auth(req,'participant'),b=z.object({text,proposalId:z.string().uuid(),roundId:z.string().uuid(),position:z.literal('REJEITO').default('REJEITO'),consent:z.literal(true)}).parse(req.body),{state}=await repo.read(i);
  if(b.proposalId!==currentProposal(state).id||b.roundId!==currentRound(state).id)throw new DomainError('Versão desatualizada.',409);
  const reserved=await reserveReview(repo,i,b.text,Date.now(),ai.model,b);
  try{const review=reserved.cached??await ai.analyzeContribution(currentProposal(state).content,b.text,b.position);
   if(!reserved.cached)await finishReview(repo,i,reserved.requestId,review);
   const latest=(await repo.read(i)).state;assertVoter(latest,i.participantId!,b.roundId,b.proposalId);
   if(latest.votes.some(v=>v.roundId===b.roundId&&v.participantId===i.participantId))throw new DomainError('Seu voto já foi registrado.',409);
   const binding={roomId:i.roomId,participantId:i.participantId,roundId:b.roundId,proposalId:b.proposalId,text:b.text};
   res.json({review,availableAt:new Date(Date.parse(reserved.at)+REVIEW_INTERVAL_MS).toISOString(),cached:Boolean(reserved.cached),receipt:makeReceipt(signingKey,'contribution',binding,review),
    rewriteReceipt:review.suggestedRewrite?makeReceipt(signingKey,'contribution',{...binding,text:review.suggestedRewrite},review):null});}
  catch(e){
   if(e instanceof AIUnavailable){
    if(!reserved.cached)try{await finishReview(repo,i,reserved.requestId);}catch{}
    await repo.mutate(i,null,s=>event(s,i.participantId!,'AI_FAILURE','analyzeContribution: '+e.code+'; '+PROMPT_VERSION+'; '+ai.model));
   }
   throw e;
  }
 });
 const contributionBody=reviewInput.extend({revision,proposalId:z.string().uuid(),roundId:z.string().uuid(),text,originalText:text,contest:z.string().trim().max(2000).default('')});
 function contributionReview(i:Identity,b:z.infer<typeof reviewInput>&{roundId:string;proposalId:string;originalText?:string},submitted:string){
  const edited=b.reviewChoice==='EDITED_REWRITE'||b.reviewChoice==='EDITED_ORIGINAL';
  if(edited&&(!b.receipt||!b.originalText?.trim()||b.appliedRewrite))throw new DomainError('O texto editado exige o comprovante do parecer sobre a justificativa original.');
  const review=reviewRecord(b,'contribution',{roomId:i.roomId,participantId:i.participantId,roundId:b.roundId,proposalId:b.proposalId,text:edited?b.originalText!.trim():submitted});
  if(b.reviewChoice==='EDITED_REWRITE'&&!review.result?.suggestedRewrite)throw new DomainError('O parecer não tem reformulação para editar.');
  return review;
 }
 app.post('/api/rooms/:code/contributions',async(req,res)=>{
  const i=await auth(req,'participant'),b=contributionBody.parse(req.body),review=contributionReview(i,b,b.text);
  await repo.mutate(i,b.revision,(s,at)=>{contribute(s,i.participantId!,b.roundId,b.proposalId,b.text,b.originalText,review,b.contest,at);});
  res.status(201).json({saved:true});
 });
 app.post('/api/rooms/:code/votes',async(req,res)=>{
  const i=await auth(req,'participant'),b=reviewInput.extend({revision,proposalId:z.string().uuid(),roundId:z.string().uuid(),choice:ActiveChoiceSchema,justification:z.string().trim().max(5000).default(''),originalText:z.string().max(5000).optional(),contest:z.string().max(2000).default('')}).parse(req.body);
  if(b.choice==='ACEITO'&&b.justification)throw new DomainError('ACEITO significa aceitar a proposta como está, sem justificativa. Se precisa de alteração, escolha REJEITO e explique.');
  const review=b.justification?contributionReview(i,{...b,bypassReason:b.bypassReason??'Autor enviou a justificativa sem parecer consultivo.'},b.justification):null;
  await repo.mutate(i,null,(s,at)=>{
   if(review)contribute(s,i.participantId!,b.roundId,b.proposalId,b.justification,b.originalText??b.justification,review,b.contest,at);
   vote(s,i.participantId!,b.roundId,b.proposalId,b.choice,b.justification,at);
  });void prepare(i);res.status(201).json({saved:true});
 });
 async function aiAction(req:express.Request,mode:'analysis'|'synthesis'){
  const i=await auth(req,'moderator'),b=z.object({revision,consent:z.literal(true),analysisId:z.string().uuid().optional()}).parse(req.body);
  const {state,revision:current}=await repo.read(i);if(current!==b.revision)throw new DomainError('Sala desatualizada.',409);
  if(state.decision.status!=='OPEN')throw new DomainError('Processo encerrado.',409);
  try{
   if(mode==='analysis'){
    const result=await ai.analyzeObjections(currentProposal(state).content,latestVotes(state).map(({id,choice,justification})=>({id,choice,justification})),state.contributions.filter(c=>c.roundId===currentRound(state).id).map(c=>({id:c.id,text:c.text})),manifestations(state));
    return await repo.mutate(i,b.revision,s=>addAnalysis(s,result,ai.model,PROMPT_VERSION));
   }
   const a=state.analyses.find(a=>a.id===b.analysisId&&a.proposalId===currentProposal(state).id);if(!a)throw new DomainError('Análise atual não encontrada.');
   const result=await ai.synthesizeProposal(currentProposal(state).content,a.result,manifestations(state),state.proposals[0].content);
   const verified=reconcileSynthesisLinks(state,result);
   return await repo.mutate(i,b.revision,s=>{
    if(verified!==result)event(s,'moderator','SYNTHESIS_LINKS_RECONCILED','IDs verificados; classificação ausente conservadoramente não atendida. Ver aviso no rascunho.');
    addSynthesis(s,a.id,verified,ai.model,PROMPT_VERSION);
   });
  }catch(e){
   if(e instanceof AIUnavailable||e instanceof DomainError&&e.status===502){
    const x=await repo.read(i);await repo.mutate(i,x.revision,s=>event(s,'moderator','AI_FAILURE',mode+': '+(e instanceof AIUnavailable?e.code:'INVALID_LINKS')+'; '+PROMPT_VERSION+'; '+ai.model));
   }throw e;
  }
 }
 app.post('/api/rooms/:code/analyze-objections',aiLimit,async(req,res)=>{await aiAction(req,'analysis');res.json({saved:true});});
 app.post('/api/rooms/:code/synthesize',aiLimit,async(req,res)=>{await aiAction(req,'synthesis');res.json({saved:true});});
 app.post('/api/rooms/:code/publish',async(req,res)=>{
  const i=await auth(req,'moderator'),b=z.object({revision,proposal:ProposalSchema,sourceId:z.string().uuid(),synthesisId:z.string().uuid().optional(),reason:z.string().trim().max(5000).default(''),coverage:CoverageSchema.default([]),confirm:z.literal(true)}).parse(req.body);
  await repo.mutate(i,b.revision,(s,at)=>publish(s,b.proposal,b.sourceId,b.reason,b.synthesisId,b.coverage,at));res.json({saved:true});
 });
 app.post('/api/rooms/:code/round-close',async(req,res)=>{
  const i=await auth(req,'moderator'),b=z.object({roundId:z.string().uuid(),pendingCount:z.number().int().nonnegative(),confirm:z.literal(true)}).parse(req.body);
  await repo.mutate(i,null,(s,at)=>closeRound(s,b.roundId,b.pendingCount,at));void prepare(i);res.json({saved:true});
 });
 app.post('/api/rooms/:code/participant-remove',async(req,res)=>{
  const i=await auth(req,'moderator'),b=z.object({roundId:z.string().uuid(),participantId:z.string().uuid(),kind:DepartureKind,confirm:z.literal(true)}).parse(req.body);
  await repo.mutate(i,null,(s,at)=>removeParticipant(s,b.participantId,b.roundId,b.kind,at));void prepare(i);res.json({saved:true});
 });
 app.post('/api/rooms/:code/close',async(req,res)=>{const i=await auth(req,'moderator'),b=z.object({revision,reason:text}).parse(req.body);await repo.mutate(i,b.revision,(s,at)=>closeWithoutConsensus(s,b.reason,at));res.json({saved:true});});
 app.post('/api/rooms/:code/contest',async(req,res)=>{const i=await auth(req,'participant'),b=z.object({revision,targetId:z.string().uuid(),text:z.string().trim().min(1).max(2000)}).parse(req.body);await repo.mutate(i,b.revision,s=>{
  if(s.enrollment&&(s.syntheses.some(x=>x.id===b.targetId&&!x.publishedProposalId)||s.analyses.some(a=>a.id===b.targetId&&!s.syntheses.some(x=>x.analysisId===a.id&&x.publishedProposalId))))throw new DomainError('Rascunho reservado ao moderador.',403);
  contest(s,i.participantId!,b.targetId,b.text);
 });res.status(201).json({saved:true});});
 app.post('/api/rooms/:code/evaluation',async(req,res)=>{const i=await auth(req,'participant'),b=z.object({revision,input:EvaluationSchema}).parse(req.body);await repo.mutate(i,b.revision,s=>evaluate(s,i.participantId!,b.input));res.status(201).json({saved:true});});
 app.post('/api/rooms/:code/export',async(req,res)=>{const i=await auth(req,'moderator'),x=await repo.read(i);res.json(exportState(x.state));});
 app.post('/api/rooms/:code/evaluation-results',async(req,res)=>{const i=await auth(req,'moderator'),{state}=await repo.read(i);res.json(statistics(state));});
 app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(err instanceof ZodError){res.status(400).json({error:'Dados inválidos. Revise os campos e vínculos.'});return;}
  if(err instanceof ReviewWait){res.set('Retry-After',String(err.retryAfterSeconds));res.status(429).json({error:err.message,code:err.code,retryAfterSeconds:err.retryAfterSeconds});return;}
  if(err instanceof DomainError){res.status(err.status).json({error:err.message});return;}
  if(err instanceof AIUnavailable){console.warn('AI failure',JSON.stringify({code:err.code,status:err.httpStatus??null,attempts:err.attempts,model:ai.model,promptVersion:PROMPT_VERSION}));const unavailable=err.httpStatus===503;
   res.status(unavailable?503:502).json({error:unavailable?'O serviço Gemini está temporariamente indisponível após as tentativas automáticas. Seu texto foi mantido. Aguarde um pouco e tente novamente ou continue sem revisão.':'IA indisponível. Você pode continuar sem parecer; registre essa escolha.',code:err.code,attempts:err.attempts,retryable:unavailable});return;}
  const msg=err instanceof Error?err.message:'';
  if(/Comprovante|Avaliação expirada|avaliação corrompido/i.test(msg)){res.status(400).json({error:msg});return;}
  const code=(err as {code?:string})?.code;
  if(code==='23505'||code==='40001'){res.status(409).json({error:'Registro concorrente. Atualize a sala.'});return;}
  if((err as {type?:string})?.type==='entity.too.large'){res.status(413).json({error:'Arquivo excede 8 MB.'});return;}
  if(err instanceof SyntaxError){res.status(400).json({error:'JSON inválido.'});return;}
  console.error('API failure',err instanceof Error?err.constructor.name:'unknown');res.status(500).json({error:'Falha de serviço. Nenhum consenso foi presumido.'});
 });
 return app;
}

