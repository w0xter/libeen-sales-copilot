import type { CaseSnapshot, ConfigBundle, DecisionRecord, Result } from '../../contracts';
import { reconcileFacts } from '../../domain/facts';
import { evaluatePolicy } from '../../domain/policies/evaluate-policy';
import { evaluateWorkflow } from '../../domain/workflows/evaluate-workflow';
import { planAction } from '../../domain/actions/plan-action';
import { bundleRef } from './helpers';

export function evaluate(snapshot: CaseSnapshot, config: ConfigBundle, eventId: string, mode: 'replay' | 'openai'): Result<{ snapshot: CaseSnapshot; decision: ReturnType<typeof evaluatePolicy> }> {
  const facts = reconcileFacts({ assertions: snapshot.assertions, messages: snapshot.messages, factSchema: config.factSchema });
  if (!facts.ok) return facts;
  const context = { knowledge: facts.value, events: snapshot.events, blockers: snapshot.blockers, policyOptions: config.businessPolicy.advisoryCall };
  const decision = evaluatePolicy({ ...context, policy: config.businessPolicy, actionCatalog: config.actionCatalog });
  const workflow = evaluateWorkflow({ ...context, policyDecision: decision, definition: config.workflow });
  const ref = bundleRef(config);
  const revision = snapshot.revision + 1;
  const proposal = planAction({ decision, catalog: config.actionCatalog, profile: config.agentProfile, proposalId: `proposal-${eventId}`, caseRevision: revision, configBundleRef: ref });
  if (!proposal.ok) return proposal;
  const record: DecisionRecord = { decisionId: `decision-${eventId}`, inputEventIds: [eventId], beforeRevision: snapshot.revision, afterRevision: revision, factAssertionIds: snapshot.assertions.map(a => a.assertionId), evidenceRefs: decision.evidenceRefs, ruleIds: decision.ruleIds, configBundleRef: ref, aiMode: mode, outcome: decision.result, warnings: [] };
  const terminalCompleted = config.workflow.milestones.some(m => m.terminalRoute && workflow.milestones.some(result => result.milestoneId === m.id && result.status === 'completed'));
  const status: CaseSnapshot['status'] = decision.result === 'STOP_CONTACT' ? 'DO_NOT_CONTACT' : terminalCompleted ? 'NEXT_STEP_AGREED' : decision.result === 'HUMAN_REVIEW_REQUIRED' ? 'ON_HOLD_REVIEW' : decision.result === 'WAIT' ? 'WAITING_CUSTOMER' : 'NEEDS_ADVISOR';
  return { ok: true, value: { snapshot: { ...snapshot, revision, assertions: snapshot.assertions, knowledge: facts.value, workflowProgress: workflow, proposals: [...snapshot.proposals.map(p => ({ ...p, status: 'superseded' as const })), proposal.value], decisions: [...snapshot.decisions, record], configBundleRef: ref, status, analysisStatus: 'complete' }, decision } };
}
