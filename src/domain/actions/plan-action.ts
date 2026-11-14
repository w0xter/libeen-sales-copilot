import type { ActionCatalog, ActionProposal, AgentProfile, ConfigBundleRef, PolicyDecision, Result } from '../../contracts';

interface PlanInput { decision: PolicyDecision; catalog: ActionCatalog; profile: AgentProfile; proposalId: string; caseRevision: number; configBundleRef: ConfigBundleRef }

/** Selects only catalogued, permitted actions; proposals are not execution. */
export function planAction(input: PlanInput): Result<ActionProposal> {
  const { decision, catalog, profile } = input;
  const allowed = decision.allowedActions.filter(id => !decision.prohibitedActions.includes(id) && catalog.actions.some(a => a.id === id) && profile.capabilities.includes(id));
  // In the absence of an authorized source for an objection, escalation is the conservative choice.
  const action = decision.result === 'HUMAN_REVIEW_REQUIRED' && allowed.includes('HANDOFF') ? 'HANDOFF' : allowed[0];
  if (!action) return { ok: false, error: { code: 'POLICY_DENIED', message: 'No hay una acción permitida', retryable: false } };
  return { ok: true, value: { proposalId: input.proposalId, originCaseRevision: input.caseRevision, configBundleRef: input.configBundleRef, actionType: action, reason: decision.reasons.join('; ') || 'Acción permitida', evidenceRefs: decision.evidenceRefs, status: 'active' } };
}
