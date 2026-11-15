import { randomUUID } from 'node:crypto';
import type { Interpreter, SubjectRef } from '../../../contracts';
import { validateInterpretation, failure } from '../validation';
import { runPipeline } from './pipeline';
import type { FakeTransport } from './scheduler';
import { PROMPT_VERSION } from './prompts';
import { validateAssertions } from '../../../domain/facts';
import type { GroupingCounts, OperationTrace, ReviewCounts } from './trace';

export type MultipassDiagnostic = {
  finalStatus: 'consolidated' | 'human_review_required' | 'failed';
  failureCode: string | null;
  consumed: number;
  operations: Pick<OperationTrace, 'role' | 'status' | 'durationMs' | 'cause'>[];
  reviewCounts?: ReviewCounts;
  groupingCounts?: GroupingCounts;
  reviewReasonCategories?: string[];
  reviewDetails?: unknown;
};

// Versioned PoC profile: sensitive financial amounts and purchase structure
// require corroboration. Sensitivity is not used as a proxy for materiality.
export const RECONCILIATION_PROFILE = { version: 'poc-material-1', fields: ['declared_monthly_income', 'available_savings', 'monthly_debt', 'buyer_count'] } as const;
export class MultipassInterpreter implements Interpreter {
  constructor(private transport: FakeTransport, private onDiagnostic?: (diagnostic: MultipassDiagnostic) => void, private captureReviewDetails = false) {}
  async interpret(input: Parameters<Interpreter['interpret']>[0]) {
    const historical = input.caseSnapshot.assertions;
    // Case identity is intrinsic to the case. Other identities only come from
    // existing, non-rejected case assertions; no participants are invented.
    const subjects: SubjectRef[] = [{ scope: 'case', id: input.caseSnapshot.caseId }];
    for (const assertion of historical) if (assertion.reviewStatus !== 'rejected' && validateAssertions([assertion], input.messages, input.factSchema).ok && !subjects.some(s => s.scope === assertion.subjectRef.scope && s.id === assertion.subjectRef.id)) subjects.push(assertion.subjectRef);
    const snapshot = { caseId: input.caseSnapshot.caseId, messages: input.messages, factSchema: input.factSchema, agentProfile: input.agentProfile, knownSubjects: subjects, historicalAssertions: historical, historicalBlockers: input.caseSnapshot.blockers, materialFieldIds: RECONCILIATION_PROFILE.fields.filter(id => input.factSchema.fields.some(f => f.id === id)) };
    try {
      const { result, trace, attributionDiagnostics } = await runPipeline({ runId: randomUUID(), snapshot, transport: this.transport, instructionVersion: PROMPT_VERSION, locateSpans: true });
      try {
        const reviewReasonCategories = result.status === 'human_review_required' ? [...new Set(result.reasons.map(reason => reason.startsWith('Grouping ') ? 'grouping' : reason.startsWith('Subject attribution') ? 'subject_attribution' : reason.startsWith('Conflicting contextual') ? 'conflicting_reviews' : reason.startsWith('Protected ') || reason.startsWith('Adjudication conflicts') ? 'protected_safety' : reason.startsWith('Ambiguous ') ? 'ambiguous_identity' : reason.startsWith('Unresolved:') ? 'unresolved_material' : 'other'))] : undefined;
        this.onDiagnostic?.({ finalStatus: result.status, failureCode: result.status === 'failed' ? result.code : null, consumed: trace.consumed, operations: trace.operations.map(({ role, status, durationMs, cause }) => ({ role, status, durationMs, ...(cause && { cause }) })), ...(trace.reviewCounts && { reviewCounts: trace.reviewCounts }), ...(trace.groupingCounts && { groupingCounts: trace.groupingCounts }), ...(reviewReasonCategories && { reviewReasonCategories }), ...(this.captureReviewDetails && result.status === 'human_review_required' && { reviewDetails: { reasons: result.reasons, disputes: result.disputes, safetyFindings: result.safetyFindings, attributionDiagnostics } }) });
      } catch { /* Diagnostics must not alter interpretation. */ }
      if (result.status === 'human_review_required') return failure('MODEL_OUTPUT_INVALID', 'La interpretación requiere revisión humana');
      if (result.status === 'failed') {
        const provider = trace.operations.some(o => ['error', 'timeout', 'cancelled'].includes(o.status));
        return failure(provider ? 'MODEL_UNAVAILABLE' : 'MODEL_OUTPUT_INVALID', provider ? 'No se pudo completar la interpretación' : 'La interpretación no superó la validación', provider);
      }
      return validateInterpretation(result.interpretation, input);
    } catch { return failure('MODEL_UNAVAILABLE', 'No se pudo completar la interpretación', true); }
  }
}
