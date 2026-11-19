import express from 'express';
import { z, ZodError } from 'zod';
import { makeReceipt, verifyReceipt } from './receipts.js';
import { ProposalSchema, ReviewSchema, ChoiceSchema, EvaluationSchema } from '../shared/contracts.js';
import { Repository, type Identity } from './db.js';
import { FactualService,privateData,type FactualAdapter } from './factual.js';
import { FACTUAL_MODEL,FACTUAL_VERSION } from '../shared/factual.js';
import { AIUnavailable, PROMPT_VERSION, type AIAdapter } from './ai.js';
import { DomainError,currentRound,currentProposal,latestVotes,positions,contribute,vote,addAnalysis,addSynthesis,publish,closeWithoutConsensus,contest,evaluate,event,exportState,ImportSchema,validateState,statistics,metrics,CoverageSchema,addFactualCheck,factualContext, type State, type ReviewRecordType } from './domain.js';
export function createApp(repo:Repository,ai:AIAdapter,signingKey:string,options:{origin?:string;commit?:string|null;aiConfigured?:boolean;factual?:FactualAdapter}={}){
 if(signingKey.length<32)throw new Error('REVIEW_SIGNING_KEY forte obrigatório.');
 const factual=options.factual??new FactualService();
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
 const aiLimit=rateLimit(20),creationLimit=rateLimit(10);
 const factualLimit=rateLimit(12);
 const credential=z.string().min(20).max(128),revision=z.number().int().positive();
 const text=z.string().trim().min(1).max(5000);
 const reviewInput=z.object({receipt:z.string().max(1000000).optional(),bypassReason:z.string().trim().min(4).max(1000).optional()});
 const reviewRecord=(body:z.infer<typeof reviewInput>,kind:'proposal'|'contribution',binding:unknown):ReviewRecordType=>{
  if(body.receipt)return {result:ReviewSchema.parse(verifyReceipt(signingKey,body.receipt,kind,binding)),status:'OK',model:ai.model,promptVersion:PROMPT_VERSION,reason:''};
  if(!body.bypassReason)throw new DomainError('Solicite parecer ou registre por que decidiu continuar sem ele.');
  return {result:null,status:'IGNORADA',model:'none',promptVersion:PROMPT_VERSION,reason:body.bypassReason};
 };
 async function auth(req:express.Request,role?:Identity['role']){
  const code=z.string().regex(/^[A-F0-9]{10}$/).parse(String(req.params.code).toUpperCase());
  const token=credential.parse(req.body?.credential);
  const identity=await repo.authorize(code,token);
  if(!identity)throw new DomainError('Código ou credencial inválidos.',401);
  if(role&&identity.role!==role)throw new DomainError('Permissão insuficiente.',403);
  return identity;
 }
 function view(s:State,identity:Identity,revision:number){
  const r=currentRound(s),p=currentProposal(s),pid=identity.participantId;
  const visible=identity.role==='moderator'||s.votes.some(v=>v.roundId===r.id&&v.participantId===pid)||s.contributions.some(c=>c.roundId===r.id&&c.participantId===pid);
  const filtered:State={...s,
   factualChecks:s.factualChecks.filter(f=>visible||f.participantId===pid),
   votes:s.votes.filter(v=>visible||v.participantId===pid),contributions:s.contributions.filter(c=>visible||c.participantId===pid),
   analyses:visible?s.analyses:[],syntheses:visible?s.syntheses:[],contests:s.contests.filter(c=>visible||c.participantId===pid),
   events:identity.role==='moderator'?s.events:s.events.filter(e=>e.actor===pid||['PROPOSAL_PUBLISHED','CONSENSUS_RECORDED','CLOSED_WITHOUT_CONSENSUS'].includes(e.type)),
   evaluations:identity.role==='moderator'?[]:s.evaluations.filter(e=>e.participantId===pid)};
  return {revision,room:{id:s.decision.id,code:identity.code,topic:p.content.title,proposal:p.content.text,proposal_review:s.proposals[0].review.result},
   role:identity.role,alias:identity.alias??null,participantId:pid??null,canViewGroup:visible,state:filtered,
   positions:visible?positions(s):positions(s).filter(p=>p.id===pid),
   contributions:filtered.contributions.map(c=>({...c,alias:s.participants.find(p=>p.id===c.participantId)!.alias,created_at:c.createdAt,review:c.review.result,user_choice:c.contest?'ENVIAR_COM_RESSALVA':'ENVIAR'})),
   metrics:identity.role==='moderator'?metrics(s):null};
 }
 app.get('/api/health',async(_req,res)=>{await repo.healthy();res.json({status:'ok',version:2,commit:options.commit??null,aiConfigured:options.aiConfigured??false,factual:{enabled:factual.enabled,model:FACTUAL_MODEL,version:FACTUAL_VERSION}});});
 app.post('/api/ai/proposal-review',aiLimit,async(req,res)=>{
  z.literal(true).parse(req.body.consent);const proposal=ProposalSchema.parse(req.body.proposal);
  const review=await ai.analyzeProposal(proposal);res.json({review,receipt:makeReceipt(signingKey,'proposal',proposal,review)});
 });
 app.post('/api/rooms',creationLimit,async(req,res)=>{
  const b=reviewInput.extend({proposal:ProposalSchema,reviewedProposal:ProposalSchema.optional(),participantCount:z.number().int().min(2).max(30)}).parse(req.body);
  const review=reviewRecord(b,'proposal',b.reviewedProposal??b.proposal);review.reason=b.reviewedProposal?'Moderador confirmou a versão publicada após parecer sobre o rascunho preservado.':review.reason;
  res.status(201).json(await repo.create(b.proposal,b.participantCount,review,undefined,b.reviewedProposal));
 });
 app.post('/api/import',creationLimit,async(req,res)=>{
  const data=ImportSchema.parse(req.body);const state=validateState(data.state);
  // Import is a new process with new access credentials; it never targets an existing room.
  res.status(201).json(await repo.create(currentProposal(state).content,state.participants.length,state.proposals[0].review,state));
 });
 app.post('/api/rooms/:code/view',async(req,res)=>{const i=await auth(req);const x=await repo.read(i);res.json(view(x.state,i,x.revision));});
 app.post('/api/rooms/:code/fact-check',factualLimit,async(req,res)=>{
  const i=await auth(req),b=z.object({text:z.string().trim().min(4).max(1200),proposalId:z.string().uuid(),roundId:z.string().uuid(),consent:z.literal(true)}).parse(req.body);
  if(privateData(b.text))throw new DomainError('Remova dados pessoais, informações privadas e URLs. Envie somente a alegação pública mínima.');
  const x=await repo.read(i);if(x.state.decision.status!=='OPEN'||currentProposal(x.state).id!==b.proposalId||currentRound(x.state).id!==b.roundId)throw new DomainError('Proposta ou rodada desatualizada.',409);
  const existing=x.state.factualChecks.find(f=>f.proposalId===b.proposalId&&f.participantId===(i.participantId??null)&&f.originalText===b.text&&Date.now()-Date.parse(f.createdAt)<600000);
  if(existing){res.json({check:existing,cached:true});return;}
  if(x.state.factualChecks.length>=40)throw new DomainError('Limite de verificações desta sala atingido.',429);
  const report=await factual.check(b.text,i.roomId);
  // Merge only an append-only factual record, retrying revision races without repeating provider calls.
  for(let attempt=0;attempt<12;attempt++){
   const current=await repo.read(i);
   if(current.state.decision.status!=='OPEN'||currentProposal(current.state).id!==b.proposalId)throw new DomainError('A proposta mudou durante a consulta. O resultado não foi aplicado.',409);
   const duplicate=current.state.factualChecks.find(f=>f.proposalId===b.proposalId&&f.participantId===(i.participantId??null)&&f.originalText===b.text&&Date.now()-Date.parse(f.createdAt)<600000);
   if(duplicate){res.json({check:duplicate,cached:true});return;}
   try{const saved=await repo.mutate(i,current.revision,s=>addFactualCheck(s,report,i.participantId??null));res.status(201).json({check:saved.state.factualChecks.at(-1),cached:false});return;}
   catch(e){if(e instanceof DomainError&&e.status===409&&attempt<11)continue;throw e;}
  }
 });
 app.post('/api/rooms/:code/contribution-review',aiLimit,async(req,res)=>{
  const i=await auth(req,'participant'),b=z.object({text,proposalId:z.string().uuid(),roundId:z.string().uuid(),consent:z.literal(true)}).parse(req.body),{state}=await repo.read(i);
  if(b.proposalId!==currentProposal(state).id||b.roundId!==currentRound(state).id)throw new DomainError('Versão desatualizada.',409);
  try{const review=await ai.analyzeContribution(currentProposal(state).content,b.text);res.json({review,receipt:makeReceipt(signingKey,'contribution',{roomId:i.roomId,participantId:i.participantId,roundId:b.roundId,proposalId:b.proposalId,text:b.text},review)});}
  catch(e){await repo.mutate(i,(await repo.read(i)).revision,s=>event(s,i.participantId!,'AI_FAILURE','analyzeContribution: '+(e instanceof AIUnavailable?e.code:'UNKNOWN')+'; '+PROMPT_VERSION+'; '+ai.model));throw e;}
 });
 const contributionBody=reviewInput.extend({revision,proposalId:z.string().uuid(),roundId:z.string().uuid(),text,originalText:text,contest:z.string().trim().max(2000).default('')});
 function contributionReview(i:Identity,b:z.infer<typeof contributionBody>){return reviewRecord(b,'contribution',{roomId:i.roomId,participantId:i.participantId,roundId:b.roundId,proposalId:b.proposalId,text:b.text});}
 app.post('/api/rooms/:code/contributions',async(req,res)=>{
  const i=await auth(req,'participant'),b=contributionBody.parse(req.body),review=contributionReview(i,b);
  await repo.mutate(i,b.revision,s=>contribute(s,i.participantId!,b.roundId,b.proposalId,b.text,b.originalText,review,b.contest));
  res.status(201).json({saved:true});
 });
 app.post('/api/rooms/:code/votes',async(req,res)=>{
  const i=await auth(req,'participant'),b=reviewInput.extend({revision,proposalId:z.string().uuid(),roundId:z.string().uuid(),choice:ChoiceSchema,justification:z.string().trim().max(5000).default(''),originalText:z.string().max(5000).optional(),contest:z.string().max(2000).default('')}).parse(req.body);
  const review=b.justification?reviewRecord(b,'contribution',{roomId:i.roomId,participantId:i.participantId,roundId:b.roundId,proposalId:b.proposalId,text:b.justification}):null;
  await repo.mutate(i,b.revision,s=>{
   if(review)contribute(s,i.participantId!,b.roundId,b.proposalId,b.justification,b.originalText??b.justification,review,b.contest);
   vote(s,i.participantId!,b.roundId,b.proposalId,b.choice,b.justification);
  });res.status(201).json({saved:true});
 });
 async function aiAction(req:express.Request,mode:'analysis'|'synthesis'){
  const i=await auth(req,'moderator'),b=z.object({revision,consent:z.literal(true),analysisId:z.string().uuid().optional()}).parse(req.body);
  const {state,revision:current}=await repo.read(i);if(current!==b.revision)throw new DomainError('Sala desatualizada.',409);
  if(state.decision.status!=='OPEN')throw new DomainError('Processo encerrado.',409);
  try{
   if(mode==='analysis'){
    const result=await ai.analyzeObjections(currentProposal(state).content,latestVotes(state).map(({id,choice,justification})=>({id,choice,justification})),[...state.contributions.filter(c=>c.roundId===currentRound(state).id).map(c=>({id:c.id,text:c.text})),...factualContext(state).map(f=>({type:'EXTERNAL_EVIDENCE_CONSULTIVE',...f}))]);
    return await repo.mutate(i,b.revision,s=>addAnalysis(s,result,ai.model,PROMPT_VERSION));
   }
   const a=state.analyses.find(a=>a.id===b.analysisId&&a.proposalId===currentProposal(state).id);if(!a)throw new DomainError('Análise atual não encontrada.');
   const result=await ai.synthesizeProposal(currentProposal(state).content,{...a.result,uncertainties:[...a.result.uncertainties,...factualContext(state).map(f=>'EVIDÊNCIA EXTERNA CONSULTIVA, NÃO DECISÓRIA: '+JSON.stringify(f))]});
   return await repo.mutate(i,b.revision,s=>addSynthesis(s,a.id,result,ai.model,PROMPT_VERSION));
  }catch(e){
   if(e instanceof AIUnavailable||e instanceof DomainError&&e.status===502){
    const x=await repo.read(i);await repo.mutate(i,x.revision,s=>event(s,'moderator','AI_FAILURE',mode+': '+(e instanceof AIUnavailable?e.code:'INVALID_LINKS')+'; '+PROMPT_VERSION+'; '+ai.model));
   }throw e;
  }
 }
 app.post('/api/rooms/:code/analyze-objections',aiLimit,async(req,res)=>{await aiAction(req,'analysis');res.json({saved:true});});
 app.post('/api/rooms/:code/synthesize',aiLimit,async(req,res)=>{await aiAction(req,'synthesis');res.json({saved:true});});
 app.post('/api/rooms/:code/publish',async(req,res)=>{
  const i=await auth(req,'moderator'),b=z.object({revision,proposal:ProposalSchema,sourceId:z.string().uuid(),synthesisId:z.string().uuid().optional(),reason:text,coverage:CoverageSchema.default([]),confirm:z.literal(true)}).parse(req.body);
  await repo.mutate(i,b.revision,s=>publish(s,b.proposal,b.sourceId,b.reason,b.synthesisId,b.coverage));res.json({saved:true});
 });
 app.post('/api/rooms/:code/close',async(req,res)=>{const i=await auth(req,'moderator'),b=z.object({revision,reason:text}).parse(req.body);await repo.mutate(i,b.revision,s=>closeWithoutConsensus(s,b.reason));res.json({saved:true});});
 app.post('/api/rooms/:code/contest',async(req,res)=>{const i=await auth(req,'participant'),b=z.object({revision,targetId:z.string().uuid(),text:z.string().trim().min(1).max(2000)}).parse(req.body);await repo.mutate(i,b.revision,s=>contest(s,i.participantId!,b.targetId,b.text));res.status(201).json({saved:true});});
 app.post('/api/rooms/:code/evaluation',async(req,res)=>{const i=await auth(req,'participant'),b=z.object({revision,input:EvaluationSchema}).parse(req.body);await repo.mutate(i,b.revision,s=>evaluate(s,i.participantId!,b.input));res.status(201).json({saved:true});});
 app.post('/api/rooms/:code/export',async(req,res)=>{const i=await auth(req,'moderator'),x=await repo.read(i);res.json(exportState(x.state));});
 app.post('/api/rooms/:code/evaluation-results',async(req,res)=>{const i=await auth(req,'moderator'),{state}=await repo.read(i);res.json(statistics(state));});
 app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(err instanceof ZodError){res.status(400).json({error:'Dados inválidos. Revise os campos e vínculos.'});return;}
  if(err instanceof DomainError){res.status(err.status).json({error:err.message});return;}
  if(err instanceof AIUnavailable){console.warn('AI failure',JSON.stringify({code:err.code,status:err.httpStatus??null,model:ai.model,promptVersion:PROMPT_VERSION}));res.status(502).json({error:'IA indisponível. Você pode continuar sem parecer; registre essa escolha.'});return;}
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
