import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CaseWorkspace } from '../../../src/components/case-workspace/case-workspace';
import { mockViews } from '../../../src/components/case-workspace/mock-views';
import { createDraftIntent } from '../../../src/components/case-workspace/intents';

describe('advisor workspace', () => {
  it('renders supplied facts and evidence for the three mock cases', () => {
    const laura = renderToStaticMarkup(<CaseWorkspace view={mockViews.laura} onIntent={vi.fn()} />);
    expect(laura).toContain('3.800');
    expect(laura).toContain('laura-m3');
    expect(laura).toContain('requiere aclaración');
    const javier = renderToStaticMarkup(<CaseWorkspace view={mockViews.javier} onIntent={vi.fn()} />);
    expect(javier).toContain('Audio no disponible');
    expect(javier).toContain('javier-m5');
    const rosa = renderToStaticMarkup(<CaseWorkspace view={mockViews.rosa} onIntent={vi.fn()} />);
    expect(rosa).toContain('0');
    expect(rosa).toContain('rosa-m3');
  });
  it('keeps approval separate from sending and exposes typed draft intents', () => {
    const view = mockViews.laura;
    const intent = createDraftIntent(view, 'DRAFT_APPROVED');
    expect(intent).toMatchObject({ type: 'DRAFT_APPROVED', caseId: 'laura', expectedRevision: view.snapshot.revision });
    const html = renderToStaticMarkup(<CaseWorkspace view={{ ...view, draft: view.draft && { ...view.draft, status: 'approved' } }} onIntent={vi.fn()} />);
    expect(html).toContain('Pendiente de comunicación');
    expect(html).not.toContain('Cita reservada');
  });
  it('renders stale and model errors without permitting approval of an obsolete proposal', () => {
    const view = mockViews.laura;
    const html = renderToStaticMarkup(<CaseWorkspace view={{ ...view, activeProposal: view.activeProposal && { ...view.activeProposal, status: 'superseded' }, errors: [{ code: 'MODEL_UNAVAILABLE', message: 'Modelo no disponible', retryable: true }] }} onIntent={vi.fn()} />);
    expect(html).toContain('Modelo no disponible');
    expect(html).toContain('Propuesta desactualizada');
    expect(createDraftIntent({ ...view, activeProposal: view.activeProposal && { ...view.activeProposal, status: 'superseded' } }, 'DRAFT_APPROVED')).toBeNull();
  });
});

describe('agreement review intent', () => {
  it('requires a selected customer text message and explicit advisor review', async () => {
    const { createAgreementIntent } = await import('../../../src/components/case-workspace/intents');
    const { mockViews } = await import('../../../src/components/case-workspace/mock-views');
    const view = mockViews.laura;
    expect(createAgreementIntent(view, 'laura-m1', false)).toBeNull();
    expect(createAgreementIntent(view, 'laura-m2', true)).toBeNull();
    expect(createAgreementIntent(view, 'missing', true)).toBeNull();
    expect(createAgreementIntent(view, 'laura-m1', true)).toBeNull();
  });
});

describe('delivery presentation', () => {
  it('shows a recorded simulated send instead of pending communication', () => {
    const view = structuredClone(mockViews.laura);
    if (!view.draft || !view.activeProposal) throw Error('missing draft');
    view.draft.status = 'approved';
    view.snapshot.events.push({ eventId: 'sent', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, simulated: true, type: 'MESSAGE_SIMULATED_AS_SENT', payload: { draftId: view.draft.draftId, proposalId: view.activeProposal.proposalId } });
    const html = renderToStaticMarkup(<CaseWorkspace view={view} onIntent={vi.fn()} />);
    expect(html).toContain('Envío simulado registrado');
    expect(html).not.toContain('Pendiente de comunicación');
  });
  it('warns that knowledge may not include unprocessed messages', () => {
    const view = structuredClone(mockViews.laura); view.snapshot.analysisStatus = 'analysis_failed';
    const html = renderToStaticMarkup(<CaseWorkspace view={view} onIntent={vi.fn()} />);
    expect(html).toContain('no incluye necesariamente');
  });
});

it('offers agreement review only for messages received after a simulated send', async () => {
  const { eligibleAgreementMessages } = await import('../../../src/components/case-workspace/intents');
  const view = structuredClone(mockViews.laura);
  if (!view.draft || !view.activeProposal) throw Error('missing draft');
  view.snapshot.proposals[0].actionType = 'PROPOSE_CALL';
  const sent = { eventId: 'sent', caseId: 'laura', actor: 'advisor' as const, occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, simulated: true as const, type: 'MESSAGE_SIMULATED_AS_SENT' as const, payload: { draftId: view.draft.draftId, proposalId: view.activeProposal.proposalId } };
  const message = { ...view.snapshot.messages[0], messageId: 'after-send', content: { type: 'text' as const, text: 'Sí, acepto la llamada.' } };
  view.snapshot.messages.push(message);
  view.snapshot.events.push(sent, { eventId: 'new', caseId: 'laura', actor: 'customer', occurredAt: '2026-05-03T10:01:00Z', expectedRevision: 1, simulated: true, type: 'MESSAGE_RECEIVED', payload: { message } });
  expect(eligibleAgreementMessages(view).map(m => m.messageId)).toEqual(['after-send']);
  const { createAgreementIntent } = await import('../../../src/components/case-workspace/intents');
  expect(createAgreementIntent(view, 'laura-m4', true)).toBeNull();
  expect(createAgreementIntent(view, 'after-send', false)).toBeNull();
  expect(createAgreementIntent(view, 'after-send', true)).toMatchObject({ payload: { reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'after-send' }] } });
});

it('requires a new handoff review when a message arrives after a recorded handoff', async () => {
  const { hasCurrentHandoff } = await import('../../../src/components/case-workspace/intents');
  const view = structuredClone(mockViews.rosa);
  view.snapshot.events.push({ eventId: 'handoff', caseId: 'rosa', actor: 'advisor', occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, simulated: true, type: 'HUMAN_HANDOFF_CONFIRMED', payload: { reason: 'Revisión' } });
  expect(hasCurrentHandoff(view)).toBe(true);
  const message = { ...view.snapshot.messages[0], messageId: 'later' };
  view.snapshot.events.push({ eventId: 'later-event', caseId: 'rosa', actor: 'customer', occurredAt: '2026-05-03T10:01:00Z', expectedRevision: 1, simulated: true, type: 'MESSAGE_RECEIVED', payload: { message } });
  expect(hasCurrentHandoff(view)).toBe(false);
});
