import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFixtures } from '../runner/fixtures';
import { scoreSemanticV2 } from './semantic-v2';
import { instructions } from '../adapters/minimal';
import type { Assertion } from '../types';
const cases = new Map(loadFixtures(resolve('experiments/structured-extraction-v1'), 'development').cases.map(c => [c.fixture.caseId, c]));
const c = (id: string) => cases.get(id)!;
const score = (id: string, actual: Assertion[]) => scoreSemanticV2(actual, c(id).gold, c(id).messages);
describe('development regressions', () => {
 it('rejects inferred buyers and collective attribution to the individual', () => {
  const x = c('F2-09'), income = x.gold.assertions.find(a => a.field === 'income')!;
  const buyer: Assertion = { field: 'buyers', value: { count: 3, certainty: 'asserted' }, evidence: { messageId: x.messages[0].id, quote: 'Somos tres hermanos' }, derivation: 'explicit' };
  const result = score('F2-09', [buyer, { ...income, value: { ...income.value, subjectRef: 'customer' } }]);
  expect(result.counts.tp).toBe(0); expect(result.counts.fp).toBe(2);
  expect(score('F2-09', [income]).counts.tp).toBe(1);
  expect(instructions).toContain('Si no se especifica cuántos comprarán o firmarán, omite buyers');
 });
 it('matches differentiated subjects when the source establishes them', () => {
  const g = c('F2-12').gold.assertions;
  const assertions = g.map(a => a.field !== 'income' ? a : { ...a, value: { ...a.value, subjectRef: a.value.subjectRef === 'sister' ? 'ella' : 'yo' } });
  expect(score('F2-12', assertions).counts.tp).toBe(3);
 });
 for (const [id, field] of [['F3-20', 'savings'], ['F4-30', 'debts'], ['F6-45', 'savings']] as const) it(`recognizes the individual speaker in ${id}`, () => {
  const g = c(id).gold.assertions.find(a => a.field === field)!;
  expect(score(id, [{ ...g, value: { ...g.value, subjectRef: 'customer' } }]).counts.tp).toBe(1);
 });
 it('keeps residence distinct from destination and excludes income components', () => {
  const x = c('F5-37');
  const residence: Assertion = { field: 'location', value: { area: 'Salamanca', precision: 'exact' }, evidence: { messageId: x.messages[0].id, quote: 'Actualmente resido en Salamanca' }, derivation: 'explicit' };
  expect(score('F5-37', [residence]).counts.tp).toBe(0);
  const y = c('F4-27');
  const component: Assertion = { field: 'income', value: { min: 600, max: 1050, kind: 'unknown' }, evidence: { messageId: y.messages[0].id, quote: y.messages[0].text! }, derivation: 'explicit' };
  expect(score('F4-27', [component]).counts.fp).toBe(1);
 });
});
