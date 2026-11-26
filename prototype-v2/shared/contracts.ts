import { z } from 'zod';
import { NATURALISTIC_VERSION,APPLICATION_VARIANT } from './instrument.js';

const field = z.string().trim().max(5000);
export const ProposalSchema = z.object({
 title:z.string().trim().min(3).max(180), problem:field.default(''), decision:field.default(''),
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
export const ReviewChoiceSchema=z.enum(['USED_REWRITE','KEPT_ORIGINAL','DISCARDED','EDITED_REWRITE','EDITED_ORIGINAL']);
export type ReviewChoice=z.infer<typeof ReviewChoiceSchema>;
const list=z.array(z.string().max(2000)).max(50);
export const ManifestationAssessmentSchema=z.object({sourceId:z.string(),kind:z.enum(['APOIO','RESSALVA','OBJECAO','ABSTENCAO','CONTRIBUICAO','CONTESTACAO']),quotedExcerpt:field,quoteOrigin:z.enum(['SUBMITTED','ORIGINAL']).optional(),interpretation:field,suggestedPath:field});
export const AssessmentSchema=z.object({
 manifestationAssessments:z.array(ManifestationAssessmentSchema).max(200).optional(),
 individualAssessments:z.array(z.object({voteId:z.string(),relevance:field,explanation:field,quotedExcerpt:field,quoteOrigin:z.enum(['SUBMITTED','ORIGINAL']).optional(),premises:list,evidence:list,risks:list,uncertainty:field})).max(30),
 sharedInterests:list,convergences:list,conflicts:list,incompatibleObjections:list,nonNegotiableConditions:list,uncertainties:list,
});
export type Assessment=z.infer<typeof AssessmentSchema>;
export const DecisionProgressSchema=z.object({defined:list,suggested:list,pending:list,questions:list});
export const ResolutionCheckSchema=z.object({voteId:z.string(),satisfiedRequirements:list,remainingRequirements:list});
export const SynthesisSchema=z.object({
 decisionProgress:DecisionProgressSchema.optional(),resolutionChecks:z.array(ResolutionCheckSchema).max(30).optional(),
 revisedProposal:ProposalSchema,
 consideredSourceIds:z.array(z.string()).max(200).optional(),
 changeLog:z.array(z.object({change:field,reason:field,voteIds:z.array(z.string()).max(30),sourceIds:z.array(z.string()).max(200).optional()})).max(30),
 addressedObjections:z.array(z.string()).max(30),partiallyAddressedObjections:z.array(z.string()).max(30),
 unresolvedObjections:z.array(z.string()).max(30),remainingImpasses:list,feasibilityWarnings:list,
});
export type SynthesisResult=z.infer<typeof SynthesisSchema>;
// Historical values remain readable; new requests use ActiveChoiceSchema.
export const ChoiceSchema=z.enum(['ACEITO','ACEITO_COM_RESSALVAS','REJEITO','ABSTENHO']);
export const ActiveChoiceSchema=z.enum(['ACEITO','REJEITO']);
export type Choice=z.infer<typeof ChoiceSchema>;
const LegacyEvaluationSchema=z.object({
 instrumentVersion:z.literal('DSR-1.0-2026-11-16'),
 answers:z.array(z.union([z.number().int().min(1).max(5),z.literal('N/A'),z.null()])).length(22),
 open:z.array(z.string().trim().max(5000)).length(4),consent:z.literal(true),
});
export const EvaluationSchema=z.discriminatedUnion('instrumentVersion',[
 LegacyEvaluationSchema,
 LegacyEvaluationSchema.extend({instrumentVersion:z.literal(NATURALISTIC_VERSION),applicationVariant:z.literal(APPLICATION_VARIANT),baseInstrumentVersion:z.literal('DSR-1.0-2026-11-16')}),
]);
export type EvaluationInput=z.infer<typeof EvaluationSchema>;
export const INSTRUMENT_VERSION='DSR-1.0-2026-11-16' as const;

