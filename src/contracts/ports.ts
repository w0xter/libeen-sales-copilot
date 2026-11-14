import { z } from 'zod';
import { FactAssertionSchema } from './facts';
import { BlockerSchema } from './decisions';
import { CaseViewSchema } from './case';
import { ResultSchema, type Result } from './errors';
import type { CaseSnapshot, CaseView } from './case';
import type { Message } from './messages';
import type { CaseEvent } from './events';
import type { ActionProposal, Draft, PolicyDecision } from './decisions';
import type { AgentProfile, FactSchema } from './configuration';

/** Model output is candidate data, never an authoritative milestone or effect. */
export const InterpretationSchema = z.strictObject({
  assertions: z.array(FactAssertionSchema),
  blockers: z.array(BlockerSchema),
  warnings: z.array(z.string())
});
export type Interpretation = z.infer<typeof InterpretationSchema>;

export interface Interpreter {
  interpret(input: {
    caseSnapshot: CaseSnapshot;
    messages: Message[];
    factSchema: FactSchema;
    agentProfile: AgentProfile;
  }): Promise<Result<Interpretation>>;
}

export interface DraftGenerator {
  generate(input: {
    caseSnapshot: CaseSnapshot;
    proposal: ActionProposal;
    agentProfile: AgentProfile;
    policyDecision: PolicyDecision;
  }): Promise<Result<Draft>>;
}

export interface EventReceipt {
  eventId: string;
  caseId: string;
  revision: number;
}

export interface CaseRepository {
  get(caseId: string): Promise<Result<CaseSnapshot>>;
  saveIfRevision(snapshot: CaseSnapshot, expectedRevision: number): Promise<Result<CaseSnapshot>>;
  appendEvent(event: CaseEvent): Promise<Result<EventReceipt>>;
  reset(caseId: string): Promise<Result<CaseSnapshot>>;
}
export type ApplicationResult = Result<CaseView>;

export const ApplicationResultSchema = ResultSchema(CaseViewSchema);
