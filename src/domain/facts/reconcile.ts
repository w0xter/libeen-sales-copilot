import type { CaseKnowledge, EvidenceRef, FactAssertion, FactSchema, FactValue, FactView, Message, Result } from '../../contracts';
import { validateAssertions } from './validate';

export interface ReconcileFactsInput { assertions: FactAssertion[]; messages: Message[]; factSchema: FactSchema }

function uniqueEvidence(assertions: FactAssertion[]): EvidenceRef[] {
  const seen = new Set<string>();
  return assertions.flatMap(a => a.evidenceRefs).filter(ref => {
    const key = JSON.stringify([ref.messageId, ref.quote, ref.start, ref.end]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function reconcileGroup(group: FactAssertion[]): FactView {
  const sorted = [...group].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.assertionId.localeCompare(b.assertionId));
  const correction = sorted.findLast(a => a.source === 'advisor_correction' && a.reviewStatus === 'confirmed_by_advisor');
  const active = sorted.filter(a => a.reviewStatus !== 'rejected' && (!correction || Date.parse(a.observedAt) >= Date.parse(correction.observedAt)));
  const first = active[0] ?? sorted[0];
  const shared = { fieldId: first.fieldId, subjectRef: first.subjectRef, unit: first.unit, period: first.period, evidenceRefs: uniqueEvidence(sorted), assertionIds: sorted.map(a => a.assertionId) };
  if (!active.length) return { ...shared, status: 'unknown' };
  const values = active.flatMap(a => a.value === undefined ? [] : [a.value]);
  const distinct = [...new Map(values.map(value => [JSON.stringify(value), value] as [string, FactValue])).values()];
  const bases = new Set(active.map(a => a.incomeBasis).filter(b => b !== undefined && b !== 'unknown'));
  if (distinct.length > 1) return { ...shared, status: 'conflicting', values: distinct };
  if (active.some(a => a.precision === 'ambiguous' || a.precision === 'inferred') || bases.size > 1 || !distinct.length) return { ...shared, status: 'ambiguous', ...(distinct.length ? { value: distinct[0] } : {}) };
  const incomeBasis = bases.size === 1 ? [...bases][0] : active.some(a => a.incomeBasis === 'unknown') ? 'unknown' : undefined;
  return { ...shared, status: active.some(a => a.precision === 'approximate') ? 'approximate' : 'known', value: distinct[0], incomeBasis };
}

/** Pure reconciliation preserves separate subjects, periods, units and source history. */
export function reconcileFacts(input: ReconcileFactsInput): Result<CaseKnowledge> {
  const validation = validateAssertions(input.assertions, input.messages, input.factSchema);
  if (!validation.ok) return validation;
  const groups = new Map<string, FactAssertion[]>();
  for (const assertion of input.assertions) {
    const key = JSON.stringify([assertion.fieldId, assertion.subjectRef.scope, assertion.subjectRef.id, assertion.period ?? null, assertion.unit ?? null]);
    const group = groups.get(key) ?? [];
    group.push(assertion);
    groups.set(key, group);
  }
  return { ok: true, value: { facts: [...groups.values()].map(reconcileGroup) } };
}
