import { expect, it } from 'vitest';
import { reconcile } from '../../../src/adapters/ai/multipass/reconcile';
it('does not accept matching extractors without contextual review', () => {
  const text = 'Gano 2000';
  const candidate = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const group = { groupId: 'g', fieldId: 'income', occurrence: candidate.occurrence, semanticAtomicity: 'context_review_required' as const, candidates: [candidate, { ...candidate, candidateId: 'b', extractorId: 'e2' }, { ...candidate, candidateId: 'c', extractorId: 'e3' }] };
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  expect(reconcile({ groups: [group], reviews: [], messages: [message], materialFieldIds: ['income'], schemaVersion: '1', safety: { blockers: [], humanReviewRequired: false } }).status).toBe('human_review_required');
});

it('consolidates a supported ordinary claim once regardless of candidate order', () => {
  const text = 'Madrid y Sevilla';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'cities', subjectRef: { scope: 'case' as const, id: 'c' }, value: ['Madrid', 'Sevilla'], precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'collection' };
  const input = { groups: [{ groupId: 'g', fieldId: 'cities', occurrence: a.occurrence, semanticAtomicity: 'context_review_required' as const, candidates: [a, b] }], reviews: [review], messages: [message], materialFieldIds: [], schemaVersion: '1', safety: { blockers: [], humanReviewRequired: false } };
  const result = reconcile(input);
  expect(result.status).toBe('consolidated');
  if (result.status === 'consolidated') expect(result.interpretation.assertions).toHaveLength(1);
  expect(reconcile({ ...input, groups: [{ ...input.groups[0], candidates: [b, a] }] })).toEqual(result);
});

it('keeps conflicting subject scopes unresolved despite a majority', () => {
  const text = 'Entre 2000 y 3000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: { min: 2000, max: 3000 }, precision: 'approximate' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const c = { ...a, candidateId: 'c', extractorId: 'e3', subjectRef: { scope: 'buying_unit' as const, id: 'u' } };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'context' };
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b, c] }], reviews: [review], messages: [message], materialFieldIds: ['income'], schemaVersion: '1', safety: { blockers: [], humanReviewRequired: false } }).status).toBe('human_review_required');
});

it('does not consolidate a material candidate with an ambiguous missing amount', () => {
  const text = 'No recuerdo la cifra';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, precision: 'ambiguous' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'the amount is unknown' };
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews: [review], messages: [message], materialFieldIds: ['income'], schemaVersion: '1', safety: { blockers: [], humanReviewRequired: false } }).status).toBe('human_review_required');
});

it('does not consolidate contradictory contextual verdicts for one candidate', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'supported' };
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews: [review, { ...review, support: 'refuted', justification: 'refuted' }], messages: [message], materialFieldIds: ['income'], schemaVersion: '1', safety: { blockers: [], humanReviewRequired: false } }).status).toBe('human_review_required');
});
