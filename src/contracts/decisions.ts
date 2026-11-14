import { z } from 'zod';
import { ConfigBundleRefSchema, Id, Revision, StringList } from './primitives';
import { EvidenceRefSchema } from './messages';

export const ActionProposalSchema = z.strictObject({
  proposalId: Id,
  originCaseRevision: Revision,
  configBundleRef: ConfigBundleRefSchema,
  actionType: Id,
  reason: Id,
  evidenceRefs: z.array(EvidenceRefSchema),
  status: z.enum(['active', 'superseded'])
});
export type ActionProposal = z.infer<typeof ActionProposalSchema>;

export const DraftSchema = z.strictObject({
  draftId: Id,
  proposalId: Id,
  text: z.string().min(1),
  status: z.enum(['generated', 'edited', 'approved', 'discarded']),
  aiMode: z.enum(['openai', 'replay']).optional()
});
export type Draft = z.infer<typeof DraftSchema>;

export const BlockerSchema = z.strictObject({
  id: Id,
  type: Id,
  description: Id,
  status: z.enum(['open', 'resolved']),
  evidenceRefs: z.array(EvidenceRefSchema)
});
export type Blocker = z.infer<typeof BlockerSchema>;

export const GoalSchema = z.strictObject({
  id: Id, description: Id, status: z.enum(['active', 'completed', 'closed'])
});
export type Goal = z.infer<typeof GoalSchema>;

export const GuardEvaluationSchema = z.strictObject({
  conditionId: Id,
  result: z.enum(['satisfied', 'unsatisfied', 'unknown', 'conflict']),
  evidenceRefs: z.array(EvidenceRefSchema)
});

export const MilestoneEvaluationSchema = z.strictObject({
  milestoneId: Id,
  status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'not_applicable', 'waived']),
  guards: z.array(GuardEvaluationSchema),
  evidenceRefs: z.array(EvidenceRefSchema),
  blockers: z.array(BlockerSchema),
  workflowVersion: Id
});
export type MilestoneEvaluation = z.infer<typeof MilestoneEvaluationSchema>;

export const WorkflowProgressSchema = z.strictObject({
  workflowId: Id, workflowVersion: Id, milestones: z.array(MilestoneEvaluationSchema)
});
export type WorkflowProgress = z.infer<typeof WorkflowProgressSchema>;

export const PolicyDecisionSchema = z.strictObject({
  result: z.enum(['NEED_CLARIFICATION', 'READY_FOR_ADVISORY_CALL', 'HUMAN_REVIEW_REQUIRED', 'WAIT', 'STOP_CONTACT']),
  allowedActions: StringList,
  prohibitedActions: StringList,
  ruleIds: StringList,
  priority: z.number().int(),
  reviewRequired: z.boolean(),
  reasons: z.array(z.string()),
  evidenceRefs: z.array(EvidenceRefSchema)
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const DecisionRecordSchema = z.strictObject({
  decisionId: Id,
  inputEventIds: StringList,
  beforeRevision: Revision,
  afterRevision: Revision,
  factAssertionIds: StringList,
  evidenceRefs: z.array(EvidenceRefSchema),
  ruleIds: StringList,
  configBundleRef: ConfigBundleRefSchema,
  aiMode: z.enum(['openai', 'replay']),
  outcome: Id,
  warnings: z.array(z.string())
});
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
