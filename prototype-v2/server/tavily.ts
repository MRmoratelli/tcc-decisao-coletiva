import {createHash} from 'node:crypto';
import {z} from 'zod';
import {publicSourceUrl,type EvidenceSource,type Retrieval} from '../shared/factual.js';

export interface RetrievedEvidence {sources:EvidenceSource[];retrieval:Retrieval;}
export interface SearchAdapter {configured:boolean;synthetic?:boolean;search(query:string,timeSensitive:boolean):Promise<RetrievedEvidence>;}
export class SearchFailure extends Error {constructor(public code:string,public httpStatus?:number){super(code);}}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const envelope=z.object({results:z.array(z.unknown()).max(30),request_id:z.string().max(200).optional(),response_time:z.union([z.number(),z.string()]).optional(),usage:z.object({credits:z.number().nonnegative()}).optional()});
const resultSchema=z.object({url:z.string().max(3000),title:z.string().max(600),content:z.string().max(200000),score:z.number().min(0).max(1).nullish(),published_date:z.string().max(200).nullish(),id:z.string().max(200).optional()});
export function normalizeTavily(raw:unknown,query:string,at=new Date().toISOString()):RetrievedEvidence{
 const response=envelope.parse(raw),sources:EvidenceSource[]=[],urls=new Set<string>();
 for(const candidate of response.results){const p=resultSchema.safeParse(candidate);if(!p.success)continue;const r=p.data;if(!publicSourceUrl(r.url)||!r.content.trim()||!r.title.trim()||urls.has(r.url)||sources.length>=3)continue;
  urls.add(r.url);const epoch=r.published_date?Date.parse(r.published_date):NaN;
  sources.push({id:'S'+(sources.length+1),provider:'TAVILY',providerId:r.id??null,title:r.title,url:r.url,excerpt:r.content.slice(0,3500),excerptTruncated:r.content.length>3500,contentSha256:sha(r.content),score:r.score??null,publishedAtRaw:r.published_date??null,publishedAt:Number.isFinite(epoch)?new Date(epoch).toISOString():null,dateOrigin:'TAVILY_ESTIMATED_METADATA'});
 }
 const seconds=Number(response.response_time);
 return {sources,retrieval:{provider:'TAVILY',endpoint:'SEARCH',searchDepth:'basic',query,requestId:response.request_id??null,queriedAt:at,creditsUsed:response.usage?.credits??null,responseTimeSeconds:Number.isFinite(seconds)&&seconds>=0?seconds:null,resultsReceived:response.results.length,resultsRetained:sources.length,rawResponseSha256:sha(JSON.stringify(raw))}};
}
export class TavilySearchAdapter implements SearchAdapter{
 readonly configured:boolean;readonly synthetic:boolean;
 constructor(private options:{apiKey?:string;freePlanConfirmed?:boolean;fetcher?:typeof fetch;now?:()=>number}={}){this.configured=Boolean(options.apiKey??process.env.TAVILY_API_KEY);this.synthetic=Boolean(options.fetcher);}
 async search(query:string,timeSensitive:boolean):Promise<RetrievedEvidence>{
  query=z.string().trim().min(3).max(250).parse(query);
  if(/https?:|@|\b(?:localhost|127\.0\.0\.1|metadata\.google\.internal)\b/i.test(query))throw new SearchFailure('PRIVATE_OR_URL_QUERY_REJECTED');
  if(!this.options.freePlanConfirmed)throw new SearchFailure('TAVILY_FREE_PLAN_NOT_CONFIRMED');
  const key=this.options.apiKey??process.env.TAVILY_API_KEY;if(!key)throw new SearchFailure('TAVILY_NOT_CONFIGURED');
  let response:Response;
  try{response=await (this.options.fetcher??fetch)('https://api.tavily.com/search',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({query,search_depth:'basic',max_results:3,topic:'general',auto_parameters:false,include_answer:false,include_raw_content:false,include_images:false,include_published_date:true,include_usage:true,...(timeSensitive?{time_range:'week'}:{})}),signal:AbortSignal.timeout(25000),redirect:'error'});}
  catch{throw new SearchFailure('TAVILY_NETWORK_OR_TIMEOUT');}
  if(!response.ok){void response.body?.cancel();throw new SearchFailure([402,432,433].includes(response.status)?'TAVILY_CREDIT_LIMIT':response.status===429?'TAVILY_RATE_LIMIT':[401,403].includes(response.status)?'TAVILY_AUTHENTICATION_OR_ACCESS':'TAVILY_API_FAILURE',response.status);}
  try{
   const reader=response.body?.getReader();if(!reader)throw Error();let size=0;const chunks:Uint8Array[]=[];
   while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>256000){await reader.cancel();throw Error();}chunks.push(part.value);}
   return normalizeTavily(JSON.parse(Buffer.concat(chunks).toString('utf8')),query,new Date(this.options.now?.()??Date.now()).toISOString());
  }catch{throw new SearchFailure('TAVILY_INVALID_OR_OVERSIZED_RESPONSE');}
 }
}
