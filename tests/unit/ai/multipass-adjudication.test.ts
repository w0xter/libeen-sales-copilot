import { expect, it } from 'vitest';
import { validateAdjudication } from '../../../src/adapters/ai/multipass/adjudication';
it('rejects a selection outside the dispute', () => {
  expect(validateAdjudication({ disputeId: 'd', resolution: { status: 'selected', candidateId: 'invented', justification: 'x', evidenceRefs: [{ messageId: 'm', quote: 'x' }] } }, [{ disputeId: 'd', groupId: 'g', candidateIds: ['a'], reason: 'scope' }], [], [], [])).toBe(false);
});
it('rejects an invented quote even when the candidate exists', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const candidate = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: candidate.evidenceRefs, justification: 'supported' };
  expect(validateAdjudication({ disputeId: 'd', resolution: { status: 'selected', candidateId: 'a', justification: 'x', evidenceRefs: [{ messageId: 'm', quote: 'invented' }] } }, [{ disputeId: 'd', groupId: 'g', candidateIds: ['a'], reason: 'scope' }], [candidate], [review], [message])).toBe(false);
});
it('rejects selection when contextual reviews disagree', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const candidate = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: candidate.evidenceRefs, justification: 'supported' };
  expect(validateAdjudication({ disputeId: 'd', resolution: { status: 'selected', candidateId: 'a', justification: 'x', evidenceRefs: candidate.evidenceRefs } }, [{ disputeId: 'd', groupId: 'g', candidateIds: ['a'], reason: 'scope' }], [candidate], [review, { ...review, support: 'refuted', justification: 'refuted' }], [message])).toBe(false);
});
