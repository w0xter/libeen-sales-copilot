import { describe, expect, it } from 'vitest';
import { demoBundle } from '../../../src/config';
import { cases } from '../../../src/fixtures';
import { reconcile } from '../../../src/adapters/ai/multipass/reconcile';
import type { ClaimCandidate, ClaimGroup, ContextReview } from '../../../src/adapters/ai/multipass/contracts';
import type { Message, SubjectRef } from '../../../src/contracts';
import type { SafetyInput } from '../../../src/adapters/ai/multipass/safety';

type Spec = { fieldId: string; messageId: string; focus: string; value: ClaimCandidate['value']; subjectRef: SubjectRef; precision?: ClaimCandidate['precision']; unit?: string; period?: string; incomeBasis?: ClaimCandidate['incomeBasis']; identity?: string };
const subjects: SubjectRef[] = [{ scope: 'case', id: 'case' }, { scope: 'buying_unit', id: 'unit' }, { scope: 'participant', id: 'person' }];
const subject = (scope: SubjectRef['scope']) => subjects.find(s => s.scope === scope)!;
const complete = (candidates: SafetyInput['candidates'] = [], verdicts: SafetyInput['verdicts'] = []): SafetyInput => ({ scanStatus: 'complete', reviewStatus: 'complete', candidates, verdicts, historicalBlockers: [] });
function makeGroups(messages: Message[], specs: Spec[]) {
  const reviews: ContextReview[] = [];
  const groups: ClaimGroup[] = specs.map((s, i) => {
    const msg = messages.find(m => m.messageId === s.messageId)!;
    if (msg.content.type !== 'text') throw new Error('text expected');
    const text = msg.content.text; const start = text.indexOf(s.focus);
    if (start < 0) throw new Error(`missing focus ${s.focus}`);
    const statementSpan = { start: 0, end: text.length, text };
    const focusSpan = { start, end: start + s.focus.length, text: s.focus };
    const evidenceRefs = [{ messageId: s.messageId, quote: text }];
    const candidates: ClaimCandidate[] = ['e1', 'e2'].map((extractorId, n) => ({ candidateId: `${i}-${n}`, extractorId, fieldId: s.fieldId, subjectRef: s.subjectRef, value: s.value, precision: s.precision ?? 'explicit', ...(s.unit && { unit: s.unit }), ...(s.period && { period: s.period }), ...(s.incomeBasis && { incomeBasis: s.incomeBasis }), occurrence: { messageId: s.messageId, statementSpan, focusSpan }, evidenceRefs }));
    for (const c of candidates) {
      const identityText = s.identity ?? s.focus;
      const identity = text.indexOf(identityText);
      reviews.push({ groupId: `g${i}`, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', justification: 'Simulated contextual review', evidenceRefs, ...(identity >= 0 ? { identitySpan: { start: identity, end: identity + identityText.length, text: identityText } } : {}) });
    }
    return { groupId: `g${i}`, fieldId: s.fieldId, occurrence: candidates[0].occurrence, semanticAtomicity: 'context_review_required', candidates };
  });
  return { groups, reviews };
}
function run(messages: Message[], specs: Spec[], safety = complete()) {
  return reconcile({ ...makeGroups(messages, specs), messages, safety, factSchema: demoBundle.factSchema, schemaVersion: demoBundle.factSchema.version, knownSubjects: subjects, historicalAssertions: [], diagnostics: [], materialFieldIds: ['declared_monthly_income', 'available_savings', 'monthly_debt'] });
}

describe('full synthetic case transcripts', () => {
  it('reconciles Laura without splitting income or inferring debt deductions', () => {
    const messages = cases.find(c => c.caseId === 'laura')!.messages;
    const result = run(messages, [
      { fieldId: 'desired_locations', messageId: 'laura-m1', focus: 'Valencia', value: ['Valencia'], subjectRef: subject('case') },
      { fieldId: 'declared_monthly_income', messageId: 'laura-m3', focus: '3.800 €', value: 3800, precision: 'approximate', unit: 'EUR', period: 'month', incomeBasis: 'net', subjectRef: subject('buying_unit') },
      { fieldId: 'available_savings', messageId: 'laura-m3', focus: '18.000', value: 18000, precision: 'approximate', unit: 'EUR', subjectRef: subject('buying_unit') },
      { fieldId: 'monthly_debt', messageId: 'laura-m4', focus: '250 €', value: 250, unit: 'EUR', period: 'month', subjectRef: subject('buying_unit') },
    ]);
    expect(result.status).toBe('consolidated');
    if (result.status !== 'consolidated') return;
    const facts = result.interpretation.assertions;
    expect(facts).toHaveLength(4);
    expect(facts.find(a => a.fieldId === 'declared_monthly_income')).toMatchObject({ value: 3800, incomeBasis: 'net', precision: 'approximate', subjectRef: subject('buying_unit') });
    expect(facts.find(a => a.fieldId === 'available_savings')).toMatchObject({ value: 18000, precision: 'approximate' });
    expect(facts.find(a => a.fieldId === 'monthly_debt')).toMatchObject({ value: 250, period: 'month' });
    expect(facts.find(a => a.fieldId === 'desired_locations')?.value).toEqual(['Valencia']);
    expect(facts.some(a => a.fieldId === 'debt_deduction_semantics')).toBe(false);
  });
  it('reconciles Javier with unknown income basis, untouched audio and a trust concern', () => {
    const messages = cases.find(c => c.caseId === 'javier')!.messages;
    expect(messages.find(m => m.messageId === 'javier-m4')?.content).toEqual({ type: 'audio_unavailable', durationSeconds: 72 });
    const trust = { signalId: 'trust', category: 'TRUST' as const, evidenceRefs: [{ messageId: 'javier-m5', quote: 'y esto es fiable? no sera una estafa no' }] };
    const safety = complete([trust], [{ signalId: 'trust', status: 'confirmed', justification: 'doubt about reliability', evidenceRefs: trust.evidenceRefs }]);
    const specs: Spec[] = [
      { fieldId: 'buyer_count', messageId: 'javier-m3', focus: 'solo', value: 1, subjectRef: subject('buying_unit') },
      { fieldId: 'employment_context', messageId: 'javier-m3', focus: 'autonomo', identity: 'autonomo', value: 'autónomo', subjectRef: subject('participant') },
      { fieldId: 'declared_monthly_income', messageId: 'javier-m3', focus: 'entre 2000 y 3000', value: { min: 2000, max: 3000 }, precision: 'approximate', unit: 'EUR', period: 'month', incomeBasis: 'unknown', subjectRef: subject('participant') },
    ];
    const result = run(messages, specs, safety);
    expect(result.status).toBe('consolidated');
    if (result.status === 'consolidated') {
      expect(result.interpretation.assertions).toHaveLength(3);
      expect(result.interpretation.assertions.find(a => a.fieldId === 'buyer_count')?.value).toBe(1);
      expect(result.interpretation.assertions.find(a => a.fieldId === 'employment_context')?.value).toBe('autónomo');
      expect(result.interpretation.assertions.find(a => a.fieldId === 'declared_monthly_income')).toMatchObject({ value: { min: 2000, max: 3000 }, incomeBasis: 'unknown', subjectRef: subject('participant') });
      expect(result.interpretation.assertions.flatMap(a => a.evidenceRefs).some(e => e.messageId === 'javier-m4')).toBe(false);
      expect(result.interpretation.blockers.map(b => b.type)).toEqual(['TRUST']);
    }
    const prepared = makeGroups(messages, specs);
    const income = prepared.groups[2];
    income.candidates[1] = { ...income.candidates[1], subjectRef: subject('buying_unit') };
    const conflict = reconcile({ ...prepared, messages, safety, factSchema: demoBundle.factSchema, schemaVersion: demoBundle.factSchema.version, knownSubjects: subjects, historicalAssertions: [], diagnostics: [], materialFieldIds: ['declared_monthly_income'] });
    expect(conflict.status).toBe('human_review_required');
    if (conflict.status === 'human_review_required') {
      expect(conflict.disputes.some(d => d.groupId === income.groupId)).toBe(true);
      expect(conflict.safetyFindings).toContainEqual(expect.objectContaining({ category: 'TRUST', status: 'confirmed' }));
    }
  });
  it('reconciles Rosa with zero savings, urgency, binding request and no opt-out', () => {
    const messages = cases.find(c => c.caseId === 'rosa')!.messages;
    const urgency = { signalId: 'urgent', category: 'URGENT' as const, evidenceRefs: [{ messageId: 'rosa-m1', quote: 'necesitamos salir del piso en dos semanas' }] };
    const binding = { signalId: 'binding', category: 'BINDING_CLAIM' as const, evidenceRefs: [{ messageId: 'rosa-m3', quote: 'Mi hijo dice que os pida por escrito que estamos aprobados antes de seguir.' }] };
    const opt = { signalId: 'opt', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'rosa-m2', quote: 'Si no podéis vendernos, ¿nos alquiláis algo solo de alquiler?' }] };
    const safety = complete([urgency, binding, opt], [
      { signalId: 'urgent', status: 'confirmed', justification: 'housing urgency', evidenceRefs: urgency.evidenceRefs },
      { signalId: 'binding', status: 'confirmed', justification: 'request for written approval', evidenceRefs: binding.evidenceRefs },
      { signalId: 'opt', status: 'dismissed', justification: 'conditional rental question', evidenceRefs: opt.evidenceRefs },
    ]);
    const result = run(messages, [
      { fieldId: 'declared_monthly_income', messageId: 'rosa-m1', focus: '1.400 €', value: 1400, unit: 'EUR', incomeBasis: 'unknown', subjectRef: subject('buying_unit') },
      { fieldId: 'available_savings', messageId: 'rosa-m1', focus: 'Ahorros no tenemos', value: 0, unit: 'EUR', subjectRef: subject('buying_unit') },
      { fieldId: 'moving_horizon', messageId: 'rosa-m1', focus: 'dos semanas', value: 'dos semanas', subjectRef: subject('case') },
    ], safety);
    expect(result.status).toBe('consolidated');
    if (result.status !== 'consolidated') return;
    expect(result.interpretation.assertions.find(a => a.fieldId === 'available_savings')?.value).toBe(0);
    expect(result.interpretation.assertions.find(a => a.fieldId === 'declared_monthly_income')?.value).toBe(1400);
    expect(result.interpretation.assertions.find(a => a.fieldId === 'moving_horizon')?.value).toBe('dos semanas');
    expect(result.interpretation.blockers.map(b => b.type).sort()).toEqual(['BINDING_CLAIM', 'URGENT']);
    expect(result.safetyFindings.find(f => f.signalId === 'opt')?.status).toBe('dismissed');
  });
});
