import { isDeepStrictEqual } from 'node:util';
import type { ContextReview } from './contracts';
import type { ReviewCounts } from './trace';

type Group = { groupId: string; candidates: { candidateId: string }[] };
const pair = (groupId: string, candidateId: string) => JSON.stringify([groupId, candidateId]);

/** Count only; never return identifiers, reviews, justifications, or evidence. */
export function checkContextCoverage(groups: Group[], reviews: ContextReview[]): { complete: boolean; counts: ReviewCounts } {
  const expected = groups.flatMap(group => group.candidates.map(candidate => pair(group.groupId, candidate.candidateId)));
  const expectedSet = new Set(expected);
  const actual = new Map<string, ContextReview[]>();
  for (const review of reviews) {
    const key = pair(review.groupId, review.candidateId);
    const entries = actual.get(key) ?? [];
    entries.push(review);
    actual.set(key, entries);
  }
  let identicalDuplicates = 0;
  let conflictingDuplicates = 0;
  for (const entries of actual.values()) {
    const variants: ContextReview[] = [];
    for (const entry of entries) {
      if (variants.some(variant => isDeepStrictEqual(variant, entry))) identicalDuplicates++;
      else variants.push(entry);
    }
    conflictingDuplicates += Math.max(0, variants.length - 1);
  }
  const missing = expected.filter(key => !actual.has(key)).length;
  const foreign = reviews.filter(review => !expectedSet.has(pair(review.groupId, review.candidateId))).length;
  const duplicates = reviews.length - actual.size;
  const groupCoverage = groups.map(group => new Set(group.candidates.map(candidate => pair(group.groupId, candidate.candidateId)).filter(key => actual.has(key))).size);
  const ambiguousExpected = expected.length - expectedSet.size;
  const groupIds = groups.map(group => group.groupId);
  const candidateIds = groups.flatMap(group => group.candidates.map(candidate => candidate.candidateId));
  const duplicateGroupIds = groupIds.length - new Set(groupIds).size;
  const duplicateCandidateIds = candidateIds.length - new Set(candidateIds).size;
  const counts: ReviewCounts = { expected: expected.length, actual: reviews.length, missing, duplicates, foreign, groupsExpected: groups.length, groupsReviewed: groupCoverage.filter(count => count > 0).length, groupsReviewedOnce: groupCoverage.filter(count => count === 1).length, identicalDuplicates, conflictingDuplicates, ambiguousExpected, duplicateGroupIds, duplicateCandidateIds };
  return { complete: missing === 0 && duplicates === 0 && foreign === 0 && ambiguousExpected === 0 && duplicateGroupIds === 0 && duplicateCandidateIds === 0 && expected.length === reviews.length, counts };
}
