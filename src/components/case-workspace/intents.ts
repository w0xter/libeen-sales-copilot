import type { CaseEvent, CaseView } from '../../contracts';

type DraftIntentType = 'DRAFT_EDITED' | 'DRAFT_APPROVED' | 'DRAFT_DISCARDED';
/** Builds an intent only; the application remains responsible for validating and applying it. */
export function createDraftIntent(view: CaseView, type: DraftIntentType, text?: string): CaseEvent | null {
  const { draft, activeProposal, snapshot } = view;
  if (!draft || !activeProposal || activeProposal.status !== 'active' || draft.proposalId !== activeProposal.proposalId) return null;
  if (type === 'DRAFT_EDITED' && !text?.trim()) return null;
  const base = { eventId: crypto.randomUUID(), caseId: snapshot.caseId, actor: 'advisor' as const, occurredAt: new Date().toISOString(), expectedRevision: snapshot.revision };
  const payload = { draftId: draft.draftId, proposalId: draft.proposalId };
  return type === 'DRAFT_EDITED' ? { ...base, type, payload: { ...payload, text: text! } } : { ...base, type, payload };
}
export function createMessageIntent(view: CaseView, text: string): CaseEvent | null {
  if (!text.trim()) return null;
  const now = new Date().toISOString();
  return { eventId: crypto.randomUUID(), caseId: view.snapshot.caseId, actor: 'customer', occurredAt: now, expectedRevision: view.snapshot.revision, simulated: true, type: 'MESSAGE_RECEIVED', payload: { message: { messageId: crypto.randomUUID(), conversationId: view.snapshot.messages[0]?.conversationId ?? `${view.snapshot.caseId}-conversation`, role: 'customer', occurredAt: now, content: { type: 'text', text }, simulated: true } } };
}

export function eligibleAgreementMessages(view: CaseView) {
  const events = view.snapshot.events;
  const sentIndex = events.findLastIndex(e => e.type === 'MESSAGE_SIMULATED_AS_SENT' && view.snapshot.proposals.some(p => p.proposalId === e.payload.proposalId && p.actionType === 'PROPOSE_CALL'));
  if (sentIndex < 0) return [];
  const ids = new Set(events.slice(sentIndex + 1).filter(e => e.type === 'MESSAGE_RECEIVED').map(e => e.payload.message.messageId));
  return view.snapshot.messages.filter(m => ids.has(m.messageId) && m.role === 'customer' && m.content.type === 'text');
}

/** An advisor explicitly reviews a quoted synthetic customer message before recording agreement. */
export function createAgreementIntent(view: CaseView, messageId: string, reviewed: boolean): CaseEvent | null {
  const message = eligibleAgreementMessages(view).find(item => item.messageId === messageId);
  if (!reviewed || !message || message.role !== 'customer' || message.content.type !== 'text' || !message.content.text.trim()) return null;
  return {
    eventId: crypto.randomUUID(), caseId: view.snapshot.caseId, actor: 'advisor', occurredAt: new Date().toISOString(),
    expectedRevision: view.snapshot.revision, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true,
    payload: { description: 'Aceptación revisada por el asesor', reviewedByAdvisor: true, evidenceRefs: [{ messageId, quote: message.content.text }] },
  };
}

export function hasCurrentHandoff(view: CaseView): boolean {
  const events = view.snapshot.events;
  const index = events.findLastIndex(e => e.type === 'HUMAN_HANDOFF_CONFIRMED');
  return index >= 0 && !events.slice(index + 1).some(e => e.type === 'MESSAGE_RECEIVED' || e.type === 'FACT_CORRECTED');
}
