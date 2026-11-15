import type { Message } from './extraction';
import type { Candidate, Review } from './review';

/** La numeración del parser es local a cada análisis, no identidad duradera. */
export function candidateKey(candidate: Candidate, source: Message): string {
  return JSON.stringify([candidate.field, source.role, source.text, candidate.quote]);
}

/** Comparación conservadora: diferencias textuales se presentan para revisión. */
export function conflictsForReview(review: Review, candidates: Candidate[]): Candidate[] {
  if (review.status !== 'corrected') return [];
  return candidates.filter(c => c.field === review.candidate.field && c.value !== review.value);
}
