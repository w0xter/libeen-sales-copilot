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
it('does not use a different sentence to dismiss an opt-out in the same message', () => {
  const text = 'No me llaméis. Necesito ayuda urgente.';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const candidate = { signalId: 's', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: 'No me llaméis.' }] };
  const verdict = { signalId: 's', status: 'dismissed' as const, justification: 'urgency', evidenceRefs: [{ messageId: 'm', quote: 'Necesito ayuda urgente.' }] };
  const result = reconcileSafety([candidate], [verdict], messages, []);
  expect(result.humanReviewRequired).toBe(true);
  expect(result.findings[0].status).toBe('uncertain');
});
it('keeps repeated quote without offsets uncertain and does not duplicate historical blockers', () => {
  const text = 'No me llaméis. No me llaméis.';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const signal = { signalId: 's', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: 'No me llaméis.' }] };
  const verdict = { signalId: 's', status: 'confirmed' as const, justification: 'No contact', evidenceRefs: signal.evidenceRefs };
  expect(reconcileSafety([signal], [verdict], messages, []).humanReviewRequired).toBe(true);
});
it('does not duplicate a historical blocker when the same signal is confirmed', () => {
  const text = 'No me llaméis';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const signal = { signalId: 's', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const verdict = { signalId: 's', status: 'confirmed' as const, justification: 'No contact', evidenceRefs: signal.evidenceRefs };
  const old = { id: 's', type: 'OPT_OUT', description: 'prior', status: 'open' as const, evidenceRefs: signal.evidenceRefs };
  expect(reconcileSafety([signal], [verdict], messages, [old]).blockers).toEqual([old]);
});
it('keeps an opt-out found by one scanner when its review confirms it', () => {
  const text = 'No quiero más llamadas';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const signal = { signalId: 'only-scanner', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const verdict = { signalId: signal.signalId, status: 'confirmed' as const, justification: 'explicit refusal', evidenceRefs: signal.evidenceRefs };
  expect(reconcileSafety([signal], [verdict], messages, []).blockers.map(b => b.type)).toEqual(['OPT_OUT']);
});
it('keeps urgency and binding request separately and dismisses a conditional rental question', () => {
  const text = '¿Podría alquilar? Es urgente. Quiero una aprobación por escrito.';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const signals = [ { signalId: 'o', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: '¿Podría alquilar?' }] }, { signalId: 'u', category: 'URGENT' as const, evidenceRefs: [{ messageId: 'm', quote: 'Es urgente.' }] }, { signalId: 'b', category: 'BINDING_CLAIM' as const, evidenceRefs: [{ messageId: 'm', quote: 'Quiero una aprobación por escrito.' }] } ];
  const verdicts = signals.map(s => ({ signalId: s.signalId, status: s.signalId === 'o' ? 'dismissed' as const : 'confirmed' as const, evidenceRefs: s.evidenceRefs, justification: 'context' }));
  const result = reconcileSafety(signals, verdicts, messages, []);
  expect(result.blockers.map(b => b.type).sort()).toEqual(['BINDING_CLAIM', 'URGENT']);
  expect(reconcileSafety([...signals].reverse(), [...verdicts].reverse(), messages, [])).toEqual(result);
});
it('distinguishes a simulated trust finding from a cost complaint without inferring signals', () => {
  const text = 'Es caro. No confío en vosotros.';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const signal = { signalId: 'trust', category: 'TRUST' as const, evidenceRefs: [{ messageId: 'm', quote: 'No confío en vosotros.' }] };
  const falseVerdict = { signalId: 'trust', status: 'confirmed' as const, justification: 'cost', evidenceRefs: [{ messageId: 'm', quote: 'Es caro.' }] };
  expect(reconcileSafety([signal], [falseVerdict], messages, []).humanReviewRequired).toBe(true);
  const genuine = { ...falseVerdict, justification: 'trust', evidenceRefs: signal.evidenceRefs };
  expect(reconcileSafety([signal], [genuine], messages, []).blockers.map(b => b.type)).toEqual(['TRUST']);
  expect(reconcileSafety([], [], messages, []).blockers).toEqual([]);
});
it('does not duplicate a historical protected finding just because the scanner changes its id', () => {
  const text = 'No me llaméis';
  const messages = [{ messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }];
  const signal = { signalId: 'new-id', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const verdict = { signalId: signal.signalId, status: 'confirmed' as const, justification: 'No contact', evidenceRefs: signal.evidenceRefs };
  const old = { id: 'old-id', type: 'OPT_OUT', description: 'prior', status: 'open' as const, evidenceRefs: signal.evidenceRefs };
  expect(reconcileSafety([signal], [verdict], messages, [old]).blockers).toEqual([old]);
});
