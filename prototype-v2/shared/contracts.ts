import { z } from 'zod';

const field = z.string().trim().max(5000);
export const ProposalSchema = z.object({
 title:z.string().trim().min(3).max(180), problem:field.min(4), decision:field.min(4),
 goals:field.default(''), alternatives:field.default(''), constraints:field.default(''),
 successCriteria:field.default(''), context:field.default(''), text:field.min(4),
});
export type ProposalContent=z.infer<typeof ProposalSchema>;
export const ReviewSchema=z.object({
 relevance:z.enum(['RELACIONADA','PARCIAL','DESALINHADA','INDETERMINADA']),
 summary:z.string().min(1).max(1200),
 recommendations:z.array(z.string().max(500)).max(8),
 assertions:z.array(z.object({text:z.string().max(500),status:z.enum(['COMPATIVEL_COM_CONTEXTO','PRECISA_DE_FONTE','NAO_VERIFICAVEL']),note:z.string().max(500)})).max(10),
 limitations:z.array(z.string().max(500)).max(10),
 clarity:field.default(''), biasFlags:z.array(field).max(10).default([]),
 assumptions:z.array(field).max(10).default([]), missingInfo:z.array(field).max(10).default([]),
 questions:z.array(field).max(10).default([]), uncertainties:z.array(field).max(10).default([]),
 suggestedRewrite:field.default(''),
});
export type Review=z.infer<typeof ReviewSchema>;
const list=z.array(z.string().max(2000)).max(50);
export const AssessmentSchema=z.object({
 individualAssessments:z.array(z.object({voteId:z.string(),relevance:field,explanation:field,quotedExcerpt:field,premises:list,evidence:list,risks:list,uncertainty:field})).max(30),
 sharedInterests:list,convergences:list,conflicts:list,incompatibleObjections:list,nonNegotiableConditions:list,uncertainties:list,
});
export type Assessment=z.infer<typeof AssessmentSchema>;
export const SynthesisSchema=z.object({
 revisedProposal:ProposalSchema,
 changeLog:z.array(z.object({change:field,reason:field,voteIds:z.array(z.string()).max(30)})).max(30),
 addressedObjections:z.array(z.string()).max(30),partiallyAddressedObjections:z.array(z.string()).max(30),
 unresolvedObjections:z.array(z.string()).max(30),remainingImpasses:list,feasibilityWarnings:list,
});
export type SynthesisResult=z.infer<typeof SynthesisSchema>;
export const ChoiceSchema=z.enum(['ACEITO','REJEITO','ABSTENHO']);
export type Choice=z.infer<typeof ChoiceSchema>;
export const EvaluationSchema=z.object({
 instrumentVersion:z.literal('DSR-1.0-2026-11-16'),
 answers:z.array(z.union([z.number().int().min(1).max(5),z.literal('N/A'),z.null()])).length(22),
 open:z.array(z.string().trim().max(5000)).length(4),consent:z.literal(true),
});
export type EvaluationInput=z.infer<typeof EvaluationSchema>;
export const INSTRUMENT_VERSION='DSR-1.0-2026-11-16' as const;
