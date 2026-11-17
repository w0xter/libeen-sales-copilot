import { describe, expect, it } from 'vitest';
import { baseline } from './baseline';

const message = { id: 'm1', role: 'customer' as const, text: 'Me interesa el alquiler con derecho a compra' };
const candidate = { field: 'interest', value: 'interesa', messageId: 'm1', quote: message.text, precision: 'explicit', subject: 'unknown', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null };

describe('baseline experimental adapter', () => {
  it('retains raw candidates and V0 discards separately', async () => {
    const raw = { candidates: [candidate], semanticIssues: [] };
    const result = await baseline.run([message], async () => raw);
    expect(result.raw).toEqual(raw);
    expect(result.accepted?.interest).toEqual([]);
    expect(result.discards).toMatchObject([{ reason: 'unsupported_interest' }]);
  });
  it('retains provider failures as errors', async () => {
    const result = await baseline.run([message], async () => { throw new Error('offline'); });
    expect(result.error).toBe('provider_error');
    expect(result.raw).toBeUndefined();
  });
});

it('preserves the original V0 accepted records in the common adapter', async () => {
  const { baselineAdapter } = await import('./baseline');
  const record = { ...candidate, field: 'savings', value: '5000', quote: message.text };
  const result = await baselineAdapter.run([message], async () => ({ raw: { candidates: [record], semanticIssues: [] } }), 'base');
  expect(result.originalAccepted).toMatchObject({ savings: [record] });
  expect(result.accepted[0].value).toMatchObject({ amount: 5000 });
  expect(result.accepted[0].normalization?.unresolved).toContain('currency');
});

it('normalizes only an unambiguous single savings amount with an explicit subject', async () => {
  const { normalizeBaseline } = await import('./baseline');
  const record = { ...candidate, field: 'savings', value: '5.000 €', quote: 'Tengo 5.000 € ahorrados', subject: 'individual' };
  expect(normalizeBaseline(record)?.value).toEqual({ amount: 5000, currency: 'EUR', scope: 'individual', period: null, precision: 'exact', availability: 'not_established' });
  expect(normalizeBaseline({ ...record, subject: 'unknown' })?.normalization?.unresolved).toContain('scope');
  expect(normalizeBaseline({ ...record, quote: '5.000 € inmovilizados' })?.normalization?.unresolved).toContain('availability');
});

it('normalizes explicit totals and debt installments without inventing a period', async () => {
 const { normalizeBaseline } = await import('./baseline');
 const income = { ...candidate, field: 'income', value: '3.000 €', quote: 'Ingresos totales: 3.000 € netos', subject: 'individual', incomeBasis: 'net' };
 expect(normalizeBaseline(income)?.value).toMatchObject({ amount: 3000, period: null, basis: 'net', basisDerivation: 'explicit', kind: 'total' });
 expect(normalizeBaseline({ ...income, quote: 'Me ingresan 3.000 € en la cuenta' })?.normalization?.unresolved).toContain('basisDerivation');
 const debt = { ...candidate, field: 'debts', value: '185 €', quote: 'Pago 185 € por la financiación de la moto', subject: 'individual' };
 expect(normalizeBaseline(debt)?.value).toMatchObject({ amount: 185, period: null, state: 'positive', includedInIncome: 'unknown' });
});
