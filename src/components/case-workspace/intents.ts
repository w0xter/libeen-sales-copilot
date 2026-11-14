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
