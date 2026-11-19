import { z } from 'zod';

export const FACTUAL_VERSION='factual-grounding-v1.0';
export const FACTUAL_MODEL='gemini-2.5-flash-lite';
export const ClaimKind=z.enum(['FATO_VERIFICAVEL','PREFERENCIA','RESTRICAO_INDIVIDUAL','OPINIAO','HIPOTESE','INFORMACAO_INSUFICIENTE']);
export const EvidenceStatus=z.enum(['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE','NAO_VERIFICAVEL','VERIFICACAO_INDISPONIVEL']);
export const AtomicClaimSchema=z.object({text:z.string().min(1).max(700),originalExcerpt:z.string().min(1).max(1200),kind:ClaimKind,query:z.string().max(250),timeSensitive:z.boolean(),reason:z.string().max(800)});
export const ClaimPlanSchema=z.object({claims:z.array(AtomicClaimSchema).min(1).max(3)});
export type AtomicClaim=z.infer<typeof AtomicClaimSchema>;

// URLs are links to provider-returned public sources, never server-side fetch targets.
export function publicSourceUrl(value:string):boolean{
 try{const u=new URL(value),h=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&h.includes('.')&&!h.includes(':')&&!/^\d+(\.\d+){3}$/.test(h)&&!['localhost','localhost.localdomain','metadata.google.internal'].includes(h)&&!['.local','.internal','.localhost','.test','.invalid','.example'].some(s=>h.endsWith(s));}catch{return false;}
}
export const EvidenceSourceSchema=z.object({id:z.string().regex(/^S\d+$/),title:z.string().min(1).max(600),url:z.string().max(3000).refine(publicSourceUrl),publishedAt:z.string().datetime().nullable(),dateOrigin:z.literal('PROVIDER_METADATA_OR_UNAVAILABLE')});
export const EvidenceSupportSchema=z.object({text:z.string().min(1).max(12000),sourceIds:z.array(z.string()).min(1).max(12)});
export const ClaimEvidenceSchema=z.object({claim:AtomicClaimSchema,status:EvidenceStatus,explanation:z.string().max(16000),providerText:z.string().max(16000),responseModel:z.string().max(120).nullable(),sources:z.array(EvidenceSourceSchema).max(12),supports:z.array(EvidenceSupportSchema).max(30),searchQueries:z.array(z.string().max(500)).max(10),searchSuggestionHtml:z.string().max(60000),queriedAt:z.string().datetime(),limitations:z.array(z.string().max(1000)).max(12),failureCode:z.string().max(80).nullable()});
export const FactualReportSchema=z.object({originalText:z.string().min(1).max(1200),model:z.literal(FACTUAL_MODEL),version:z.literal(FACTUAL_VERSION),createdAt:z.string().datetime(),provenance:z.enum(['LIVE_PROVIDER','LOCAL_CLASSIFICATION','SYNTHETIC_TEST','IMPORTED_UNAUTHENTICATED']),claims:z.array(ClaimEvidenceSchema).min(1).max(3)});
export const FactualCheckSchema=FactualReportSchema.extend({id:z.string().uuid(),proposalId:z.string().uuid(),roundId:z.string().uuid(),participantId:z.string().uuid().nullable()});
export type ClaimEvidence=z.infer<typeof ClaimEvidenceSchema>;
export type FactualReport=z.infer<typeof FactualReportSchema>;
export type FactualCheck=z.infer<typeof FactualCheckSchema>;

// Also applied on imports: a model-written URL or unattached source is not evidence.
export function soundEvidence(report:FactualReport):boolean{
 return report.claims.every(c=>{
  const ids=new Set(c.sources.map(s=>s.id));
  if(ids.size!==c.sources.length||c.supports.some(s=>s.sourceIds.some(id=>!ids.has(id))||!c.providerText.includes(s.text)))return false;
  if(['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA'].includes(c.status))return c.claim.kind==='FATO_VERIFICAVEL'&&c.sources.length>0&&c.supports.length>0&&c.searchQueries.length>0&&c.searchSuggestionHtml.length>0;
  return true;
 });
}
