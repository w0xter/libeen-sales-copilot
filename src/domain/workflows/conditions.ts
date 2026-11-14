import type { Blocker, BusinessPolicy, CaseEvent, CaseKnowledge, Condition, EvidenceRef, FactView, PolicyDecision } from '../../contracts';

type GuardResult = 'satisfied' | 'unsatisfied' | 'unknown' | 'conflict';
export interface EvaluationContext {
  knowledge: CaseKnowledge;
  events: CaseEvent[];
  blockers: Blocker[];
  policyDecision?: PolicyDecision;
  policyOptions?: BusinessPolicy['advisoryCall'];
}
export interface ConditionEvaluation { conditionId: string; result: GuardResult; evidenceRefs: EvidenceRef[] }

export function uniqueEvidence(refs: EvidenceRef[]): EvidenceRef[] {
  const seen = new Set<string>();
  return refs.filter(ref => {
    const key = JSON.stringify([ref.messageId, ref.quote, ref.start, ref.end]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function factState(fact: FactView): GuardResult {
  if (fact.status === 'conflicting' || fact.status === 'ambiguous') return 'conflict';
  if (fact.status === 'unknown') return 'unknown';
  if (fact.status === 'not_applicable') return 'unsatisfied';
  return 'satisfied';
}

function combine(op: 'ALL' | 'ANY', results: GuardResult[]): GuardResult {
  if (op === 'ALL' && results.includes('unsatisfied')) return 'unsatisfied';
  if (op === 'ANY' && results.includes('satisfied')) return 'satisfied';
  if (results.includes('conflict')) return 'conflict';
  if (results.includes('unknown')) return 'unknown';
  return op === 'ALL' ? 'satisfied' : 'unsatisfied';
}

/** Evaluate typed predicates without inferring missing values or combining subjects. */
export function evaluateCondition(condition: Condition, context: EvaluationContext): ConditionEvaluation {
  const output = (result: GuardResult, evidenceRefs: EvidenceRef[] = []): ConditionEvaluation => ({ conditionId: condition.id, result, evidenceRefs: uniqueEvidence(evidenceRefs) });
  if (condition.op === 'ALL' || condition.op === 'ANY') {
    const children = condition.conditions.map(c => evaluateCondition(c, context));
    return output(combine(condition.op, children.map(c => c.result)), children.flatMap(c => c.evidenceRefs));
  }
  if (condition.op === 'when_option_enabled') {
    if (!context.policyOptions) return output('unknown');
    if (!context.policyOptions[condition.option]) return output('satisfied');
    const child = evaluateCondition(condition.condition, context);
    return output(child.result, child.evidenceRefs);
  }
  if (condition.op === 'NOT') {
    const child = evaluateCondition(condition.condition, context);
    const inverse = child.result === 'satisfied' ? 'unsatisfied' : child.result === 'unsatisfied' ? 'satisfied' : child.result;
    return output(inverse, child.evidenceRefs);
  }
  if (condition.op === 'blocker_open') {
    const found = context.blockers.filter(b => b.status === 'open' && condition.blockerTypes.includes(b.type));
    return output(found.length ? 'satisfied' : 'unsatisfied', found.flatMap(b => b.evidenceRefs));
  }
  if (condition.op === 'event_confirmed') {
    // Only independent confirmation events can satisfy agreement predicates.
    if (!['CUSTOMER_CONFIRMED_NEXT_STEP', 'HUMAN_HANDOFF_CONFIRMED'].includes(condition.eventType)) return output('unsatisfied');
    const found = context.events.filter(e => e.type === condition.eventType && ((e.type === 'CUSTOMER_CONFIRMED_NEXT_STEP' && e.actor === 'advisor' && e.simulated && e.payload.reviewedByAdvisor) || (e.type === 'HUMAN_HANDOFF_CONFIRMED' && e.actor === 'advisor')));
    return output(found.length ? 'satisfied' : 'unknown', found.flatMap(e => 'evidenceRefs' in e.payload ? e.payload.evidenceRefs : []));
  }
  if (condition.op === 'policy_result') return output(!context.policyDecision ? 'unknown' : context.policyDecision.result === condition.result ? 'satisfied' : 'unsatisfied', context.policyDecision?.evidenceRefs);
  if (!('fieldId' in condition)) return output('unknown');
  const facts = context.knowledge.facts.filter(f => f.fieldId === condition.fieldId && (!condition.subjectScope || f.subjectRef.scope === condition.subjectScope));
  if (!facts.length) return output('unknown');
  // Distinct subjects/periods must not be aggregated or selected arbitrarily.
  if (facts.length !== 1) return output('conflict', facts.flatMap(f => f.evidenceRefs));
  const fact = facts[0];
  const state = factState(fact);
  if (state !== 'satisfied') return output(state, fact.evidenceRefs);
  if (condition.op === 'fact_present' || condition.op === 'fact_unambiguous') return output('satisfied', fact.evidenceRefs);
  if (condition.op === 'fact_income_basis') {
    if (!fact.incomeBasis || fact.incomeBasis === 'unknown') return output('unknown', fact.evidenceRefs);
    return output(fact.incomeBasis === condition.basis ? 'satisfied' : 'unsatisfied', fact.evidenceRefs);
  }
  if (fact.status !== 'known' && fact.status !== 'approximate' || !('value' in condition)) return output('unknown', fact.evidenceRefs);
  return output(JSON.stringify(fact.value) === JSON.stringify(condition.value) ? 'satisfied' : 'unsatisfied', fact.evidenceRefs);
}
