import type { OccurrenceRef } from './contracts';

/** An explicit focus is required. A focus containing several numbers is not atomic. */
export function occurrenceKey(fieldId: string, occurrence: OccurrenceRef): string | undefined {
  const focus = occurrence.focusSpan;
  if (!focus || (focus.text.match(/\d[\d.,]*/g) ?? []).length > 1) return undefined;
  return JSON.stringify([occurrence.messageId, fieldId, focus.start, focus.end]);
}
