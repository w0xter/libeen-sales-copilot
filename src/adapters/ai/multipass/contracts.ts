import { z } from 'zod';
import { EvidenceRefSchema, FactValueSchema, InterpretationSchema, SubjectRefSchema } from '../../../contracts';

const id = z.string().min(1);
export const SpanSchema = z.strictObject({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative(), text: z.string().min(1) }).refine(s => s.end > s.start);
export const OccurrenceRefSchema = z.strictObject({ messageId: id, statementSpan: SpanSchema, focusSpan: SpanSchema.optional(), previousAssertionId: id.optional() });
export const RawClaimSchema = z.strictObject({ fieldId: id, subjectRef: SubjectRefSchema, value: FactValueSchema.optional(), unit: id.optional(), period: id.optional(), incomeBasis: z.enum(['net', 'gross', 'unknown']).optional(), precision: z.enum(['explicit', 'approximate', 'ambiguous', 'inferred']), occurrence: OccurrenceRefSchema, evidenceRefs: z.array(EvidenceRefSchema).min(1), correction: z.strictObject({ dimension: z.enum(['value', 'incomeBasis', 'period', 'unit', 'subjectRef']), previousAssertionId: id }).optional() });
export const ClaimCandidateSchema = RawClaimSchema.extend({ candidateId: id, extractorId: id });
export const ClaimGroupSchema = z.strictObject({ groupId: id, occurrence: OccurrenceRefSchema, fieldId: id, semanticAtomicity: z.literal('context_review_required'), candidates: z.array(ClaimCandidateSchema).min(1) });
export const DisputeSchema = z.strictObject({ disputeId: id, groupId: id, candidateIds: z.array(id).min(1), reason: id });
export const ResolutionSchema = z.discriminatedUnion('status', [z.strictObject({ status: z.literal('selected'), candidateId: id, justification: id }), z.strictObject({ status: z.literal('unresolved'), justification: id })]);
export const AdjudicationResponseSchema = z.strictObject({ disputeId: id, resolution: ResolutionSchema });
export const ReconciliationResultSchema = z.strictObject({ interpretation: InterpretationSchema, disputes: z.array(DisputeSchema), resolutions: z.array(AdjudicationResponseSchema) });
export type OccurrenceRef = z.infer<typeof OccurrenceRefSchema>;
export type RawClaim = z.infer<typeof RawClaimSchema>;
export type ClaimCandidate = z.infer<typeof ClaimCandidateSchema>;
export type ClaimGroup = z.infer<typeof ClaimGroupSchema>;
