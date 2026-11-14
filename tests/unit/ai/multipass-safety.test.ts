import { expect, it } from 'vitest';
import { reconcileSafety } from '../../../src/adapters/ai/multipass/safety';

it('keeps an unreviewed protected scanner finding uncertain', () => {
  const result = reconcileSafety([{ signalId: 's', category: 'OPT_OUT', evidenceRefs: [{ messageId: 'm', quote: 'no me llaméis' }] }], [], [{ messageId: 'm', conversationId: 'c', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text', text: 'no me llaméis' } }], []);
  expect(result.humanReviewRequired).toBe(true);
  expect(result.blockers).toHaveLength(0);
});
it('preserves confirmed urgency while dismissing a false opt-out and retains historical blockers', () => {
  const text = '¿Podría alquilar? Necesito ayuda urgente';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const opt = { signalId: 'opt', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: '¿Podría alquilar?' }] };
  const urgent = { signalId: 'urgent', category: 'URGENT' as const, evidenceRefs: [{ messageId: 'm', quote: 'Necesito ayuda urgente' }] };
  const old = { id: 'old', type: 'TRUST', description: 'prior', status: 'open' as const, evidenceRefs: [] };
  const verdicts = [{ signalId: 'opt', status: 'dismissed' as const, justification: 'Conditional question', evidenceRefs: opt.evidenceRefs }, { signalId: 'urgent', status: 'confirmed' as const, justification: 'Urgency', evidenceRefs: urgent.evidenceRefs }];
  const result = reconcileSafety([opt, urgent], verdicts, messages, [old]);
  expect(result.blockers.map(b => b.id)).toEqual(['old', 'urgent']);
  expect(result.humanReviewRequired).toBe(false);
});
