import { expect, it } from 'vitest';
import { pairedComparison } from './paired';
import { scoreCase } from './score';
import type { Assertion } from '../types';
const expected: Assertion = { field: 'income', value: { amount: 2000, basis: 'net' }, evidence: { messageId: 'm', quote: 'dato' }, derivation: 'explicit' };
const uncertain: Assertion = { ...expected, value: { amount: 2000 }, normalization: { originalValue: '2000', unresolved: ['basis'] } };
const gold = { assertions: [expected], absentFields: [], contextChecks: [] };
it('compares only complete A/B pairs and preserves the interval', () => {
 const rows = [
  { caseId: '1', iteration: 1, arm: 'A' as const, score: scoreCase([uncertain], gold) },
  { caseId: '1', iteration: 1, arm: 'B' as const, score: scoreCase([expected], gold) },
  { caseId: '2', iteration: 1, arm: 'A' as const, score: null },
  { caseId: '2', iteration: 1, arm: 'B' as const, score: scoreCase([], gold) },
 ];
 const r = pairedComparison(rows);
 expect(r.pairedCases).toBe(1); expect(r.incompletePairs).toBe(1);
 expect(r.otherFields.b.f1).toBe(1);
 expect(r.otherFields.aF1Interval).toEqual({ min: 0, max: 1 });
 expect(r.otherFields.bMinusAF1Interval).toEqual({ min: 0, max: 1 });
});

it('compares semantic scores only on complete pairs', async () => {
 const { pairedSemanticComparison } = await import('./paired');
 const s = { counts: { tp: 1, fp: 0, fn: 0 } };
 const result = pairedSemanticComparison([
  { caseId: 'a', iteration: 1, arm: 'A', semanticScore: s },
  { caseId: 'a', iteration: 1, arm: 'B', semanticScore: s },
  { caseId: 'b', iteration: 1, arm: 'A', semanticScore: s },
  { caseId: 'b', iteration: 1, arm: 'B', semanticScore: null },
 ]);
 expect(result.pairedCases).toBe(1); expect(result.incompletePairs).toBe(1);
 expect(result.A.counts.tp).toBe(1); expect(result.B.counts.tp).toBe(1);
});
