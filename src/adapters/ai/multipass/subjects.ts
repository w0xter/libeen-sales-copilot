import { createHash } from 'node:crypto';
import type { FactAssertion, Message, SubjectRef } from '../../../contracts';
import type { ClaimGroup, ContextReview } from './contracts';
import { validateOccurrence } from './evidence';
import { evidenceAnchored, sameEvidence } from './safety';

/** S2 supplies semantic classification; this stage verifies its provenance and
 * consistency. Canonical IDs are pseudonymous references, not authentication. */
export function bindSubjects(input: { groups: ClaimGroup[]; reviews: ContextReview[]; messages: Message[]; historicalAssertions: FactAssertion[]; knownSubjects: SubjectRef[]; caseId: string; diagnostics: { candidateId: string; code: string }[] }) {
  const { groups, reviews, messages, historicalAssertions, knownSubjects, caseId } = input;
  const bound: ClaimGroup[] = [];
  const authorized: SubjectRef[] = [];
  const diagnostics: { groupId: string; candidateId: string; status: 'verified' | 'normalized' | 'rejected'; reason: string }[] = [];
  const digest = (kind: string, ...parts: string[]) => `${kind}-${createHash('sha256').update(JSON.stringify([kind, ...parts])).digest('hex')}`;
  const units = new Set([...knownSubjects, ...historicalAssertions.filter(a => a.reviewStatus !== 'rejected').map(a => a.subjectRef)].filter(s => s.scope === 'buying_unit').map(s => s.id));
  for (const group of groups) {
    const scopes = new Set(group.candidates.map(c => c.subjectRef.scope));
    const matched = group.candidates.map(c => reviews.filter(r => r.groupId === group.groupId && r.candidateId === c.candidateId));
    const kinds = new Set(matched.flatMap(rs => rs.flatMap(r => r.subjectAttribution ? [r.subjectAttribution.kind] : [])));
    const claimedSubjects = new Set(group.candidates.map(c => JSON.stringify(c.subjectRef)));
    // Separate occurrences in one message may describe different people. A
    // message-local ID cannot safely identify either without stronger binding.
    const competingOccurrences = kinds.has('local_speaker') && group.candidates.some(c => c.subjectRef.scope === 'participant' && groups.some(other => other.groupId !== group.groupId && other.fieldId === group.fieldId && other.candidates.some(peer => peer.subjectRef.scope === 'participant' && peer.occurrence.messageId === c.occurrence.messageId)));
    let rejected = scopes.size !== 1 || claimedSubjects.size !== 1 || kinds.size > 1 || matched.some(rs => rs.length !== 1) || competingOccurrences;
    const normalized = group.candidates.map((c, i) => {
      const review = matched[i][0]; const a = review?.subjectAttribution;
      const known = knownSubjects.some(s => s.scope === c.subjectRef.scope && s.id === c.subjectRef.id);
      const compatible = c.subjectRef.scope === 'case' ? 'case' : c.subjectRef.scope === 'buying_unit' ? 'buying_unit' : 'local_speaker';
      let subject: SubjectRef | undefined;
      const supported = review?.atomicity === 'atomic' && review.support === 'supported' && validateOccurrence(c.occurrence, messages) && evidenceAnchored(review.evidenceRefs, messages) && sameEvidence(review.evidenceRefs, c.evidenceRefs, messages);
      // A known participant ID does not prove continuity in a different
      // message. The case itself is intrinsic; other references need S2.
      if (!a && supported && known && ((c.subjectRef.scope === 'case' && c.subjectRef.id === caseId) || c.correction || !historicalAssertions.some(h => h.subjectRef.scope === c.subjectRef.scope && h.subjectRef.id === c.subjectRef.id))) subject = c.subjectRef;
      else if (a && supported && a.kind === compatible && a.messageId === c.occurrence.messageId && a.justification.trim()) {
        const message = messages.find(m => m.messageId === a.messageId);
        const span = c.occurrence.statementSpan;
        const valid = message?.content.type === 'text' && a.evidenceRefs.length > 0 && a.evidenceRefs.every(ref => {
          if (ref.messageId !== a.messageId || !ref.quote || message.content.type !== 'text') return false;
          const text = message.content.text; const start = ref.start ?? text.indexOf(ref.quote);
          const end = ref.end ?? start + ref.quote.length;
          return start >= span.start && end <= span.end && end > start && text.slice(start, end) === ref.quote && (ref.start !== undefined || text.indexOf(ref.quote, start + 1) < 0) && validateOccurrence({ messageId: a.messageId, statementSpan: span, focusSpan: { start, end, text: ref.quote } }, messages);
        });
        if (valid && !c.correction) {
          if (compatible === 'case') subject = { scope: 'case', id: caseId };
          if (compatible === 'local_speaker') subject = { scope: 'participant', id: digest('local', caseId, a.messageId) };
          if (compatible === 'buying_unit' && units.size <= 1) subject = { scope: 'buying_unit', id: digest('unit', caseId) };
          const history = historicalAssertions.filter(h => h.reviewStatus !== 'rejected' && h.fieldId === c.fieldId && sameEvidence(h.evidenceRefs, c.evidenceRefs, messages));
          if (history.length) {
            if (history.length === 1 && subject && history[0].subjectRef.scope === subject.scope && (subject.scope === 'case' || history[0].subjectRef.id === subject.id)) subject = history[0].subjectRef;
            else subject = undefined;
          }
          if (subject?.scope === 'buying_unit' && units.size && !units.has(subject.id)) subject = undefined;
        }
      }
      if (!subject) rejected = true;
      return { candidate: c, subject };
    });
    if (new Set(normalized.flatMap(x => x.subject ? [JSON.stringify(x.subject)] : [])).size > 1) rejected = true;
    for (const entry of normalized) {
      const support = reviews.find(r => r.groupId === group.groupId && r.candidateId === entry.candidate.candidateId)?.support;
      const reason = rejected ? support && support !== 'supported' ? `Subject attribution requires review: contextual support ${support}` : 'Subject attribution requires review' : 'Subject attribution accepted';
      diagnostics.push({ groupId: group.groupId, candidateId: entry.candidate.candidateId, status: rejected ? 'rejected' : JSON.stringify(entry.candidate.subjectRef) === JSON.stringify(entry.subject) ? 'verified' : 'normalized', reason });
    }
    if (rejected) continue;
    const candidates = normalized.map(({ candidate, subject }) => ({ ...candidate, subjectRef: subject! }));
    for (const c of candidates) if (!knownSubjects.some(s => s.scope === c.subjectRef.scope && s.id === c.subjectRef.id) && !authorized.some(s => s.scope === c.subjectRef.scope && s.id === c.subjectRef.id)) authorized.push(c.subjectRef);
    bound.push({ ...group, candidates });
  }
  return { status: diagnostics.some(d => d.status === 'rejected') ? 'human_review_required' as const : 'success' as const, groups: bound, authorizedSubjects: authorized, diagnostics };
}

/** Experimental, deliberately narrow grammar. This helper is not connected to
 * the pipeline: its input does not authenticate the message or resolve history. */
export function resolveLocalSubject(input: { caseId: string; messageId: string; text: string; scope: 'buying_unit' | 'participant'; focusStart: number; focusEnd: number }) {
  const { text, caseId, messageId, scope, focusStart, focusEnd } = input;
  const unresolved = { kind: 'unresolved' as const };
  if (!caseId || !messageId || focusStart < 0 || focusEnd <= focusStart || focusEnd > text.length) return unresolved;
  // Require the whole message to match a minimal, unquoted assertion. This is
  // intentionally not a general Spanish parser or a source-of-authority check.
  const amount = '(?:[0-9]+(?:[.,][0-9]+)?)';
  const single = new RegExp(`^yo gano\\s+${amount}(?:\\s+euros?)?\\s*[.!]?$`, 'iu');
  const buyer = new RegExp(`^compro yo solo y gano\\s+${amount}\\s*[.!]?$`, 'iu');
  const joint = new RegExp(`^compramos mi pareja y yo; entre los dos ganamos\\s+${amount}\\s*[.!]?$`, 'iu');
  const supported = scope === 'participant' ? single.test(text.trim()) : buyer.test(text.trim()) || joint.test(text.trim());
  if (!supported) return unresolved;
  const focus = text.slice(focusStart, focusEnd);
  if (!new RegExp(`^(?:${amount}|solo)$`, 'iu').test(focus)) return unresolved;
  const id = createHash('sha256').update(JSON.stringify([scope, caseId, ...(scope === 'participant' ? [messageId] : [])])).digest('hex');
  return { kind: 'resolved' as const, id: `local-${id}`, provenance: { messageId, focusStart, focusEnd, method: 'strict-text-pattern-v1' as const } };
}

/** Validates one local attribution in isolation; NOT sufficient to authorize a
 * candidate until the group, other S2 reviews and historical state agree. */
export function validateAttribution(input: { caseId: string; message: { messageId: string; role: string; content: { type: string; text: string } }; candidateId: string; candidateScope: string; occurrence: { messageId: string; statementSpan: { start: number; end: number; text: string } }; attribution: { kind: string; messageId: string; evidenceRefs: { messageId: string; quote: string; start: number; end: number }[]; justification: string } }) {
  const { caseId, message, candidateId, candidateScope, occurrence, attribution } = input;
  const unresolved = { status: 'unresolved' as const };
  if (!caseId || !candidateId || message.role !== 'customer' || message.content.type !== 'text' || candidateScope !== 'participant' || attribution.kind !== 'local_speaker' || attribution.messageId !== message.messageId || occurrence.messageId !== message.messageId || !attribution.justification.trim() || !attribution.evidenceRefs.length) return unresolved;
  const text = message.content.text; const span = occurrence.statementSpan;
  const boundary = (n: number) => !(n > 0 && n < text.length && text.charCodeAt(n - 1) >= 0xd800 && text.charCodeAt(n - 1) <= 0xdbff && text.charCodeAt(n) >= 0xdc00 && text.charCodeAt(n) <= 0xdfff);
  const exact = (start: number, end: number, quote: string) => Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= text.length && boundary(start) && boundary(end) && text.slice(start, end) === quote;
  if (!exact(span.start, span.end, span.text) || attribution.evidenceRefs.some(ref => ref.messageId !== message.messageId || ref.start < span.start || ref.end > span.end || !exact(ref.start, ref.end, ref.quote))) return unresolved;
  const digest = createHash('sha256').update(JSON.stringify(['local_speaker-v1', caseId, message.messageId])).digest('hex');
  return { status: 'resolved' as const, subject: { scope: 'participant' as const, id: `local-${digest}` }, evidence: { candidateId, attribution } };
}
