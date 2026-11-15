import { expect, it } from 'vitest';
import type { ClaimCandidate } from '../../../src/adapters/ai/multipass/contracts';
import { reconcile } from '../../../src/adapters/ai/multipass/reconcile';

const text = 'Gano 3150 euros brutos al mes';
const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
const base = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 3150, unit: 'EUR', period: 'month' as const, incomeBasis: 'gross' as const, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
const schema = { id: 'f', version: '1', fields: [{ id: 'income', label: 'income', description: '', type: 'money' as const, scopes: ['participant' as const], cardinality: 'one' as const, units: ['EUR'], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }] };
const safety = { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] };
const review = (candidateId: string, support: 'supported' | 'refuted' | 'uncertain') => ({ groupId: 'g', candidateId, atomicity: 'atomic' as const, support, evidenceRefs: base.evidenceRefs, justification: 'context review' });
const input = (candidates: ClaimCandidate[], reviews: ReturnType<typeof review>[]) => ({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: base.occurrence, semanticAtomicity: 'context_review_required' as const, candidates }], reviews, messages: [message], materialFieldIds: ['income'], factSchema: schema, knownSubjects: [base.subjectRef], historicalAssertions: [], diagnostics: [], schemaVersion: '1', safety });

it('isolates a refuted income basis while keeping the supported alternative pending for human review', () => {
  const net = { ...base, candidateId: 'b', extractorId: 'e2', incomeBasis: 'net' as const };
  const result = reconcile(input([base, net], [review('a', 'supported'), review('b', 'refuted')]));
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') {
    expect(result.trace).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidateId: 'a', decision: 'pending' }),
      expect.objectContaining({ candidateId: 'b', decision: 'excluded', reason: expect.stringMatching(/refut/i) }),
    ]));
    expect(result.disputes[0].candidateIds).toEqual(['a', 'b']);
  }
});

it('does not classify contradictory reviews as a valid refutation', () => {
  const result = reconcile(input([base], [review('a', 'refuted'), review('a', 'supported')]));
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.trace[0]).toMatchObject({ candidateId: 'a', decision: 'pending' });
});

it('keeps a refuted candidate excluded and an uncertain alternative pending without selecting by elimination', () => {
  const net = { ...base, candidateId: 'b', extractorId: 'e2', incomeBasis: 'net' as const };
  const result = reconcile(input([base, net], [review('a', 'refuted'), review('b', 'uncertain')]));
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.trace).toEqual(expect.arrayContaining([
    expect.objectContaining({ candidateId: 'a', decision: 'excluded' }),
    expect.objectContaining({ candidateId: 'b', decision: 'pending' }),
  ]));
});

it('does not exclude an assertion when equivalent candidates receive contradictory verdicts', () => {
  const same = { ...base, candidateId: 'b', extractorId: 'e2' };
  const result = reconcile(input([base, same], [review('a', 'supported'), review('b', 'refuted')]));
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.trace.map(t => t.decision)).toEqual(['pending', 'pending']);
});

it('does not let adjudication select a supported variant in the presence of a refutation', () => {
  const net = { ...base, candidateId: 'b', extractorId: 'e2', incomeBasis: 'net' as const };
  const result = reconcile({ ...input([base, net], [review('a', 'supported'), review('b', 'refuted')]), adjudications: [{ disputeId: 'g', resolution: { status: 'selected' as const, candidateId: 'a', justification: 'selection', evidenceRefs: base.evidenceRefs } }] });
  expect(result.status).toBe('human_review_required');
});

it('does not treat an unanchored refutation as a valid exclusion', () => {
  const net = { ...base, candidateId: 'b', extractorId: 'e2', incomeBasis: 'net' as const };
  const result = reconcile(input([base, net], [review('a', 'supported'), { ...review('b', 'refuted'), evidenceRefs: [{ messageId: 'm', quote: 'not in the message' }] }]));
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.trace.find(t => t.candidateId === 'b')?.decision).toBe('pending');
});

it('requires review when an equivalent candidate is uncertain', () => {
  const same = { ...base, candidateId: 'b', extractorId: 'e2' };
  const result = reconcile(input([base, same], [review('a', 'supported'), review('b', 'uncertain')]));
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.trace.map(t => t.decision)).toEqual(['pending', 'pending']);
});

it('does not consolidate when a present review has unrelated evidence, even with two supported candidates', () => {
  const b = { ...base, candidateId: 'b', extractorId: 'e2' };
  const c = { ...base, candidateId: 'c', extractorId: 'e3' };
  const result = reconcile(input([base, b, c], [review('a', 'supported'), review('b', 'supported'), { ...review('c', 'supported'), evidenceRefs: [{ messageId: 'm', quote: 'not in the message' }] }]));
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.trace.find(t => t.candidateId === 'c')?.decision).toBe('pending');
});
