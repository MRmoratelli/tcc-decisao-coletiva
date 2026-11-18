import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { ProposalSchema, ReviewSchema, AssessmentSchema, SynthesisSchema, EvaluationSchema, ChoiceSchema, type ProposalContent, type Review, type Assessment, type SynthesisResult, type EvaluationInput, type Choice } from '../shared/contracts.js';
import { dimensions } from '../shared/instrument.js';

export class DomainError extends Error { constructor(message:string, public status=400){super(message);} }
const id=z.string().uuid(), date=z.string().datetime();
const ReviewRecord=z.object({result:ReviewSchema.nullable(),status:z.enum(['OK','IGNORADA','INDISPONIVEL']),promptVersion:z.string(),model:z.string(),reason:z.string()});
const Proposal=z.object({id,version:z.number().int().positive(),parentId:id.nullable(),content:ProposalSchema,createdAt:date,approvedBy:z.string(),review:ReviewRecord});
const Round=z.object({id,number:z.number().int().positive(),proposalId:id,status:z.enum(['OPEN','CLOSED']),openedAt:date,closedAt:date.nullable()});
const Vote=z.object({id,participantId:id,roundId:id,proposalId:id,choice:ChoiceSchema,justification:z.string().max(5000),createdAt:date});
const Contribution=z.object({id,participantId:id,roundId:id,proposalId:id,originalText:z.string().min(1).max(5000),text:z.string().min(1).max(5000),review:ReviewRecord,contest:z.string().max(2000),createdAt:date});
const Analysis=z.object({id,proposalId:id,roundId:id,sourceFingerprint:z.string(),result:AssessmentSchema,promptVersion:z.string(),model:z.string(),createdAt:date});
export const CoverageSchema=z.array(z.object({voteId:id,status:z.enum(['ATENDIDA','PARCIAL','NAO_ATENDIDA']),faithful:z.boolean().nullable(),note:z.string().max(2000)})).max(30);
const Synthesis=z.object({id,proposalId:id,roundId:id,analysisId:id,result:SynthesisSchema,promptVersion:z.string(),model:z.string(),createdAt:date,publishedProposalId:id.nullable(),humanCoverage:CoverageSchema});
const Event=z.object({id,at:date,actor:z.string(),type:z.string(),detail:z.string().max(5000)});
const Evaluation=z.object({id,participantId:id,at:date,input:EvaluationSchema});
const Contest=z.object({id,participantId:id,targetId:id,text:z.string().min(1).max(2000),at:date});
export const StateSchema=z.object({
 schemaVersion:z.literal(2),initialDraft:ProposalSchema,decision:z.object({id,originId:id,title:z.string(),status:z.enum(['OPEN','CONSENSUS','CLOSED_WITHOUT_CONSENSUS']),createdAt:date,closedAt:date.nullable(),closureReason:z.string()}),
 participants:z.array(z.object({id,alias:z.string().regex(/^P\d{2}$/)})).min(2).max(30),
 proposals:z.array(Proposal).min(1),rounds:z.array(Round).min(1),
 votes:z.array(Vote),contributions:z.array(Contribution),analyses:z.array(Analysis),syntheses:z.array(Synthesis),contests:z.array(Contest),events:z.array(Event),evaluations:z.array(Evaluation),
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
 votes:[],contributions:[],analyses:[],syntheses:[],contests:[],events:[],evaluations:[]};
 event(s,'moderator','ROOM_CREATED','Proposta inicial confirmada por pessoa responsável.');return s;
}
function open(s:State){if(s.decision.status!=='OPEN')throw new DomainError('Processo encerrado.',409);}
function participant(s:State,pid:string){if(!s.participants.some(p=>p.id===pid))throw new DomainError('Participante não pertence à sala.',403);}
export function vote(s:State,pid:string,roundId:string,proposalId:string,choice:Choice,justification:string){
 open(s);participant(s,pid);const r=currentRound(s);
 if(r.id!==roundId||r.proposalId!==proposalId)throw new DomainError('Versão ou rodada desatualizada. Atualize a sala.',409);
 if(choice==='REJEITO'&&!justification.trim())throw new DomainError('A rejeição exige justificativa.');
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
export function assertAssessment(s:State,result:Assessment){
 const objections=latestVotes(s).filter(v=>v.choice==='REJEITO');
 const ids=result.individualAssessments.map(a=>a.voteId);
 if(ids.length!==objections.length||new Set(ids).size!==ids.length||objections.some(v=>!ids.includes(v.id)))throw new DomainError('Serviço de IA omitiu ou inventou objeções.',502);
 for(const a of result.individualAssessments){const v=objections.find(v=>v.id===a.voteId)!;if(!a.quotedExcerpt.trim()||!v.justification.includes(a.quotedExcerpt))throw new DomainError('Serviço de IA retornou citação não presente na objeção.',502);}
}
export function sourceFingerprint(s:State){const roundId=currentRound(s).id;return createHash('sha256').update(JSON.stringify({votes:latestVotes(s),contributions:s.contributions.filter(c=>c.roundId===roundId)})).digest('hex');}
export function addAnalysis(s:State,result:Assessment,model:string,promptVersion:string){
 open(s);assertAssessment(s,result);const a={id:randomUUID(),proposalId:currentProposal(s).id,roundId:currentRound(s).id,sourceFingerprint:sourceFingerprint(s),result,model,promptVersion,createdAt:now()};s.analyses.push(a);event(s,'moderator','OBJECTIONS_ANALYZED');return a;
}
export function assertSynthesis(s:State,result:SynthesisResult){
 const ids=latestVotes(s).filter(v=>v.choice==='REJEITO').map(v=>v.id);
 const classified=[...result.addressedObjections,...result.partiallyAddressedObjections,...result.unresolvedObjections];
 if(classified.length!==ids.length||new Set(classified).size!==classified.length||ids.some(id=>!classified.includes(id))||result.changeLog.some(c=>c.voteIds.some(id=>!ids.includes(id))))throw new DomainError('Serviço de IA omitiu ou inventou vínculos de objeções.',502);
}
export function addSynthesis(s:State,analysisId:string,result:SynthesisResult,model:string,promptVersion:string){
 open(s);const a=s.analyses.find(a=>a.id===analysisId&&a.proposalId===currentProposal(s).id);
 if(!a)throw new DomainError('Analise as objeções da versão atual primeiro.');
 // Análises anteriores a um novo voto não podem fundamentar uma síntese.
 if(a.sourceFingerprint!==sourceFingerprint(s))throw new DomainError('Novas manifestações após a análise. Analise novamente.',409);
 assertAssessment(s,a.result);assertSynthesis(s,result);
 const entry={id:randomUUID(),proposalId:currentProposal(s).id,roundId:currentRound(s).id,analysisId,result,model,promptVersion,createdAt:now(),publishedProposalId:null,humanCoverage:[]};
 s.syntheses.push(entry);event(s,'moderator','SYNTHESIS_DRAFTED');return entry;
}
export function publish(s:State,content:ProposalContent,sourceId:string,reason:string,synthesisId?:string,coverage:z.infer<typeof CoverageSchema>=[]){
 open(s);if(sourceId!==currentProposal(s).id)throw new DomainError('Proposta desatualizada.',409);
 if(!reason.trim())throw new DomainError('Registre a justificativa da revisão humana.');
 const synthesis=synthesisId?s.syntheses.find(x=>x.id===synthesisId&&x.proposalId===sourceId&&!x.publishedProposalId):undefined;
 if(synthesisId&&!synthesis)throw new DomainError('Síntese inválida.');
 if(synthesis)assertSynthesis(s,synthesis.result);
 const ids=latestVotes(s).filter(v=>v.choice==='REJEITO').map(v=>v.id);
 if(coverage.some(c=>!ids.includes(c.voteId))||new Set(coverage.map(c=>c.voteId)).size!==coverage.length)throw new DomainError('Cobertura humana inválida.');
 const r=currentRound(s);r.status='CLOSED';r.closedAt=now();
 const proposal={id:randomUUID(),version:s.proposals.length+1,parentId:sourceId,content,createdAt:now(),approvedBy:'moderator',review:{result:null,status:'IGNORADA' as const,promptVersion:'human-review-v1',model:'human',reason}};
 s.proposals.push(proposal);s.rounds.push({id:randomUUID(),number:s.rounds.length+1,proposalId:proposal.id,status:'OPEN',openedAt:now(),closedAt:null});
 if(synthesis){synthesis.publishedProposalId=proposal.id;synthesis.humanCoverage=coverage;}
 event(s,'moderator','PROPOSAL_PUBLISHED',reason);
}
export function closeWithoutConsensus(s:State,reason:string){open(s);if(!reason.trim())throw new DomainError('Informe a razão do encerramento.');s.decision.status='CLOSED_WITHOUT_CONSENSUS';s.decision.closedAt=now();s.decision.closureReason=reason;currentRound(s).status='CLOSED';currentRound(s).closedAt=s.decision.closedAt;event(s,'moderator','CLOSED_WITHOUT_CONSENSUS',reason);}
export function contest(s:State,pid:string,targetId:string,text:string){
 participant(s,pid);
 const own=s.contributions.some(c=>c.id===targetId&&c.participantId===pid);
 const accessible=s.analyses.some(a=>a.id===targetId)||s.syntheses.some(a=>a.id===targetId);
 if(!own&&!accessible)throw new DomainError('Parecer não acessível.',403);
 s.contests.push({id:randomUUID(),participantId:pid,targetId,text,at:now()});event(s,pid,'AI_CONTESTED',text);
}
export function evaluate(s:State,pid:string,input:EvaluationInput){
 participant(s,pid);
 if(s.decision.status==='OPEN'||s.rounds.length<2)throw new DomainError('Questionário pós-sessão disponível após encerramento e pelo menos duas rodadas.',409);
 if(s.evaluations.some(e=>e.participantId===pid))throw new DomainError('Resposta individual já registrada.',409);
 s.evaluations.push({id:randomUUID(),participantId:pid,at:now(),input});event(s,pid,'DSR_SUBMITTED');
}
export function repeatedObjections(s:State){const grouped=new Map<string,string[]>();for(const r of s.rounds)for(const v of latestVotes(s,r.id).filter(v=>v.choice==='REJEITO')){const key=v.justification.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');grouped.set(key,[...(grouped.get(key)??[]),v.id]);}return [...grouped.entries()].filter(([,ids])=>ids.length>1).map(([text,voteIds])=>({text,voteIds}));}
export function metrics(s:State){
 const coverage=s.syntheses.flatMap(x=>x.humanCoverage);
 const counted=(status:string)=>coverage.filter(x=>x.status===status).length;
 return {automatic:{consensus:s.decision.status==='CONSENSUS',rounds:s.rounds.length,deliberationMs:s.decision.closedAt?Date.parse(s.decision.closedAt)-Date.parse(s.decision.createdAt):null,
 repeatedObjections:repeatedObjections(s),votes:s.votes.length,objections:s.votes.filter(v=>v.choice==='REJEITO').length,distinctObjectionsByRound:s.rounds.reduce((n,r)=>n+latestVotes(s,r.id).filter(v=>v.choice==='REJEITO').length,0)},
 human:{addressed:counted('ATENDIDA'),partial:counted('PARCIAL'),unresolved:counted('NAO_ATENDIDA'),assessed:coverage.length,faithful:coverage.filter(c=>c.faithful===true).length,fidelityAssessed:coverage.filter(c=>c.faithful!==null).length,argumentQuality:null},
 limitation:'Cobertura e fidelidade são avaliações humanas do moderador, não medidas automáticas de qualidade ou resultados científicos.'};
}
function descriptive(values:Array<number|'N/A'|null>){
 const valid=values.filter((v):v is number=>typeof v==='number');const counts=Object.fromEntries([1,2,3,4,5].map(n=>[n,valid.filter(v=>v===n).length]));
 return {n:valid.length,na:values.filter(v=>v==='N/A').length,missing:values.filter(v=>v===null).length,frequencies:counts,mean:valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null};
}
export function statistics(s:State){
 const rows=s.participants.map(p=>s.evaluations.find(e=>e.participantId===p.id)?.input.answers??Array(22).fill(null));
 return {expected:s.participants.length,received:s.evaluations.length,items:Array.from({length:22},(_,i)=>({item:i+1,...descriptive(rows.map(r=>r[i]))})),
 dimensions:dimensions.map(d=>({name:d.name,...descriptive(rows.flatMap(r=>r.slice(d.from,d.to)))})),
 openResponses:s.evaluations.map(e=>({alias:s.participants.find(p=>p.id===e.participantId)!.alias,answers:e.input.open})),
 thematicCoding:'Codificação temática humana pendente. Não há síntese científica automática.',psychometricValidation:false};
}
export function validateState(input:unknown):State{
 const s=StateSchema.parse(input);
 const unique=(xs:string[])=>new Set(xs).size===xs.length;
 const allIds=[...s.proposals,...s.rounds,...s.votes,...s.contributions,...s.analyses,...s.syntheses,...s.contests,...s.events,...s.evaluations].map(x=>x.id);
 if(!unique(allIds)||!unique(s.participants.map(p=>p.id))||!unique(s.participants.map(p=>p.alias))||!unique(s.evaluations.map(e=>e.participantId)))throw new DomainError('Identificadores duplicados no arquivo.');
 const pids=new Set(s.participants.map(p=>p.id));
 for(let i=0;i<s.proposals.length;i++){const p=s.proposals[i];if(p.version!==i+1||p.parentId!==(i?s.proposals[i-1].id:null))throw new DomainError('Cadeia de propostas inválida.');}
 if(s.rounds.length!==s.proposals.length)throw new DomainError('Rodadas incompatíveis.');
 for(let i=0;i<s.rounds.length;i++){const r=s.rounds[i];if(r.number!==i+1||r.proposalId!==s.proposals[i].id||r.status!==(i===s.rounds.length-1&&s.decision.status==='OPEN'?'OPEN':'CLOSED'))throw new DomainError('Sequência de rodadas inválida.');}
 for(const v of [...s.votes,...s.contributions]){if(!pids.has(v.participantId)||!s.rounds.some(r=>r.id===v.roundId&&r.proposalId===v.proposalId))throw new DomainError('Manifestação com vínculo inválido.');}
 if(s.votes.some(v=>v.choice==='REJEITO'&&!v.justification.trim()))throw new DomainError('Rejeição sem justificativa.');
 for(const a of s.analyses){const r=s.rounds.find(r=>r.id===a.roundId&&r.proposalId===a.proposalId);if(!r||a.result.individualAssessments.some(x=>!s.votes.some(v=>v.id===x.voteId&&v.roundId===r.id&&v.choice==='REJEITO')))throw new DomainError('Análise com vínculo inválido.');}
 for(const x of s.syntheses){if(!s.analyses.some(a=>a.id===x.analysisId&&a.roundId===x.roundId&&a.proposalId===x.proposalId)||x.publishedProposalId&&!s.proposals.some(p=>p.id===x.publishedProposalId&&p.parentId===x.proposalId))throw new DomainError('Síntese com vínculo inválido.');const ids=[...x.result.addressedObjections,...x.result.partiallyAddressedObjections,...x.result.unresolvedObjections,...x.result.changeLog.flatMap(c=>c.voteIds),...x.humanCoverage.map(c=>c.voteId)];if(ids.some(id=>!s.votes.some(v=>v.id===id&&v.roundId===x.roundId&&v.choice==='REJEITO')))throw new DomainError('Vínculo de cobertura inválido.');}
 for(const c of s.contests){if(!pids.has(c.participantId)||![...s.contributions,...s.analyses,...s.syntheses].some(x=>x.id===c.targetId))throw new DomainError('Contestação inválida.');}
 if(s.evaluations.some(e=>!pids.has(e.participantId))||s.evaluations.length&&(s.decision.status==='OPEN'||s.rounds.length<2))throw new DomainError('Avaliação incompatível com o processo.');
 if(s.decision.status==='CONSENSUS'&&!unanimous(s)||s.decision.status!=='CONSENSUS'&&unanimous(s))throw new DomainError('Resultado de consenso incompatível com os votos.');
 if((s.decision.status==='OPEN')!==(s.decision.closedAt===null)||s.decision.status!=='OPEN'&&!s.decision.closureReason.trim())throw new DomainError('Encerramento inválido.');
 return s;
}
export function exportState(s:State){return {format:'dc2-consensus',version:2,exportedAt:now(),state:s,metrics:metrics(s),evaluation:statistics(s),provenance:'Histórico exportado pelo moderador. Não é comprovação criptográfica de autoria externa.'};}
export const ImportSchema=z.object({format:z.literal('dc2-consensus'),version:z.literal(2),state:StateSchema});
