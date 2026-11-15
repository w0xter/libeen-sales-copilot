import { describe, expect, it } from 'vitest';
import { bindSubjects, validateAttribution } from '../../../src/adapters/ai/multipass/subjects';
import { groupClaims } from '../../../src/adapters/ai/multipass/grouping';
import { demoBundle } from '../../../src/config';
import type { ClaimCandidate, ContextReview } from '../../../src/adapters/ai/multipass/contracts';
import type { Message } from '../../../src/contracts';

type Input = { caseId: string; message: { messageId: string; role: string; content: { type: string; text: string } }; candidateId: string; candidateScope: string; occurrence: { messageId: string; statementSpan: { start: number; end: number; text: string } }; attribution: { kind: string; messageId: string; evidenceRefs: { messageId: string; quote: string; start: number; end: number }[]; justification: string } };
const resolve = (input: Input) => validateAttribution(input);
const input = (): Input => ({ caseId: 'case-1', message: { messageId: 'm1', role: 'customer', content: { type: 'text', text: 'Yo gano 2000.' } }, candidateId: 'candidate-a', candidateScope: 'participant', occurrence: { messageId: 'm1', statementSpan: { start: 0, end: 13, text: 'Yo gano 2000.' } }, attribution: { kind: 'local_speaker', messageId: 'm1', evidenceRefs: [{ messageId: 'm1', quote: 'Yo', start: 0, end: 2 }], justification: 'First person' } });
describe('validated contextual attribution', () => {
  it('assigns stable case-and-message local identity without relying on candidate ID', () => {
    const first = input(); const a = resolve(first); const b = resolve({ ...first, candidateId: 'other' });
    expect(a).toMatchObject({ status: 'resolved', subject: { id: expect.any(String) }, evidence: expect.anything() });
    if (a.status !== 'resolved' || b.status !== 'resolved') throw Error('expected resolved');
    expect(a.subject).toEqual(b.subject);
    const other = resolve({ ...first, message: { ...first.message, messageId: 'm2' }, occurrence: { ...first.occurrence, messageId: 'm2' }, attribution: { ...first.attribution, messageId: 'm2', evidenceRefs: [{ ...first.attribution.evidenceRefs[0], messageId: 'm2' }] } });
    expect(other.status).toBe('resolved');
    if (other.status === 'resolved') expect(other.subject).not.toEqual(a.subject);
  });
  it.each(['advisor', 'system'])('rejects a noncustomer %s source', role => { const value = input(); value.message.role = role; expect(resolve(value)).toMatchObject({ status: 'unresolved' }); });
  it('rejects forged evidence and mismatched message or scope', () => {
    const value = input();
    expect(resolve({ ...value, attribution: { ...value.attribution, evidenceRefs: [{ ...value.attribution.evidenceRefs[0], quote: 'invented' }] } })).toMatchObject({ status: 'unresolved' });
    expect(resolve({ ...value, attribution: { ...value.attribution, messageId: 'other' } })).toMatchObject({ status: 'unresolved' });
    expect(resolve({ ...value, candidateScope: 'buying_unit' })).toMatchObject({ status: 'unresolved' });
  });
  it.each(['ambiguous', 'other_person'])('does not authorize %s as a speaker', kind => { const value = input(); expect(resolve({ ...value, attribution: { ...value.attribution, kind } })).toMatchObject({ status: 'unresolved' }); });
});

describe('subject binding', () => {
  const text = 'Yo gano 2000 euros.';
  const message: Message = { messageId: 'm', conversationId: 'c', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text', text } };
  const candidate = (id: string): ClaimCandidate => ({ candidateId: id, extractorId: id, fieldId: 'declared_monthly_income', subjectRef: { scope: 'participant', id: 'invented' }, value: 2000, unit: 'EUR', precision: 'explicit', occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start: 8, end: 12, text: '2000' } }, evidenceRefs: [{ messageId: 'm', quote: '2000', start: 8, end: 12 }] });
  const setup = () => {
    const candidates = [candidate('a'), candidate('b')];
    const grouped = groupClaims(candidates, [message], { factSchema: demoBundle.factSchema, assertions: [], caseId: 'case' });
    const reviews: ContextReview[] = candidates.map(c => ({ groupId: grouped.groups[0].groupId, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', evidenceRefs: c.evidenceRefs, justification: 'supported', subjectAttribution: { kind: 'local_speaker', messageId: 'm', evidenceRefs: [{ messageId: 'm', quote: 'Yo', start: 0, end: 2 }], justification: 'speaker' } }));
    return { groups: grouped.groups, reviews, messages: [message], historicalAssertions: [], knownSubjects: [], caseId: 'case', diagnostics: grouped.diagnostics };
  };
  it('replaces extractor IDs with a stable local reference irrespective of order', () => {
    const value = setup(); const a = bindSubjects(value);
    const b = bindSubjects({ ...value, groups: value.groups.map(g => ({ ...g, candidates: [...g.candidates].reverse() })), reviews: [...value.reviews].reverse() });
    expect(a.status).toBe('success'); expect(a.authorizedSubjects).toEqual(b.authorizedSubjects);
    expect(a.authorizedSubjects[0].id).not.toBe('invented');
    expect(a.groups[0].candidates.every(c => c.subjectRef.id === a.authorizedSubjects[0].id)).toBe(true);
  });
  it.each(['missing', 'other-message', 'third-person', 'ambiguous', 'contradiction', 'duplicate'] as const)('requires review for %s attribution', mode => {
    const value = setup();
    if (mode === 'missing') delete value.reviews[0].subjectAttribution;
    if (mode === 'other-message') value.reviews[0].subjectAttribution!.messageId = 'other';
    if (mode === 'third-person') value.reviews[0].subjectAttribution!.kind = 'other_person';
    if (mode === 'ambiguous') value.reviews[0].subjectAttribution!.kind = 'ambiguous';
    if (mode === 'contradiction') value.reviews[0].subjectAttribution!.kind = 'buying_unit';
    if (mode === 'duplicate') value.reviews.push(value.reviews[0]);
    const result = bindSubjects(value); expect(result.status).toBe('human_review_required'); expect(result.groups).toEqual([]); expect(result.authorizedSubjects).toEqual([]);
  });
  it('does not link an earlier participant to a newly attributed speaker', () => {
    const value = setup();
    value.knownSubjects.push({ scope: 'participant', id: 'historical' } as never);
    const result = bindSubjects(value); expect(result.status).toBe('success'); expect(result.authorizedSubjects[0].id).not.toBe('historical');
  });
  it('requires review when two historical buying units exist', () => {
    const value = setup();
    for (const group of value.groups) for (const c of group.candidates) c.subjectRef = { scope: 'buying_unit', id: 'invented' };
    for (const review of value.reviews) review.subjectAttribution!.kind = 'buying_unit';
    value.knownSubjects.push({ scope: 'buying_unit', id: 'one' } as never, { scope: 'buying_unit', id: 'two' } as never);
    expect(bindSubjects(value)).toMatchObject({ status: 'human_review_required', groups: [], authorizedSubjects: [] });
  });
  it('does not join different messages into the same local participant', () => {
    const value = setup(); const first = bindSubjects(value).authorizedSubjects[0];
    const otherMessage = { ...message, messageId: 'other' };
    const groups = value.groups.map(g => ({ ...g, occurrence: { ...g.occurrence, messageId: 'other' }, candidates: g.candidates.map(c => ({ ...c, occurrence: { ...c.occurrence, messageId: 'other' }, evidenceRefs: c.evidenceRefs.map(e => ({ ...e, messageId: 'other' })) })) }));
    const reviews = value.reviews.map(r => ({ ...r, evidenceRefs: r.evidenceRefs.map(e => ({ ...e, messageId: 'other' })), subjectAttribution: { ...r.subjectAttribution!, messageId: 'other', evidenceRefs: r.subjectAttribution!.evidenceRefs.map(e => ({ ...e, messageId: 'other' })) } }));
    const second = bindSubjects({ ...value, groups, reviews, messages: [otherMessage] });
    expect(second.status).toBe('success'); expect(second.authorizedSubjects[0]).not.toEqual(first);
  });
  it.each([
    ['Mi pareja dice: «Yo gano 2000 euros».', 'other_person'],
    ['Mensaje reenviado: Yo gano 2000 euros.', 'ambiguous'],
    ['Yo gano 2000 y ella gana 2000.', 'other_person'],
  ] as const)('does not authorize S2 classification of a quoted or third-party statement: %s', (source, kind) => {
    const value = setup(); const start = source.lastIndexOf('2000');
    value.messages = [{ ...message, content: { type: 'text', text: source } }];
    value.groups = value.groups.map(g => ({ ...g, occurrence: { messageId: 'm', statementSpan: { start: 0, end: source.length, text: source }, focusSpan: { start, end: start + 4, text: '2000' } }, candidates: g.candidates.map(c => ({ ...c, occurrence: { messageId: 'm', statementSpan: { start: 0, end: source.length, text: source }, focusSpan: { start, end: start + 4, text: '2000' } }, evidenceRefs: [{ messageId: 'm', quote: '2000', start, end: start + 4 }] })) }));
    value.reviews = value.reviews.map(r => ({ ...r, subjectAttribution: { kind, messageId: 'm', evidenceRefs: [{ messageId: 'm', quote: source, start: 0, end: source.length }], justification: 'Context indicates a different or uncertain speaker' } }));
    expect(bindSubjects(value)).toMatchObject({ status: 'human_review_required', groups: [] });
  });
  it('rejects incompatible historical identity for the same occurrence', () => {
    const value = setup();
    value.historicalAssertions.push({ assertionId: 'prior', fieldId: 'declared_monthly_income', subjectRef: { scope: 'participant', id: 'different' }, value: 2000, unit: 'EUR', rawValue: text, source: 'customer_message', evidenceRefs: [{ messageId: 'm', quote: '2000', start: 8, end: 12 }], observedAt: message.occurredAt, precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: demoBundle.factSchema.version } as never);
    expect(bindSubjects(value)).toMatchObject({ status: 'human_review_required', groups: [] });
  });
});
