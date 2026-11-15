import { z } from 'zod';
import type { AgentProfile, Blocker, FactAssertion, FactSchema, Message, SubjectRef } from '../../../contracts';
import { RawClaimSchema, ContextReviewSchema, AdjudicationResponseSchema, ReconciliationResultSchema, type ClaimCandidate } from './contracts';
import { SafetyCandidateSchema, SafetyVerdictSchema } from './safety';
import { groupClaims } from './grouping';
import { reconcile } from './reconcile';
import { Scheduler, type FakeTransport } from './scheduler';
import { createTrace, type Role, type GroupingCounts, type InvalidCandidateReason, type SpanMismatchKind } from './trace';
import { bindSubjects } from './subjects';
import { checkContextCoverage } from './context-coverage';
import { locateEvidenceRef, locateOccurrence, validateOccurrence, validateEvidenceRefs } from './evidence';

export type Snapshot = { caseId: string; messages: Message[]; factSchema: FactSchema; agentProfile: AgentProfile; knownSubjects: SubjectRef[]; historicalAssertions: FactAssertion[]; historicalBlockers: Blocker[]; materialFieldIds: string[] };
const extraction = z.strictObject({ claims: z.array(RawClaimSchema) });
const scan = z.strictObject({ status: z.literal('complete'), candidates: z.array(SafetyCandidateSchema) });
const review = z.strictObject({ status: z.literal('complete'), reviews: z.array(ContextReviewSchema), candidates: z.array(SafetyCandidateSchema).optional(), verdicts: z.array(SafetyVerdictSchema) });
function freeze<T>(value: T): T { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
function invalidCandidateReason(candidate: ClaimCandidate, snapshot: Snapshot): InvalidCandidateReason {
  const messages = snapshot.messages.filter(m => m.messageId === candidate.occurrence.messageId);
  if (messages.length !== 1 || messages[0].role !== 'customer' || messages[0].content.type !== 'text') return 'message_reference';
  const text = messages[0].content.text;
  const statement = candidate.occurrence.statementSpan;
  if (text.slice(statement.start, statement.end) !== statement.text) return 'statement_span_mismatch';
  const focus = candidate.occurrence.focusSpan;
  if (focus && (focus.start < statement.start || focus.end > statement.end || text.slice(focus.start, focus.end) !== focus.text)) return 'focus_span_mismatch';
  if (!validateOccurrence(candidate.occurrence, snapshot.messages)) return 'occurrence_other';
  const field = snapshot.factSchema.fields.find(f => f.id === candidate.fieldId);
  if (!field) return 'unknown_field';
  if (!field.scopes.includes(candidate.subjectRef.scope)) return 'invalid_scope';
  if (candidate.unit !== undefined && !field.units.includes(candidate.unit)) return 'invalid_unit';
  if (candidate.subjectRef.scope === 'case' && candidate.subjectRef.id !== snapshot.caseId) return 'case_subject_mismatch';
  if (!validateEvidenceRefs(candidate, snapshot.messages)) return 'invalid_evidence';
  return 'other_validation';
}
export async function runPipeline(options: { runId: string; snapshot: Snapshot; transport: FakeTransport; signal?: AbortSignal; timeoutMs?: number; totalTimeoutMs?: number; instructionVersion?: string; schemaVersion?: string; locateSpans?: boolean }) {
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
  const candidates: ClaimCandidate[] = initial.slice(0, 3).flatMap((value, i) => extraction.parse(value).claims.map((claim, n) => {
    const references = options.locateSpans ? claim.evidenceRefs.map(ref => locateEvidenceRef(ref, snapshot.messages)) : claim.evidenceRefs;
    const occurrence = options.locateSpans ? locateOccurrence(claim.occurrence, snapshot.messages) : claim.occurrence;
    const safeOccurrence = occurrence && references.every(ref => ref !== undefined) ? occurrence : { ...claim.occurrence, statementSpan: { ...claim.occurrence.statementSpan, start: 0, end: 0 } };
    return { ...claim, occurrence: safeOccurrence, evidenceRefs: references.every(ref => ref !== undefined) ? references : claim.evidenceRefs, extractorId: `E${i + 1}`, candidateId: `E${i + 1}-${n}` };
  }));
  const grouped = groupClaims(candidates, snapshot.messages, { factSchema: snapshot.factSchema, assertions: snapshot.historicalAssertions, caseId: snapshot.caseId });
  const rejectionReasons: GroupingCounts['rejectionReasons'] = {};
  const invalidCandidateReasons: GroupingCounts['invalidCandidateReasons'] = {};
  const spanMismatchKinds: GroupingCounts['spanMismatchKinds'] = {};
  const evidenceFailures: GroupingCounts['evidenceFailures'] = {};
  const invalidScopes: GroupingCounts['invalidScopes'] = [];
  for (const diagnostic of grouped.diagnostics) {
    const code = diagnostic.code;
    if (code === 'invalid_candidate' || code === 'missing_focus' || code === 'ambiguous_occurrence' || code === 'duplicate_candidate' || code === 'duplicate_extractor') rejectionReasons[code] = (rejectionReasons[code] ?? 0) + 1;
  }
  const invalidIds = new Set(grouped.diagnostics.filter(d => d.code === 'invalid_candidate').map(d => d.candidateId));
  for (const candidate of grouped.rejected) if (invalidIds.has(candidate.candidateId)) {
    const reason = invalidCandidateReason(candidate, snapshot);
    invalidCandidateReasons[reason] = (invalidCandidateReasons[reason] ?? 0) + 1;
    if (reason === 'invalid_scope') {
      const field = snapshot.factSchema.fields.find(f => f.id === candidate.fieldId)!;
      const previous = invalidScopes.find(entry => entry.fieldId === field.id && entry.receivedScope === candidate.subjectRef.scope);
      if (previous) previous.count++;
      else invalidScopes.push({ fieldId: field.id, receivedScope: candidate.subjectRef.scope, allowedScopes: [...field.scopes], count: 1 });
    }
    if (reason === 'invalid_evidence') {
      const bad = candidate.evidenceRefs.find(ref => !validateEvidenceRefs({ ...candidate, evidenceRefs: [ref] }, snapshot.messages));
      const matching = snapshot.messages.filter(m => m.messageId === bad?.messageId);
      const source = matching[0];
      const kind = !bad || matching.length !== 1 || bad.messageId !== candidate.occurrence.messageId || source.role !== 'customer' || source.content.type !== 'text' ? 'message_reference' : bad.quote && !source.content.text.includes(bad.quote) ? 'quote_absent' : bad.quote && bad.start !== undefined && bad.end !== undefined && source.content.text.slice(bad.start, bad.end) !== bad.quote ? 'quote_present_bad_offsets' : 'other';
      evidenceFailures[kind] = (evidenceFailures[kind] ?? 0) + 1;
    }
    if (reason === 'statement_span_mismatch' || reason === 'focus_span_mismatch') {
      const message = snapshot.messages.find(m => m.messageId === candidate.occurrence.messageId)!;
      const text = message.content.type === 'text' ? message.content.text : '';
      const span = reason === 'statement_span_mismatch' ? candidate.occurrence.statementSpan : candidate.occurrence.focusSpan!;
      const start = text.indexOf(span.text);
      const kind: SpanMismatchKind = start < 0 ? 'text_absent' : text.indexOf(span.text, start + 1) >= 0 ? 'text_repeated' : span.start === start && span.end === start + span.text.length ? 'text_present_offsets_correct' : span.start === start ? 'text_present_start_correct_end_wrong' : span.end === start + span.text.length ? 'text_present_start_wrong_end_correct' : 'text_present_both_wrong';
      spanMismatchKinds[kind] = (spanMismatchKinds[kind] ?? 0) + 1;
    }
  }
  trace.groupingCounts = { extraction: { E1: extraction.parse(initial[0]).claims.length, E2: extraction.parse(initial[1]).claims.length, E3: extraction.parse(initial[2]).claims.length }, candidates: candidates.length, groups: grouped.groups.length, groupedCandidates: grouped.groups.reduce((sum, group) => sum + group.candidates.length, 0), rejected: grouped.rejected.length, rejectionReasons, invalidCandidateReasons, spanMismatchKinds, evidenceFailures, invalidScopes };
  const normalizeRefs = <T extends { evidenceRefs: import('../../../contracts').EvidenceRef[] }>(item: T): T => options.locateSpans ? { ...item, evidenceRefs: item.evidenceRefs.map(ref => locateEvidenceRef(ref, snapshot.messages) ?? ref) } : item;
  const rawScan = scan.parse(initial[3]);
  const scanResult = { ...rawScan, candidates: rawScan.candidates.map(normalizeRefs) };
  const reviewed = await call('S2', freeze({ snapshot, candidates, groups: grouped.groups, diagnostics: grouped.diagnostics, signals: scanResult.candidates }), review);
  if (reviewed === undefined) { const failure = fail('protected_review_failed'); return { ...failure, diagnostics: grouped.diagnostics }; }
  const rawContextual = review.parse(reviewed);
  const contextual = { ...rawContextual, candidates: rawContextual.candidates?.map(normalizeRefs), verdicts: rawContextual.verdicts.map(normalizeRefs) };
  const coverage = checkContextCoverage(grouped.groups, contextual.reviews);
  if (!coverage.complete) {
    trace.reviewCounts = coverage.counts;
    const failure = fail('incomplete_contextual_review');
    return { ...failure, diagnostics: grouped.diagnostics };
  }
  const binding = bindSubjects({ factSchema: snapshot.factSchema, groups: grouped.groups, reviews: contextual.reviews, messages: snapshot.messages, historicalAssertions: snapshot.historicalAssertions, knownSubjects: snapshot.knownSubjects, caseId: snapshot.caseId, diagnostics: grouped.diagnostics });
  const additionalSignals = contextual.candidates ?? [];
  const distinctAdditional = additionalSignals.filter(candidate => {
    const original = scanResult.candidates.filter(signal => signal.signalId === candidate.signalId);
    return !(original.length === 1 && additionalSignals.filter(signal => signal.signalId === candidate.signalId).length === 1 && JSON.stringify(original[0]) === JSON.stringify(candidate));
  });
  const input = { factSchema: snapshot.factSchema, knownSubjects: [...snapshot.knownSubjects, ...binding.authorizedSubjects], historicalAssertions: snapshot.historicalAssertions, diagnostics: grouped.diagnostics, groups: binding.groups, reviews: contextual.reviews, messages: snapshot.messages, materialFieldIds: snapshot.materialFieldIds, schemaVersion: snapshot.factSchema.version, safety: { scanStatus: 'complete' as const, reviewStatus: 'complete' as const, candidates: [...scanResult.candidates, ...distinctAdditional], verdicts: contextual.verdicts, historicalBlockers: snapshot.historicalBlockers } };
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
