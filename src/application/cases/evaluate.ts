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
  // The current action can be WAIT after agreement while the prior orientation
  // remains satisfied. Re-evaluate that orientation against current facts and
  // protections; never infer readiness solely from the confirmation event.
  const priorReady = config.workflow.milestones.some(m => m.terminalRoute && m.prerequisites.length > 0 && m.prerequisites.every(id => snapshot.workflowProgress.milestones.some(previous => previous.milestoneId === id && previous.status === 'completed')));
  const orientation = decision.result === 'WAIT' && decision.ruleIds.includes('R08') && priorReady
    ? evaluatePolicy({ ...context, events: context.events.filter(e => !['CUSTOMER_CONFIRMED_NEXT_STEP', 'HUMAN_HANDOFF_CONFIRMED', 'DRAFT_APPROVED', 'DRAFT_EDITED', 'DRAFT_DISCARDED', 'MESSAGE_SIMULATED_AS_SENT'].includes(e.type)), policy: config.businessPolicy, actionCatalog: config.actionCatalog })
    : decision;
  const workflow = evaluateWorkflow({ ...context, policyDecision: orientation, definition: config.workflow });
  const ref = bundleRef(config);
  const revision = snapshot.revision + 1;
  const proposal = planAction({ decision, catalog: config.actionCatalog, profile: config.agentProfile, proposalId: `proposal-${eventId}`, caseRevision: revision, configBundleRef: ref });
  if (!proposal.ok) return proposal;
  const record: DecisionRecord = { decisionId: `decision-${eventId}`, inputEventIds: [eventId], beforeRevision: snapshot.revision, afterRevision: revision, factAssertionIds: snapshot.assertions.map(a => a.assertionId), evidenceRefs: decision.evidenceRefs, ruleIds: decision.ruleIds, configBundleRef: ref, aiMode: mode, outcome: decision.result, warnings: [] };
  const terminalCompleted = config.workflow.milestones.some(m => m.terminalRoute && workflow.milestones.some(result => result.milestoneId === m.id && result.status === 'completed'));
  const status: CaseSnapshot['status'] = decision.result === 'STOP_CONTACT' ? 'DO_NOT_CONTACT' : decision.result === 'HUMAN_REVIEW_REQUIRED' ? 'ON_HOLD_REVIEW' : terminalCompleted ? 'NEXT_STEP_AGREED' : decision.result === 'WAIT' ? 'WAITING_CUSTOMER' : 'NEEDS_ADVISOR';
  return { ok: true, value: { snapshot: { ...snapshot, revision, assertions: snapshot.assertions, knowledge: facts.value, workflowProgress: workflow, proposals: [...snapshot.proposals.map(p => ({ ...p, status: 'superseded' as const })), proposal.value], decisions: [...snapshot.decisions, record], configBundleRef: ref, status }, decision } };
}
