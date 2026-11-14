import { createHash } from 'node:crypto';
import { InterpretationSchema, type Message, type FactSchema, type FactAssertion, type SubjectRef } from '../../../contracts';
import { ClaimGroupSchema, ContextReviewSchema, ReconciliationResultSchema, type AdjudicationResponse, type ClaimCandidate, type ClaimGroup, type ContextReview, type Dispute } from './contracts';
import { validateOccurrence, validateCandidate } from './evidence';
import { occurrenceKey } from './alignment';
import { evidenceAnchored, sameEvidence, reconcileSafety, SafetyInputSchema, type SafetyInput } from './safety';
import { validateAdjudication } from './adjudication';
import { validateInterpretation } from '../validation';
import { validateAssertions } from '../../../domain/facts/validate';

type Diagnostic = { candidateId: string; code: 'invalid_candidate' | 'missing_focus' | 'ambiguous_occurrence' | 'duplicate_candidate' | 'duplicate_extractor' | 'subject_unverified' | 'subject_disagreement' };
type Input = { factSchema: FactSchema; knownSubjects: SubjectRef[]; historicalAssertions: FactAssertion[]; diagnostics: Diagnostic[]; groups: ClaimGroup[]; reviews: ContextReview[]; messages: Message[]; materialFieldIds: string[]; schemaVersion: string; safety: SafetyInput; adjudications?: AdjudicationResponse[] };
function dimensions(c: ClaimCandidate) {
  return JSON.stringify([c.fieldId, c.subjectRef.scope, c.subjectRef.id, c.value, c.unit, c.period, c.incomeBasis, c.precision, c.correction]);
}
function validCandidate(candidate: ClaimCandidate, input: Input): boolean {
  if (candidate.correction?.dimension !== 'subjectRef') return validateCandidate(candidate, input.factSchema, input.messages, input.historicalAssertions);
  const prior = input.historicalAssertions.filter(a => a.assertionId === candidate.correction!.previousAssertionId);
  const field = input.factSchema.fields.find(f => f.id === candidate.fieldId);
  if (prior.length !== 1 || !field?.scopes.includes(candidate.subjectRef.scope)) return false;
  // The shared validator requires matching subjects for other corrections; check the new subject separately.
  return validateCandidate({ ...candidate, subjectRef: prior[0].subjectRef }, input.factSchema, input.messages, input.historicalAssertions);
}
export function reconcile(input: Input) {
  if (!input.factSchema || !Array.isArray(input.knownSubjects) || !Array.isArray(input.historicalAssertions) || !Array.isArray(input.diagnostics)) return ReconciliationResultSchema.parse({ status: 'failed', code: 'missing_context', message: 'Validation context is required' });
  const trace: { groupId: string; candidateId: string; decision: 'accepted' | 'excluded' | 'pending'; reason: string }[] = [];
  const disputes: Dispute[] = [];
  const assertions: unknown[] = [];
  const reasons: string[] = [];
  const safetyInput = SafetyInputSchema.safeParse(input.safety);
  const safety = safetyInput.success ? reconcileSafety(safetyInput.data.candidates, safetyInput.data.verdicts, input.messages, safetyInput.data.historicalBlockers) : undefined;
  if (!safety || safety.humanReviewRequired) reasons.push('Protected safety scan or review is incomplete or uncertain');
  const responseIds = (input.adjudications ?? []).map(a => a.disputeId);
  if (new Set(responseIds).size !== responseIds.length || responseIds.some(id => !input.groups.some(g => g.groupId === id))) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_adjudication', message: 'Invalid adjudication reference' });
  if (input.diagnostics.some(d => !['subject_unverified', 'subject_disagreement'].includes(d.code))) reasons.push('Grouping rejected or could not align a candidate');
  const ids = new Set<string>();
  const occurrenceIds = new Set<string>();
  const candidateIds = new Set<string>();
  for (const group of [...input.groups].sort((a, b) => a.groupId.localeCompare(b.groupId))) {
    if (!ClaimGroupSchema.safeParse(group).success || ids.has(group.groupId) || group.candidates.some(c => c.fieldId !== group.fieldId || c.occurrence.messageId !== group.occurrence.messageId || !validateOccurrence(c.occurrence, input.messages) || !validCandidate(c, input) || !input.knownSubjects.some(s => s.scope === c.subjectRef.scope && s.id === c.subjectRef.id) || input.diagnostics.some(d => d.candidateId === c.candidateId && !['subject_unverified', 'subject_disagreement'].includes(d.code)) || !evidenceAnchored(c.evidenceRefs, input.messages))) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_input', message: 'Invalid group or evidence' });
    const groupFocus = group.occurrence.focusSpan;
    if (!validateOccurrence(group.occurrence, input.messages) || new Set(group.candidates.map(c => c.extractorId)).size !== group.candidates.length || group.candidates.some(c => {
      const focus = c.occurrence.focusSpan;
      if (!!focus !== !!groupFocus) return true;
      if (focus && groupFocus) return focus.start >= groupFocus.end || groupFocus.start >= focus.end;
      return c.occurrence.statementSpan.start !== group.occurrence.statementSpan.start || c.occurrence.statementSpan.end !== group.occurrence.statementSpan.end;
    })) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_group', message: 'Incompatible grouped occurrences' });
    ids.add(group.groupId);
    const focus = group.occurrence.focusSpan ?? group.occurrence.statementSpan;
    const source = input.messages.find(m => m.messageId === group.occurrence.messageId);
    const anchor = source?.content.type === 'text' && group.occurrence.focusSpan ? occurrenceKey(group.fieldId, group.occurrence, source.content.text) : undefined;
    if (anchor && !anchor.key) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_group', message: 'Ambiguous occurrence anchor' });
    const occurrenceId = anchor?.key ?? JSON.stringify([group.occurrence.messageId, group.fieldId, focus.start, focus.end]);
    if (occurrenceIds.has(occurrenceId) || new Set(group.candidates.map(c => c.candidateId)).size !== group.candidates.length || group.candidates.some(c => candidateIds.has(c.candidateId))) return ReconciliationResultSchema.parse({ status: 'failed', code: 'duplicate_occurrence', message: 'Duplicate occurrence or candidate' });
    occurrenceIds.add(occurrenceId);
    for (const c of group.candidates) candidateIds.add(c.candidateId);
    const candidates = [...group.candidates].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    const supported = candidates.filter(c => input.reviews.filter(r => r.groupId === group.groupId && r.candidateId === c.candidateId).length === 1 && input.reviews.filter(r => r.groupId === group.groupId && r.candidateId === c.candidateId && ContextReviewSchema.safeParse(r).success && r.atomicity === 'atomic' && r.support === 'supported' && evidenceAnchored(r.evidenceRefs, input.messages) && sameEvidence(r.evidenceRefs, c.evidenceRefs, input.messages)).length === 1);
    const variants = new Set(candidates.map(dimensions));
    const previousAssertionIds = [...new Set(candidates.flatMap(c => c.correction ? [c.correction.previousAssertionId] : []))].sort();
    const priorAssertions = input.historicalAssertions.filter(a => previousAssertionIds.includes(a.assertionId));
    if (previousAssertionIds.length && !validateAssertions(priorAssertions, input.messages, input.factSchema).ok) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_history', message: 'Historical evidence or assertion is invalid' });
    const correctionEvidence = [...input.historicalAssertions.filter(a => previousAssertionIds.includes(a.assertionId)).flatMap(a => a.evidenceRefs), ...candidates.flatMap(c => c.evidenceRefs)];
    const evidenceRefs = [...new Map(correctionEvidence.map(e => [JSON.stringify(e), e])).values()];
    const dispute: Dispute = { disputeId: group.groupId, groupId: group.groupId, candidateIds: candidates.map(c => c.candidateId), reason: variants.size > 1 ? 'Conflicting dimensions' : 'Insufficient contextual support', ...(previousAssertionIds.length ? { previousAssertionIds, evidenceRefs } : {}) };
    const explicitlyAbsent = candidates.every(c => c.value === undefined && !c.correction && input.reviews.filter(r => r.groupId === group.groupId && r.candidateId === c.candidateId).length === 1 && input.reviews.some(r => ContextReviewSchema.safeParse(r).success && r.groupId === group.groupId && r.candidateId === c.candidateId && r.atomicity === 'atomic' && r.support === 'absent' && evidenceAnchored(r.evidenceRefs, input.messages) && sameEvidence(r.evidenceRefs, c.evidenceRefs, input.messages)));
    if (explicitlyAbsent && !(input.adjudications ?? []).some(a => a.disputeId === dispute.disputeId)) {
      disputes.push({ ...dispute, reason: 'Information is absent; clarification may be needed' });
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Information is absent' });
      continue;
    }
    const responses = (input.adjudications ?? []).filter(a => a.disputeId === dispute.disputeId);
    if (responses.length && !validateAdjudication(responses[0], [dispute], candidates, input.reviews, input.messages)) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_adjudication', message: 'Invalid adjudication response' });
    if (responses.length && !validateAdjudication(responses[0], [dispute], candidates, input.reviews, input.messages, [], safety?.findings ?? [])) {
      disputes.push(dispute);
      reasons.push(`Adjudication conflicts with a protected finding: ${group.groupId}`);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Protected finding requires review' });
      continue;
    }
    const response = responses[0];
    const selected = response?.resolution.status === 'selected' ? supported.find(c => c.candidateId === (response.resolution.status === 'selected' ? response.resolution.candidateId : '')) : !response && variants.size === 1 && supported.length && (!input.materialFieldIds.includes(group.fieldId) || new Set(supported.map(c => c.extractorId)).size >= 2) ? supported[0] : undefined;
    if (!selected || selected.correction || selected.value === undefined || selected.precision === 'ambiguous' || selected.precision === 'inferred') {
      disputes.push(dispute);
      if (input.materialFieldIds.includes(group.fieldId) || candidates.some(c => c.correction)) reasons.push(`Unresolved: ${group.groupId}`);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: dispute.reason });
      continue;
    }
    const message = input.messages.find(m => m.messageId === selected.occurrence.messageId)!;
    assertions.push({ assertionId: `mp-${createHash('sha256').update(occurrenceId).digest('hex')}`, fieldId: selected.fieldId, subjectRef: selected.subjectRef, value: selected.value, unit: selected.unit, period: selected.period, incomeBasis: selected.incomeBasis, rawValue: selected.occurrence.statementSpan.text, source: 'customer_message', evidenceRefs: selected.evidenceRefs, observedAt: message.occurredAt, precision: selected.precision, reviewStatus: 'unreviewed', schemaVersion: input.schemaVersion });
    for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: c.candidateId === selected.candidateId ? 'accepted' : 'excluded', reason: c.candidateId === selected.candidateId ? 'Contextually supported' : 'Duplicate or unselected candidate' });
  }
  if (reasons.length) return ReconciliationResultSchema.parse({ status: 'human_review_required', disputes, reasons, trace, safetyFindings: safety?.findings ?? [] });
  const historicalIds = new Set(safetyInput.success ? safetyInput.data.historicalBlockers.map(b => b.id) : []);
  const freshBlockers = (safety?.blockers ?? []).filter(b => !historicalIds.has(b.id));
  const candidate = { assertions, blockers: freshBlockers, warnings: disputes.map(d => `Unresolved: ${d.groupId}`) };
  const checked = validateInterpretation(candidate, { messages: input.messages, factSchema: input.factSchema } as Parameters<typeof validateInterpretation>[1]);
  if (!checked.ok) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_interpretation', message: 'Interpretation validation failed' });
  const interpretation = InterpretationSchema.safeParse({ ...checked.value, blockers: safety?.blockers ?? [] });
  return interpretation.success ? ReconciliationResultSchema.parse({ status: 'consolidated', interpretation: interpretation.data, trace, safetyFindings: safety?.findings ?? [] }) : ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_interpretation', message: 'Interpretation validation failed' });
}
