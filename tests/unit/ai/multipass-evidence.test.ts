import { describe, expect, it } from 'vitest';
import { validateOccurrence } from '../../../src/adapters/ai/multipass/evidence';

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
