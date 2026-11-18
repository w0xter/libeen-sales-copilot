import { describe, expect, it } from 'vitest';
import { minimal } from './minimal';
const messages = [{ id: 'm1', role: 'customer' as const, text: 'Cobro comisiones y tengo ahorros.' }];
const evidence = { messageId: 'm1', quote: 'tengo ahorros' };
describe('B and C share scope and subject validation', () => {
 for (const arm of ['B', 'C'] as const) it(`requires purchase attribution and removes individual labels from collective facts in ${arm}`, async () => {
  const context = [{ id: 'm', role: 'customer' as const, text: 'Convivimos cuatro personas. Entre todos ganamos 4000 euros. Firmaremos dos titulares.' }];
  const raw = { assertions: [
   { field: 'buyers', value: { count: 4 }, evidence: { messageId: 'm', quote: 'Convivimos cuatro personas' }, derivation: 'explicit' },
   { field: 'buyers', value: { count: 2 }, evidence: { messageId: 'm', quote: 'Firmaremos dos titulares' }, derivation: 'explicit' },
   { field: 'income', value: { amount: 4000, scope: 'collective', subjectRef: 'customer', kind: 'total' }, evidence: { messageId: 'm', quote: 'Entre todos ganamos 4000 euros' }, derivation: 'explicit' },
  ] };
  const result = await minimal(arm).run(context, async () => ({ raw }), 'mock');
  expect(result.accepted).toHaveLength(2);
  expect(result.accepted[0].value.count).toBe(2);
  expect(result.accepted[1].value.subjectRef).toBeUndefined();
  expect(result.discards.map(d => d.reason)).toEqual(['buyers_evidence_missing_purchase', 'individual_subject_removed_from_collective']);
 });

 for (const arm of ['B', 'C'] as const) it(`retains collective facts without an unverified buyer subject in ${arm}`, async () => {
  const raw = { assertions: [
   { field: 'income', value: { amount: 100, scope: 'collective', subjectRef: 'buyers', kind: 'total' }, evidence, derivation: 'explicit' },
   { field: 'savings', value: { amount: 0, subjectRef: 'customer' }, evidence, derivation: 'explicit' },
  ] };
  const result = await minimal(arm).run(messages, async () => ({ raw }), 'mock');
  expect(result.accepted).toHaveLength(2);
  expect(result.accepted[0].value).toEqual({ amount: 100, scope: 'collective', kind: 'total' });
  expect(result.accepted[1].value.subjectRef).toBe('customer');
  expect(result.discards.map(d => d.reason)).toEqual(['unverifiable_buyer_subject_removed']);
 });

 for (const arm of ['B', 'C'] as const) it(`rejects message identifiers and income components in ${arm}`, async () => {
  const raw = { assertions: [
   { field: 'savings', value: { amount: 0, subjectRef: 'm1' }, evidence, derivation: 'explicit' },
   { field: 'income', value: { amount: 100, kind: 'component' }, evidence, derivation: 'explicit' },
  ] };
  const result = await minimal(arm).run(messages, async () => ({ raw }), 'mock');
  expect(result.accepted).toHaveLength(0);
  expect(result.discards.map(d => d.reason)).toEqual(['subject_is_message_id', 'income_component_out_of_scope']);
 });
});
