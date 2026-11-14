import { z } from 'zod';
import { Id, StringList, Timestamp } from './primitives';
import { EvidenceRefSchema, SubjectRefSchema } from './messages';

export const FactValueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.array(z.string()), z.strictObject({
  min: z.number().finite(), max: z.number().finite()
}).refine(v => v.min <= v.max)]);
export type FactValue = z.infer<typeof FactValueSchema>;

export const FactAssertionSchema = z.strictObject({
  assertionId: Id,
  fieldId: Id,
  subjectRef: SubjectRefSchema,
  value: FactValueSchema.optional(),
  unit: Id.optional(),
  period: Id.optional(),
  incomeBasis: z.enum(['net', 'gross', 'unknown']).optional(),
  rawValue: z.string().min(1),
  source: z.enum(['customer_message', 'advisor_correction', 'form']),
  evidenceRefs: z.array(EvidenceRefSchema).min(1),
  observedAt: Timestamp,
  precision: z.enum(['explicit', 'approximate', 'ambiguous', 'inferred']),
  reviewStatus: z.enum(['unreviewed', 'confirmed_by_advisor', 'rejected']),
  schemaVersion: Id
});
export type FactAssertion = z.infer<typeof FactAssertionSchema>;
const viewBase = {
  fieldId: Id,
  subjectRef: SubjectRefSchema,
  unit: Id.optional(),
  period: Id.optional(),
  incomeBasis: z.enum(['net', 'gross', 'unknown']).optional(),
  evidenceRefs: z.array(EvidenceRefSchema),
  assertionIds: StringList.optional()
};

export const FactViewSchema = z.discriminatedUnion('status', [
  z.strictObject({
    ...viewBase,
    status: z.literal('known'),
    value: FactValueSchema,
    evidenceRefs: z.array(EvidenceRefSchema).min(1)
  }),
  z.strictObject({
    ...viewBase,
    status: z.literal('approximate'),
    value: FactValueSchema,
    evidenceRefs: z.array(EvidenceRefSchema).min(1)
  }),
  z.strictObject({
    ...viewBase, status: z.literal('unknown')
  }),
  z.strictObject({
    ...viewBase, status: z.literal('ambiguous'), value: FactValueSchema.optional()
  }),
  z.strictObject({
    ...viewBase,
    status: z.literal('conflicting'),
    values: z.array(FactValueSchema).min(2)
  }),
  z.strictObject({
    ...viewBase, status: z.literal('not_applicable'), reason: z.string().min(1)
  }),
]);
export type FactView = z.infer<typeof FactViewSchema>;

export const CaseKnowledgeSchema = z.strictObject({
  facts: z.array(FactViewSchema)
});
export type CaseKnowledge = z.infer<typeof CaseKnowledgeSchema>;
