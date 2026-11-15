import { z } from 'zod';
import type { AgentProfile, Blocker, FactAssertion, FactSchema, Message, SubjectRef } from '../../../contracts';
import { RawClaimSchema, ContextReviewSchema, AdjudicationResponseSchema, ReconciliationResultSchema, type ClaimCandidate } from './contracts';
import { SafetyCandidateSchema, SafetyVerdictSchema } from './safety';
import { groupClaims } from './grouping';
import { reconcile } from './reconcile';
import { Scheduler, type FakeTransport } from './scheduler';
import { createTrace, type Role } from './trace';
import { bindSubjects } from './subjects';

export type Snapshot = { caseId: string; messages: Message[]; factSchema: FactSchema; agentProfile: AgentProfile; knownSubjects: SubjectRef[]; historicalAssertions: FactAssertion[]; historicalBlockers: Blocker[]; materialFieldIds: string[] };
const extraction = z.strictObject({ claims: z.array(RawClaimSchema) });
const scan = z.strictObject({ status: z.literal('complete'), candidates: z.array(SafetyCandidateSchema) });
const review = z.strictObject({ status: z.literal('complete'), reviews: z.array(ContextReviewSchema), candidates: z.array(SafetyCandidateSchema).optional(), verdicts: z.array(SafetyVerdictSchema) });
function freeze<T>(value: T): T { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
export async function runPipeline(options: { runId: string; snapshot: Snapshot; transport: FakeTransport; signal?: AbortSignal; timeoutMs?: number; totalTimeoutMs?: number; instructionVersion?: string; schemaVersion?: string }) {
  const snapshot = freeze(structuredClone(options.snapshot));
  const trace = createTrace(options.runId);
  const scheduler = new Scheduler(options.transport, trace, { timeoutMs: options.timeoutMs ?? 25000, totalTimeoutMs: options.totalTimeoutMs ?? 75000, signal: options.signal, instructionVersion: options.instructionVersion ?? 'multipass-1', schemaVersion: options.schemaVersion ?? 'multipass-1', configVersion: `${snapshot.factSchema.version}/${snapshot.agentProfile.version}` });
  let repaired = false;
  const call = async (role: Role, input: unknown, schema: z.ZodType) => {
    const valid = (v: unknown) => schema.safeParse(v).success;
    const value = await scheduler.call(role, input, valid);
    if (value !== undefined) return value;
    const last = trace.operations.findLast(op => op.role === role);
    if (!repaired && last?.status === 'invalid') {
      repaired = true;
      return scheduler.call('Repair', freeze({ snapshot, targetRole: role, originalInput: input }), valid);
    }
    return undefined;
  };
  // Wait for every initial pass before choosing repair: multiple failures are
  // ambiguous and cannot be recovered with the single global repair budget.
  const roles = ['E1', 'E2', 'E3', 'S1'] as const;
  const initialInput = freeze({ snapshot });
  const initial = await Promise.all(roles.map(role => scheduler.call(role, initialInput, v => (role === 'S1' ? scan : extraction).safeParse(v).success)));
  const failed = initial.flatMap((value, index) => value === undefined ? [index] : []);
  if (failed.length === 1) {
    const index = failed[0];
    const role = roles[index];
    if (trace.operations.find(op => op.role === role)?.status === 'invalid') {
      repaired = true;
      const schema = role === 'S1' ? scan : extraction;
      initial[index] = await scheduler.call('Repair', freeze({ snapshot, targetRole: role, originalInput: initialInput }), v => schema.safeParse(v).success);
    }
  }
  const fail = (code: string) => { trace.finalStatus = 'failed'; trace.abstentionCauses.push(code); return { result: ReconciliationResultSchema.parse({ status: 'failed', code, message: 'Pipeline could not safely complete' }), trace, diagnostics: [] }; };
  if (initial.some(v => v === undefined)) return fail('initial_pass_failed');
  const candidates: ClaimCandidate[] = initial.slice(0, 3).flatMap((value, i) => extraction.parse(value).claims.map((claim, n) => ({ ...claim, extractorId: `E${i + 1}`, candidateId: `E${i + 1}-${n}` })));
  const grouped = groupClaims(candidates, snapshot.messages, { factSchema: snapshot.factSchema, assertions: snapshot.historicalAssertions, caseId: snapshot.caseId });
  const scanResult = scan.parse(initial[3]);
  const reviewed = await call('S2', freeze({ snapshot, candidates, groups: grouped.groups, diagnostics: grouped.diagnostics, signals: scanResult.candidates }), review);
  if (reviewed === undefined) { const failure = fail('protected_review_failed'); return { ...failure, diagnostics: grouped.diagnostics }; }
  const contextual = review.parse(reviewed);
  const expectedReviews = grouped.groups.flatMap(g => g.candidates.map(c => JSON.stringify([g.groupId, c.candidateId])));
  const actualReviews = contextual.reviews.map(r => JSON.stringify([r.groupId, r.candidateId]));
  if (actualReviews.length !== expectedReviews.length || new Set(actualReviews).size !== actualReviews.length || actualReviews.some(id => !expectedReviews.includes(id))) {
    const failure = fail('incomplete_contextual_review');
    return { ...failure, diagnostics: grouped.diagnostics };
  }
  const binding = bindSubjects({ groups: grouped.groups, reviews: contextual.reviews, messages: snapshot.messages, historicalAssertions: snapshot.historicalAssertions, knownSubjects: snapshot.knownSubjects, caseId: snapshot.caseId, diagnostics: grouped.diagnostics });
  const input = { factSchema: snapshot.factSchema, knownSubjects: [...snapshot.knownSubjects, ...binding.authorizedSubjects], historicalAssertions: snapshot.historicalAssertions, diagnostics: grouped.diagnostics, groups: binding.groups, reviews: contextual.reviews, messages: snapshot.messages, materialFieldIds: snapshot.materialFieldIds, schemaVersion: snapshot.factSchema.version, safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [...scanResult.candidates, ...(contextual.candidates ?? [])], verdicts: contextual.verdicts, historicalBlockers: snapshot.historicalBlockers } };
  let result = reconcile(input);
  if (binding.status === 'human_review_required' && result.status !== 'failed') {
    result = ReconciliationResultSchema.parse({ status: 'human_review_required', disputes: result.status === 'human_review_required' ? result.disputes : [], reasons: [...(result.status === 'human_review_required' ? result.reasons : []), 'Subject attribution requires review'], trace: result.trace, safetyFindings: result.safetyFindings });
  }
  // Conflicting contextual verdicts for the same occurrence require human review;
  // corroborating votes do not erase an explicit refutation.
  const conflictingReview = grouped.groups.some(group => {
    const reviews = contextual.reviews.filter(r => r.groupId === group.groupId);
    return reviews.some(r => r.support === 'supported') && reviews.some(r => r.support === 'refuted');
  });
  if (conflictingReview && result.status === 'consolidated') {
    result = ReconciliationResultSchema.parse({ status: 'human_review_required', disputes: [], reasons: ['Conflicting contextual reviews'], trace: result.trace, safetyFindings: result.safetyFindings });
  }
  if (binding.status === 'success' && !conflictingReview && result.status === 'human_review_required' && result.disputes.length && trace.consumed < 7) {
    const dispute = result.disputes[0];
    const answer = await call('J', freeze({ snapshot, dispute, group: binding.groups.find(g => g.groupId === dispute.groupId), reviews: contextual.reviews, safetyFindings: result.safetyFindings }), AdjudicationResponseSchema);
    if (answer !== undefined) { const adjudication = AdjudicationResponseSchema.parse(answer); const next = reconcile({ ...input, adjudications: [adjudication] }); if (next.status !== 'failed') { result = next; trace.resolutions = adjudication.resolution.status === 'selected' ? 1 : 0; } }
  }
  result = ReconciliationResultSchema.parse(result);
  trace.disputes = result.status === 'human_review_required' ? result.disputes.length : 0;
  trace.finalStatus = result.status;
  if (result.status === 'human_review_required') trace.abstentionCauses = ['reconciliation_requires_review'];
  if (result.status === 'failed') trace.abstentionCauses = [result.code];
  return { result, trace, diagnostics: grouped.diagnostics, attributionDiagnostics: binding.diagnostics };
}
