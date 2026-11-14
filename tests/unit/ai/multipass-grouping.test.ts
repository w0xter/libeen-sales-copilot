import { describe, expect, it } from 'vitest';
import { groupClaims as groupWithContext } from '../../../src/adapters/ai/multipass/grouping';
import type { FactSchema, FactAssertion } from '../../../src/contracts';
import type { ClaimCandidate } from '../../../src/adapters/ai/multipass/contracts';

const text = 'Yo gano 2.000 € y ella 2.000 €.';
const message = { messageId: 'm1', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
function claim(id: string, extractorId: string, start: number, scope: 'participant' | 'buying_unit' = 'participant'): ClaimCandidate {
  return { candidateId: id, extractorId, fieldId: 'income', subjectRef: { scope, id: 'p' }, value: 2000, precision: 'explicit', evidenceRefs: [{ messageId: 'm1' }], occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + 7, text: '2.000 €' } } };
}
const defaultSchema: FactSchema = { id: 's', version: '1', fields: [{ id: 'income', label: 'Income', description: '', type: 'money', scopes: ['participant', 'buying_unit'], cardinality: 'one', units: ['EUR'], enumOptions: [], sensitivity: 'normal', schemaVersion: '1' }] };
const previous: FactAssertion = { assertionId: 'previous', fieldId: 'income', subjectRef: { scope: 'participant', id: 'p' }, value: 2000, rawValue: '2000', source: 'customer_message', evidenceRefs: [{ messageId: 'old' }], observedAt: '2025-01-01T00:00:00Z', precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: '1' };
const groupClaims = (candidates: ClaimCandidate[], messages: typeof message[], context = { factSchema: defaultSchema, assertions: [previous] }) => groupWithContext(candidates, messages, context);
describe('atomic grouping', () => {
  it('groups by position, independent of subject, and keeps identical amounts separate', () => {
    const result = groupClaims([claim('a', 'e1', 8), claim('b', 'e2', 8, 'buying_unit'), claim('c', 'e3', 8), claim('d', 'e1', 23)], [message]);
    expect(result.groups.map(g => g.candidates.length)).toEqual([3, 1]);
    expect(result.rejected).toHaveLength(0);
  });
  it('rejects a broad occurrence with no focus and duplicate extractor contributions', () => {
    const a = claim('a', 'e1', 8);
    const broad = { messageId: a.occurrence.messageId, statementSpan: a.occurrence.statementSpan };
    expect(groupClaims([a, { ...a, candidateId: 'b', occurrence: broad }, { ...a, candidateId: 'c' }], [message]).rejected).toHaveLength(2);
  });
});
it('keeps identical text in different messages separate and rejects duplicate candidate IDs', () => {
  const other = { ...message, messageId: 'm2' };
  const a = claim('a', 'e1', 8);
  const b = { ...claim('b', 'e1', 8), occurrence: { ...a.occurrence, messageId: 'm2' }, evidenceRefs: [{ messageId: 'm2' }] };
  const result = groupClaims([a, b, { ...a, extractorId: 'e2' }], [message, other]);
  expect(result.groups).toHaveLength(2);
  expect(result.rejected).toHaveLength(1);
});
it('represents a basis-only correction without inventing a value', () => {
  const correctionText = 'Me equivoqué, eran brutos.';
  const correctionMessage = { ...message, messageId: 'm3', content: { type: 'text' as const, text: correctionText } };
  const correction: ClaimCandidate = { ...claim('correction', 'e1', 8), value: undefined, correction: { dimension: 'incomeBasis', previousAssertionId: 'previous' }, incomeBasis: 'gross', precision: 'ambiguous', evidenceRefs: [{ messageId: 'm3' }], occurrence: { messageId: 'm3', statementSpan: { start: 0, end: correctionText.length, text: correctionText }, focusSpan: { start: 19, end: 25, text: 'brutos' }, previousAssertionId: 'previous' } };
  const result = groupClaims([correction], [correctionMessage]);
  expect(result.groups[0].candidates[0].value).toBeUndefined();
  expect(result.groups[0].occurrence.previousAssertionId).toBe('previous');
});
it('keeps two different income occurrences separate', () => {
  const text = 'Yo gano 2.400 € y mi pareja 1.800 €.';
  const msg = { ...message, content: { type: 'text' as const, text } };
  const first = { ...claim('a', 'e1', 8), occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start: 8, end: 15, text: '2.400 €' } } };
  const second = { ...first, candidateId: 'b', value: 1800, occurrence: { ...first.occurrence, focusSpan: { start: 28, end: 35, text: '1.800 €' } } };
  expect(groupClaims([first, second], [msg]).groups).toHaveLength(2);
});
it('rejects a candidate whose evidence does not match its source message', () => {
  const candidate = { ...claim('a', 'e1', 8), evidenceRefs: [{ messageId: 'm1', quote: 'inventado', start: 8, end: 15 }] };
  expect(groupClaims([candidate], [message]).rejected).toHaveLength(1);
});

it('must validate the fact schema before grouping', () => {
  const invalid = { ...claim('invalid', 'e1', 8), unit: 'BAD' };
  const factSchema = { id: 's', version: '1', fields: [{ id: 'income', label: 'Income', description: '', type: 'money' as const, scopes: ['participant' as const, 'buying_unit' as const], cardinality: 'one' as const, units: ['EUR'], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }] };
  expect(groupClaims([invalid], [message], { factSchema, assertions: [] }).groups).toHaveLength(0);
});
it('accepts a single textual range as one atomic occurrence', () => {
  const text = 'Gano entre 2000 y 3000 euros.';
  const msg = { ...message, content: { type: 'text' as const, text } };
  const a = { ...claim('range', 'e1', 8), value: { min: 2000, max: 3000 }, occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start: 5, end: 22, text: 'entre 2000 y 3000' } } };
  const factSchema = { id: 's', version: '1', fields: [{ id: 'income', label: 'Income', description: '', type: 'money' as const, scopes: ['participant' as const], cardinality: 'one' as const, units: [], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }] };
  expect(groupClaims([a], [msg], { factSchema, assertions: [] }).groups).toHaveLength(1);
});
it('aligns uniquely overlapping focuses and is stable under permutation', () => {
  const a = claim('a', 'e1', 8);
  const b = { ...claim('b', 'e2', 8), occurrence: { ...a.occurrence, focusSpan: { start: 8, end: 13, text: '2.000' } } };
  const factSchema = { id: 's', version: '1', fields: [{ id: 'income', label: 'Income', description: '', type: 'money' as const, scopes: ['participant' as const], cardinality: 'one' as const, units: [], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }] };
  const one = groupClaims([a, b], [message], { factSchema, assertions: [] });
  const two = groupClaims([b, a], [message], { factSchema, assertions: [] });
  expect(one.groups).toHaveLength(1);
  expect(one.groups[0].candidates).toHaveLength(2);
  expect(one).toEqual(two);
});
it('diagnoses a focus covering multiple statements instead of merging them', () => {
  const a = claim('a', 'e1', 8);
  const broad = { ...claim('b', 'e2', 8), occurrence: { ...a.occurrence, focusSpan: { start: 8, end: 30, text: '2.000 € y ella 2.000 €' } } };
  const factSchema = { id: 's', version: '1', fields: [{ id: 'income', label: 'Income', description: '', type: 'money' as const, scopes: ['participant' as const], cardinality: 'one' as const, units: [], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }] };
  const result = groupClaims([a, broad], [message], { factSchema, assertions: [] });
  expect(result.groups).toHaveLength(1);
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ candidateId: 'b', code: 'ambiguous_occurrence' }));
});
it('rejects invalid fields, value types and scopes at the grouping boundary', () => {
  const a = claim('a', 'e1', 8);
  for (const bad of [{ ...a, fieldId: 'missing' }, { ...a, value: true }, { ...a, subjectRef: { scope: 'case' as const, id: 'p' } }]) {
    expect(groupClaims([bad], [message]).groups).toHaveLength(0);
  }
});
it('rejects corrections with missing, unknown, or incompatible prior assertions', () => {
  const text = 'eran brutos';
  const msg = { ...message, content: { type: 'text' as const, text } };
  const base = { ...claim('a', 'e1', 8), value: undefined, incomeBasis: 'gross' as const, correction: { dimension: 'incomeBasis' as const, previousAssertionId: 'previous' }, occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start: 5, end: 11, text: 'brutos' } } };
  expect(groupClaims([base], [msg]).groups).toHaveLength(1);
  expect(groupClaims([{ ...base, correction: { ...base.correction, previousAssertionId: 'missing' } }], [msg]).groups).toHaveLength(0);
  expect(groupClaims([{ ...base, subjectRef: { scope: 'participant', id: 'other' } }], [msg]).groups).toHaveLength(0);
  expect(groupClaims([{ ...base, correction: undefined }], [msg]).groups).toHaveLength(0);
});
it('reports subject identity as unverified when the case lacks a subject registry', () => {
  const result = groupClaims([claim('a', 'e1', 8, 'buying_unit')], [message]);
  expect(result.diagnostics).toContainEqual({ candidateId: 'a', code: 'subject_unverified' });
});
it('rejects a focus that contains only a fragment of a numeric token', () => {
  const a = claim('a', 'e1', 8);
  const partial = { ...a, occurrence: { ...a.occurrence, focusSpan: { start: 8, end: 9, text: '2' } } };
  expect(groupClaims([partial], [message]).groups).toHaveLength(0);
});
it('preserves differing subjects as a structured disagreement', () => {
  const result = groupClaims([claim('a', 'e1', 8), claim('b', 'e2', 8, 'buying_unit')], [message]);
  expect(result.groups).toHaveLength(1);
  expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'subject_disagreement', candidateId: 'b' }));
});
it('does not accept a correction targeting a future assertion', () => {
  const text = 'eran brutos';
  const msg = { ...message, content: { type: 'text' as const, text } };
  const candidate = { ...claim('a', 'e1', 8), value: undefined, incomeBasis: 'gross' as const, correction: { dimension: 'incomeBasis' as const, previousAssertionId: 'previous' }, occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start: 5, end: 11, text: 'brutos' } } };
  expect(groupClaims([candidate], [msg], { factSchema: defaultSchema, assertions: [{ ...previous, observedAt: '2027-01-01T00:00:00Z' }] }).groups).toHaveLength(0);
});
it('reports nonnumeric overlapping focus ambiguity without choosing an occurrence', () => {
  const text = 'Madrid y Sevilla';
  const msg = { ...message, content: { type: 'text' as const, text } };
  const mk = (id: string, extractor: string, start: number, end: number) => ({ ...claim(id, extractor, 8), fieldId: 'location', value: text.slice(start, end), occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end, text: text.slice(start, end) } } });
  const factSchema: FactSchema = { id: 's', version: '1', fields: [{ ...defaultSchema.fields[0], id: 'location', type: 'text' }] };
  const result = groupClaims([mk('a', 'e1', 0, 6), mk('b', 'e1', 9, 16), mk('c', 'e2', 0, 16)], [msg], { factSchema, assertions: [] });
  expect(result.groups).toHaveLength(2);
  expect(result.diagnostics).toContainEqual({ candidateId: 'c', code: 'ambiguous_occurrence' });
});
it('aligns a unique contained nonnumeric focus', () => {
  const text = 'en Madrid';
  const msg = { ...message, content: { type: 'text' as const, text } };
  const mk = (id: string, extractor: string, start: number) => ({ ...claim(id, extractor, 8), fieldId: 'location', value: 'Madrid', occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: text.length, text: text.slice(start) } } });
  const factSchema: FactSchema = { id: 's', version: '1', fields: [{ ...defaultSchema.fields[0], id: 'location', type: 'text' }] };
  expect(groupClaims([mk('a', 'e1', 0), mk('b', 'e2', 3)], [msg], { factSchema, assertions: [] }).groups).toHaveLength(1);
});
it('does not arbitrarily choose between conflicting duplicate contributions from one extractor', () => {
  const first = claim('a', 'e1', 8);
  const second = { ...first, candidateId: 'b', value: 3000 };
  const result = groupClaims([first, second], [message]);
  expect(result.groups).toHaveLength(0);
  expect(result.diagnostics.filter(d => d.code === 'duplicate_extractor')).toHaveLength(2);
});
it('does not mistake a historical change from one amount to another for a range', () => {
  const text = 'Pasé de 2000 a 3000';
  const msg = { ...message, content: { type: 'text' as const, text } };
  const a = { ...claim('a', 'e1', 8), occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start: 8, end: text.length, text: '2000 a 3000' } } };
  const result = groupClaims([a], [msg]);
  expect(result.groups).toHaveLength(0);
  expect(result.diagnostics).toContainEqual({ candidateId: 'a', code: 'ambiguous_occurrence' });
});
