import { expect, it } from 'vitest';
import { reconcile } from '../../../src/adapters/ai/multipass/reconcile';

const defaultSchema = { id: 'f', version: '1', fields: [
  { id: 'income', label: 'income', description: '', type: 'money' as const, scopes: ['participant' as const, 'buying_unit' as const], cardinality: 'one' as const, units: [], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' },
  { id: 'cities', label: 'cities', description: '', type: 'collection' as const, scopes: ['case' as const], cardinality: 'one' as const, units: [], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' },
  { id: 'city', label: 'city', description: '', type: 'text' as const, scopes: ['case' as const], cardinality: 'one' as const, units: [], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }
] };
const validationContext = { factSchema: defaultSchema, knownSubjects: [{ scope: 'participant' as const, id: 'p' }, { scope: 'buying_unit' as const, id: 'u' }, { scope: 'case' as const, id: 'c' }], historicalAssertions: [], diagnostics: [] };

it('does not accept matching extractors without contextual review', () => {
  const text = 'Gano 2000';
  const candidate = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const group = { groupId: 'g', fieldId: 'income', occurrence: candidate.occurrence, semanticAtomicity: 'context_review_required' as const, candidates: [candidate, { ...candidate, candidateId: 'b', extractorId: 'e2' }, { ...candidate, candidateId: 'c', extractorId: 'e3' }] };
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  expect(reconcile({ groups: [group], reviews: [], messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } }).status).toBe('human_review_required');
});

it('consolidates a supported ordinary claim once regardless of candidate order', () => {
  const text = 'Madrid y Sevilla';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'cities', subjectRef: { scope: 'case' as const, id: 'c' }, value: ['Madrid', 'Sevilla'], precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'collection' };
  const input = { groups: [{ groupId: 'g', fieldId: 'cities', occurrence: a.occurrence, semanticAtomicity: 'context_review_required' as const, candidates: [a, b] }], reviews: [review], messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } };
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
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b, c] }], reviews: [review], messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } }).status).toBe('human_review_required');
});

it('does not consolidate a material candidate with an ambiguous missing amount', () => {
  const text = 'No recuerdo la cifra';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, precision: 'ambiguous' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'the amount is unknown' };
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews: [review], messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } }).status).toBe('human_review_required');
});

it('does not consolidate contradictory contextual verdicts for one candidate', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'supported' };
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews: [review, { ...review, support: 'refuted', justification: 'refuted' }], messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } }).status).toBe('human_review_required');
});

it('requires complete safety scan and review before consolidation', () => {
  expect(reconcile({ groups: [], reviews: [], messages: [], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: undefined } as never).status).not.toBe('consolidated');
});

it('does not count an unreviewed extractor as material corroboration', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'supported' };
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews: [review], messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } }).status).toBe('human_review_required');
});

it('rejects a candidate whose amount violates the fact schema', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 'bad', precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'supported' };
  const factSchema = { id: 'f', version: '1', fields: [{ id: 'income', label: 'income', description: '', type: 'money' as const, scopes: ['participant' as const], cardinality: 'one' as const, units: [], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }] };
  const input = { groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required' as const, candidates: [a] }], reviews: [review], messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] }, factSchema, historicalAssertions: [], knownSubjects: [a.subjectRef], diagnostics: [] };
  expect(reconcile(input).status).not.toBe('consolidated');
});

it('uses the same assertion identity when candidate and extractor ids change', () => {
  const text = 'Madrid';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'city', subjectRef: { scope: 'case' as const, id: 'c' }, value: 'Madrid', precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const run = (candidate: typeof a) => reconcile({ groups: [{ groupId: 'g', fieldId: 'city', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [candidate] }], reviews: [{ groupId: 'g', candidateId: candidate.candidateId, atomicity: 'atomic', support: 'supported', evidenceRefs: a.evidenceRefs, justification: 'supported' }], messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } });
  const first = run(a); const second = run({ ...a, candidateId: 'changed', extractorId: 'other' });
  expect(first.status).toBe('consolidated'); expect(second.status).toBe('consolidated');
  if (first.status === 'consolidated' && second.status === 'consolidated') expect(first.interpretation.assertions[0].assertionId).toBe(second.interpretation.assertions[0].assertionId);
});
it('does not trust an unvalidated safety summary with no completed scan', () => {
  const result = reconcile({ groups: [], reviews: [], messages: [], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { blockers: [], humanReviewRequired: false } } as never);
  expect(result.status).not.toBe('consolidated');
});
it('validates the final assertion against the schema version', () => {
  const text = 'Madrid';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'city', subjectRef: { scope: 'case' as const, id: 'c' }, value: 'Madrid', precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'city', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a] }], reviews: [{ groupId: 'g', candidateId: 'a', atomicity: 'atomic', support: 'supported', evidenceRefs: a.evidenceRefs, justification: 'supported' }], messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: 'wrong', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('failed');
});
it('retains historical and corrective evidence without attributing the old amount to the correction', () => {
  const first = { messageId: 'old', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text: 'Gano 3150 netos' } };
  const second = { ...first, messageId: 'new', occurredAt: '2026-01-02T00:00:00Z', content: { type: 'text' as const, text: 'Me equivoqué, eran brutos' } };
  const prior = { assertionId: 'old-assertion', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 3150, incomeBasis: 'net' as const, rawValue: first.content.text, source: 'customer_message' as const, evidenceRefs: [{ messageId: 'old', quote: first.content.text }], observedAt: first.occurredAt, precision: 'explicit' as const, reviewStatus: 'unreviewed' as const, schemaVersion: '1' };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: prior.subjectRef, incomeBasis: 'gross' as const, precision: 'ambiguous' as const, correction: { dimension: 'incomeBasis' as const, previousAssertionId: prior.assertionId }, occurrence: { messageId: 'new', statementSpan: { start: 0, end: second.content.text.length, text: second.content.text }, previousAssertionId: prior.assertionId }, evidenceRefs: [{ messageId: 'new', quote: second.content.text }] };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a] }], reviews: [{ groupId: 'g', candidateId: 'a', atomicity: 'atomic', support: 'supported', evidenceRefs: a.evidenceRefs, justification: 'basis correction' }], messages: [first, second], materialFieldIds: [], ...validationContext, historicalAssertions: [prior], schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.disputes[0]).toMatchObject({ previousAssertionIds: ['old-assertion'], evidenceRefs: [prior.evidenceRefs[0], a.evidenceRefs[0]] });
});
it('does not ignore a response for a nonexistent dispute', () => {
  const result = reconcile({ groups: [], reviews: [], messages: [], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] }, adjudications: [{ disputeId: 'invented', resolution: { status: 'unresolved', justification: 'unknown' } }] });
  expect(result.status).not.toBe('consolidated');
});
it('rejects duplicate groups for the same occurrence instead of emitting duplicate facts', () => {
  const text = 'Madrid';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'city', subjectRef: { scope: 'case' as const, id: 'c' }, value: 'Madrid', precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const group = { groupId: 'g', fieldId: 'city', occurrence: a.occurrence, semanticAtomicity: 'context_review_required' as const, candidates: [a] };
  const reviews = [a, b].map((c, i) => ({ groupId: i ? 'other' : 'g', candidateId: c.candidateId, atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: c.evidenceRefs, justification: 'supported' }));
  const result = reconcile({ groups: [group, { ...group, groupId: 'other', candidates: [b] }], reviews, messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).not.toBe('consolidated');
});
it('consolidates independently reviewed Laura-style joint income, savings and debt', () => {
  const fields = ['income', 'savings', 'debt'];
  const texts = ['Entre los dos ingresamos 3800 euros netos', 'Tenemos 18000 euros ahorrados', 'Pagamos 300 euros por el coche'];
  const messages = texts.map((text, i) => ({ messageId: `m${i}`, conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } }));
  const factSchema = { ...defaultSchema, fields: [...defaultSchema.fields, ...['savings', 'debt'].map(id => ({ id, label: id, description: '', type: 'money' as const, scopes: ['buying_unit' as const], cardinality: 'one' as const, units: ['EUR'], enumOptions: [], sensitivity: 'normal' as const, schemaVersion: '1' }))] };
  const groups = fields.map((fieldId, i) => {
    const text = texts[i];
    const base = { candidateId: `a${i}`, extractorId: 'e1', fieldId, subjectRef: { scope: 'buying_unit' as const, id: 'u' }, value: [3800, 18000, 300][i], ...(i ? { unit: 'EUR' } : { incomeBasis: 'net' as const }), precision: 'explicit' as const, occurrence: { messageId: `m${i}`, statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: `m${i}`, quote: text }] };
    return { groupId: `g${i}`, fieldId, occurrence: base.occurrence, semanticAtomicity: 'context_review_required' as const, candidates: [base, { ...base, candidateId: `b${i}`, extractorId: 'e2' }] };
  });
  const reviews = groups.flatMap(g => g.candidates.map(c => ({ groupId: g.groupId, candidateId: c.candidateId, atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: c.evidenceRefs, justification: 'supported' })));
  const result = reconcile({ groups, reviews, messages, materialFieldIds: fields, ...validationContext, factSchema, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('consolidated');
  if (result.status === 'consolidated') expect(result.interpretation.assertions.map(a => [a.fieldId, a.value, a.subjectRef.scope]).sort()).toEqual([['debt', 300, 'buying_unit'], ['income', 3800, 'buying_unit'], ['savings', 18000, 'buying_unit']]);
});
it('preserves a reviewed explicit zero savings amount', () => {
  const text = 'No tengo ahorros, cero euros';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'savings', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 0, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2' };
  const reviews = [a, b].map(c => ({ groupId: 'g', candidateId: c.candidateId, atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: c.evidenceRefs, justification: 'zero stated' }));
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'savings', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews, messages: [message], materialFieldIds: ['savings'], ...validationContext, factSchema: { ...defaultSchema, fields: [...defaultSchema.fields, { ...defaultSchema.fields[0], id: 'savings', label: 'savings' }] }, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('consolidated');
  if (result.status === 'consolidated') expect(result.interpretation.assertions[0].value).toBe(0);
});
it('rejects structurally valid groups that combine unrelated occurrences', () => {
  const text = 'Madrid y Sevilla';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const base = { candidateId: 'a', extractorId: 'e1', fieldId: 'city', subjectRef: { scope: 'case' as const, id: 'c' }, value: 'Madrid', precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start: 0, end: 6, text: 'Madrid' } }, evidenceRefs: [{ messageId: 'm', quote: 'Madrid' }] };
  const other = { ...base, candidateId: 'b', extractorId: 'e2', occurrence: { ...base.occurrence, focusSpan: { start: 9, end: 16, text: 'Sevilla' } }, evidenceRefs: [{ messageId: 'm', quote: 'Sevilla' }] };
  const reviews = [base, other].map(c => ({ groupId: 'g', candidateId: c.candidateId, atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: c.evidenceRefs, justification: 'review' }));
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'city', occurrence: base.occurrence, semanticAtomicity: 'context_review_required', candidates: [base, other] }], reviews, messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).not.toBe('consolidated');
});
it('rejects a correction whose historical evidence is invented', () => {
  const first = { messageId: 'old', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text: 'Gano 3150 netos' } };
  const second = { ...first, messageId: 'new', occurredAt: '2026-01-02T00:00:00Z', content: { type: 'text' as const, text: 'Me equivoqué, eran brutos' } };
  const prior = { assertionId: 'old-assertion', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 3150, incomeBasis: 'net' as const, rawValue: first.content.text, source: 'customer_message' as const, evidenceRefs: [{ messageId: 'old', quote: 'inventado' }], observedAt: first.occurredAt, precision: 'explicit' as const, reviewStatus: 'unreviewed' as const, schemaVersion: '1' };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: prior.subjectRef, incomeBasis: 'gross' as const, precision: 'ambiguous' as const, correction: { dimension: 'incomeBasis' as const, previousAssertionId: prior.assertionId }, occurrence: { messageId: 'new', statementSpan: { start: 0, end: second.content.text.length, text: second.content.text }, previousAssertionId: prior.assertionId }, evidenceRefs: [{ messageId: 'new', quote: second.content.text }] };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a] }], reviews: [], messages: [first, second], materialFieldIds: [], ...validationContext, historicalAssertions: [prior], schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('failed');
});
it('keeps a historical subject correction for review with both subject identities', () => {
  const first = { messageId: 'old', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text: 'Ingresamos 2000' } };
  const second = { ...first, messageId: 'new', occurredAt: '2026-01-02T00:00:00Z', content: { type: 'text' as const, text: 'Es mi sueldo individual' } };
  const prior = { assertionId: 'old-assertion', fieldId: 'income', subjectRef: { scope: 'buying_unit' as const, id: 'u' }, value: 2000, rawValue: first.content.text, source: 'customer_message' as const, evidenceRefs: [{ messageId: 'old', quote: first.content.text }], observedAt: first.occurredAt, precision: 'explicit' as const, reviewStatus: 'unreviewed' as const, schemaVersion: '1' };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, precision: 'ambiguous' as const, correction: { dimension: 'subjectRef' as const, previousAssertionId: prior.assertionId }, occurrence: { messageId: 'new', statementSpan: { start: 0, end: second.content.text.length, text: second.content.text }, previousAssertionId: prior.assertionId }, evidenceRefs: [{ messageId: 'new', quote: second.content.text }] };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a] }], reviews: [{ groupId: 'g', candidateId: 'a', atomicity: 'atomic', support: 'supported', evidenceRefs: a.evidenceRefs, justification: 'subject correction' }], messages: [first, second], materialFieldIds: ['income'], ...validationContext, historicalAssertions: [prior], schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.disputes[0].previousAssertionIds).toEqual(['old-assertion']);
});
it('keeps numeric assertion identity when focus wording changes around the same amount', () => {
  const text = 'Gano 2000 euros';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const make = (focus: { start: number; end: number; text: string }) => {
    const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text }, focusSpan: focus }, evidenceRefs: [{ messageId: 'm', quote: text }] };
    return reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a] }], reviews: [{ groupId: 'g', candidateId: 'a', atomicity: 'atomic', support: 'supported', evidenceRefs: a.evidenceRefs, justification: 'supported' }], messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  };
  const first = make({ start: 5, end: 9, text: '2000' }); const second = make({ start: 5, end: 15, text: '2000 euros' });
  expect(first.status).toBe('consolidated'); expect(second.status).toBe('consolidated');
  if (first.status === 'consolidated' && second.status === 'consolidated') expect(first.interpretation.assertions[0].assertionId).toBe(second.interpretation.assertions[0].assertionId);
});
it('does not resolve a reviewed 2–1 material value conflict by majority', () => {
  const text = 'Entre 2000 y 3000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: { min: 2000, max: 3000 }, precision: 'approximate' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const candidates = [a, { ...a, candidateId: 'b', extractorId: 'e2' }, { ...a, candidateId: 'c', extractorId: 'e3', value: 2000 }];
  const reviews = candidates.map(c => ({ groupId: 'g', candidateId: c.candidateId, atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: c.evidenceRefs, justification: 'simulated' }));
  const input = { groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required' as const, candidates }], reviews, messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [], verdicts: [], historicalBlockers: [] } };
  const result = reconcile(input);
  expect(result.status).toBe('human_review_required');
  expect(reconcile({ ...input, groups: [{ ...input.groups[0], candidates: [...candidates].reverse() }], reviews: [...reviews].reverse() })).toEqual(result);
});
it('does not accept a valid candidate corroborated by an invalid one', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, candidateId: 'b', extractorId: 'e2', unit: 'INVALID' };
  const reviews = [a, b].map(c => ({ groupId: 'g', candidateId: c.candidateId, atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: c.evidenceRefs, justification: 'supported' }));
  expect(reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews, messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } }).status).toBe('failed');
});
it('requires human review when adjudication overlaps a confirmed protected signal', () => {
  const text = 'No me llaméis';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'city', subjectRef: { scope: 'case' as const, id: 'c' }, value: 'Madrid', precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const signal = { signalId: 's', category: 'OPT_OUT' as const, evidenceRefs: a.evidenceRefs };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'city', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a] }], reviews: [{ groupId: 'g', candidateId: 'a', atomicity: 'atomic', support: 'supported', evidenceRefs: a.evidenceRefs, justification: 'simulated' }], messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [signal], verdicts: [{ signalId: 's', status: 'confirmed', justification: 'opt out', evidenceRefs: signal.evidenceRefs }], historicalBlockers: [] }, adjudications: [{ disputeId: 'g', resolution: { status: 'selected', candidateId: 'a', justification: 'simulated', evidenceRefs: a.evidenceRefs } }] });
  expect(result.status).toBe('human_review_required');
});
it('preserves the unresolved protected signal and its evidence in the review result', () => {
  const text = 'No me llaméis';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const signal = { signalId: 's', category: 'OPT_OUT' as const, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const result = reconcile({ groups: [], reviews: [], messages: [message], materialFieldIds: [], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [signal], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result).toMatchObject({ safetyFindings: [{ signalId: 's', status: 'uncertain', evidenceRefs: signal.evidenceRefs }] });
});
it.each([
  { dimension: 'value' as const, extra: { value: 4000 }, text: 'Corrijo, son 4000' },
  { dimension: 'period' as const, extra: { period: 'annual' }, text: 'Corrijo, es anual' },
  { dimension: 'unit' as const, extra: { unit: 'EUR' }, text: 'Corrijo, son euros' },
])('keeps an unresolved historical $dimension correction for human review', ({ dimension, extra, text }) => {
  const first = { messageId: 'old', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text: 'Gano 3150' } };
  const second = { ...first, messageId: 'new', occurredAt: '2026-01-02T00:00:00Z', content: { type: 'text' as const, text } };
  const prior = { assertionId: 'prior', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 3150, rawValue: first.content.text, source: 'customer_message' as const, evidenceRefs: [{ messageId: 'old', quote: first.content.text }], observedAt: first.occurredAt, precision: 'explicit' as const, reviewStatus: 'unreviewed' as const, schemaVersion: '1' };
  const candidate = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: prior.subjectRef, ...extra, precision: 'ambiguous' as const, correction: { dimension, previousAssertionId: 'prior' }, occurrence: { messageId: 'new', statementSpan: { start: 0, end: text.length, text }, previousAssertionId: 'prior' }, evidenceRefs: [{ messageId: 'new', quote: text }] };
  const factSchema = { ...defaultSchema, fields: defaultSchema.fields.map(f => f.id === 'income' ? { ...f, units: ['EUR'] } : f) };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: candidate.occurrence, semanticAtomicity: 'context_review_required', candidates: [candidate] }], reviews: [{ groupId: 'g', candidateId: 'a', atomicity: 'atomic', support: 'supported', evidenceRefs: candidate.evidenceRefs, justification: 'correction' }], messages: [first, second], materialFieldIds: ['income'], ...validationContext, factSchema, historicalAssertions: [prior], schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('human_review_required');
  if (result.status === 'human_review_required') expect(result.disputes[0].previousAssertionIds).toEqual(['prior']);
});
it('treats explicit missing information as a clarification rather than a historical correction', () => {
  const text = 'No sé cuánto gano';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'a', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, precision: 'ambiguous' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const review = { groupId: 'g', candidateId: 'a', atomicity: 'atomic' as const, support: 'absent' as const, evidenceRefs: a.evidenceRefs, justification: 'customer does not know' };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a] }], reviews: [review], messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } } as never);
  expect(result.status).toBe('consolidated');
  if (result.status === 'consolidated') expect(result.interpretation.assertions).toHaveLength(0);
});
it('rejects duplicate candidate identifiers within the same group', () => {
  const text = 'Gano 2000';
  const message = { messageId: 'm', conversationId: 'c', role: 'customer' as const, occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text' as const, text } };
  const a = { candidateId: 'same', extractorId: 'e1', fieldId: 'income', subjectRef: { scope: 'participant' as const, id: 'p' }, value: 2000, precision: 'explicit' as const, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const b = { ...a, extractorId: 'e2' };
  const review = { groupId: 'g', candidateId: 'same', atomicity: 'atomic' as const, support: 'supported' as const, evidenceRefs: a.evidenceRefs, justification: 'supported' };
  const result = reconcile({ groups: [{ groupId: 'g', fieldId: 'income', occurrence: a.occurrence, semanticAtomicity: 'context_review_required', candidates: [a, b] }], reviews: [review], messages: [message], materialFieldIds: ['income'], ...validationContext, schemaVersion: '1', safety: { scanStatus: 'complete', reviewStatus: 'complete', candidates: [], verdicts: [], historicalBlockers: [] } });
  expect(result.status).toBe('failed');
});
