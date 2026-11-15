import { describe, expect, it } from 'vitest';
import { validateAttribution } from '../../../src/adapters/ai/multipass/subjects';

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
