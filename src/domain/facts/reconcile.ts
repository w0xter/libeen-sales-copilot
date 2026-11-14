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

function customerCorrection(group: FactAssertion[], messages: Message[], all: FactAssertion[], schema: FactSchema): FactAssertion | undefined {
  // Require a clear reference to the prior figure and exactly one attributed
  // monetary field in the correction message. Unclear cases stay conflicting.
  for (const candidate of [...group].reverse()) {
    if (schema.fields.find(f => f.id === candidate.fieldId)?.type !== 'money' || candidate.source !== 'customer_message' || candidate.reviewStatus === 'rejected' || candidate.precision !== 'explicit' || typeof candidate.value !== 'number' || candidate.evidenceRefs.length !== 1) continue;
    const message = messages.find(m => m.messageId === candidate.evidenceRefs[0].messageId);
    if (!message || message.role !== 'customer' || message.content.type !== 'text' || Date.parse(candidate.observedAt) !== Date.parse(message.occurredAt)) continue;
    const text = message.content.text;
    if (!/(?:me equivoqu[ée]|corrijo|rectifico|correcci[oó]n)/i.test(text) || !/(?:anterior|antes|que (?:os |te )?(?:dije|indicamos|dijimos))/i.test(text)) continue;
    const nums = text.match(/\d[\d.,]*/g) ?? [];
    if (nums.length !== 1 || nums[0].replace(/\D/g, '') !== String(candidate.value).replace(/\D/g, '')) continue;
    const attributed = all.filter(a => a.source === 'customer_message' && typeof a.value === 'number' && a.evidenceRefs.some(r => r.messageId === message.messageId));
    if (attributed.some(a => a.fieldId !== candidate.fieldId || a.subjectRef.scope !== candidate.subjectRef.scope || a.subjectRef.id !== candidate.subjectRef.id || a.period !== candidate.period || a.unit !== candidate.unit)) continue;
    const prior = group.filter(a => a.reviewStatus !== 'rejected' && Date.parse(a.observedAt) < Date.parse(candidate.observedAt));
    const priorTargets = new Set(all.filter(a => a.source === 'customer_message' && a.reviewStatus !== 'rejected' && Date.parse(a.observedAt) < Date.parse(candidate.observedAt) && schema.fields.find(f => f.id === a.fieldId)?.type === 'money' && a.subjectRef.scope === candidate.subjectRef.scope && a.subjectRef.id === candidate.subjectRef.id && a.period === candidate.period && a.unit === candidate.unit).map(a => a.fieldId));
    if (priorTargets.size !== 1 || !priorTargets.has(candidate.fieldId)) continue;
    const priorValues = new Set(prior.map(a => JSON.stringify(a.value)));
    if (priorValues.size !== 1 || prior.some(a => a.incomeBasis !== candidate.incomeBasis)) continue;
    return candidate;
  }
  return undefined;
}

function reconcileGroup(group: FactAssertion[], messages: Message[], all: FactAssertion[], schema: FactSchema): FactView {
  const sorted = [...group].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.assertionId.localeCompare(b.assertionId));
  const correction = sorted.findLast(a => a.source === 'advisor_correction' && a.reviewStatus === 'confirmed_by_advisor');
  const customer = customerCorrection(sorted, messages, all, schema);
  const cutoff = correction && customer ? Math.max(Date.parse(correction.observedAt), Date.parse(customer.observedAt)) : correction ? Date.parse(correction.observedAt) : customer ? Date.parse(customer.observedAt) : undefined;
  const active = sorted.filter(a => a.reviewStatus !== 'rejected' && (cutoff === undefined || Date.parse(a.observedAt) >= cutoff));
  const first = active[0] ?? sorted[0];
  const shared = { fieldId: first.fieldId, subjectRef: first.subjectRef, unit: first.unit, period: first.period, evidenceRefs: uniqueEvidence(sorted), assertionIds: sorted.map(a => a.assertionId) };
  if (!active.length) return { ...shared, status: 'unknown' };
  const values = active.flatMap(a => a.value === undefined ? [] : [a.value]);
  const distinct = [...new Map(values.map(value => [JSON.stringify(value), value] as [string, FactValue])).values()];
  const bases = new Set(active.map(a => a.incomeBasis).filter(b => b !== undefined && b !== 'unknown'));
  if (distinct.length > 1) {
    // Different interpretations of the very same customer text are model
    // uncertainty, not evidence that two different statements were made.
    const oneSource = active.every(a => a.source === 'customer_message' && a.evidenceRefs.length === 1 && a.evidenceRefs[0].messageId === active[0].evidenceRefs[0]?.messageId);
    if (oneSource && ['initial_intent', 'moving_horizon'].includes(first.fieldId) && distinct.every(v => typeof v === 'string')) return { ...shared, status: 'ambiguous' };
    return { ...shared, status: 'conflicting', values: distinct };
  }
  if (active.some(a => a.precision === 'ambiguous' || a.precision === 'inferred') || bases.size > 1 || !distinct.length) {
    const latest = active.at(-1);
    const message = latest?.evidenceRefs.length === 1 ? messages.find(m => m.messageId === latest.evidenceRefs[0].messageId) : undefined;
    const text = message?.role === 'customer' && message.content.type === 'text' ? message.content.text : '';
    const correction = /(?:equivoqu[ée]|corrijo|rectifico|correcci[oó]n)|(?:perd[oó]n|perdona|disculpa).{0,80}\b(?:ingresos|sueldo|salario)\b.{0,60}\b(?:dije|dijimos|indicamos)\b/i.test(text);
    const basisInText = latest?.incomeBasis === 'gross' ? /\bbrut[oa]s?\b/i.test(text) : latest?.incomeBasis === 'net' ? /\bnet[oa]s?\b/i.test(text) : false;
    const earlier = latest && active.some(a => a !== latest && a.value !== undefined && a.incomeBasis && a.incomeBasis !== latest.incomeBasis && Date.parse(a.observedAt) < Date.parse(latest.observedAt));
    const priorTargets = latest ? new Set(all.filter(a => a.source === 'customer_message' && a.reviewStatus !== 'rejected' && Date.parse(a.observedAt) < Date.parse(latest.observedAt) && schema.fields.find(f => f.id === a.fieldId)?.type === 'money' && a.subjectRef.scope === latest.subjectRef.scope && a.subjectRef.id === latest.subjectRef.id && a.period === latest.period && a.unit === latest.unit).map(a => a.fieldId)) : new Set<string>();
    const correctedBasis = first.fieldId === 'declared_monthly_income' && latest?.source === 'customer_message' && latest.value === undefined && latest.precision === 'ambiguous' && !/\d/.test(text) && correction && basisInText && earlier && priorTargets.size === 1 && priorTargets.has(latest.fieldId) ? latest.incomeBasis : undefined;
    return { ...shared, status: 'ambiguous', ...(distinct.length ? { value: distinct[0] } : {}), ...(correctedBasis ? { incomeBasis: correctedBasis } : {}) };
  }
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
  return { ok: true, value: { facts: [...groups.values()].map(group => reconcileGroup(group, input.messages, input.assertions, input.factSchema)) } };
}
