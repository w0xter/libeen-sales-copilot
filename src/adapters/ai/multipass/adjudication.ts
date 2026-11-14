import type { Message } from '../../../contracts';
import { AdjudicationResponseSchema, ContextReviewSchema, type AdjudicationResponse, type ClaimCandidate, type ContextReview, type Dispute } from './contracts';
import { evidenceAnchored, sameEvidence, type SafetyCandidate } from './safety';

export function validateAdjudication(response: AdjudicationResponse, disputes: Dispute[], candidates: ClaimCandidate[], reviews: ContextReview[], messages: Message[], previous: AdjudicationResponse[] = [], protectedFindings: { signalId: string; category: SafetyCandidate['category']; status: 'proposed' | 'confirmed' | 'dismissed' | 'uncertain'; justification: string; evidenceRefs: SafetyCandidate['evidenceRefs'] }[] = []): boolean {
  if (!AdjudicationResponseSchema.safeParse(response).success || previous.some(r => r.disputeId === response.disputeId)) return false;
  const matches = disputes.filter(d => d.disputeId === response.disputeId);
  if (matches.length !== 1) return false;
  if (response.resolution.status === 'unresolved') return true;
  const resolution = response.resolution;
  const selected = candidates.filter(c => c.candidateId === resolution.candidateId);
  if (protectedFindings.some(f => f.status === 'confirmed' && f.evidenceRefs.some(e => e.messageId === selected[0]?.occurrence.messageId))) return false;
  if (!matches[0].candidateIds.includes(resolution.candidateId) || selected.length !== 1 || !evidenceAnchored(resolution.evidenceRefs, messages)) return false;
  return reviews.filter(r => r.groupId === matches[0].groupId && r.candidateId === resolution.candidateId).length === 1 && reviews.some(r => ContextReviewSchema.safeParse(r).success && r.groupId === matches[0].groupId && r.candidateId === resolution.candidateId && r.atomicity === 'atomic' && r.support === 'supported' && evidenceAnchored(r.evidenceRefs, messages) && sameEvidence(r.evidenceRefs, selected[0].evidenceRefs, messages)) && sameEvidence(resolution.evidenceRefs, selected[0].evidenceRefs, messages);
}
