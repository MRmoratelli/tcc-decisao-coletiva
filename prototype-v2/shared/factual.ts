import { z } from 'zod';
export const FACTUAL_VERSION='factual-tavily-gemini-v2.1';
export const PREVIOUS_TAVILY_VERSION='factual-tavily-gemini-v2.0';
export const ResearchModeSchema=z.enum(['VERIFY','RESEARCH']);
export type ResearchMode=z.infer<typeof ResearchModeSchema>;
export const FACTUAL_MODEL='gemini-3.5-flash-lite';
export const LEGACY_FACTUAL_VERSION='factual-grounding-v1.0';
export const ClaimKind=z.enum(['FATO_VERIFICAVEL','SOLICITACAO_PESQUISA','PREFERENCIA','RESTRICAO_INDIVIDUAL','OPINIAO','HIPOTESE','INFORMACAO_INSUFICIENTE']);
export const EvidenceStatus=z.enum(['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE','NAO_VERIFICAVEL','VERIFICACAO_INDISPONIVEL']);
export const AtomicClaimSchema=z.object({text:z.string().min(1).max(700),originalExcerpt:z.string().min(1).max(1200),kind:ClaimKind,query:z.string().max(250),timeSensitive:z.boolean(),reason:z.string().max(800)});
export const ClaimPlanSchema=z.object({claims:z.array(AtomicClaimSchema).min(1).max(3)});
export type AtomicClaim=z.infer<typeof AtomicClaimSchema>;
// Source URLs are displayed as links, never fetched by this server.
export function publicSourceUrl(value:string):boolean{
 try{const u=new URL(value),h=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&h.includes('.')&&!h.includes(':')&&!/^\d+(\.\d+){3}$/.test(h)&&!['localhost','localhost.localdomain','metadata.google.internal'].includes(h)&&!['.local','.internal','.localhost','.test','.invalid','.example'].some(s=>h.endsWith(s));}catch{return false;}
}
const SourceBase={id:z.string().regex(/^S\d+$/),title:z.string().min(1).max(600),url:z.string().max(3000).refine(publicSourceUrl),publishedAt:z.string().datetime().nullable()};
const CommonClaim={claim:AtomicClaimSchema,status:EvidenceStatus,explanation:z.string().max(16000),providerText:z.string().max(16000),responseModel:z.string().max(120).nullable(),queriedAt:z.string().datetime(),limitations:z.array(z.string().max(1000)).max(12),failureCode:z.string().max(80).nullable()};
const CommonReport={originalText:z.string().min(1).max(1200),createdAt:z.string().datetime(),provenance:z.enum(['LIVE_PROVIDER','LOCAL_CLASSIFICATION','SYNTHETIC_TEST','IMPORTED_UNAUTHENTICATED'])};
const Binding={id:z.string().uuid(),proposalId:z.string().uuid(),roundId:z.string().uuid(),participantId:z.string().uuid().nullable()};
// Read-only compatibility: these fields belong only to historic Google records.
const LegacySourceSchema=z.object({...SourceBase,dateOrigin:z.literal('PROVIDER_METADATA_OR_UNAVAILABLE')});
const LegacyClaimSchema=z.object({...CommonClaim,sources:z.array(LegacySourceSchema).max(12),supports:z.array(z.object({text:z.string().min(1).max(12000),sourceIds:z.array(z.string()).min(1).max(12)})).max(30),searchQueries:z.array(z.string().max(500)).max(10),searchSuggestionHtml:z.string().max(60000)});
export const LegacyFactualReportSchema=z.object({...CommonReport,model:z.literal('gemini-2.5-flash-lite'),version:z.literal(LEGACY_FACTUAL_VERSION),claims:z.array(LegacyClaimSchema).min(1).max(3)});
export const LegacyFactualCheckSchema=LegacyFactualReportSchema.extend(Binding);
export type LegacyFactualCheck=z.infer<typeof LegacyFactualCheckSchema>;
export const EvidenceSourceSchema=z.object({...SourceBase,provider:z.literal('TAVILY'),providerId:z.string().max(200).nullable(),excerpt:z.string().min(1).max(3500),excerptTruncated:z.boolean(),contentSha256:z.string().regex(/^[a-f0-9]{64}$/),score:z.number().min(0).max(1).nullable(),publishedAtRaw:z.string().max(200).nullable(),dateOrigin:z.literal('TAVILY_ESTIMATED_METADATA')});
export const EvidenceLinkSchema=z.object({sourceId:z.string().regex(/^S\d+$/),quote:z.string().min(12).max(1000),relation:z.enum(['SUPPORTS','CONTRADICTS','CONTEXT']),explanation:z.string().min(1).max(700)});
export const InterpretationSchema=z.object({status:z.enum(['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA','EVIDENCIA_INSUFICIENTE','NAO_VERIFICAVEL']),explanation:z.string().min(1).max(3000),scopeMatches:z.boolean(),evidenceLinks:z.array(EvidenceLinkSchema).max(6),uncertainties:z.array(z.string().max(700)).max(6)});
export const RetrievalSchema=z.object({provider:z.literal('TAVILY'),endpoint:z.literal('SEARCH'),searchDepth:z.literal('basic'),query:z.string().max(250),reusedFromCheckId:z.string().uuid().nullable().optional(),requestId:z.string().max(200).nullable(),queriedAt:z.string().datetime(),creditsUsed:z.number().nonnegative().nullable(),responseTimeSeconds:z.number().nonnegative().nullable(),resultsReceived:z.number().int().nonnegative(),resultsRetained:z.number().int().min(0).max(3),rawResponseSha256:z.string().regex(/^[a-f0-9]{64}$/)});
export const ClaimEvidenceSchema=z.object({...CommonClaim,searchAttempted:z.boolean().optional(),attemptedQuery:z.string().max(250).optional(),failureStage:z.enum(['CLASSIFICATION','SEARCH','INTERPRETATION']).nullable().optional(),sources:z.array(EvidenceSourceSchema).max(3),retrieval:RetrievalSchema.nullable(),scopeMatches:z.boolean(),evidenceLinks:z.array(EvidenceLinkSchema).max(6)});
export const TavilyReportSchema=z.object({...CommonReport,model:z.literal(FACTUAL_MODEL),version:z.enum([FACTUAL_VERSION,PREVIOUS_TAVILY_VERSION]),modality:ResearchModeSchema.optional(),retrievalProvider:z.literal('TAVILY'),classificationSourceCheckId:z.string().uuid().nullable().optional(),classificationModel:z.string().max(120).nullable(),claims:z.array(ClaimEvidenceSchema).min(1).max(3)});
export const TavilyCheckSchema=TavilyReportSchema.extend(Binding);
export const FactualReportSchema=z.union([TavilyReportSchema,LegacyFactualReportSchema]);
export const FactualCheckSchema=z.union([TavilyCheckSchema,LegacyFactualCheckSchema]);
export type EvidenceSource=z.infer<typeof EvidenceSourceSchema>;
export type ClaimEvidence=z.infer<typeof ClaimEvidenceSchema>;
export type Interpretation=z.infer<typeof InterpretationSchema>;
export type Retrieval=z.infer<typeof RetrievalSchema>;
export type TavilyReport=z.infer<typeof TavilyReportSchema>;
export type FactualReport=z.infer<typeof FactualReportSchema>;
export type FactualCheck=z.infer<typeof FactualCheckSchema>;
export type TavilyCheck=z.infer<typeof TavilyCheckSchema>;
export const isTavilyCheck=(f:FactualCheck):f is TavilyCheck=>f.version!==LEGACY_FACTUAL_VERSION;
// A retrieved result is not confirmation. Model links must quote the actual snippet.
export function soundEvidence(report:FactualReport):boolean{
 if(report.version===LEGACY_FACTUAL_VERSION)return report.claims.every(c=>{
  const ids=new Set(c.sources.map(s=>s.id));
  if(ids.size!==c.sources.length||c.supports.some(s=>s.sourceIds.some(id=>!ids.has(id))||!c.providerText.includes(s.text)))return false;
  return !['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA'].includes(c.status)||(c.claim.kind==='FATO_VERIFICAVEL'&&c.sources.length>0&&c.supports.length>0&&c.searchQueries.length>0&&c.searchSuggestionHtml.length>0);
 });
 return report.claims.every(c=>{
  const ids=new Set(c.sources.map(s=>s.id));
  if(ids.size!==c.sources.length||c.evidenceLinks.some(link=>!c.sources.some(s=>s.id===link.sourceId&&s.excerpt.includes(link.quote))))return false;
  if(!['EVIDENCIA_FAVORAVEL','EVIDENCIA_CONTRARIA'].includes(c.status))return true;
  const expected=c.status==='EVIDENCIA_FAVORAVEL'?'SUPPORTS':'CONTRADICTS',opposite=expected==='SUPPORTS'?'CONTRADICTS':'SUPPORTS';
  return ['FATO_VERIFICAVEL','SOLICITACAO_PESQUISA'].includes(c.claim.kind)&&c.retrieval?.provider==='TAVILY'&&c.scopeMatches&&c.evidenceLinks.some(l=>l.relation===expected)&&!c.evidenceLinks.some(l=>l.relation===opposite);
 });
}

