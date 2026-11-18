import { describe, expect, it } from 'vitest';
import { scoreSemantic } from './semantic';
import type { Assertion } from '../types';
const a = (field: Assertion['field'], value: Record<string, unknown>, quote = 'dato completo'): Assertion => ({ field, value, evidence: { messageId: 'm', quote }, derivation: 'explicit' });
const score = (actual: Assertion[], expected: Assertion[]) => scoreSemantic(actual, { assertions: expected, absentFields: [], contextChecks: [] });
describe('semantic-v1 conservative matching', () => {
 it('normalizes supported subject names with gold-backed attribution', () => {
  for (const [es, en] of [['hermana', 'sister'], ['yo', 'speaker']]) {
   const g = a('income', { amount: 100, subjectRef: en }, 'ella gana 100 euros');
   expect(score([a('income', { amount: 100, subjectRef: es }, 'ella gana 100 euros')], [g]).counts.tp).toBe(1);
  }
 });
 it('separates zero, unknown, omitted optional values and contradictions', () => {
  const g = a('savings', { amount: 0, period: null });
  expect(score([a('savings', { amount: 0 })], [g]).counts.tp).toBe(1);
  for (const v of [{ amount: null }, {}, { amount: 0, period: 'month' }]) expect(score([a('savings', v)], [g]).counts.tp).toBe(0);
 });
 it('keeps period, scope, components, availability and negation distinct', () => {
  for (const [field, good, bad] of [
   ['income', { amount: 100, period: 'quincena' }, { amount: 100, period: '14_days' }],
   ['income', { amount: 100, scope: 'individual' }, { amount: 100, scope: 'collective' }],
   ['income', { amount: 100, kind: 'total' }, { amount: 100, kind: 'component' }],
   ['savings', { amount: 100, availability: 'not_established' }, { amount: 100, availability: 'available' }],
   ['debts', { state: 'none_declared' }, { state: 'positive' }],
  ] as [Assertion['field'], Record<string, unknown>, Record<string, unknown>][]) expect(score([a(field, bad)], [a(field, good)]).counts.tp).toBe(0);
  expect(score([], [a('debts', { state: 'none_declared' })]).counts.fn).toBe(1);
 });
 it('requires one-to-one matches and sufficient evidence', () => {
  const g = a('income', { amount: 100 }, 'gano 100 euros netos');
  expect(score([g, g], [g]).counts).toEqual({ tp: 1, fp: 1, fn: 0 });
  expect(score([a('income', { amount: 100 }, '100')], [g]).counts.tp).toBe(0);
  expect(score([a('income', { amount: 100 }, 'gano los 100 euros netos')], [g]).counts.tp).toBe(1);
  expect(score([a('income', { amount: 100 }, 'no gano 100 euros netos')], [g]).counts.tp).toBe(0);
 });
 it('rejects additional unsupported or contradictory values', () => {
  const g = a('savings', { amount: 0 }, 'cero euros y 500 euros');
  expect(score([a('savings', { amount: 0, amountText: '500 euros' }, 'cero euros y 500 euros')], [g]).counts.tp).toBe(0);
  expect(score([a('savings', { amount: 0, subjectRef: 'm' }, 'cero euros y 500 euros')], [g]).counts.tp).toBe(0);
 });
 it('normalizes known obligations without hiding explicit contradictions', () => {
  const g = a('debts', { amount: 74, obligation: 'furniture_financing', state: 'positive' });
  expect(score([a('debts', { amount: 74, obligation: 'muebles financiados', state: 'positive' })], [g]).counts.tp).toBe(1);
  expect(score([a('debts', { amount: 74, obligation: 'muebles financiados', state: 'none_declared' })], [g]).counts.tp).toBe(0);
 });
});
