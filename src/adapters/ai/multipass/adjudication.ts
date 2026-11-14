import type { Message } from '../../../contracts';
import { AdjudicationResponseSchema, ContextReviewSchema, type AdjudicationResponse, type ClaimCandidate, type ContextReview, type Dispute } from './contracts';
import { evidenceAnchored } from './safety';

export function validateAdjudication(response: AdjudicationResponse, disputes: Dispute[], candidates: ClaimCandidate[], reviews: ContextReview[], messages: Message[], previous: AdjudicationResponse[] = []): boolean {
  if (!AdjudicationResponseSchema.safeParse(response).success || previous.some(r => r.disputeId === response.disputeId)) return false;
  const matches = disputes.filter(d => d.disputeId === response.disputeId);
  if (matches.length !== 1) return false;
  if (response.resolution.status === 'unresolved') return true;
  const resolution = response.resolution;
  const selected = candidates.filter(c => c.candidateId === resolution.candidateId);
  if (!matches[0].candidateIds.includes(resolution.candidateId) || selected.length !== 1 || !evidenceAnchored(resolution.evidenceRefs, messages)) return false;
  return reviews.filter(r => r.groupId === matches[0].groupId && r.candidateId === resolution.candidateId).length === 1 && reviews.some(r => ContextReviewSchema.safeParse(r).success && r.groupId === matches[0].groupId && r.candidateId === resolution.candidateId && r.atomicity === 'atomic' && r.support === 'supported' && evidenceAnchored(r.evidenceRefs, messages) && r.evidenceRefs.some(e => e.messageId === selected[0].occurrence.messageId)) && resolution.evidenceRefs.every(e => e.messageId === selected[0].occurrence.messageId);
}
