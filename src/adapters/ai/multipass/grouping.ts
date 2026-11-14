import type { Message } from '../../../contracts';
import { ClaimCandidateSchema, type ClaimCandidate, type ClaimGroup } from './contracts';
import { validateEvidenceRefs, validateOccurrence } from './evidence';
import { occurrenceKey } from './alignment';

export function groupClaims(candidates: ClaimCandidate[], messages: Message[]): { groups: ClaimGroup[]; rejected: ClaimCandidate[] } {
  const groups = new Map<string, ClaimGroup>();
  const rejected: ClaimCandidate[] = [];
  const ids = new Set<string>();
  for (const candidate of candidates) {
    const parsed = ClaimCandidateSchema.safeParse(candidate);
    if (!parsed.success || !validateOccurrence(candidate.occurrence, messages) || !validateEvidenceRefs(candidate, messages) || ids.has(candidate.candidateId)) { rejected.push(candidate); continue; }
    const key = occurrenceKey(candidate.fieldId, candidate.occurrence);
    if (!key) { rejected.push(candidate); continue; }
    const group = groups.get(key);
    if (group?.candidates.some(c => c.extractorId === candidate.extractorId)) { rejected.push(candidate); continue; }
    ids.add(candidate.candidateId);
    if (group) group.candidates.push(candidate);
    else groups.set(key, { groupId: key, fieldId: candidate.fieldId, occurrence: candidate.occurrence, candidates: [candidate] });
  }
  return { groups: [...groups.values()], rejected };
}
