import { describe, expect, it } from 'vitest';
import { demoBundle } from '../../../src/config';
import { cases } from '../../../src/fixtures';
import type { FactAssertion } from '../../../src/contracts';
import { reconcileFacts } from '../../../src/domain/facts';

const laura = cases.find(c => c.caseId === 'laura')!.messages;
const household = { scope: 'buying_unit' as const, id: 'household' };
const base: FactAssertion = { assertionId: 'a', fieldId: 'declared_monthly_income', subjectRef: household, value: 3800, unit: 'EUR', period: 'month', incomeBasis: 'net', rawValue: '3.800 € netos', source: 'customer_message', evidenceRefs: [{ messageId: 'laura-m3', quote: '3.800 € netos' }], observedAt: '2026-05-01T10:03:00Z', precision: 'approximate', reviewStatus: 'unreviewed', schemaVersion: '1.0.0' };
const run = (assertions: FactAssertion[], messages = laura) => reconcileFacts({ assertions, messages, factSchema: demoBundle.factSchema });

describe('fact reconciliation', () => {
  it('preserves zero, household amounts and debt semantics without arithmetic', () => {
    const savings = { ...base, assertionId: 's', fieldId: 'available_savings', value: 0, rawValue: 'ahorrado', evidenceRefs: [{ messageId: 'laura-m3' }], incomeBasis: undefined };
    const debt = { ...base, assertionId: 'd', fieldId: 'monthly_debt', value: 250, rawValue: '250', evidenceRefs: [{ messageId: 'laura-m4' }], incomeBasis: undefined };
    const semantics = { ...base, assertionId: 'i', fieldId: 'debt_deduction_semantics', value: 'included', unit: undefined, period: undefined, incomeBasis: undefined, rawValue: 'coche', evidenceRefs: [{ messageId: 'laura-m4' }] };
    const result = run([base, savings, debt, semantics]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts.find(f => f.fieldId === 'available_savings')).toMatchObject({ status: 'approximate', value: 0, subjectRef: household });
    expect(result.value.facts.find(f => f.fieldId === 'declared_monthly_income')).toMatchObject({ value: 3800, incomeBasis: 'net' });
    expect(result.value.facts.find(f => f.fieldId === 'monthly_debt')).toMatchObject({ value: 250 });
    expect(result.value.facts.find(f => f.fieldId === 'debt_deduction_semantics')).toMatchObject({ value: 'included' });
  });
  it('rejects absent, mismatched and untranscribed evidence', () => {
    expect(run([{ ...base, evidenceRefs: [{ messageId: 'missing' }] }])).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
    expect(run([{ ...base, evidenceRefs: [{ messageId: 'laura-m3', quote: 'invented' }] }])).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
    const javier = cases.find(c => c.caseId === 'javier')!.messages;
    expect(run([{ ...base, evidenceRefs: [{ messageId: 'javier-m4' }] }], javier)).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
  it('retains history while applying an explicit advisor correction', () => {
    const advisor = { ...laura[1], messageId: 'advisor-correction', occurredAt: '2026-05-02T00:00:00Z', content: { type: 'text' as const, text: 'Corrección: ingresos brutos.' } };
    const correction: FactAssertion = { ...base, assertionId: 'b', incomeBasis: 'gross', source: 'advisor_correction', reviewStatus: 'confirmed_by_advisor', evidenceRefs: [{ messageId: advisor.messageId }], observedAt: advisor.occurredAt };
    const result = run([base, correction], [...laura, advisor]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts[0]).toMatchObject({ incomeBasis: 'gross', assertionIds: ['a', 'b'], evidenceRefs: [{ messageId: 'laura-m3', quote: '3.800 € netos' }, { messageId: 'advisor-correction' }] });
  });
  it('distinguishes conflicting claims, different periods and subjects', () => {
    const result = run([base, { ...base, assertionId: 'b', value: 2000 }, { ...base, assertionId: 'c', period: '2026-02', value: 1800 }, { ...base, assertionId: 'd', subjectRef: { scope: 'participant', id: 'one' }, value: 1000 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facts).toHaveLength(3);
    expect(result.value.facts[0]).toMatchObject({ status: 'conflicting', values: [3800, 2000] });
  });
  it('rejects schema mismatch, invalid values, scope and units', () => {
    for (const invalid of [{ ...base, fieldId: 'missing' }, { ...base, value: -1 }, { ...base, unit: 'USD' }, { ...base, subjectRef: { scope: 'case' as const, id: 'c' } }, { ...base, schemaVersion: 'old' }]) {
      expect(run([invalid])).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    }
  });
});

describe('uncertainty and evidence boundaries', () => {
  it('preserves Javier’s range and Rosa’s explicit zero', () => {
    const javier = cases.find(c => c.caseId === 'javier')!.messages;
    const range: FactAssertion = { ...base, assertionId: 'j', subjectRef: { scope: 'participant', id: 'javier' }, value: { min: 2000, max: 3000 }, incomeBasis: 'unknown', rawValue: 'entre 2000 y 3000', evidenceRefs: [{ messageId: 'javier-m3', quote: 'entre 2000 y 3000' }] };
    const j = run([range], javier);
    expect(j.ok && j.value.facts[0]).toMatchObject({ status: 'approximate', value: { min: 2000, max: 3000 }, incomeBasis: 'unknown' });
    const rosa = cases.find(c => c.caseId === 'rosa')!.messages;
    const savings: FactAssertion = { ...base, assertionId: 'r', fieldId: 'available_savings', value: 0, incomeBasis: undefined, precision: 'explicit', rawValue: 'Ahorros no tenemos', evidenceRefs: [{ messageId: 'rosa-m1', quote: 'Ahorros no tenemos' }] };
    const r = run([savings], rosa);
    expect(r.ok && r.value.facts[0]).toMatchObject({ status: 'known', value: 0 });
  });
  it('does not turn ambiguous or inferred claims into known facts', () => {
    for (const precision of ['ambiguous', 'inferred'] as const) {
      const result = run([{ ...base, precision }]);
      expect(result.ok && result.value.facts[0]).toMatchObject({ status: 'ambiguous' });
    }
  });
  it('rejects out-of-range and inconsistent evidence spans', () => {
    expect(run([{ ...base, evidenceRefs: [{ messageId: 'laura-m3', start: 0, end: 1000 }] }])).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
    expect(run([{ ...base, evidenceRefs: [{ messageId: 'laura-m3', quote: '3.800 € netos', start: 0, end: 5 }] }])).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
});

describe('customer corrections', () => {
  it('keeps conflicting income bases unresolved until advisor confirmation', () => {
    const laterMessage = { ...laura[2], messageId: 'gross-correction', occurredAt: '2026-05-02T10:00:00Z', content: { type: 'text' as const, text: 'Me equivoqué: eran brutos.' } };
    const correction: FactAssertion = { ...base, assertionId: 'gross', incomeBasis: 'gross', rawValue: 'eran brutos', observedAt: laterMessage.occurredAt, evidenceRefs: [{ messageId: laterMessage.messageId, quote: 'eran brutos' }] };
    const result = run([base, correction], [...laura, laterMessage]);
    expect(result.ok && result.value.facts[0]).toMatchObject({ status: 'ambiguous', assertionIds: ['a', 'gross'] });
  });
});


describe('source authority', () => {
  it('rejects customer claims of advisor confirmation', () => {
    expect(run([{ ...base, reviewStatus: 'confirmed_by_advisor' }])).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
  it('requires message roles to match the declared assertion source', () => {
    const forged = { ...base, source: 'advisor_correction' as const, reviewStatus: 'confirmed_by_advisor' as const };
    expect(run([forged])).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
    const customerClaim = { ...base, evidenceRefs: [{ messageId: 'laura-m2' }] };
    expect(run([customerClaim])).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
});
