import { describe, expect, it } from 'vitest';
import { runCase } from './run';
import type { Fixture } from './fixtures';
const fixture = { caseId: 'x', family: 'F1', split: 'development', input: { messages: [{ messageId: 'm', role: 'customer', text: 'No tengo deudas' }] }, gold: { assertions: [{ field: 'debts', value: { state: 'none_declared' }, evidence: { messageId: 'm', exactQuote: 'No tengo deudas' }, derivation: 'explicit' }], absentFields: [], contextChecks: [] } } as Fixture;
const gold = { assertions: [{ field: 'debts' as const, value: { state: 'none_declared' }, evidence: { messageId: 'm', quote: 'No tengo deudas' }, derivation: 'explicit' as const }], absentFields: [], contextChecks: [] };
describe('runner', () => {
 it('records mock outputs and correct negative claims', async () => {
  const output = await runCase({ fixture, gold, messages: [{ id: 'm', role: 'customer', text: 'No tengo deudas' }] }, 'B', 'mock', async () => ({ raw: { assertions: gold.assertions } }));
  expect(output.score?.counts).toEqual({ tp: 1, fp: 0, fn: 0 });
 });
 it('keeps provider failure separate from extraction errors', async () => {
  const output = await runCase({ fixture, gold, messages: [] }, 'C', 'mock', async () => { throw Error('down'); });
  expect(output.result.error).toBe('provider_error'); expect(output.score).toBeNull();
 });
});

it('reports the historical interest filter separately from the raw result', async () => {
 const text = 'Me interesa el alquiler con derecho a compra';
 const messages = [{ id: 'm', role: 'customer' as const, text }];
 const expected = { assertions: [{ field: 'interest' as const, value: { polarity: 'positive' }, evidence: { messageId: 'm', quote: text }, derivation: 'explicit' as const }], absentFields: [], contextChecks: [] };
 const candidate = { field: 'interest', value: text, messageId: 'm', quote: text, precision: 'explicit', subject: 'unknown', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null };
 const row = await runCase({ fixture, gold: expected, messages }, 'A', 'base', async () => ({ raw: { candidates: [candidate], semanticIssues: [] } }));
 expect(row.rawScore?.counts.tp).toBe(1); expect(row.score?.counts.fn).toBe(1);
 expect(row.classes.postprocessing.rawMatchedButLost).toBe(1);
 expect(row.result.discards[0]?.reason).toBe('unsupported_interest');
});
