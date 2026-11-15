import { describe, expect, it } from 'vitest';
import { checkContextCoverage } from '../../../src/adapters/ai/multipass/context-coverage';
import type { ContextReview } from '../../../src/adapters/ai/multipass/contracts';

const groups = [{ groupId:'g-secret', candidates:[{candidateId:'a-secret'},{candidateId:'b-secret'}] }];
const review = (candidateId:string, support:ContextReview['support']='supported'):ContextReview => ({ groupId:'g-secret',candidateId,atomicity:'atomic',support,evidenceRefs:[{messageId:'private-message',quote:'private-text'}],justification:'private-reason' });

describe('context review correspondence', () => {
  it('accepts exactly one review for each candidate irrespective of order', () => {
    const result = checkContextCoverage(groups, [review('b-secret'),review('a-secret')]);
    expect(result.complete).toBe(true);
    expect(result.counts).toMatchObject({expected:2,actual:2,missing:0,duplicates:0,foreign:0,groupsReviewedOnce:0,identicalDuplicates:0,conflictingDuplicates:0});
  });
  it('rejects missing reviews without inventing them', () => {
    expect(checkContextCoverage(groups,[review('a-secret')])).toMatchObject({complete:false,counts:{missing:1,groupsReviewed:1,groupsReviewedOnce:1}});
  });
  it('rejects identical duplicates and counts distinct covered candidates', () => {
    const result = checkContextCoverage(groups,[review('a-secret'),review('a-secret')]);
    expect(result).toMatchObject({complete:false,counts:{missing:1,duplicates:1,identicalDuplicates:1,conflictingDuplicates:0,groupsReviewedOnce:1}});
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('rejects contradictory duplicates without erasing refutation', () => {
    const result = checkContextCoverage(groups,[review('a-secret'),review('a-secret','refuted'),review('b-secret')]);
    expect(result).toMatchObject({complete:false,counts:{missing:0,duplicates:1,identicalDuplicates:0,conflictingDuplicates:1}});
  });
  it('rejects references to a wrong group, candidate, or both', () => {
    const result = checkContextCoverage(groups,[{...review('a-secret'),groupId:'foreign-group'},review('foreign-candidate')]);
    expect(result).toMatchObject({complete:false,counts:{missing:2,foreign:2}});
  });
  it('rejects ambiguous expected pairs even if the returned count matches', () => {
    const malformed = [{ groupId:'g-secret', candidates:[{candidateId:'a-secret'},{candidateId:'a-secret'}] }];
    expect(checkContextCoverage(malformed,[review('a-secret'),review('a-secret')])).toMatchObject({complete:false,counts:{ambiguousExpected:1,duplicates:1}});
  });
  it('rejects repeated group or candidate identifiers even when pairs differ', () => {
    const badGroups = [{groupId:'g-secret',candidates:[{candidateId:'a-secret'}]},{groupId:'g-secret',candidates:[{candidateId:'b-secret'}]}];
    expect(checkContextCoverage(badGroups,[review('a-secret'),review('b-secret')])).toMatchObject({complete:false,counts:{duplicateGroupIds:1}});
    const badCandidates = [{groupId:'g-secret',candidates:[{candidateId:'a-secret'}]},{groupId:'other',candidates:[{candidateId:'a-secret'}]}];
    expect(checkContextCoverage(badCandidates,[review('a-secret'),{...review('a-secret'),groupId:'other'}])).toMatchObject({complete:false,counts:{duplicateCandidateIds:1}});
  });
  it('counts duplicate variants independently of review ordering', () => {
    const items = [review('a-secret'),review('a-secret','refuted'),review('a-secret','refuted')];
    expect(checkContextCoverage(groups,items).counts).toEqual(checkContextCoverage(groups,[...items].reverse()).counts);
  });
  it('does not collapse material disagreements or uncertainty between different candidates', () => {
    expect(checkContextCoverage(groups,[review('a-secret','refuted'),review('b-secret','uncertain')]).complete).toBe(true);
  });
});
