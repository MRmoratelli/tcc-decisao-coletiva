import 'dotenv/config';
import express from 'express';
import { z, ZodError } from 'zod';
import { digest, makeReceipt, verifyReceipt } from './receipts.js';
import { ReviewSchema, reviewText } from './ai.js';
import { addContribution, authorize, createRoom, healthy, roomView } from './db.js';

const signingKey = process.env.REVIEW_SIGNING_KEY;
if (!signingKey || signingKey.length < 32) throw new Error('REVIEW_SIGNING_KEY deve ter ao menos 32 caracteres.');
const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'24kb'}));

const requestCounts = new Map<string,{count:number; until:number}>();
function rateLimit(max: number) {
  return (req:express.Request,res:express.Response,next:express.NextFunction) => {
    const now=Date.now(), key=(req.ip || 'unknown') + ':' + req.path;
    let item=requestCounts.get(key);
    if(!item || now>item.until) item={count:0,until:now+10*60_000};
    item.count+=1; requestCounts.set(key,item);
    if(item.count>max){res.status(429).json({error:'Muitas requisições. Tente mais tarde.'});return;}
    next();
  };
}
app.use('/api',rateLimit(80));
const textField=z.string().trim().min(4).max(5000);
const topicField=z.string().trim().min(3).max(180);
const codeField=z.string().trim().regex(/^[A-F0-9]{10}$/);
const tokenField=z.string().min(20).max(128);
const proposalBody=z.object({topic:topicField,proposal:textField});

app.get('/api/health',async(_req,res)=>{await healthy();res.json({status:'ok'});});

app.post('/api/ai/proposal-review',rateLimit(10),async(req,res)=>{
  const body=proposalBody.parse(req.body);
  const review=await reviewText(body);
  res.json({review,receipt:makeReceipt(signingKey,'proposal',body,review)});
});

app.post('/api/rooms',rateLimit(10),async(req,res)=>{
  const body=proposalBody.extend({participantCount:z.number().int().min(2).max(30),receipt:z.string().min(10).max(10000)}).parse(req.body);
  const review=ReviewSchema.parse(verifyReceipt(signingKey,body.receipt,'proposal',{topic:body.topic,proposal:body.proposal}));
  const created=await createRoom(body.topic,body.proposal,review,body.participantCount);
  res.status(201).json(created);
});

const roomLogin=z.object({code:codeField,credential:tokenField});
app.post('/api/rooms/:code/view',async(req,res)=>{
  const {code,credential}=roomLogin.parse({code:String(req.params.code).toUpperCase(),credential:req.body?.credential});
  const identity=await authorize(code,credential);
  if(!identity){res.status(401).json({error:'Código ou credencial inválidos.'});return;}
  res.json(await roomView(identity));
});

app.post('/api/rooms/:code/contribution-review',rateLimit(20),async(req,res)=>{
  const body=z.object({credential:tokenField,text:textField}).parse(req.body);
  const code=codeField.parse(String(req.params.code).toUpperCase());
  const identity=await authorize(code,body.credential);
  if(!identity||identity.role!=='participant'||!identity.participantId){
    res.status(401).json({error:'Acesso exclusivo de participante.'});return;
  }
  const review=await reviewText({topic:identity.room.topic,proposal:identity.room.proposal,contribution:body.text});
  const binding={code,participantId:identity.participantId,text:body.text};
  res.json({review,receipt:makeReceipt(signingKey,'contribution',binding,review)});
});

app.post('/api/rooms/:code/contributions',async(req,res)=>{
  const body=z.object({credential:tokenField,text:textField,receipt:z.string().min(10).max(10000),userChoice:z.enum(['ENVIAR','ENVIAR_COM_RESSALVA'])}).parse(req.body);
  const code=codeField.parse(String(req.params.code).toUpperCase());
  const identity=await authorize(code,body.credential);
  if(!identity||identity.role!=='participant'||!identity.participantId){
    res.status(401).json({error:'Acesso exclusivo de participante.'});return;
  }
  const binding={code,participantId:identity.participantId,text:body.text};
  const review=ReviewSchema.parse(verifyReceipt(signingKey,body.receipt,'contribution',binding));
  await addContribution(identity,body.text,review,body.userChoice,digest(body.receipt));
  res.status(201).json({saved:true});
});

app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(err instanceof ZodError){res.status(400).json({error:'Dados inválidos. Revise os campos.'});return;}
  const msg=err instanceof Error?err.message:'';
  if(/Comprovante|Avaliação expirada|avaliação corrompido/i.test(msg)){res.status(400).json({error:msg});return;}
  if(/Serviço de IA|GEMINI_API_KEY/i.test(msg)){res.status(502).json({error:'Análise por IA indisponível. Tente novamente; não foi registrada decisão.'});return;}
  if((err as {code?:string})?.code==='23505'){res.status(409).json({error:'Registro já existe. Recarregue a sala.'});return;}
  console.error('Falha de API:',err instanceof Error?err.constructor.name:'erro');
  res.status(500).json({error:'Ocorreu um problema no serviço. Nenhuma decisão foi presumida.'});
});
const port=Number(process.env.API_PORT)||8787;
app.listen(port,'127.0.0.1',()=>console.log('API v2 pronta na porta '+port+' (uso local).'));
