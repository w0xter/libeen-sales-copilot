import { createHash } from 'node:crypto';

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
