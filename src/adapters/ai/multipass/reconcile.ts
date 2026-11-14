import { InterpretationSchema, type Blocker, type Message } from '../../../contracts';
import { ClaimGroupSchema, ContextReviewSchema, ReconciliationResultSchema, type AdjudicationResponse, type ClaimCandidate, type ClaimGroup, type ContextReview, type Dispute } from './contracts';
import { validateOccurrence } from './evidence';
import { evidenceAnchored } from './safety';
import { validateAdjudication } from './adjudication';

type Input = { groups: ClaimGroup[]; reviews: ContextReview[]; messages: Message[]; materialFieldIds: string[]; schemaVersion: string; safety: { blockers: Blocker[]; humanReviewRequired: boolean }; adjudications?: AdjudicationResponse[] };
function dimensions(c: ClaimCandidate) {
  return JSON.stringify([c.fieldId, c.subjectRef.scope, c.subjectRef.id, c.value, c.unit, c.period, c.incomeBasis, c.precision, c.correction]);
}
export function reconcile(input: Input) {
  const trace: { groupId: string; candidateId: string; decision: 'accepted' | 'excluded' | 'pending'; reason: string }[] = [];
  const disputes: Dispute[] = [];
  const assertions: unknown[] = [];
  const reasons: string[] = [];
  if (input.safety.humanReviewRequired) reasons.push('Protected signal requires human review');
  const ids = new Set<string>();
  for (const group of [...input.groups].sort((a, b) => a.groupId.localeCompare(b.groupId))) {
    if (!ClaimGroupSchema.safeParse(group).success || ids.has(group.groupId) || group.candidates.some(c => c.fieldId !== group.fieldId || c.occurrence.messageId !== group.occurrence.messageId || !validateOccurrence(c.occurrence, input.messages) || !evidenceAnchored(c.evidenceRefs, input.messages))) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_input', message: 'Invalid group or evidence' });
    ids.add(group.groupId);
    const candidates = [...group.candidates].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    const supported = candidates.filter(c => input.reviews.filter(r => r.groupId === group.groupId && r.candidateId === c.candidateId).length === 1 && input.reviews.filter(r => r.groupId === group.groupId && r.candidateId === c.candidateId && ContextReviewSchema.safeParse(r).success && r.atomicity === 'atomic' && r.support === 'supported' && evidenceAnchored(r.evidenceRefs, input.messages) && r.evidenceRefs.some(e => e.messageId === c.occurrence.messageId)).length === 1);
    const variants = new Set(candidates.map(dimensions));
    const dispute: Dispute = { disputeId: group.groupId, groupId: group.groupId, candidateIds: candidates.map(c => c.candidateId), reason: variants.size > 1 ? 'Conflicting dimensions' : 'Insufficient contextual support' };
    const responses = (input.adjudications ?? []).filter(a => a.disputeId === dispute.disputeId);
    const response = responses.length === 1 && validateAdjudication(responses[0], [dispute], candidates, input.reviews, input.messages) ? responses[0] : undefined;
    const selected = response?.resolution.status === 'selected' ? supported.find(c => c.candidateId === (response.resolution.status === 'selected' ? response.resolution.candidateId : '')) : variants.size === 1 && supported.length && (!input.materialFieldIds.includes(group.fieldId) || new Set(candidates.map(c => c.extractorId)).size >= 2) ? supported[0] : undefined;
    if (!selected || selected.correction || selected.value === undefined || selected.precision === 'ambiguous' || selected.precision === 'inferred') {
      disputes.push(dispute);
      if (input.materialFieldIds.includes(group.fieldId) || selected?.correction) reasons.push(`Unresolved: ${group.groupId}`);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: dispute.reason });
      continue;
    }
    const message = input.messages.find(m => m.messageId === selected.occurrence.messageId)!;
    assertions.push({ assertionId: selected.candidateId, fieldId: selected.fieldId, subjectRef: selected.subjectRef, value: selected.value, unit: selected.unit, period: selected.period, incomeBasis: selected.incomeBasis, rawValue: selected.occurrence.statementSpan.text, source: 'customer_message', evidenceRefs: selected.evidenceRefs, observedAt: message.occurredAt, precision: selected.precision, reviewStatus: 'unreviewed', schemaVersion: input.schemaVersion });
    for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: c.candidateId === selected.candidateId ? 'accepted' : 'excluded', reason: c.candidateId === selected.candidateId ? 'Contextually supported' : 'Duplicate or unselected candidate' });
  }
  if (reasons.length) return ReconciliationResultSchema.parse({ status: 'human_review_required', disputes, reasons, trace });
  const interpretation = InterpretationSchema.safeParse({ assertions, blockers: input.safety.blockers, warnings: disputes.map(d => `Unresolved: ${d.groupId}`) });
  return interpretation.success ? ReconciliationResultSchema.parse({ status: 'consolidated', interpretation: interpretation.data, trace }) : ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_interpretation', message: 'Interpretation validation failed' });
}
