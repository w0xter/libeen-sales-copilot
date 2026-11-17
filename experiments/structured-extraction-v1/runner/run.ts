import { baselineAdapter, normalizeBaseline } from '../adapters/baseline';
import { minimal } from '../adapters/minimal';
import { scoreCase } from '../evaluators/score';
import type { Fixture } from './fixtures';
import type { Gold, Transport } from '../types';
import type { Message } from '../../../src/intake/extraction';
export async function runCase(input: { fixture: Fixture; gold: Gold; messages: Message[] }, arm: 'A' | 'B' | 'C', model: string, transport: Transport) {
 const start = performance.now();
 const result = await (arm === 'A' ? baselineAdapter : minimal(arm)).run(input.messages, transport, model);
 const latencyMs = performance.now() - start;
 const score = result.error ? null : scoreCase(result.accepted, input.gold);
 let rawScore = null;
 if (arm === 'A' && result.raw && typeof result.raw === 'object' && 'candidates' in result.raw && Array.isArray(result.raw.candidates)) {
  rawScore = scoreCase(result.raw.candidates.map(normalizeBaseline).filter(x => x !== null), input.gold);
 }
 const classes = { provider: result.error === 'provider_error', invalidResponse: result.error === 'invalid_response', extraction: score ? { definiteFalsePositives: score.bounds.definiteFalsePositives, definiteOmissions: score.bounds.definiteOmissions } : null, contractLimitations: { notes: result.limitations, unresolvedCandidates: result.accepted.filter(a => (a.normalization?.unresolved.length ?? 0) > 0), potentialMatchesRequiringReview: score ? score.bounds.possibleMatches - score.bounds.definiteMatches : 0 }, postprocessing: { discarded: result.discards.length, rawMatchedButLost: rawScore && score ? Math.max(0, rawScore.counts.tp - score.counts.tp) : null } };
 return { negativeFields: input.gold.absentFields, classes, caseId: input.fixture.caseId, family: input.fixture.family, arm, model, latencyMs, result, score, rawScore };
}
