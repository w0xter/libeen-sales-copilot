import { describe, expect, it } from 'vitest';
import { scoreSemanticV2 } from './semantic-v2';
import type { Assertion } from '../types';
const assertion = (value: Record<string, unknown>, quote: string, field: Assertion['field'] = 'savings'): Assertion => ({ field, value, evidence: { messageId: 'm', quote }, derivation: 'explicit' });
const test = (actual: Assertion, expected: Assertion, text: string) => scoreSemanticV2([actual], { assertions: [expected], absentFields: [], contextChecks: [] }, [{ id: 'm', role: 'customer', text }]).counts.tp;
describe('semantic-v2 attributed subjects', () => {
 it('allows an explicit speaker only for individually attributed first-person facts', () => {
  const quote = 'Tengo 300 euros ahorrados';
  for (const ref of ['customer', 'speaker', 'yo']) expect(test(assertion({ amount: 300, scope: 'individual', subjectRef: ref }, quote), assertion({ amount: 300, scope: 'individual' }, quote), quote)).toBe(1);
  expect(test(assertion({ amount: 300, scope: 'collective', subjectRef: 'customer' }, 'Ganamos 300 euros', 'income'), assertion({ amount: 300, scope: 'collective' }, 'Ganamos 300 euros', 'income'), 'Ganamos 300 euros')).toBe(0);
  expect(test(assertion({ amount: 300, scope: 'individual', subjectRef: 'customer' }, 'Ella tiene 300 euros'), assertion({ amount: 300, scope: 'individual' }, 'Ella tiene 300 euros'), 'Ella tiene 300 euros')).toBe(0);
  expect(test(assertion({ amount: 300, scope: 'individual', subjectRef: 'customer' }, quote), assertion({ amount: 300, scope: 'individual' }, quote), `Mi hermana tiene ahorros. ${quote}`)).toBe(0);
  expect(test(assertion({ amount: 300, scope: 'individual', subjectRef: 'customer' }, 'mi vecino tiene 300 euros'), assertion({ amount: 300, scope: 'individual' }, 'mi vecino tiene 300 euros'), 'mi vecino tiene 300 euros')).toBe(0);
 });
 it('resolves ella only to an unambiguous sister in the same message', () => {
  const quote = 'ella gana 100 euros';
  const a = assertion({ amount: 100, scope: 'individual', subjectRef: 'ella' }, quote, 'income');
  const g = assertion({ amount: 100, scope: 'individual', subjectRef: 'sister' }, quote, 'income');
  expect(test(a, g, `Mi hermana y yo trabajamos; ${quote}`)).toBe(1);
  const self = assertion({ amount: 200, scope: 'individual', subjectRef: 'yo' }, 'yo gano 200 euros', 'income');
  const selfGold = assertion({ amount: 200, scope: 'individual', subjectRef: 'speaker' }, 'yo gano 200 euros', 'income');
  expect(test(self, selfGold, 'Mi hermana y yo trabajamos; yo gano 200 euros')).toBe(1);
  expect(test(a, g, `Mi madre y yo trabajamos; ${quote}`)).toBe(0);
  expect(test(a, g, `Mi hermana y mi madre trabajan; ${quote}`)).toBe(0);
  expect(test(a, g, `Mi hermana y yo trabajamos con mi jefa; ${quote}`)).toBe(0);
  expect(test(a, g, `Mi hermana trabaja; ella no gana 100 euros`)).toBe(0);
 });
 it('does not equate unknown, insufficient evidence or different temporal meaning', () => {
  const q = 'Tengo 300 euros';
  expect(test(assertion({ amount: 300, scope: 'individual', subjectRef: 'unknown' }, q), assertion({ amount: 300, scope: 'individual' }, q), q)).toBe(0);
  const unresolved = { ...assertion({ amount: 300, scope: 'individual' }, q), normalization: { unresolved: ['subjectRef'], originalValue: q } };
  expect(test(unresolved, assertion({ amount: 300, scope: 'individual', subjectRef: 'speaker' }, q), q)).toBe(0);
  expect(test(assertion({ amount: 300, scope: 'individual', subjectRef: 'customer' }, '300 euros'), assertion({ amount: 300, scope: 'individual' }, q), q)).toBe(0);
  expect(test(assertion({ amount: 300 }, 'tengo 300 euros'), assertion({ amount: 300 }, 'tengo 300 euros'), 'no tengo 300 euros')).toBe(0);
  expect(test(assertion({ text: 'desde febrero', certainty: 'asserted' }, 'desde febrero', 'horizon'), assertion({ text: 'febrero', certainty: 'asserted' }, 'desde febrero', 'horizon'), 'Busco desde febrero')).toBe(0);
 });
});
