import { describe, expect, it } from 'vitest';
import { scoreCase } from './score';
import type { Assertion } from '../types';

const assertion = (field: Assertion['field'], value: Record<string, unknown>, quote = 'dato'): Assertion => ({ field, value, evidence: { messageId: 'm1', quote }, derivation: 'explicit' });
const gold = (assertions: Assertion[]) => ({ assertions, absentFields: [], contextChecks: [] });
describe('strict evaluation', () => {
  it('matches multiple assertions once each, preserving ranges and periods', () => {
    const a = assertion('income', { min: 1000, max: 2000, period: 'month' });
    const b = assertion('savings', { amount: 0 });
    expect(scoreCase([a, b, a], gold([a, b])).counts).toEqual({ tp: 2, fp: 1, fn: 0 });
    expect(scoreCase([assertion('income', { min: 1000, max: 2000, period: null })], gold([a])).counts).toEqual({ tp: 0, fp: 1, fn: 1 });
  });
  it('does not equate missing with zero, negation or unknown with known', () => {
    expect(scoreCase([], gold([assertion('debts', { state: 'none_declared' })])).counts.fn).toBe(1);
    expect(scoreCase([assertion('savings', { amount: null })], gold([assertion('savings', { amount: 0 })])).counts.tp).toBe(0);
    expect(scoreCase([], gold([])).counts).toEqual({ tp: 0, fp: 0, fn: 0 });
  });
  it('rejects a semantically insufficient quote even if literal', () => {
    const expected = assertion('interest', { polarity: 'negative' }, 'no me interesa');
    const actual = assertion('interest', { polarity: 'negative' }, 'interesa');
    expect(scoreCase([actual], gold([expected])).evidenceErrors).toBe(1);
  });
});

describe('strict attributes', () => {
  it('keeps scope, derived basis, range and negation distinct', () => {
    const expected = assertion('income', { amountRange: { min: 1000, max: 2000 }, scope: 'collective', period: 'month', basis: 'net', basisDerivation: 'explicit' });
    for (const value of [
      { ...expected.value, scope: 'individual' },
      { ...expected.value, basisDerivation: 'inferred' },
      { ...expected.value, amountRange: { min: 1000, max: 2100 } },
    ]) expect(scoreCase([assertion('income', value)], gold([expected])).counts.tp).toBe(0);
    expect(scoreCase([assertion('debts', { state: 'positive' })], gold([assertion('debts', { state: 'none_declared' })])).counts.tp).toBe(0);
  });
});

it('separates unresolved attributes from definite errors with one-to-one bounds', () => {
 const expected = assertion('income', { amount: 2000, currency: 'EUR', period: 'month', basis: 'net' });
 const actual = { ...assertion('income', { amount: 2000, currency: 'EUR', period: 'month' }), normalization: { originalValue: '2000 €', unresolved: ['basis'] } };
 const s = scoreCase([actual], gold([expected]));
 expect(s.counts).toEqual({ tp: 0, fp: 1, fn: 1 });
 expect(s.bounds).toEqual({ definiteMatches: 0, possibleMatches: 1, definiteFalsePositives: 0, definiteOmissions: 0 });
 const mismatch = { ...actual, value: { ...actual.value, amount: 3000 } };
 expect(scoreCase([mismatch], gold([expected])).bounds.possibleMatches).toBe(0);
 expect(scoreCase([actual, actual], gold([expected])).bounds.definiteFalsePositives).toBe(1);
});

it('does not treat unknown geographic precision as a definite extraction error', () => {
 const expected = assertion('location', { area: 'Vigo', precision: 'exact' });
 const actual = { ...assertion('location', { area: 'busco en Vigo' }), normalization: { originalValue: 'busco en Vigo', unresolved: ['area', 'precision'] } };
 const result = scoreCase([actual], gold([expected]));
 expect(result.counts.tp).toBe(0);
 expect(result.bounds.possibleMatches).toBe(1);
 expect(result.bounds.definiteFalsePositives).toBe(0);
});
