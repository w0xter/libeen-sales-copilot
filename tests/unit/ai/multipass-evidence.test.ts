import { describe, expect, it } from 'vitest';
import { locateEvidenceRef, locateOccurrence, validateOccurrence } from '../../../src/adapters/ai/multipass/evidence';

const message = { messageId: 'm1', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text: '😀 gano 2.000 €' } };
const occurrence = { messageId: 'm1', statementSpan: { start: 3, end: 15, text: 'gano 2.000 €' }, focusSpan: { start: 8, end: 15, text: '2.000 €' } };

describe('occurrence evidence', () => {
  it('uses UTF-16 offsets and exact original text', () => {
    expect(validateOccurrence(occurrence, [message])).toBe(true);
    expect(validateOccurrence({ ...occurrence, focusSpan: { start: 7, end: 15, text: '2.000 €' } }, [message])).toBe(false);
  });
  it('rejects missing messages, non-customer messages and spans outside the statement', () => {
    expect(validateOccurrence(occurrence, [])).toBe(false);
    expect(validateOccurrence(occurrence, [{ ...message, role: 'advisor' }])).toBe(false);
    expect(validateOccurrence({ ...occurrence, statementSpan: { start: 3, end: 7, text: 'gano' } }, [message])).toBe(false);
  });
});
it('rejects offsets that split an emoji surrogate pair', () => {
  const split = { messageId: 'm1', statementSpan: { start: 0, end: 1, text: message.content.text.slice(0, 1) } };
  expect(validateOccurrence(split, [message])).toBe(false);
});

it('derives UTF-16 offsets from unique exact statement and focus quotes', () => {
  const wrong = { ...occurrence, statementSpan: { ...occurrence.statementSpan, start: 0, end: 1 }, focusSpan: { ...occurrence.focusSpan, start: 0, end: 1 } };
  expect(locateOccurrence(wrong, [message])).toEqual(occurrence);
});

it('locates an equal amount only within its unique statement', () => {
  const text = 'Yo gano 2.000 € y ella 2.000 €.';
  const m = { ...message, content: { type: 'text' as const, text } };
  const input = { messageId: 'm1', statementSpan: { start: 0, end: 1, text: 'Yo gano 2.000 €' }, focusSpan: { start: 0, end: 1, text: '2.000 €' } };
  expect(locateOccurrence(input, [m])).toMatchObject({ statementSpan: { start: 0, end: 15 }, focusSpan: { start: 8, end: 15 } });
});

it('rejects absent or ambiguous quotes and non-customer sources', () => {
  const text = 'Yo gano 2.000 € y ella 2.000 €.';
  const m = { ...message, content: { type: 'text' as const, text } };
  const span = { start: 0, end: 1, text: '2.000 €' };
  expect(locateOccurrence({ messageId: 'm1', statementSpan: span }, [m])).toBeUndefined();
  expect(locateOccurrence({ messageId: 'm1', statementSpan: { ...span, text: 'inexistente' } }, [m])).toBeUndefined();
  expect(locateOccurrence({ messageId: 'm1', statementSpan: { ...span, text }, focusSpan: span }, [m])).toBeUndefined();
  expect(locateOccurrence(occurrence, [{ ...message, role: 'advisor' }])).toBeUndefined();
});

it('locates uniquely quoted evidence and rejects ambiguous, absent or unquoted references', () => {
  expect(locateEvidenceRef({ messageId: 'm1', quote: '2.000 €', start: 0, end: 1 }, [message])).toEqual({ messageId: 'm1', quote: '2.000 €', start: 8, end: 15 });
  const repeated = { ...message, content: { type: 'text' as const, text: '2.000 € y 2.000 €' } };
  expect(locateEvidenceRef({ messageId: 'm1', quote: '2.000 €' }, [repeated])).toBeUndefined();
  expect(locateEvidenceRef({ messageId: 'm1', quote: 'no existe' }, [message])).toBeUndefined();
  expect(locateEvidenceRef({ messageId: 'm1' }, [message])).toBeUndefined();
});
