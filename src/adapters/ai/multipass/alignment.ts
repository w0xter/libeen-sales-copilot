import type { OccurrenceRef } from './contracts';

type Anchor = { start: number; end: number };

/** Only textually explicit ranges are treated as a single numeric occurrence. */
function numericAnchors(text: string): Anchor[] {
  const numbers = [...text.matchAll(/\d+(?:[.,]\d+)*/g)].map(m => ({ start: m.index, end: m.index + m[0].length }));
  const anchors: Anchor[] = [];
  for (let i = 0; i < numbers.length; i++) {
    const current = numbers[i];
    const next = numbers[i + 1];
    const prefix = text.slice(Math.max(0, current.start - 12), current.start);
    const between = next ? text.slice(current.end, next.start) : '';
    if (next && ((/\bentre\s*$/iu.test(prefix) && /^\s*(?:€\s*)?y\s*$/iu.test(between)) || /^\s*[-–—]\s*$/u.test(between))) {
      anchors.push({ start: current.start, end: next.end });
      i++;
    } else anchors.push(current);
  }
  return anchors;
}

export function occurrenceKey(fieldId: string, occurrence: OccurrenceRef, text: string): { key?: string; reason?: 'missing_focus' | 'ambiguous_occurrence'; numeric?: boolean } {
  const focus = occurrence.focusSpan;
  if (!focus) return { reason: 'missing_focus' };
  const anchors = numericAnchors(text).filter(a => focus.start < a.end && focus.end > a.start);
  if (anchors.length > 1) return { reason: 'ambiguous_occurrence' };
  if (anchors[0] && (focus.start > anchors[0].start || focus.end < anchors[0].end)) return { reason: 'ambiguous_occurrence' };
  const anchor = anchors[0] ?? focus;
  return { key: JSON.stringify([occurrence.messageId, fieldId, anchor.start, anchor.end]), numeric: anchors.length > 0 };
}
