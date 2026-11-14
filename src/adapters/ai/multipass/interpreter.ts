import { randomUUID } from 'node:crypto';
import type { Interpreter, SubjectRef } from '../../../contracts';
import { validateInterpretation, failure } from '../validation';
import { runPipeline } from './pipeline';
import type { FakeTransport } from './scheduler';
import { PROMPT_VERSION } from './prompts';
import { validateAssertions } from '../../../domain/facts';

// Versioned PoC profile: sensitive financial amounts and purchase structure
// require corroboration. Sensitivity is not used as a proxy for materiality.
export const RECONCILIATION_PROFILE = { version: 'poc-material-1', fields: ['declared_monthly_income', 'available_savings', 'monthly_debt', 'buyer_count'] } as const;
export class MultipassInterpreter implements Interpreter {
  constructor(private transport: FakeTransport) {}
  async interpret(input: Parameters<Interpreter['interpret']>[0]) {
    const historical = input.caseSnapshot.assertions;
    // Case identity is intrinsic to the case. Other identities only come from
    // existing, non-rejected case assertions; no participants are invented.
    const subjects: SubjectRef[] = [{ scope: 'case', id: input.caseSnapshot.caseId }];
    for (const assertion of historical) if (assertion.reviewStatus !== 'rejected' && validateAssertions([assertion], input.messages, input.factSchema).ok && !subjects.some(s => s.scope === assertion.subjectRef.scope && s.id === assertion.subjectRef.id)) subjects.push(assertion.subjectRef);
    const snapshot = { caseId: input.caseSnapshot.caseId, messages: input.messages, factSchema: input.factSchema, agentProfile: input.agentProfile, knownSubjects: subjects, historicalAssertions: historical, historicalBlockers: input.caseSnapshot.blockers, materialFieldIds: RECONCILIATION_PROFILE.fields.filter(id => input.factSchema.fields.some(f => f.id === id)) };
    try {
      const { result, trace } = await runPipeline({ runId: randomUUID(), snapshot, transport: this.transport, instructionVersion: PROMPT_VERSION });
      if (result.status === 'human_review_required') return failure('MODEL_OUTPUT_INVALID', 'La interpretación requiere revisión humana');
      if (result.status === 'failed') {
        const provider = trace.operations.some(o => ['error', 'timeout', 'cancelled'].includes(o.status));
        return failure(provider ? 'MODEL_UNAVAILABLE' : 'MODEL_OUTPUT_INVALID', provider ? 'No se pudo completar la interpretación' : 'La interpretación no superó la validación', provider);
      }
      return validateInterpretation(result.interpretation, input);
    } catch { return failure('MODEL_UNAVAILABLE', 'No se pudo completar la interpretación', true); }
  }
}
