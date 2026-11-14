import { describe, expect, it } from 'vitest';
import { groupClaims } from '../../../src/adapters/ai/multipass/grouping';
import type { ClaimCandidate } from '../../../src/adapters/ai/multipass/contracts';

const text = 'Yo gano 2.000 € y ella 2.000 €.';
const message = { messageId: 'm1', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
function claim(id: string, extractorId: string, start: number, scope: 'participant' | 'buying_unit' = 'participant'): ClaimCandidate {
  return { candidateId: id, extractorId, fieldId: 'income', subjectRef: { scope, id: 'p' }, value: 2000, precision: 'explicit', evidenceRefs: [{ messageId: 'm1' }], occurrence: { messageId: 'm1', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + 7, text: '2.000 €' } } };
}
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
  const correction: ClaimCandidate = { ...claim('correction', 'e1', 8), value: undefined, correction: true, incomeBasis: 'gross', precision: 'ambiguous', evidenceRefs: [{ messageId: 'm3' }], occurrence: { messageId: 'm3', statementSpan: { start: 0, end: correctionText.length, text: correctionText }, focusSpan: { start: 19, end: 25, text: 'brutos' }, previousAssertionId: 'previous' } };
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
