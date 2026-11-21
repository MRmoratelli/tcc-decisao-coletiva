import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { ProposalSchema, ReviewSchema, AssessmentSchema, SynthesisSchema, EvaluationSchema, ChoiceSchema, type ProposalContent, type Review, type Assessment, type SynthesisResult, type EvaluationInput, type Choice } from '../shared/contracts.js';
import { FactualCheckSchema,FactualReportSchema,soundEvidence,isTavilyCheck,type FactualReport } from '../shared/factual.js';
import { dimensions,NATURALISTIC_VERSION,APPLICATION_VARIANT,displayedOpenItems } from '../shared/instrument.js';

export class DomainError extends Error { constructor(message:string, public status=400){super(message);} }
const id=z.string().uuid(), date=z.string().datetime();
const ReviewRecord=z.object({result:ReviewSchema.nullable(),status:z.enum(['OK','IGNORADA','INDISPONIVEL']),promptVersion:z.string(),model:z.string(),reason:z.string(),appliedRewrite:z.boolean().optional(),choice:z.enum(['USED_REWRITE','KEPT_ORIGINAL','DISCARDED']).optional()});
const Proposal=z.object({id,version:z.number().int().positive(),parentId:id.nullable(),content:ProposalSchema,createdAt:date,approvedBy:z.string(),review:ReviewRecord,intervention:z.object({kind:z.enum(['APROVACAO_HUMANA','EDICAO_HUMANA']),source:z.enum(['PROPOSTA_ANTERIOR','SINTESE_IA','RASCUNHO_INICIAL','PARECER_INICIAL_IA']),sourceId:id,original:ProposalSchema,published:ProposalSchema,changes:z.array(z.object({field:z.string(),before:z.string(),after:z.string()})),reason:z.string(),at:date,actor:z.literal('moderator')}).optional()});
const Round=z.object({id,number:z.number().int().positive(),proposalId:id,status:z.enum(['OPEN','CLOSED']),openedAt:date,closedAt:date.nullable()});
const Vote=z.object({id,participantId:id,roundId:id,proposalId:id,choice:ChoiceSchema,justification:z.string().max(5000),createdAt:date});
const Contribution=z.object({id,participantId:id,roundId:id,proposalId:id,originalText:z.string().min(1).max(5000),text:z.string().min(1).max(5000),review:ReviewRecord,contest:z.string().max(2000),createdAt:date});
const Analysis=z.object({id,proposalId:id,roundId:id,sourceFingerprint:z.string(),factualCheckIds:z.array(id).default([]),result:AssessmentSchema,promptVersion:z.string(),model:z.string(),createdAt:date});
export const CoverageSchema=z.array(z.object({voteId:id,status:z.enum(['ATENDIDA','PARCIAL','NAO_ATENDIDA']),faithful:z.boolean().nullable(),note:z.string().max(2000)})).max(30);
const Synthesis=z.object({id,proposalId:id,roundId:id,analysisId:id,factualCheckIds:z.array(id).default([]),result:SynthesisSchema,promptVersion:z.string(),model:z.string(),createdAt:date,publishedProposalId:id.nullable(),humanCoverage:CoverageSchema});
const Event=z.object({id,at:date,actor:z.string(),type:z.string(),detail:z.string().max(5000)});
const EvaluationContext=z.object({applicationVariant:z.literal(APPLICATION_VARIANT),baseInstrumentVersion:z.literal('DSR-1.0-2026-11-16'),status:z.literal('PROPOSTA_SUJEITA_A_REVISAO_E_PRE_TESTE'),rounds:z.number().int().positive(),processResult:z.enum(['CONSENSUS','CLOSED_WITHOUT_CONSENSUS']),closedAt:date,proposalVersions:z.number().int().positive(),objectionsRecorded:z.number().int().nonnegative(),analysesRecorded:z.number().int().nonnegative(),synthesesRecorded:z.number().int().nonnegative()});
const Evaluation=z.object({id,participantId:id,at:date,input:EvaluationSchema,applicationContext:EvaluationContext.optional()});
const Contest=z.object({id,participantId:id,targetId:id,text:z.string().min(1).max(2000),at:date});
export const StateSchema=z.object({
 schemaVersion:z.literal(2),initialDraft:ProposalSchema,decision:z.object({id,originId:id,title:z.string(),status:z.enum(['OPEN','CONSENSUS','CLOSED_WITHOUT_CONSENSUS']),createdAt:date,closedAt:date.nullable(),closureReason:z.string()}),
 research:z.object({version:z.string(),text:z.string().max(20000),source:z.string()}).optional(),
 enrollment:z.object({mode:z.literal('SELF'),claims:z.array(id),automaticMediation:z.boolean()}).optional(),
 researchConsents:z.array(z.object({participantId:id,response:z.literal('SIM'),at:date,version:z.string(),actor:z.literal('participant')})).default([]),
 mediation:z.object({roundId:id,fingerprint:z.string(),status:z.enum(['RUNNING','READY','FAILED']),startedAt:date,detail:z.string()}).optional(),
 participants:z.array(z.object({id,alias:z.string().regex(/^P\d{2}$/)})).min(2).max(30),
 proposals:z.array(Proposal).min(1),rounds:z.array(Round).min(1),
 factualChecks:z.array(FactualCheckSchema).max(200).default([]),votes:z.array(Vote),contributions:z.array(Contribution),analyses:z.array(Analysis),syntheses:z.array(Synthesis),contests:z.array(Contest),events:z.array(Event),evaluations:z.array(Evaluation),
});
export type State=z.infer<typeof StateSchema>;
export type ReviewRecordType=z.infer<typeof ReviewRecord>;
export const now=()=>new Date().toISOString();
export function event(s:State,actor:string,type:string,detail=''){s.events.push({id:randomUUID(),at:now(),actor,type,detail});}
export const currentRound=(s:State)=>s.rounds[s.rounds.length-1];
export const currentProposal=(s:State)=>s.proposals[s.proposals.length-1];
export function latestVotes(s:State,roundId=currentRound(s).id){
 const map=new Map<string,State['votes'][number]>();
 for(const v of s.votes)if(v.roundId===roundId)map.set(v.participantId,v);
 return [...map.values()];
}
export function positions(s:State){const votes=latestVotes(s);return s.participants.map(p=>({...p,choice:votes.find(v=>v.participantId===p.id)?.choice??'PENDENTE'}));}
export function unanimous(s:State){const r=currentRound(s);const votes=latestVotes(s);return s.participants.length>=2&&s.participants.every(p=>votes.some(v=>v.participantId===p.id&&v.proposalId===r.proposalId&&v.choice==='ACEITO'));}
export function createState(roomId:string,proposal:ProposalContent,participants:State['participants'],review:ReviewRecordType,initialDraft:ProposalContent=proposal):State{
 const at=now(),pid=randomUUID();const s:State={
 schemaVersion:2,initialDraft,decision:{id:roomId,originId:roomId,title:proposal.title,status:'OPEN',createdAt:at,closedAt:null,closureReason:''},participants,
 proposals:[{id:pid,version:1,parentId:null,content:proposal,createdAt:at,approvedBy:'moderator',review}],
 rounds:[{id:randomUUID(),number:1,proposalId:pid,status:'OPEN',openedAt:at,closedAt:null}],
 researchConsents:[],factualChecks:[],votes:[],contributions:[],analyses:[],syntheses:[],contests:[],events:[],evaluations:[]};
 if(review.appliedRewrite||JSON.stringify(initialDraft)!==JSON.stringify(proposal)){
  const original=review.appliedRewrite&&review.result?.suggestedRewrite?{...initialDraft,text:review.result.suggestedRewrite}:initialDraft;
  const changes=Object.keys(proposal).filter(k=>proposal[k as keyof ProposalContent]!==original[k as keyof ProposalContent]).map(k=>({field:k,before:original[k as keyof ProposalContent],after:proposal[k as keyof ProposalContent]}));
  s.proposals[0].intervention={kind:changes.length?'EDICAO_HUMANA':'APROVACAO_HUMANA',source:review.appliedRewrite?'PARECER_INICIAL_IA':'RASCUNHO_INICIAL',sourceId:pid,original,published:structuredClone(proposal),changes,reason:review.reason||'Confirmação humana da proposta inicial.',at,actor:'moderator'};
 }
 event(s,'moderator','ROOM_CREATED','Proposta inicial confirmada por pessoa responsável.');return s;
}
function open(s:State){if(s.decision.status!=='OPEN')throw new DomainError('Processo encerrado.',409);}
function participant(s:State,pid:string){if(!s.participants.some(p=>p.id===pid))throw new DomainError('Participante não pertence à sala.',403);}
export function vote(s:State,pid:string,roundId:string,proposalId:string,choice:Choice,justification:string){
 open(s);participant(s,pid);const r=currentRound(s);
 if(r.id!==roundId||r.proposalId!==proposalId)throw new DomainError('Versão ou rodada desatualizada. Atualize a sala.',409);
 if(s.votes.some(v=>v.participantId===pid&&v.roundId===roundId))throw new DomainError('Seu voto nesta rodada já foi registrado. Aguarde o moderador publicar uma nova rodada.',409);
 if(['REJEITO','ACEITO_COM_RESSALVAS'].includes(choice)&&!justification.trim())throw new DomainError('Rejeição e aceite com ressalvas exigem justificativa.');
 s.votes.push({id:randomUUID(),participantId:pid,roundId,proposalId,choice,justification:justification.trim(),createdAt:now()});
 event(s,pid,'VOTE_RECORDED',choice);
 if(unanimous(s)){s.decision.status='CONSENSUS';s.decision.closedAt=now();s.decision.closureReason='Aceitação explícita de todos na mesma versão.';r.status='CLOSED';r.closedAt=s.decision.closedAt;event(s,'system','CONSENSUS_RECORDED',s.decision.closureReason);}
}
export function contribute(s:State,pid:string,roundId:string,proposalId:string,text:string,originalText:string,review:ReviewRecordType,contest:string){
 open(s);participant(s,pid);const r=currentRound(s);
 if(r.id!==roundId||r.proposalId!==proposalId)throw new DomainError('Rodada desatualizada.',409);
 const entry={id:randomUUID(),participantId:pid,roundId,proposalId,text,originalText,review,contest,createdAt:now()};
 s.contributions.push(entry);event(s,pid,'CONTRIBUTION_RECORDED',contest?'Parecer contestado.':'Texto preservado.');return entry;
}
export function manifestations(s:State){
 const roundId=currentRound(s).id,votes=latestVotes(s);
 const kind=(choice:string)=>choice==='REJEITO'?'OBJECAO' as const:choice==='ACEITO_COM_RESSALVAS'?'RESSALVA' as const:choice==='ABSTENHO'?'ABSTENCAO' as const:'APOIO' as const;
 const contributions=s.contributions.filter(c=>c.roundId===roundId);
 const rows=[...votes.map(v=>({linkedOriginals:contributions.filter(c=>c.participantId===v.participantId&&c.text===v.justification).map(c=>({id:c.id,originalText:c.originalText,contest:c.contest})),id:v.id,kind:kind(v.choice),text:v.justification,participantId:v.participantId,choice:v.choice,linkedContributionIds:contributions.filter(c=>c.participantId===v.participantId&&c.text===v.justification).map(c=>c.id)})),...contributions.filter(c=>!votes.some(v=>v.participantId===c.participantId&&v.justification===c.text)).map(c=>({id:c.id,kind:'CONTRIBUICAO' as const,text:c.text,participantId:c.participantId,originalText:c.originalText,contest:c.contest}))];
 const relevant=new Set([...votes,...contributions,...s.analyses.filter(a=>a.roundId===roundId),...s.syntheses.filter(a=>a.roundId===roundId),...s.factualChecks.filter(a=>a.roundId===roundId)].map(a=>a.id));
 return [...rows,...s.contests.filter(c=>relevant.has(c.targetId)).map(c=>({id:c.id,kind:'CONTESTACAO' as const,text:c.text,participantId:c.participantId,targetId:c.targetId}))];
}
export function assertManifestations(s:State,result:Assessment){
 const sources=manifestations(s),rows=result.manifestationAssessments??[];
 if(rows.length!==sources.length||new Set(rows.map(x=>x.sourceId)).size!==rows.length)throw new DomainError('IA omitiu ou duplicou manifestações.',502);
 for(const row of rows){const source=sources.find(x=>x.id===row.sourceId);if(!source||row.kind!==source.kind||(source.text?(!row.quotedExcerpt.trim()||!source.text.includes(row.quotedExcerpt)):row.quotedExcerpt!==''))throw new DomainError('Proveniência de manifestação inválida.',502);}
}
export function assertAssessment(s:State,result:Assessment){
 assertManifestations(s,result);
 const objections=latestVotes(s).filter(v=>v.choice==='REJEITO');
 const ids=result.individualAssessments.map(a=>a.voteId);
 if(ids.length!==objections.length||new Set(ids).size!==ids.length||objections.some(v=>!ids.includes(v.id)))throw new DomainError('Serviço de IA omitiu ou inventou objeções.',502);
 for(const a of result.individualAssessments){const v=objections.find(v=>v.id===a.voteId)!;if(!a.quotedExcerpt.trim()||!v.justification.includes(a.quotedExcerpt))throw new DomainError('Serviço de IA retornou citação não presente na objeção.',502);}
}
export function sourceFingerprint(s:State){const roundId=currentRound(s).id;return createHash('sha256').update(JSON.stringify({manifestations:manifestations(s),votes:latestVotes(s),contributions:s.contributions.filter(c=>c.roundId===roundId),factualChecks:s.factualChecks.filter(c=>c.roundId===roundId).map(c=>c.id)})).digest('hex');}
export function addAnalysis(s:State,result:Assessment,model:string,promptVersion:string){
 open(s);assertAssessment(s,result);const a={id:randomUUID(),proposalId:currentProposal(s).id,roundId:currentRound(s).id,sourceFingerprint:sourceFingerprint(s),factualCheckIds:factualContext(s).map(f=>f.id),result,model,promptVersion,createdAt:now()};s.analyses.push(a);event(s,'moderator','OBJECTIONS_ANALYZED');return a;
}
export function assertSynthesis(s:State,result:SynthesisResult){
 const sourceIds=manifestations(s).map(x=>x.id),considered=result.consideredSourceIds??[];
 if(considered.length!==sourceIds.length||new Set(considered).size!==considered.length||sourceIds.some(id=>!considered.includes(id))||result.changeLog.some(c=>!c.sourceIds?.length||c.sourceIds.some(id=>!sourceIds.includes(id))))throw new DomainError('Síntese sem cobertura ou proveniência das manifestações.',502);
 const ids=latestVotes(s).filter(v=>v.choice==='REJEITO').map(v=>v.id);
 const classified=[...result.addressedObjections,...result.partiallyAddressedObjections,...result.unresolvedObjections];
 if(classified.length!==ids.length||new Set(classified).size!==classified.length||ids.some(id=>!classified.includes(id))||result.changeLog.some(c=>c.voteIds.some(id=>!ids.includes(id))))throw new DomainError('Serviço de IA omitiu ou inventou vínculos de objeções.',502);
}
// Reconcile only mechanical ID mistakes from a fallible AI output. A missing
// formal rejection is conservatively UNRESOLVED, never silently considered met.
// Keep the authoritative domain validation strict for imported or other data.
export function reconcileSynthesisLinks(s:State,result:SynthesisResult):SynthesisResult{
 const formalIds=latestVotes(s).filter(v=>v.choice==='REJEITO').map(v=>v.id);
 const allowed=new Set(formalIds);
 const original=[...result.addressedObjections,...result.partiallyAddressedObjections,...result.unresolvedObjections];
 const classified=new Set(original.filter(id=>allowed.has(id)));
 const addressed=formalIds.filter(id=>result.addressedObjections.includes(id)&&!result.partiallyAddressedObjections.includes(id)&&!result.unresolvedObjections.includes(id));
 const partial=formalIds.filter(id=>result.partiallyAddressedObjections.includes(id)&&!result.unresolvedObjections.includes(id));
 const unresolved=formalIds.filter(id=>result.unresolvedObjections.includes(id)||!classified.has(id));
 const changeLog=result.changeLog.map(c=>({...c,voteIds:[...new Set(c.voteIds.filter(id=>allowed.has(id)))]}));
 const changed=original.length!==formalIds.length||new Set(original).size!==original.length||
  original.some(id=>!allowed.has(id))||
  addressed.length!==result.addressedObjections.length||
  partial.length!==result.partiallyAddressedObjections.length||
  unresolved.length!==result.unresolvedObjections.length||
  changeLog.some((c,i)=>JSON.stringify(c.voteIds)!==JSON.stringify(result.changeLog[i].voteIds));
 if(!changed)return result;
 const discarded=original.filter(id=>!allowed.has(id)).length+
  result.changeLog.reduce((n,c)=>n+c.voteIds.filter(id=>!allowed.has(id)).length,0);
 const missing=formalIds.filter(id=>!classified.has(id)).length;
 const warning='AJUSTE DE VÍNCULOS (verificação automática, não avaliação de mérito): IDs estranhos às rejeições formais removidos ('+discarded+'); rejeições não classificadas marcadas como não atendidas ('+missing+'). Ressalvas e contribuições continuam rastreadas em sourceIds. A síntese exige revisão humana.';
 return {...result,addressedObjections:addressed,partiallyAddressedObjections:partial,unresolvedObjections:unresolved,changeLog,
  feasibilityWarnings:[...result.feasibilityWarnings.slice(0,49),warning]};
}
export function addSynthesis(s:State,analysisId:string,result:SynthesisResult,model:string,promptVersion:string){
 open(s);const a=s.analyses.find(a=>a.id===analysisId&&a.proposalId===currentProposal(s).id);
 if(!a)throw new DomainError('Analise as objeções da versão atual primeiro.');
 // Análises anteriores a um novo voto não podem fundamentar uma síntese.
 if(a.sourceFingerprint!==sourceFingerprint(s))throw new DomainError('Novas manifestações após a análise. Analise novamente.',409);
 assertAssessment(s,a.result);assertSynthesis(s,result);
 const entry={id:randomUUID(),proposalId:currentProposal(s).id,roundId:currentRound(s).id,analysisId,factualCheckIds:a.factualCheckIds,result,model,promptVersion,createdAt:now(),publishedProposalId:null,humanCoverage:[]};
 s.syntheses.push(entry);event(s,'moderator','SYNTHESIS_DRAFTED');return entry;
}
export function publish(s:State,content:ProposalContent,sourceId:string,reason:string,synthesisId?:string,coverage:z.infer<typeof CoverageSchema>=[]){
 open(s);if(sourceId!==currentProposal(s).id)throw new DomainError('Proposta desatualizada.',409);
 if(!reason.trim())throw new DomainError('Registre a justificativa da revisão humana.');
 const synthesis=synthesisId?s.syntheses.find(x=>x.id===synthesisId&&x.proposalId===sourceId&&!x.publishedProposalId):undefined;
 if(synthesisId&&!synthesis)throw new DomainError('Síntese inválida.');
 if(synthesis){assertSynthesis(s,synthesis.result);const a=s.analyses.find(a=>a.id===synthesis.analysisId);if(a?.sourceFingerprint!==sourceFingerprint(s))throw new DomainError('Novas manifestações: analise e sintetize novamente.',409);}
 const ids=latestVotes(s).filter(v=>v.choice==='REJEITO').map(v=>v.id);
 if(coverage.some(c=>!ids.includes(c.voteId))||new Set(coverage.map(c=>c.voteId)).size!==coverage.length)throw new DomainError('Cobertura humana inválida.');
 const r=currentRound(s);r.status='CLOSED';r.closedAt=now();
 const proposal={id:randomUUID(),version:s.proposals.length+1,parentId:sourceId,content,createdAt:now(),approvedBy:'moderator',review:{result:null,status:'IGNORADA' as const,promptVersion:'human-review-v1',model:'human',reason}};
 const original=synthesis?.result.revisedProposal??currentProposal(s).content;
 const changes=Object.keys(content).filter(k=>content[k as keyof ProposalContent]!==original[k as keyof ProposalContent]).map(k=>({field:k,before:original[k as keyof ProposalContent],after:content[k as keyof ProposalContent]}));
 const intervention={kind:changes.length?'EDICAO_HUMANA' as const:'APROVACAO_HUMANA' as const,source:synthesis?'SINTESE_IA' as const:'PROPOSTA_ANTERIOR' as const,sourceId:synthesis?.id??sourceId,original:structuredClone(original),published:structuredClone(content),changes,reason,at:proposal.createdAt,actor:'moderator' as const};
 s.proposals.push({...proposal,intervention});s.rounds.push({id:randomUUID(),number:s.rounds.length+1,proposalId:proposal.id,status:'OPEN',openedAt:now(),closedAt:null});
 if(synthesis){synthesis.publishedProposalId=proposal.id;synthesis.humanCoverage=coverage;}
 event(s,'moderator','PROPOSAL_PUBLISHED',reason);
}
export function closeWithoutConsensus(s:State,reason:string){open(s);if(!reason.trim())throw new DomainError('Informe a razão do encerramento.');s.decision.status='CLOSED_WITHOUT_CONSENSUS';s.decision.closedAt=now();s.decision.closureReason=reason;currentRound(s).status='CLOSED';currentRound(s).closedAt=s.decision.closedAt;event(s,'moderator','CLOSED_WITHOUT_CONSENSUS',reason);}
export function contest(s:State,pid:string,targetId:string,text:string){
 participant(s,pid);
 const own=s.contributions.some(c=>c.id===targetId&&c.participantId===pid);
 const accessible=s.analyses.some(a=>a.id===targetId)||s.syntheses.some(a=>a.id===targetId)||s.factualChecks.some(f=>f.id===targetId&&(f.participantId===pid||s.votes.some(v=>v.roundId===f.roundId&&v.participantId===pid)||s.contributions.some(c=>c.roundId===f.roundId&&c.participantId===pid)));
 if(!own&&!accessible)throw new DomainError('Parecer não acessível.',403);
 s.contests.push({id:randomUUID(),participantId:pid,targetId,text,at:now()});event(s,pid,'AI_CONTESTED',text);
}
export function evaluate(s:State,pid:string,input:EvaluationInput){
 participant(s,pid);
 if(s.decision.status==='OPEN')throw new DomainError('Questionário disponível somente após o encerramento legítimo.',409);
 input=EvaluationSchema.parse(input);
 if(input.instrumentVersion!==NATURALISTIC_VERSION&&s.rounds.length<2)throw new DomainError('O instrumento original mantém a condição de duas rodadas. Use a variante naturalística identificada.',409);
 if(s.evaluations.some(e=>e.participantId===pid))throw new DomainError('Resposta individual já registrada.',409);
 s.evaluations.push({id:randomUUID(),participantId:pid,at:now(),input,...(input.instrumentVersion===NATURALISTIC_VERSION?{applicationContext:{applicationVariant:APPLICATION_VARIANT,baseInstrumentVersion:'DSR-1.0-2026-11-16' as const,status:'PROPOSTA_SUJEITA_A_REVISAO_E_PRE_TESTE' as const,rounds:s.rounds.length,processResult:s.decision.status as 'CONSENSUS'|'CLOSED_WITHOUT_CONSENSUS',closedAt:s.decision.closedAt!,proposalVersions:s.proposals.length,objectionsRecorded:s.votes.filter(v=>v.choice==='REJEITO').length,analysesRecorded:s.analyses.length,synthesesRecorded:s.syntheses.length}}:{})});event(s,pid,'DSR_SUBMITTED');
}
export function repeatedObjections(s:State){const grouped=new Map<string,string[]>();for(const r of s.rounds)for(const v of latestVotes(s,r.id).filter(v=>v.choice==='REJEITO')){const key=v.justification.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');grouped.set(key,[...(grouped.get(key)??[]),v.id]);}return [...grouped.entries()].filter(([,ids])=>ids.length>1).map(([text,voteIds])=>({text,voteIds}));}
export function metrics(s:State){
 const coverage=s.syntheses.flatMap(x=>x.humanCoverage);
 const counted=(status:string)=>coverage.filter(x=>x.status===status).length;
 return {automatic:{consensus:s.decision.status==='CONSENSUS',rounds:s.rounds.length,deliberationMs:s.decision.closedAt?Date.parse(s.decision.closedAt)-Date.parse(s.decision.createdAt):null,
 repeatedObjections:repeatedObjections(s),votes:s.votes.length,conditionalAcceptances:s.votes.filter(v=>v.choice==='ACEITO_COM_RESSALVAS').length,objections:s.votes.filter(v=>v.choice==='REJEITO').length,distinctObjectionsByRound:s.rounds.reduce((n,r)=>n+latestVotes(s,r.id).filter(v=>v.choice==='REJEITO').length,0)},
 human:{addressed:counted('ATENDIDA'),partial:counted('PARCIAL'),unresolved:counted('NAO_ATENDIDA'),assessed:coverage.length,faithful:coverage.filter(c=>c.faithful===true).length,fidelityAssessed:coverage.filter(c=>c.faithful!==null).length,argumentQuality:null},
 limitation:'Cobertura e fidelidade são avaliações humanas do moderador, não medidas automáticas de qualidade ou resultados científicos.'};
}
function descriptive(values:Array<number|'N/A'|null>){
 const valid=values.filter((v):v is number=>typeof v==='number');const counts=Object.fromEntries([1,2,3,4,5].map(n=>[n,valid.filter(v=>v===n).length]));
 return {n:valid.length,na:values.filter(v=>v==='N/A').length,missing:values.filter(v=>v===null).length,frequencies:counts,mean:valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null};
}
export function statistics(s:State){
 const summarize=(evaluations:State['evaluations'],expected:number)=>({expected,received:evaluations.length,nonrespondents:expected-evaluations.length,items:Array.from({length:22},(_,i)=>({item:i+1,...descriptive(evaluations.map(e=>e.input.answers[i]))})),dimensions:dimensions.map(d=>({name:d.name,...descriptive(evaluations.flatMap(e=>e.input.answers.slice(d.from,d.to)))}))});
 const versions=[...new Set(s.evaluations.map(e=>e.input.instrumentVersion))];
 const groups=versions.map(instrumentVersion=>({instrumentVersion,applicationVariant:instrumentVersion===NATURALISTIC_VERSION?APPLICATION_VARIANT:'ORIGINAL_DUAS_RODADAS',rounds:s.rounds.length,processResult:s.decision.status,...summarize(s.evaluations.filter(e=>e.input.instrumentVersion===instrumentVersion),s.participants.length)}));
 return {...summarize(s.evaluations,s.participants.length),groups,mixedVersions:versions.length>1,pooledSummary:versions.length>1?'EXPLORATORIO_NAO_COMPARAVEL_AUTOMATICAMENTE':'UMA_VERSAO',
 denominator:'Frequências e médias usam somente respostas individuais enviadas; n inclui apenas notas 1–5. N/A, itens ausentes e participantes não respondentes são separados. Dimensões agrupam respostas a itens, não um escore validado.',
 openResponses:s.evaluations.map(e=>({alias:s.participants.find(p=>p.id===e.participantId)!.alias,instrumentVersion:e.input.instrumentVersion,questions:displayedOpenItems(e.input.instrumentVersion),answers:e.input.open,applicationContext:e.applicationContext??null})),
 thematicCoding:'Codificação temática humana pendente. Não há síntese científica automática.',psychometricValidation:false};
}
export function validateState(input:unknown):State{
 const s=StateSchema.parse(input);
 const unique=(xs:string[])=>new Set(xs).size===xs.length;
 const allIds=[...s.proposals,...s.rounds,...s.votes,...s.contributions,...s.analyses,...s.syntheses,...s.factualChecks,...s.contests,...s.events,...s.evaluations].map(x=>x.id);
 if(!unique(allIds)||!unique(s.participants.map(p=>p.id))||!unique(s.participants.map(p=>p.alias))||!unique(s.evaluations.map(e=>e.participantId)))throw new DomainError('Identificadores duplicados no arquivo.');
 const pids=new Set(s.participants.map(p=>p.id));
 if(s.enrollment&&(s.participants.length>15||!unique(s.enrollment.claims)||s.enrollment.claims.some(id=>!pids.has(id))))throw new DomainError('Inscrições incompatíveis com a sala.');
 if(!unique(s.researchConsents.map(c=>c.participantId))||s.researchConsents.some(c=>!pids.has(c.participantId)||s.research&&c.version!==s.research.version))throw new DomainError('Concordância de pesquisa incompatível.');
 if(s.enrollment&&s.votes.some(v=>!s.researchConsents.some(c=>c.participantId===v.participantId)))throw new DomainError('Voto sem concordância prévia.');
 for(let i=0;i<s.proposals.length;i++){const p=s.proposals[i];if(p.version!==i+1||p.parentId!==(i?s.proposals[i-1].id:null))throw new DomainError('Cadeia de propostas inválida.');}
 if(s.rounds.length!==s.proposals.length)throw new DomainError('Rodadas incompatíveis.');
 for(let i=0;i<s.rounds.length;i++){const r=s.rounds[i];if(r.number!==i+1||r.proposalId!==s.proposals[i].id||r.status!==(i===s.rounds.length-1&&s.decision.status==='OPEN'?'OPEN':'CLOSED'))throw new DomainError('Sequência de rodadas inválida.');}
 for(const v of [...s.votes,...s.contributions]){if(!pids.has(v.participantId)||!s.rounds.some(r=>r.id===v.roundId&&r.proposalId===v.proposalId))throw new DomainError('Manifestação com vínculo inválido.');}
 if(s.votes.some(v=>['REJEITO','ACEITO_COM_RESSALVAS'].includes(v.choice)&&!v.justification.trim()))throw new DomainError('Rejeição sem justificativa.');
 for(const a of s.analyses){const r=s.rounds.find(r=>r.id===a.roundId&&r.proposalId===a.proposalId);if(!r||a.result.individualAssessments.some(x=>!s.votes.some(v=>v.id===x.voteId&&v.roundId===r.id&&v.choice==='REJEITO')))throw new DomainError('Análise com vínculo inválido.');}
 for(const x of s.syntheses){if(!s.analyses.some(a=>a.id===x.analysisId&&a.roundId===x.roundId&&a.proposalId===x.proposalId)||x.publishedProposalId&&!s.proposals.some(p=>p.id===x.publishedProposalId&&p.parentId===x.proposalId))throw new DomainError('Síntese com vínculo inválido.');const ids=[...x.result.addressedObjections,...x.result.partiallyAddressedObjections,...x.result.unresolvedObjections,...x.result.changeLog.flatMap(c=>c.voteIds),...x.humanCoverage.map(c=>c.voteId)];if(ids.some(id=>!s.votes.some(v=>v.id===id&&v.roundId===x.roundId&&v.choice==='REJEITO')))throw new DomainError('Vínculo de cobertura inválido.');}
 for(const p of s.proposals){if(p.intervention){const i=p.intervention,source=i.source==='RASCUNHO_INICIAL'?s.initialDraft:i.source==='PARECER_INICIAL_IA'?(s.proposals[0].review.result?.suggestedRewrite?{...s.initialDraft,text:s.proposals[0].review.result.suggestedRewrite}:undefined):i.source==='SINTESE_IA'?s.syntheses.find(x=>x.id===i.sourceId)?.result.revisedProposal:s.proposals.find(x=>x.id===i.sourceId)?.content;
 const changes=Object.keys(p.content).filter(k=>p.content[k as keyof ProposalContent]!==i.original[k as keyof ProposalContent]).map(k=>({field:k,before:i.original[k as keyof ProposalContent],after:p.content[k as keyof ProposalContent]}));
 if(!source||JSON.stringify(source)!==JSON.stringify(i.original)||JSON.stringify(i.published)!==JSON.stringify(p.content)||JSON.stringify(changes)!==JSON.stringify(i.changes)||i.kind!==(changes.length?'EDICAO_HUMANA':'APROVACAO_HUMANA')||!i.reason.trim()||i.at!==p.createdAt)throw new DomainError('Intervenção humana incompatível com a proveniência.');}}
 const recorded=[...s.votes.map(v=>({id:v.id,roundId:v.roundId,text:v.justification,kind:v.choice==='REJEITO'?'OBJECAO':v.choice==='ACEITO_COM_RESSALVAS'?'RESSALVA':v.choice==='ABSTENHO'?'ABSTENCAO':'APOIO'})),...s.contributions.map(c=>({id:c.id,roundId:c.roundId,text:c.text,kind:'CONTRIBUICAO'})),...s.contests.map(c=>({id:c.id,roundId:[...s.contributions,...s.analyses,...s.syntheses,...s.factualChecks].find(x=>x.id===c.targetId)?.roundId,text:c.text,kind:'CONTESTACAO'}))];
 for(const a of s.analyses)if(a.result.manifestationAssessments){const rows=a.result.manifestationAssessments;if(new Set(rows.map(x=>x.sourceId)).size!==rows.length||rows.some(row=>{const src=recorded.find(x=>x.id===row.sourceId&&x.roundId===a.roundId);return !src||src.kind!==row.kind||(src.text?(!row.quotedExcerpt.trim()||!src.text.includes(row.quotedExcerpt)):row.quotedExcerpt!=='');}))throw new DomainError('Análise com proveniência de manifestação inválida.');}
 for(const x of s.syntheses)if(x.result.consideredSourceIds){const ids=x.result.consideredSourceIds;if(new Set(ids).size!==ids.length||ids.some(id=>!recorded.some(r=>r.id===id&&r.roundId===x.roundId))||x.result.changeLog.some(c=>!c.sourceIds?.length||c.sourceIds.some(id=>!ids.includes(id))))throw new DomainError('Síntese com proveniência de manifestação inválida.');}
 for(const f of s.factualChecks){if(f.participantId!==null&&!pids.has(f.participantId)||!s.rounds.some(r=>r.id===f.roundId&&r.proposalId===f.proposalId)||!soundEvidence(f))throw new DomainError('Evidência factual ou vínculo inválido.');}
 for(const a of [...s.analyses,...s.syntheses])if(a.factualCheckIds.some(id=>!s.factualChecks.some(f=>f.id===id&&f.proposalId===a.proposalId)))throw new DomainError('Referência factual inválida.');
 for(const c of s.contests){if(!pids.has(c.participantId)||![...s.contributions,...s.analyses,...s.syntheses,...s.factualChecks].some(x=>x.id===c.targetId))throw new DomainError('Contestação inválida.');}
 for(const e of s.evaluations){
  if(!pids.has(e.participantId)||s.decision.status==='OPEN'||!s.decision.closedAt||Date.parse(e.at)<Date.parse(s.decision.closedAt))throw new DomainError('Avaliação incompatível com o processo.');
  if(e.input.instrumentVersion===NATURALISTIC_VERSION){const c=e.applicationContext;if(!c||c.rounds!==s.rounds.length||c.processResult!==s.decision.status||c.closedAt!==s.decision.closedAt||c.proposalVersions!==s.proposals.length||c.objectionsRecorded!==s.votes.filter(v=>v.choice==='REJEITO').length||c.analysesRecorded!==s.analyses.length||c.synthesesRecorded!==s.syntheses.length)throw new DomainError('Contexto de aplicação do questionário incompatível.');}
  else if(s.rounds.length<2||e.applicationContext)throw new DomainError('Condição original de aplicação incompatível.');
 }
 if(s.decision.status==='CONSENSUS'&&!unanimous(s)||s.decision.status!=='CONSENSUS'&&unanimous(s))throw new DomainError('Resultado de consenso incompatível com os votos.');
 if((s.decision.status==='OPEN')!==(s.decision.closedAt===null)||s.decision.status!=='OPEN'&&!s.decision.closureReason.trim())throw new DomainError('Encerramento inválido.');
 return s;
}
export function exportState(s:State){return {format:'dc2-consensus',version:2,exportedAt:now(),state:s,metrics:metrics(s),evaluation:statistics(s),provenance:'Histórico exportado pelo moderador. Não é comprovação criptográfica de autoria externa.'};}
export const ImportSchema=z.object({format:z.literal('dc2-consensus'),version:z.literal(2),state:StateSchema});

export function addFactualCheck(s:State,report:FactualReport,participantId:string|null){
 open(s);if(participantId)participant(s,participantId);
 if(s.factualChecks.length>=200)throw new DomainError('Limite de verificações desta sala atingido.',429);
 FactualReportSchema.parse(report);if(!soundEvidence(report))throw new DomainError('Evidências sem suporte rastreável.',502);
 const entry={...report,id:randomUUID(),participantId,proposalId:currentProposal(s).id,roundId:currentRound(s).id};
 s.factualChecks.push(entry);event(s,participantId??'moderator','FACTUAL_CHECK_RECORDED',entry.id+'; '+report.version+'; '+report.model);return entry;
}
export function factualContext(s:State){
 return s.factualChecks.filter(isTavilyCheck).filter(f=>f.proposalId===currentProposal(s).id&&f.provenance!=='IMPORTED_UNAUTHENTICATED').slice(-12).map(f=>({id:f.id,provider:'TAVILY',version:f.version,queriedAt:f.createdAt,contested:s.contests.some(c=>c.targetId===f.id),contests:s.contests.filter(c=>c.targetId===f.id).map(c=>({text:c.text,at:c.at})),claims:f.claims.map(c=>({claim:c.claim.text,status:c.status,interpretation:c.explanation,sources:c.sources,evidenceLinks:c.evidenceLinks,retrieval:c.retrieval,limitations:c.limitations}))}));
}

