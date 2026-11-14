import type { CaseEvent, CaseSnapshot, ConfigBundle, EvidenceRef, Result } from '../../contracts';
import { validateAssertions } from '../../domain/facts';
import { bundleRef, failure, sameRef } from './helpers';

function customerEvidenceValid(snapshot: CaseSnapshot, refs: EvidenceRef[]): boolean {
  return refs.every(ref => {
    const message = snapshot.messages.find(m => m.messageId === ref.messageId);
    if (!message || message.role !== 'customer' || message.content.type !== 'text') return false;
    const text = message.content.text;
    if (ref.quote && !text.includes(ref.quote)) return false;
    return ref.end === undefined || (ref.end <= text.length && (ref.quote === undefined || text.slice(ref.start, ref.end) === ref.quote));
  });
}

/** Validate human intents before the event and resulting projection are committed atomically. */
export function applyLifecycle(snapshot: CaseSnapshot, event: CaseEvent, config: ConfigBundle): Result<CaseSnapshot> {
  const next: CaseSnapshot = structuredClone(snapshot);
  next.revision++;
  next.events.push(event);
  if (event.type === 'MESSAGE_RECEIVED') return failure('INVALID_INPUT', 'El mensaje requiere recepción independiente');
  if (event.type === 'DRAFT_EDITED' || event.type === 'DRAFT_APPROVED' || event.type === 'DRAFT_DISCARDED' || event.type === 'MESSAGE_SIMULATED_AS_SENT') {
    if (event.actor !== 'advisor') return failure('INVALID_INPUT', 'La revisión requiere un asesor');
    const proposal = next.proposals.find(p => p.proposalId === event.payload.proposalId);
    const draft = next.drafts.find(d => d.draftId === event.payload.draftId && d.proposalId === event.payload.proposalId);
    const newerChange = snapshot.events.some(e => e.expectedRevision >= (proposal?.originCaseRevision ?? 0) && ['MESSAGE_RECEIVED', 'FACT_CORRECTED', 'CASE_REEVALUATION_REQUESTED', 'CASE_ANALYSIS_REQUESTED', 'DO_NOT_CONTACT_REQUESTED'].includes(e.type));
    if (!proposal || proposal.status !== 'active' || !sameRef(proposal.configBundleRef, bundleRef(config)) || newerChange) return failure('STALE_PROPOSAL', 'La propuesta debe reevaluarse');
    if (!draft) return failure('NOT_FOUND', 'Borrador no encontrado');
    if (event.type === 'MESSAGE_SIMULATED_AS_SENT') {
      if (draft.status !== 'approved') return failure('POLICY_DENIED', 'El borrador debe estar aprobado');
      if (snapshot.events.some(e => e.type === 'MESSAGE_SIMULATED_AS_SENT' && e.payload.draftId === draft.draftId && e.payload.proposalId === draft.proposalId)) return failure('POLICY_DENIED', 'El envío simulado ya está registrado');
    } else {
      if (draft.status === 'approved' || draft.status === 'discarded') return failure('POLICY_DENIED', 'El borrador ya fue revisado');
      if (event.type === 'DRAFT_EDITED') { draft.text = event.payload.text; draft.status = 'edited'; }
      if (event.type === 'DRAFT_APPROVED') draft.status = 'approved';
      if (event.type === 'DRAFT_DISCARDED') draft.status = 'discarded';
    }
  }
  if (event.type === 'FACT_CORRECTED') {
    if (event.actor !== 'advisor' || event.payload.assertion.source !== 'advisor_correction' || event.payload.assertion.reviewStatus !== 'confirmed_by_advisor') return failure('INVALID_INPUT', 'La corrección requiere confirmación del asesor');
    const valid = validateAssertions([event.payload.assertion], snapshot.messages, config.factSchema);
    if (!valid.ok) return valid;
    if (next.assertions.some(a => a.assertionId === event.payload.assertion.assertionId)) return failure('INVALID_INPUT', 'La afirmación ya existe');
    next.assertions.push(event.payload.assertion);
  }
  if (event.type === 'CUSTOMER_CONFIRMED_NEXT_STEP' && (event.actor !== 'advisor' || !event.simulated || !event.payload.reviewedByAdvisor || !customerEvidenceValid(snapshot, event.payload.evidenceRefs))) return failure('EVIDENCE_INVALID', 'La confirmación requiere evidencia del cliente');
  if (event.type === 'CUSTOMER_CONFIRMED_NEXT_STEP' && snapshot.events.some(e => e.type === 'CUSTOMER_CONFIRMED_NEXT_STEP' && e.payload.evidenceRefs.some(existing => event.payload.evidenceRefs.some(ref => ref.messageId === existing.messageId)))) return failure('POLICY_DENIED', 'La confirmación ya está registrada');
  if (event.type === 'HUMAN_HANDOFF_CONFIRMED' && event.actor !== 'advisor') return failure('INVALID_INPUT', 'La derivación requiere un asesor');
  if (event.type === 'DO_NOT_CONTACT_REQUESTED' && !customerEvidenceValid(snapshot, event.payload.evidenceRefs)) return failure('EVIDENCE_INVALID', 'La solicitud requiere evidencia del cliente');
  return { ok: true, value: next };
}
