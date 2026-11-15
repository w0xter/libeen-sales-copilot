import { describe, expect, it } from 'vitest';
import { score } from './f02-metrics';

describe('simulated metrics', () => {
  const oracle = { facts: [{ fieldId: 'income', value: 10, scope: 'participant', precision: 'explicit', unit: 'EUR', period: 'month', incomeBasis: 'net', messageId: 'm1' }], protected: ['TRUST'], forbidden: ['OPT_OUT'] };
  it('distinguishes attribute mismatches, invented evidence and false signals', () => {
    const result = score(oracle, { status: 'complete', facts: [{ fieldId: 'income', value: 10, scope: 'buying_unit', precision: 'explicit', unit: 'EUR', period: 'month', incomeBasis: 'net', evidence: ['m2'] }], signals: ['OPT_OUT'] });
    expect(result.scope).toEqual({ numerator: 0, denominator: 1, notEvaluable: 0 });
    expect(result.value.numerator).toBe(1);
    expect(result.evidence.numerator).toBe(0);
    expect(result.protectedRecall.numerator).toBe(0);
    expect(result.falseSignals.OPT_OUT.numerator).toBe(1);
  });
  it('does not score abstentions as correct or errors as missing safety', () => {
    const abstained = score(oracle, { status: 'abstained', facts: [], signals: [] });
    expect(abstained.coverage.numerator).toBe(0);
    expect(abstained.value.numerator).toBe(0);
    const failed = score(oracle, { status: 'error', facts: [], signals: [] });
    expect(failed.protectedRecall).toEqual({ numerator: 0, denominator: 0, notEvaluable: 1 });
  });
});
