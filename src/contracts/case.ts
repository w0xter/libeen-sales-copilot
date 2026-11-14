import { z } from 'zod';
import { ConfigBundleRefSchema, Id, Revision } from './primitives';
import { MessageSchema } from './messages';
import { CaseKnowledgeSchema, FactAssertionSchema } from './facts';
import { CaseEventSchema } from './events';
import { ApplicationErrorSchema } from './errors';
import { ActionProposalSchema, BlockerSchema, DecisionRecordSchema, DraftSchema, GoalSchema, WorkflowProgressSchema } from './decisions';

export const CaseSnapshotSchema = z.strictObject({
  caseId: Id,
  revision: Revision,
  messages: z.array(MessageSchema),
  assertions: z.array(FactAssertionSchema),
  knowledge: CaseKnowledgeSchema,
  goal: GoalSchema,
  workflowProgress: WorkflowProgressSchema,
  blockers: z.array(BlockerSchema),
  proposals: z.array(ActionProposalSchema),
  drafts: z.array(DraftSchema),
  events: z.array(CaseEventSchema),
  decisions: z.array(DecisionRecordSchema),
  configBundleRef: ConfigBundleRefSchema,
  status: z.enum(['NEEDS_ADVISOR', 'READY_TO_REPLY', 'WAITING_CUSTOMER', 'ON_HOLD_REVIEW', 'NEXT_STEP_AGREED', 'CLOSED', 'DO_NOT_CONTACT']),
  analysisStatus: z.enum(['pending', 'complete', 'analysis_failed']).optional()
});
export type CaseSnapshot = z.infer<typeof CaseSnapshotSchema>;

export const CaseViewSchema = z.strictObject({
  snapshot: CaseSnapshotSchema,
  activeProposal: ActionProposalSchema.nullable(),
  draft: DraftSchema.nullable(),
  errors: z.array(ApplicationErrorSchema),
  warnings: z.array(z.string()),
  aiMode: z.enum(['openai', 'replay'])
});
export type CaseView = z.infer<typeof CaseViewSchema>;
