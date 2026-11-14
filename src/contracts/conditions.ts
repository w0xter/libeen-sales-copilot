import { z } from 'zod';
import { Id } from './primitives';
import { SubjectRefSchema, type SubjectRef } from './messages';
import { FactValueSchema, type FactValue } from './facts';
import type { CaseEvent } from './events';
import { PolicyDecisionSchema, type PolicyDecision } from './decisions';
export type Condition = {
  id: string;
  op: 'fact_present' | 'fact_unambiguous';
  fieldId: string;
  subjectScope?: SubjectRef['scope'];
} | {
  id: string;
  op: 'fact_matches';
  fieldId: string;
  subjectScope?: SubjectRef['scope'];
  value: FactValue;
} | {
  id: string;
  op: 'fact_income_basis';
  fieldId: string;
  subjectScope?: SubjectRef['scope'];
  basis: 'net' | 'gross' | 'unknown';
} | {
  id: string;
  op: 'event_confirmed';
  eventType: CaseEvent['type'];
} | {
  id: string;
  op: 'policy_result';
  result: PolicyDecision['result'];
} | {
  id: string;
  op: 'ALL' | 'ANY';
  conditions: Condition[];
} | {
  id: string;
  op: 'NOT';
  condition: Condition;
} | {
  id: string;
  op: 'blocker_open';
  blockerTypes: string[];
};

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() => z.discriminatedUnion('op', [
  z.strictObject({
    id: Id,
    op: z.literal('fact_present'),
    fieldId: Id,
    subjectScope: SubjectRefSchema.shape.scope.optional()
  }),
  z.strictObject({
    id: Id,
    op: z.literal('fact_unambiguous'),
    fieldId: Id,
    subjectScope: SubjectRefSchema.shape.scope.optional()
  }),
  z.strictObject({
    id: Id,
    op: z.literal('fact_matches'),
    fieldId: Id,
    subjectScope: SubjectRefSchema.shape.scope.optional(),
    value: FactValueSchema
  }),
  // Evaluate the reconciled fact's basis; propagate missing, ambiguous and conflicting states.
  z.strictObject({
    id: Id,
    op: z.literal('fact_income_basis'),
    fieldId: Id,
    subjectScope: SubjectRefSchema.shape.scope.optional(),
    basis: z.enum(['net', 'gross', 'unknown'])
  }),
  z.strictObject({
    id: Id,
    op: z.literal('event_confirmed'),
    eventType: z.enum(['MESSAGE_RECEIVED', 'CASE_ANALYSIS_REQUESTED', 'CASE_REEVALUATION_REQUESTED', 'FACT_CORRECTED', 'DRAFT_EDITED', 'DRAFT_APPROVED', 'DRAFT_DISCARDED', 'MESSAGE_SIMULATED_AS_SENT', 'CUSTOMER_CONFIRMED_NEXT_STEP', 'HUMAN_HANDOFF_CONFIRMED', 'DO_NOT_CONTACT_REQUESTED'])
  }),
  z.strictObject({
    id: Id, op: z.literal('policy_result'), result: PolicyDecisionSchema.shape.result
  }),
  // NOT swaps satisfied/unsatisfied and preserves unknown/conflict. blocker_open matches currently open types.
  z.strictObject({
    id: Id, op: z.literal('NOT'), condition: ConditionSchema
  }),
  z.strictObject({
    id: Id, op: z.literal('blocker_open'), blockerTypes: z.array(Id).min(1)
  }),
  z.strictObject({
    id: Id, op: z.literal('ALL'), conditions: z.array(ConditionSchema).min(1)
  }),
  z.strictObject({
    id: Id, op: z.literal('ANY'), conditions: z.array(ConditionSchema).min(1)
  }),
]));
