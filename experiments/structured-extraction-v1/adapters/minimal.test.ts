import { describe, expect, it } from 'vitest';
import { minimal } from './minimal';
import type { Transport } from '../types';
const messages = [{ id: 'm1', role: 'customer' as const, text: 'No tengo créditos.' }, { id: 'm2', role: 'advisor' as const, text: 'Ingresas 2000' }];
const candidate = { field: 'debts', value: { state: 'none_declared' }, evidence: { messageId: 'm1', quote: 'No tengo créditos' }, derivation: 'explicit' };
const mock = (raw: unknown): Transport => async () => ({ raw });
describe('minimal adapter', () => {
 it('preserves explicit negation and abstention', async () => {
   expect((await minimal('B').run(messages, mock({ assertions: [candidate] }), 'same')).accepted).toEqual([candidate]);
   expect((await minimal('C').run(messages, mock({ assertions: [] }), 'other')).accepted).toEqual([]);
 });
 it('discards advisor and nonexistent evidence', async () => {
   const results = await minimal('B').run(messages, mock({ assertions: [{ ...candidate, evidence: { messageId: 'm2', quote: 'Ingresas 2000' } }, { ...candidate, evidence: { messageId: 'm1', quote: 'inventada' } }] }), 'same');
   expect(results.discards.map(x => x.reason)).toEqual(['not_customer', 'quote_not_found']);
 });
 it('classifies transport failure', async () => {
   expect((await minimal('B').run(messages, async () => { throw Error('offline'); }, 'same')).error).toBe('provider_error');
 });
});

describe('B and C controls', () => {
 it('uses the same validator for both arms with only the selected model changed', async () => {
  const seen: string[] = [];
  const transport: Transport = async (_messages, config) => { seen.push(config.model); return { raw: { assertions: [candidate] } }; };
  const b = await minimal('B').run(messages, transport, 'base');
  const c = await minimal('C').run(messages, transport, 'capacity');
  expect(b.accepted).toEqual(c.accepted); expect(b.discards).toEqual(c.discards);
  expect(seen).toEqual(['base', 'capacity']);
 });
});

it('discards inverted ranges while preserving valid alternatives', async () => {
 const range = { field: 'savings', value: { amount: null, amountRange: { min: 2000, max: 1000 } }, evidence: { messageId: 'm1', quote: 'No tengo créditos' }, derivation: 'explicit' };
 const result = await minimal('B').run(messages, mock({ assertions: [range, candidate] }), 'base');
 expect(result.discards.map(d => d.reason)).toEqual(['invalid_range']);
 expect(result.accepted).toEqual([candidate]);
});
