import { beforeAll, describe, expect, it } from 'vitest';
import type { CaseEvent, ApplicationResult } from '../../../src/contracts';

let GET: typeof import('../../../src/app/api/cases/route').GET;
let POST: typeof import('../../../src/app/api/cases/route').POST;
const request = (payload: unknown) => new Request('http://localhost/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
const get = (id: string) => GET(new Request(`http://localhost/api/cases?caseId=${id}`));
const result = async (response: Response) => response.json() as Promise<ApplicationResult>;
beforeAll(async () => {
  process.env.AI_MODE = 'replay';
  ({ GET, POST } = await import('../../../src/app/api/cases/route'));
});
describe('case API', () => {
  it('loads synthetic case and processes replay analysis', async () => {
    const initial = await result(await get('laura'));
    if (!initial.ok) throw new Error(initial.error.code);
    expect(initial.value.snapshot.messages).toHaveLength(4);
    const event: CaseEvent = { eventId: 'api-analysis', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-02T10:00:00Z', expectedRevision: initial.value.snapshot.revision, type: 'CASE_ANALYSIS_REQUESTED', payload: {} };
    const response = await POST(request({ operation: 'event', event }));
    const analyzed = await result(response);
    expect(response.status).toBe(200);
    if (!analyzed.ok) throw new Error(analyzed.error.code);
    expect(analyzed.value.aiMode).toBe('replay');
    expect(analyzed.value.snapshot.knowledge.facts.some(f => f.fieldId === 'declared_monthly_income')).toBe(true);
    const again = await result(await POST(request({ operation: 'event', event })));
    expect(again.ok && again.value.snapshot.revision).toBe(analyzed.value.snapshot.revision);
  });
  it('rejects malformed input and stale revisions', async () => {
    expect((await POST(request({ operation: 'event', event: {} }))).status).toBe(400);
    expect((await get('missing')).status).toBe(404);
    const event: CaseEvent = { eventId: 'api-stale', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-02T10:00:00Z', expectedRevision: 999, type: 'CASE_ANALYSIS_REQUESTED', payload: {} };
    const response = await POST(request({ operation: 'event', event }));
    expect(response.status).toBe(409);
    expect(await result(response)).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } });
  });
  it('does not accept an unvalidated customer agreement through the public route', async () => {
    const event = { eventId: 'unverified-agreement', caseId: 'laura', actor: 'customer', occurredAt: '2026-05-02T10:00:00Z', expectedRevision: 0, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true, payload: { description: 'Acepta llamada', evidenceRefs: [{ messageId: 'laura-m1' }] } };
    const response = await POST(request({ operation: 'event', event }));
    expect(response.status).toBe(400);
    expect(await result(response)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
  it('records an advisor-reviewed simulated agreement with an exact customer quote', async () => {
    const reset = await result(await POST(request({ operation: 'reset', caseId: 'laura' })));
    if (!reset.ok) throw new Error(reset.error.code);
    const time = '2026-05-02T10:00:00Z';
    const analyze: CaseEvent = { eventId: 'review-analyze', caseId: 'laura', actor: 'advisor', occurredAt: time, expectedRevision: 0, type: 'CASE_ANALYSIS_REQUESTED', payload: {} };
    const analyzed = await result(await POST(request({ operation: 'event', event: analyze })));
    if (!analyzed.ok) throw new Error(analyzed.error.code);
    const messageEvent = (id: string, text: string, revision: number): CaseEvent => ({ eventId: `event-${id}`, caseId: 'laura', actor: 'customer', occurredAt: time, expectedRevision: revision, type: 'MESSAGE_RECEIVED', simulated: true, payload: { message: { messageId: id, conversationId: 'laura-conversation', role: 'customer', occurredAt: time, simulated: true, content: { type: 'text', text } } } });
    const interest = await result(await POST(request({ operation: 'event', event: messageEvent('review-interest', 'Sí, queremos explorar SmartHousing y los 3.800 € ya son después del coche.', analyzed.value.snapshot.revision) })));
    if (!interest.ok) throw new Error(interest.error.code);
    const quote = 'Sí, acepto una llamada.';
    const accepted = await result(await POST(request({ operation: 'event', event: messageEvent('review-acceptance', quote, interest.value.snapshot.revision) })));
    if (!accepted.ok) throw new Error(accepted.error.code);
    const review: CaseEvent = { eventId: 'review-confirmation', caseId: 'laura', actor: 'advisor', occurredAt: time, expectedRevision: accepted.value.snapshot.revision, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true, payload: { description: 'Aceptación revisada por asesor', reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'review-acceptance', quote }] } };
    const output = await result(await POST(request({ operation: 'event', event: review })));
    if (!output.ok) throw new Error(output.error.code);
    expect(output.value.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M5')?.status).toBe('completed');
    expect(output.value.snapshot.events).toContainEqual(review);
    expect(output.value.snapshot.events.some(e => e.type === 'MESSAGE_SIMULATED_AS_SENT')).toBe(false);
  });
  it('keeps a new message when replay cannot interpret it', async () => {
    const before = await result(await get('javier'));
    if (!before.ok) throw new Error(before.error.code);
    const event: CaseEvent = { eventId: 'api-unknown-message', caseId: 'javier', actor: 'customer', occurredAt: '2026-05-02T10:00:00Z', expectedRevision: before.value.snapshot.revision, type: 'MESSAGE_RECEIVED', simulated: true, payload: { message: { messageId: 'api-unknown-message-content', conversationId: 'javier-conversation', role: 'customer', occurredAt: '2026-05-02T10:00:00Z', simulated: true, content: { type: 'text', text: 'Una frase sin replay definido.' } } } };
    const output = await result(await POST(request({ operation: 'event', event })));
    if (!output.ok) throw new Error(output.error.code);
    expect(output.value.errors[0]?.code).toBe('MODEL_UNAVAILABLE');
    expect(output.value.snapshot.messages.some(m => m.messageId === 'api-unknown-message-content')).toBe(true);
    expect(output.value.snapshot.knowledge).toEqual(before.value.snapshot.knowledge);
    const repeat = await result(await POST(request({ operation: 'event', event })));
    expect(repeat.ok && repeat.value.snapshot.messages.filter(m => m.messageId === 'api-unknown-message-content')).toHaveLength(1);
  });
  it('resets a case without exposing credentials', async () => {
    const response = await POST(request({ operation: 'reset', caseId: 'laura' }));
    expect(response.status).toBe(200);
    const body = await result(response);
    expect(body.ok && body.value.snapshot.revision).toBe(0);
    expect(JSON.stringify(body)).not.toContain('OPENAI_API_KEY');
  });
});
