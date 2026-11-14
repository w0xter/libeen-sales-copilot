import { describe, expect, it } from 'vitest';
import { configBundleRef, demoBundle } from '../../../src/config';
import { planAction } from '../../../src/domain/actions/plan-action';
import type { PolicyDecision } from '../../../src/contracts';
const decision: PolicyDecision = { result: 'HUMAN_REVIEW_REQUIRED', allowedActions: ['ANSWER_QUESTION', 'HANDOFF'], prohibitedActions: ['PROPOSE_CALL'], ruleIds: ['R07'], priority: 70, reviewRequired: true, reasons: ['Sin fuentes verificadas'], evidenceRefs: [{ messageId: 'm1' }] };
describe('action planner', () => {
  it('proposes a permitted human handoff and retains version and evidence', () => {
    const result = planAction({ decision, catalog: demoBundle.actionCatalog, profile: demoBundle.agentProfile, proposalId: 'p', caseRevision: 4, configBundleRef });
    expect(result).toMatchObject({ ok: true, value: { actionType: 'HANDOFF', originCaseRevision: 4, configBundleRef, evidenceRefs: [{ messageId: 'm1' }], status: 'active' } });
  });
  it('rejects a decision with no admissible action', () => {
    expect(planAction({ decision: { ...decision, allowedActions: ['PROPOSE_CALL'] }, catalog: demoBundle.actionCatalog, profile: demoBundle.agentProfile, proposalId: 'p', caseRevision: 0, configBundleRef })).toMatchObject({ ok: false, error: { code: 'POLICY_DENIED' } });
  });
});
