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
