import { z } from 'zod';
import { Id, Revision, Timestamp } from './primitives';
import { EvidenceRefSchema, MessageSchema } from './messages';
import { FactAssertionSchema } from './facts';
const eventBase = {
  eventId: Id,
  caseId: Id,
  actor: z.enum(['customer', 'advisor', 'system']),
  occurredAt: Timestamp,
  expectedRevision: Revision
};
const empty = z.strictObject({});
const draftRef = z.strictObject({
  draftId: Id, proposalId: Id
});

export const CaseEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...eventBase,
    type: z.literal('MESSAGE_RECEIVED'),
    simulated: z.boolean().optional(),
    payload: z.strictObject({
      message: MessageSchema
    })
  }),
  z.strictObject({
    ...eventBase, type: z.literal('CASE_ANALYSIS_REQUESTED'), payload: empty
  }),
  z.strictObject({
    ...eventBase, type: z.literal('CASE_REEVALUATION_REQUESTED'), payload: empty
  }),
  z.strictObject({
    ...eventBase,
    type: z.literal('FACT_CORRECTED'),
    payload: z.strictObject({
      assertion: FactAssertionSchema, reason: Id
    })
  }),
  z.strictObject({
    ...eventBase,
    type: z.literal('DRAFT_EDITED'),
    payload: z.strictObject({
      draftId: Id, proposalId: Id, text: z.string().min(1)
    })
  }),
  z.strictObject({
    ...eventBase, type: z.literal('DRAFT_APPROVED'), payload: draftRef
  }),
  z.strictObject({
    ...eventBase, type: z.literal('DRAFT_DISCARDED'), payload: draftRef
  }),
  z.strictObject({
    ...eventBase,
    type: z.literal('MESSAGE_SIMULATED_AS_SENT'),
    simulated: z.literal(true),
    payload: draftRef
  }),
  z.strictObject({
    ...eventBase,
    type: z.literal('CUSTOMER_CONFIRMED_NEXT_STEP'),
    simulated: z.boolean().optional(),
    payload: z.strictObject({
      description: Id, evidenceRefs: z.array(EvidenceRefSchema).min(1)
    })
  }),
  z.strictObject({
    ...eventBase,
    type: z.literal('HUMAN_HANDOFF_CONFIRMED'),
    simulated: z.boolean().optional(),
    payload: z.strictObject({
      reason: Id
    })
  }),
  z.strictObject({
    ...eventBase,
    type: z.literal('DO_NOT_CONTACT_REQUESTED'),
    payload: z.strictObject({
      evidenceRefs: z.array(EvidenceRefSchema).min(1)
    })
  }),
]);
export type CaseEvent = z.infer<typeof CaseEventSchema>;
