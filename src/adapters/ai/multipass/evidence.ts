import type { Message } from '../../../contracts';
import { OccurrenceRefSchema, type OccurrenceRef } from './contracts';

export function validateOccurrence(value: OccurrenceRef, messages: Message[]): boolean {
  const parsed = OccurrenceRefSchema.safeParse(value);
  if (!parsed.success) return false;
  const { messageId, statementSpan: statement, focusSpan: focus } = parsed.data;
  const matches = messages.filter(m => m.messageId === messageId);
  if (matches.length !== 1) return false;
  const message = matches[0];
  if (message.role !== 'customer' || message.content.type !== 'text') return false;
  const text = message.content.text;
  const valid = (span: typeof statement) => span.end <= text.length && text.slice(span.start, span.end) === span.text;
  return valid(statement) && (!focus || (focus.start >= statement.start && focus.end <= statement.end && valid(focus)));
}

import type { FactSchema } from '../../../contracts';
import { ClaimCandidateSchema, type ClaimCandidate } from './contracts';

export function validateCandidate(candidate: ClaimCandidate, schema: FactSchema, messages: Message[]): boolean {
  const parsed = ClaimCandidateSchema.safeParse(candidate);
  if (!parsed.success || !validateOccurrence(candidate.occurrence, messages)) return false;
  const field = schema.fields.find(f => f.id === candidate.fieldId);
  if (!field || !field.scopes.includes(candidate.subjectRef.scope) || (candidate.unit !== undefined && !field.units.includes(candidate.unit))) return false;
  const value = candidate.value;
  if (value === undefined && candidate.precision !== 'ambiguous' && !candidate.correction) return false;
  if (value !== undefined) {
    const range = typeof value === 'object' && !Array.isArray(value);
    const valid = field.type === 'money' || field.type === 'range' ? typeof value === 'number' || range : field.type === 'number' ? typeof value === 'number' : field.type === 'boolean' ? typeof value === 'boolean' : field.type === 'collection' ? Array.isArray(value) : typeof value === 'string';
    if (!valid || (field.type === 'enum' && (typeof value !== 'string' || !field.enumOptions.includes(value)))) return false;
    const numbers = typeof value === 'number' ? [value] : range ? [value.min, value.max] : [];
    const constraints = field.structuralValidation;
    if (numbers.some(n => (constraints?.min !== undefined && n < constraints.min) || (constraints?.max !== undefined && n > constraints.max) || (constraints?.integer && !Number.isInteger(n)))) return false;
  }
  return validateEvidenceRefs(candidate, messages);
}

export function validateEvidenceRefs(candidate: ClaimCandidate, messages: Message[]): boolean {
  return candidate.evidenceRefs.every(ref => {
    const matching = messages.filter(m => m.messageId === ref.messageId);
    if (matching.length !== 1 || ref.messageId !== candidate.occurrence.messageId) return false;
    const m = matching[0];
    if (m.role !== 'customer' || m.content.type !== 'text') return false;
    if (ref.start !== undefined && ref.end !== undefined) return ref.end <= m.content.text.length && (!ref.quote || m.content.text.slice(ref.start, ref.end) === ref.quote);
    return !ref.quote || m.content.text.includes(ref.quote);
  });
}
