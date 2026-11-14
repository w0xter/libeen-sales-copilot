import type { ActionCatalog, BusinessPolicy, CaseEvent, EvidenceRef, PolicyDecision, PolicyRule } from '../../contracts';
import { evaluateCondition, uniqueEvidence, type EvaluationContext } from '../workflows/conditions';

export type PolicyInput = EvaluationContext & { policy: BusinessPolicy; actionCatalog: ActionCatalog };

function approvalPending(events: CaseEvent[]): boolean {
  const approval = events.findLastIndex(e => e.type === 'DRAFT_APPROVED');
  if (approval < 0) return false;
  const approved = events[approval];
  if (approved.type !== 'DRAFT_APPROVED') return false;
  return !events.slice(approval + 1).some(e => (e.type === 'MESSAGE_SIMULATED_AS_SENT' && e.payload.draftId === approved.payload.draftId && e.payload.proposalId === approved.payload.proposalId) || e.type === 'CUSTOMER_CONFIRMED_NEXT_STEP' || e.type === 'HUMAN_HANDOFF_CONFIRMED');
}

function agreementIsCurrent(events: CaseEvent[]): boolean {
  const index = events.findLastIndex(event =>
    (event.type === 'CUSTOMER_CONFIRMED_NEXT_STEP' && event.actor === 'advisor' && event.simulated && event.payload.reviewedByAdvisor) ||
    (event.type === 'HUMAN_HANDOFF_CONFIRMED' && event.actor === 'advisor')
  );
  if (index < 0) return false;
  return !events.slice(index + 1).some(event => event.type === 'MESSAGE_RECEIVED' || event.type === 'FACT_CORRECTED');
}

function matches(rule: PolicyRule, input: PolicyInput): { matches: boolean; evidenceRefs: EvidenceRef[] } {
  if (rule.requiredOption && !input.policy.advisoryCall[rule.requiredOption]) return { matches: false, evidenceRefs: [] };
  if (rule.id === 'R08' && !agreementIsCurrent(input.events)) return { matches: false, evidenceRefs: [] };
  if (rule.id === 'R09' && !approvalPending(input.events)) return { matches: false, evidenceRefs: [] };
  const blockers = input.blockers.filter(b => b.status === 'open' && rule.blockerTypesAny?.includes(b.type));
  if (rule.blockerTypesAny && !blockers.length) return { matches: false, evidenceRefs: [] };
  const events = input.events.filter(e => rule.eventTypesAny?.includes(e.type));
  if (rule.eventTypesAny && !events.length) return { matches: false, evidenceRefs: [] };
  const guard = rule.condition ? evaluateCondition(rule.condition, { ...input, policyOptions: input.policy.advisoryCall }) : undefined;
  if (guard && !(rule.conditionResults ?? ['satisfied']).includes(guard.result)) return { matches: false, evidenceRefs: [] };
  return { matches: true, evidenceRefs: uniqueEvidence([...blockers.flatMap(b => b.evidenceRefs), ...events.flatMap(e => 'evidenceRefs' in e.payload ? e.payload.evidenceRefs : []), ...(guard?.evidenceRefs ?? [])]) };
}

/** Protected guards cannot be relaxed by editable commercial rules or profile preferences. */
export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const actions = input.actionCatalog.actions.map(a => a.id);
  const protectedDecision = (result: PolicyDecision['result'], action: string, ruleId: string, reason: string, evidenceRefs: EvidenceRef[]): PolicyDecision => ({ result, allowedActions: actions.includes(action) ? [action] : [], prohibitedActions: actions.filter(a => a !== action), ruleIds: [ruleId], priority: Number.MAX_SAFE_INTEGER, reviewRequired: true, reasons: [reason], evidenceRefs: uniqueEvidence(evidenceRefs) });
  const optOut = input.events.filter(e => e.type === 'DO_NOT_CONTACT_REQUESTED');
  const optOutBlockers = input.blockers.filter(b => b.status === 'open' && b.type === 'OPT_OUT');
  if (optOut.length || optOutBlockers.length) return protectedDecision('STOP_CONTACT', 'STOP_CONTACT', 'R01', 'El cliente solicita no ser contactado', [...optOut.flatMap(e => e.payload.evidenceRefs), ...optOutBlockers.flatMap(b => b.evidenceRefs)]);
  const critical = input.blockers.filter(b => b.status === 'open' && ['BINDING_CLAIM', 'URGENT'].includes(b.type));
  if (critical.length) return protectedDecision('HUMAN_REVIEW_REQUIRED', 'HANDOFF', 'R02', 'La solicitud requiere revisión humana', critical.flatMap(b => b.evidenceRefs));
  const objections = input.blockers.filter(b => b.status === 'open' && ['TRUST', 'PRODUCT', 'COST', 'PRIVACY', 'TIME', 'FIT'].includes(b.type));
  if (objections.length) return protectedDecision('HUMAN_REVIEW_REQUIRED', 'HANDOFF', 'R07', 'La cuestión requiere una fuente autorizada o revisión humana', objections.flatMap(b => b.evidenceRefs));
  if (approvalPending(input.events)) return protectedDecision('WAIT', 'WAIT', 'R09', 'Un borrador aprobado aún no es un envío ni un acuerdo', []);
  const matched = input.policy.rules.map(rule => ({ rule, ...matches(rule, input) })).filter(item => item.matches);
  matched.sort((a, b) => b.rule.priority - a.rule.priority || a.rule.id.localeCompare(b.rule.id));
  const first = matched[0];
  if (!first) return { result: 'WAIT', allowedActions: actions.includes('WAIT') ? ['WAIT'] : [], prohibitedActions: actions.filter(a => a !== 'WAIT'), ruleIds: [], priority: 0, reviewRequired: true, reasons: ['No hay una regla aplicable'], evidenceRefs: [] };
  return { result: first.rule.result, allowedActions: first.rule.allowedActions.filter(a => actions.includes(a) && !first.rule.prohibitedActions.includes(a)), prohibitedActions: first.rule.prohibitedActions, ruleIds: matched.map(item => item.rule.id), priority: first.rule.priority, reviewRequired: first.rule.reviewRequired, reasons: matched.map(item => item.rule.reason), evidenceRefs: uniqueEvidence(matched.flatMap(item => item.evidenceRefs)) };
}
