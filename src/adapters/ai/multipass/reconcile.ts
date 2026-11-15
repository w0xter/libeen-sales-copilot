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
  const canonicalIds = new Set<string>();
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
    if (new Set(group.candidates.map(c => c.candidateId)).size !== group.candidates.length || group.candidates.some(c => candidateIds.has(c.candidateId))) return ReconciliationResultSchema.parse({ status: 'failed', code: 'duplicate_candidate', message: 'Duplicate candidate' });
    if (occurrenceIds.has(occurrenceId)) {
      disputes.push({ disputeId: group.groupId, groupId: group.groupId, candidateIds: group.candidates.map(c => c.candidateId).sort(), reason: 'Duplicate occurrence requires review' });
      reasons.push(`Ambiguous identity: ${group.groupId}`);
      for (const c of [...group.candidates].sort((a, b) => a.candidateId.localeCompare(b.candidateId))) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Duplicate occurrence requires review' });
      continue;
    }
    occurrenceIds.add(occurrenceId);
    for (const c of group.candidates) candidateIds.add(c.candidateId);
    const candidates = [...group.candidates].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
    // A verdict is usable only when it is unique, atomic and anchored to this
    // candidate's evidence. It is still a contextual judgment, not proof.
    const verdict = (c: ClaimCandidate) => {
      const reviews = input.reviews.filter(r => r.groupId === group.groupId && r.candidateId === c.candidateId);
      const r = reviews[0];
      return reviews.length === 1 && ContextReviewSchema.safeParse(r).success && r.atomicity === 'atomic' && evidenceAnchored(r.evidenceRefs, input.messages) && sameEvidence(r.evidenceRefs, c.evidenceRefs, input.messages) ? r.support : undefined;
    };
    const supported = candidates.filter(c => verdict(c) === 'supported');
    // Refuting the same assertion another reviewer supports is itself a
    // disagreement; neither review is sufficient to exclude that assertion.
    const refuted = candidates.filter(c => verdict(c) === 'refuted' && !supported.some(s => dimensions(s) === dimensions(c)));
    const unresolvedContext = candidates.some(c => {
      const status = verdict(c);
      const hasReview = input.reviews.some(r => r.groupId === group.groupId && r.candidateId === c.candidateId);
      return status === 'refuted' || status === 'uncertain' || status === 'absent' || (hasReview && !status);
    });
    const pendingTrace = (reason: string) => {
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: refuted.includes(c) ? 'excluded' : 'pending', reason: refuted.includes(c) ? 'Contextually refuted' : reason });
    };
    const variants = new Set(candidates.filter(c => !refuted.includes(c)).map(dimensions));
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
    // Exclusion is not affirmative support for any remaining alternative, and
    // an adjudication cannot erase a conflicting contextual review.
    if (unresolvedContext) {
      disputes.push({ ...dispute, reason: supported.length && candidates.some(c => verdict(c) === 'refuted') ? 'Conflicting contextual reviews' : candidates.some(c => verdict(c) === 'uncertain') ? 'Uncertain contextual support' : candidates.some(c => verdict(c) === 'refuted') ? 'Contextual refutation requires review' : 'Invalid or absent contextual support' });
      reasons.push(`Unresolved: ${group.groupId}`);
      pendingTrace('Contextual disagreement requires review');
      continue;
    }
    const selected = response?.resolution.status === 'selected' ? supported.find(c => c.candidateId === (response.resolution.status === 'selected' ? response.resolution.candidateId : '')) : !response && variants.size === 1 && supported.length && (!input.materialFieldIds.includes(group.fieldId) || new Set(supported.map(c => c.extractorId)).size >= 2) ? supported[0] : undefined;
    if (!selected || selected.correction || selected.value === undefined || selected.precision === 'ambiguous' || selected.precision === 'inferred') {
      disputes.push(dispute);
      if (input.materialFieldIds.includes(group.fieldId) || candidates.some(c => c.correction)) reasons.push(`Unresolved: ${group.groupId}`);
      pendingTrace(dispute.reason);
      continue;
    }
    const message = input.messages.find(m => m.messageId === selected.occurrence.messageId)!;
    let canonicalId = occurrenceId;
    const equivalentCandidates = supported.filter(c => dimensions(c) === dimensions(selected));
    const equivalentReviews = equivalentCandidates.map(c => input.reviews.find(r => r.groupId === group.groupId && r.candidateId === c.candidateId)!);
    const identitySpans = equivalentReviews.map(r => r.identitySpan);
    const text = message.content.type === 'text' ? message.content.text : '';
    const values = Array.isArray(selected.value) ? selected.value : typeof selected.value === 'string' ? [selected.value] : typeof selected.value === 'number' ? [String(selected.value)] : [];
    const positions = values.map(value => ({ value, start: text.indexOf(value) }));
    let literalSpan: { start: number; end: number; text: string } | undefined;
    if (positions.length && positions.every(p => p.value.length > 0 && p.start >= 0 && text.indexOf(p.value, p.start + 1) < 0)) {
      const start = Math.min(...positions.map(p => p.start));
      const end = Math.max(...positions.map(p => p.start + p.value.length));
      literalSpan = { start, end, text: text.slice(start, end) };
    }
    const invalidReviewerSpan = identitySpans.some((span, i) => {
      if (!span) return false;
      const occurrence = equivalentCandidates[i].occurrence;
      const focus = occurrence.focusSpan ?? occurrence.statementSpan;
      return span.start >= focus.end || focus.start >= span.end || !validateOccurrence({ ...occurrence, focusSpan: span }, input.messages);
    });
    const normalizedByLiteral = literalSpan && identitySpans.every(span => span && span.start <= literalSpan!.start && span.end >= literalSpan!.end);
    if (invalidReviewerSpan || (identitySpans.some(Boolean) && (identitySpans.some(s => !s) || (new Set(identitySpans.map(s => JSON.stringify(s))).size !== 1 && !normalizedByLiteral)))) {
      disputes.push({ ...dispute, reason: 'Context reviewers disagree on occurrence identity' });
      reasons.push(`Ambiguous identity: ${group.groupId}`);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Context reviewers disagree on occurrence identity' });
      continue;
    }
    const selectedReview = input.reviews.find(r => r.groupId === group.groupId && r.candidateId === selected.candidateId)!;
    if (selectedReview.identitySpan || typeof selected.value === 'string' || Array.isArray(selected.value) || !anchor?.numeric) {
      const span = normalizedByLiteral ? literalSpan : selectedReview.identitySpan ?? literalSpan;
      const original = selected.occurrence.statementSpan;
      const selectedFocus = selected.occurrence.focusSpan ?? original;
      const coversCollection = !Array.isArray(selected.value) || selected.value.every(value => !text.includes(value) || span?.text.includes(value));
      const validSpan = coversCollection && span && span.start >= original.start && span.end <= original.end && span.start < selectedFocus.end && selectedFocus.start < span.end && validateOccurrence({ messageId: message.messageId, statementSpan: original, focusSpan: span }, input.messages);
      if (!validSpan || !span) {
        disputes.push({ ...dispute, reason: 'Textual occurrence identity is ambiguous' });
        reasons.push(`Ambiguous identity: ${group.groupId}`);
        for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Textual occurrence identity is ambiguous' });
        continue;
      }
      canonicalId = JSON.stringify([message.messageId, group.fieldId, span.start, span.end]);
    }
    const identity = JSON.parse(canonicalId) as [string, string, number, number];
    if (equivalentCandidates.some(c => {
      const occurrence = c.occurrence;
      const focus = occurrence.focusSpan ?? occurrence.statementSpan;
      const canonicalSpan = { start: identity[2], end: identity[3], text: text.slice(identity[2], identity[3]) };
      return identity[2] >= focus.end || focus.start >= identity[3] || !validateOccurrence({ ...occurrence, focusSpan: canonicalSpan }, input.messages);
    })) {
      disputes.push({ ...dispute, reason: 'Candidates do not share a validated occurrence' });
      reasons.push(`Ambiguous identity: ${group.groupId}`);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Candidates do not share a validated occurrence' });
      continue;
    }
    const overlapsCanonical = [...canonicalIds].some(key => {
      const prior = JSON.parse(key) as [string, string, number, number];
      return prior[0] === identity[0] && prior[1] === identity[1] && prior[2] < identity[3] && identity[2] < prior[3];
    });
    if (overlapsCanonical) {
      disputes.push({ ...dispute, reason: 'Canonical occurrence is duplicated' });
      reasons.push(`Ambiguous identity: ${group.groupId}`);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Canonical occurrence is duplicated' });
      continue;
    }
    canonicalIds.add(canonicalId);
    const [, , identityStart, identityEnd] = JSON.parse(canonicalId) as [string, string, number, number];
    const sourceText = message.content.type === 'text' ? message.content.text : '';
    const identityRef = { messageId: message.messageId, start: identityStart, end: identityEnd, quote: sourceText.slice(identityStart, identityEnd) };
    const relatedHistory = input.historicalAssertions.filter(a => a.fieldId === group.fieldId && a.evidenceRefs.some(e => e.messageId === message.messageId));
    const overlappingHistory = relatedHistory.filter(a => a.evidenceRefs.some(e => {
      if (e.messageId !== message.messageId) return false;
      const start = e.start ?? (e.quote ? sourceText.indexOf(e.quote) : -1);
      if (start < 0 || (e.start === undefined && e.quote && sourceText.indexOf(e.quote, start + 1) >= 0)) return true;
      const end = e.end ?? start + (e.quote?.length ?? 0);
      return start < identityEnd && identityStart < end;
    }));
    const exactHistory = overlappingHistory.filter(a => sameEvidence(a.evidenceRefs, [identityRef], input.messages));
    if (overlappingHistory.length && (overlappingHistory.length !== 1 || exactHistory.length !== 1 || !validateAssertions(exactHistory, input.messages, input.factSchema).ok || exactHistory[0].source !== 'customer_message' || exactHistory[0].reviewStatus !== 'unreviewed' || JSON.stringify([exactHistory[0].subjectRef.scope, exactHistory[0].subjectRef.id, exactHistory[0].value, exactHistory[0].unit, exactHistory[0].period, exactHistory[0].incomeBasis, exactHistory[0].precision]) !== JSON.stringify([selected.subjectRef.scope, selected.subjectRef.id, selected.value, selected.unit, selected.period, selected.incomeBasis, selected.precision]))) {
      disputes.push({ ...dispute, reason: 'Historical occurrence identity or value is ambiguous', previousAssertionIds: overlappingHistory.map(a => a.assertionId), evidenceRefs: overlappingHistory.flatMap(a => a.evidenceRefs) });
      reasons.push(`Ambiguous historical identity: ${group.groupId}`);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: 'pending', reason: 'Historical identity requires review' });
      continue;
    }
    if (exactHistory.length === 1) {
      assertions.push(exactHistory[0]);
      for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: c.candidateId === selected.candidateId ? 'accepted' : 'excluded', reason: 'Reused validated historical occurrence' });
      continue;
    }
    assertions.push({ assertionId: `mp-${createHash('sha256').update(canonicalId).digest('hex')}`, fieldId: selected.fieldId, subjectRef: selected.subjectRef, value: selected.value, unit: selected.unit, period: selected.period, incomeBasis: selected.incomeBasis, rawValue: selected.occurrence.statementSpan.text, source: 'customer_message', evidenceRefs: selected.evidenceRefs, observedAt: message.occurredAt, precision: selected.precision, reviewStatus: 'unreviewed', schemaVersion: input.schemaVersion });
    for (const c of candidates) trace.push({ groupId: group.groupId, candidateId: c.candidateId, decision: c.candidateId === selected.candidateId ? 'accepted' : 'excluded', reason: c.candidateId === selected.candidateId ? 'Contextually supported' : 'Duplicate or unselected candidate' });
  }
  if (reasons.length) return ReconciliationResultSchema.parse({ status: 'human_review_required', disputes, reasons, trace, safetyFindings: safety?.findings ?? [] });
  const historicalIds = new Set(safetyInput.success ? safetyInput.data.historicalBlockers.map(b => b.id) : []);
  const freshBlockers = (safety?.blockers ?? []).filter(b => !historicalIds.has(b.id));
  const candidate = { assertions, blockers: freshBlockers, warnings: disputes.map(d => `Unresolved: ${d.groupId}`) };
  const checked = validateInterpretation(candidate, { messages: input.messages, factSchema: input.factSchema } as Parameters<typeof validateInterpretation>[1]);
  if (!checked.ok) return ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_interpretation', message: 'Interpretation validation failed' });
  const interpretation = InterpretationSchema.safeParse(checked.value);
  return interpretation.success ? ReconciliationResultSchema.parse({ status: 'consolidated', interpretation: interpretation.data, trace, safetyFindings: safety?.findings ?? [] }) : ReconciliationResultSchema.parse({ status: 'failed', code: 'invalid_interpretation', message: 'Interpretation validation failed' });
}
