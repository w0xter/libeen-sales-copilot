import { describe, expect, it } from 'vitest';
import { analysis, customerMessage, fact, makeCase, milestone, unwrap } from './helpers';
import type { CaseEvent } from '../../../src/contracts';

describe('Laura qualification in deterministic replay', () => {
  it('shows evidenced joint facts, an unresolved debt and a reviewable clarification', async () => {
    const { orchestrator } = makeCase();
    const view = unwrap(await orchestrator.handleEvent(analysis()));
    expect(view.aiMode).toBe('replay');
    expect(view.snapshot.messages).toHaveLength(4);
    expect(fact(view, 'declared_monthly_income')).toMatchObject({ status: 'approximate', value: 3800, subjectRef: { scope: 'buying_unit' }, incomeBasis: 'net', evidenceRefs: expect.arrayContaining([{ messageId: 'laura-m3' }]) });
    expect(fact(view, 'available_savings')).toMatchObject({ status: 'approximate', value: 18000, subjectRef: { scope: 'buying_unit' } });
    expect(fact(view, 'monthly_debt')).toMatchObject({ status: 'known', value: 250, evidenceRefs: expect.arrayContaining([{ messageId: 'laura-m4' }]) });
    expect(fact(view, 'debt_deduction_semantics')).toBeUndefined();
    expect(fact(view, 'product_intent')).toBeUndefined();
    expect(milestone(view, 'M3')?.status).toBe('blocked');
    expect(view.activeProposal).toMatchObject({ actionType: 'CLARIFY', evidenceRefs: expect.arrayContaining([{ messageId: 'laura-m4' }]) });
    expect(view.draft).toMatchObject({ status: 'generated', aiMode: 'replay' });
    expect(view.draft?.text.toLowerCase()).toMatch(/cuota|descuento/);
    expect(view.snapshot.decisions[0].ruleIds).toContain('R05');
  });

  it.each([['laura-included', 'included'], ['laura-excluded', 'excluded']] as const)('preserves declared amounts after %s and asks about unconfirmed interest', async (scenario, semantics) => {
    const { orchestrator } = makeCase();
    const initial = unwrap(await orchestrator.handleEvent(analysis()));
    const view = unwrap(await orchestrator.handleEvent(customerMessage(scenario, initial.snapshot.revision)));
    expect(fact(view, 'debt_deduction_semantics')).toMatchObject({ status: 'known', value: semantics });
    expect(fact(view, 'declared_monthly_income')).toMatchObject({ value: 3800, subjectRef: { scope: 'buying_unit' } });
    expect(fact(view, 'monthly_debt')).toMatchObject({ value: 250 });
    expect(view.snapshot.knowledge.facts.some(f => f.fieldId === 'declared_monthly_income' && f.subjectRef.scope === 'participant')).toBe(false);
    expect(fact(view, 'product_intent')).toBeUndefined();
    expect(view.activeProposal?.actionType).toBe('CLARIFY');
    expect(view.draft?.text).toMatch(/SmartHousing/i);
    expect(milestone(view, 'M3')?.status).not.toBe('completed'); // Interest prerequisite remains unconfirmed.
  });

  it('keeps approval distinct from delivery and customer agreement', async () => {
    const { orchestrator } = makeCase();
    const view = unwrap(await orchestrator.handleEvent(analysis()));
    if (!view.draft || !view.activeProposal) throw new Error('Missing draft');
    const edit: CaseEvent = { eventId: 'edit', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T10:59:00Z', expectedRevision: view.snapshot.revision, type: 'DRAFT_EDITED', payload: { draftId: view.draft.draftId, proposalId: view.activeProposal.proposalId, text: '¿La cuota del coche ya estaba descontada?' } };
    const edited = unwrap(await orchestrator.handleEvent(edit));
    expect(edited.draft).toMatchObject({ status: 'edited', text: edit.payload.text });
    const event: CaseEvent = { eventId: 'approve', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T11:00:00Z', expectedRevision: edited.snapshot.revision, type: 'DRAFT_APPROVED', payload: { draftId: view.draft.draftId, proposalId: view.activeProposal.proposalId } };
    const approved = unwrap(await orchestrator.handleEvent(event));
    expect(approved.draft?.status).toBe('approved');
    expect(milestone(approved, 'M5')?.status).not.toBe('completed');
    expect(approved.snapshot.events.some(e => e.type === 'MESSAGE_SIMULATED_AS_SENT' || e.type === 'CUSTOMER_CONFIRMED_NEXT_STEP')).toBe(false);
  });

  it('requires an advisor-reviewed customer message before recording simulated agreement', async () => {
    const { orchestrator } = makeCase();
    const initial = unwrap(await orchestrator.handleEvent(analysis()));
    const ready = unwrap(await orchestrator.handleEvent(customerMessage('laura-r10-off', initial.snapshot.revision)));
    expect(milestone(ready, 'M5')?.status).not.toBe('completed');
    const withAcceptance = unwrap(await orchestrator.handleEvent(customerMessage('laura-confirmed', ready.snapshot.revision)));
    const event: CaseEvent = { eventId: 'reviewed-acceptance', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-04T11:00:00Z', expectedRevision: withAcceptance.snapshot.revision, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true, payload: { description: 'Acepta llamada', reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'laura-confirmed-addition', quote: 'Sí, acepto una llamada.' }] } };
    const agreed = unwrap(await orchestrator.handleEvent(event));
    expect(milestone(agreed, 'M5')?.status).toBe('completed');
    expect(agreed.snapshot.events).toContainEqual(event);
    expect(agreed.snapshot.events.some(e => e.type === 'MESSAGE_SIMULATED_AS_SENT')).toBe(false);
  });

  it('changes only the call route when R10 is enabled after financial clarification', async () => {
    const { orchestrator, setR10 } = makeCase();
    const initial = unwrap(await orchestrator.handleEvent(analysis()));
    const before = unwrap(await orchestrator.handleEvent(customerMessage('laura-r10-off', initial.snapshot.revision)));
    expect(fact(before, 'product_intent')).toMatchObject({ value: 'explore_smart_housing' });
    expect(milestone(before, 'M3')?.status).toBe('completed');
    expect(before.activeProposal?.actionType).toBe('PROPOSE_CALL');
    setR10(true);
    const after = unwrap(await orchestrator.handleEvent({ eventId: 'r10-enable', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-04T10:00:00Z', expectedRevision: before.snapshot.revision, type: 'CASE_REEVALUATION_REQUESTED', payload: {} }));
    expect(milestone(after, 'M3')?.status).toBe('completed');
    expect(after.activeProposal?.actionType).toBe('CLARIFY');
    expect(after.snapshot.decisions.at(-1)?.ruleIds).toContain('R10');
    expect(after.snapshot.proposals.find(p => p.proposalId === before.activeProposal?.proposalId)?.status).toBe('superseded');
  });

  it('reopens the financial context on a gross income correction while retaining history', async () => {
    const { orchestrator } = makeCase();
    const initial = unwrap(await orchestrator.handleEvent(analysis()));
    const ready = unwrap(await orchestrator.handleEvent(customerMessage('laura-r10-off', initial.snapshot.revision)));
    expect(milestone(ready, 'M3')?.status).toBe('completed');
    const corrected = unwrap(await orchestrator.handleEvent(customerMessage('laura-gross-correction', ready.snapshot.revision)));
    expect(milestone(corrected, 'M3')?.status).not.toBe('completed');
    expect(corrected.snapshot.assertions.filter(a => a.fieldId === 'declared_monthly_income').map(a => a.incomeBasis)).toEqual(expect.arrayContaining(['net', 'gross']));
    expect(corrected.activeProposal?.actionType).toBe('CLARIFY');
    expect(corrected.snapshot.knowledge.facts.some(f => f.fieldId === 'declared_monthly_income' && f.status === 'known' && f.incomeBasis === 'net')).toBe(false);
  });
});
