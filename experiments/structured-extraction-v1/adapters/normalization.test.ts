import { describe, expect, it } from 'vitest';
import { normalizeBaseline } from './baseline';
const c = (field: string, value: string, quote: string, overrides = {}) => ({ field, value, messageId: 'm', quote, precision: 'explicit', subject: 'individual', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null, ...overrides });
describe('A normalization without inventing facts', () => {
 it('does not turn generic or conditional interest into a positive assertion', () => {
  expect(normalizeBaseline(c('interest', 'interés', 'Quiero información'))?.normalization?.unresolved).toContain('polarity');
  expect(normalizeBaseline(c('interest', 'quizá me interese', 'Quizá me interese SmartHousing'))?.normalization?.unresolved).toContain('polarity');
 });
 it('preserves ranges, explicit period and joint scope without asserting income total', () => {
  const x = normalizeBaseline(c('income', 'entre 1.500 y 2.000 €/mes', 'Ganamos entre 1.500 y 2.000 € al mes', { precision: 'range', subject: 'joint' }));
  expect(x?.value).toMatchObject({ amountRange: { min: 1500, max: 2000 }, currency: 'EUR', period: 'month', scope: 'collective' });
  expect(x?.normalization?.unresolved).toContain('kind');
 });
 it('does not invent a period or infer net basis from account deposits', () => {
  const x = normalizeBaseline(c('income', '2.000 €', 'Me llegan 2.000 € a la cuenta'));
  expect(x?.value).toMatchObject({ amount: 2000, period: null });
  expect(x?.normalization?.unresolved).toContain('basisDerivation');
 });
 it('keeps unknown scope unknown and negative debts distinct from zero', () => {
  const x = normalizeBaseline(c('debts', 'sin créditos', 'No tengo créditos', { subject: 'unknown' }));
  expect(x?.value).toMatchObject({ state: 'none_declared' });
  expect(x?.value).not.toHaveProperty('amount', 0);
  expect(x?.normalization?.unresolved).toContain('scope');
 });
 it('handles decimals and does not treat two installments as a range', () => {
  const x = normalizeBaseline(c('debts', '125,50 €', 'Pago una cuota de 125,50 €'));
  expect(x?.value).toMatchObject({ amount: 125.5 });
  const y = normalizeBaseline(c('debts', 'cuotas de 120 y 70 €', 'Tenemos cuotas de 120 y 70 €'));
  expect(y?.value).not.toHaveProperty('amountRange');
  expect(y?.normalization?.unresolved).toContain('amount');
 });
});

it('does not convert a range into an approximation without an approximation cue', () => {
 const x = normalizeBaseline(c('income', 'entre 1.500 y 2.000 €', 'Gano entre 1.500 y 2.000 €', { precision: 'range' }));
 expect(x?.value).not.toHaveProperty('precision', 'approximate_range');
 expect(x?.normalization?.unresolved).toContain('precision');
});

it('does not convert a negative debt claim into a verified monetary zero', () => {
 const x = normalizeBaseline(c('debts', '0', 'No tengo créditos ni cuotas'));
 expect(x?.value).toMatchObject({ amount: null, currency: null, state: 'none_declared' });
 expect(x?.value).not.toHaveProperty('precision');
});

it('does not classify an information request as explicit interest', () => {
 const x = normalizeBaseline(c('interest', 'quiero información', 'Quiero información sobre SmartHousing'));
 expect(x?.normalization?.unresolved).toContain('polarity');
});

it('does not equate A evidentiary precision with geographic or temporal certainty', () => {
 const loc = normalizeBaseline(c('location', 'costa de Asturias', 'Busco en la costa de Asturias'));
 expect(loc?.normalization?.unresolved).toContain('precision');
 expect(loc?.value).not.toHaveProperty('precision');
 const buyers = normalizeBaseline(c('buyers', '2', 'Probablemente compraremos dos'));
 expect(buyers?.normalization?.unresolved).toContain('certainty');
});
