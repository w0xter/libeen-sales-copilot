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
    const event = createAgreementIntent(view, 'laura-m1', true);
    expect(event).toMatchObject({ type: 'CUSTOMER_CONFIRMED_NEXT_STEP', actor: 'advisor', simulated: true, payload: { reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'laura-m1', quote: expect.any(String) }] } });
  });
});
