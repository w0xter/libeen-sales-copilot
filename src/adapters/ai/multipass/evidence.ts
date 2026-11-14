import type { Message } from '../../../contracts';
import { OccurrenceRefSchema, type OccurrenceRef } from './contracts';

function isBoundary(text: string, position: number): boolean {
  const previous = text.charCodeAt(position - 1);
  const next = text.charCodeAt(position);
  return !(previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff);
}

export function validateOccurrence(value: OccurrenceRef, messages: Message[]): boolean {
  const parsed = OccurrenceRefSchema.safeParse(value);
  if (!parsed.success) return false;
  const { messageId, statementSpan: statement, focusSpan: focus } = parsed.data;
  const matches = messages.filter(m => m.messageId === messageId);
  if (matches.length !== 1) return false;
  const message = matches[0];
  if (message.role !== 'customer' || message.content.type !== 'text') return false;
  const text = message.content.text;
  const valid = (span: typeof statement) => span.end <= text.length && isBoundary(text, span.start) && isBoundary(text, span.end) && text.slice(span.start, span.end) === span.text;
  return valid(statement) && (!focus || (focus.start >= statement.start && focus.end <= statement.end && valid(focus)));
}

import type { FactSchema, FactAssertion } from '../../../contracts';
import { ClaimCandidateSchema, type ClaimCandidate } from './contracts';

export function validateCandidate(candidate: ClaimCandidate, schema: FactSchema, messages: Message[], assertions: FactAssertion[] = []): boolean {
  const parsed = ClaimCandidateSchema.safeParse(candidate);
  if (!parsed.success || !validateOccurrence(candidate.occurrence, messages)) return false;
  const field = schema.fields.find(f => f.id === candidate.fieldId);
  if (!field || !field.scopes.includes(candidate.subjectRef.scope) || (candidate.unit !== undefined && !field.units.includes(candidate.unit))) return false;
  const correction = candidate.correction;
  if (candidate.occurrence.previousAssertionId && (!correction || correction.previousAssertionId !== candidate.occurrence.previousAssertionId)) return false;
  if (correction) {
    const matches = assertions.filter(a => a.assertionId === correction.previousAssertionId);
    if (matches.length !== 1) return false;
    const prior = matches[0];
    const currentMessage = messages.find(m => m.messageId === candidate.occurrence.messageId);
    if (!currentMessage || Date.parse(prior.observedAt) > Date.parse(currentMessage.occurredAt) || prior.evidenceRefs.some(e => e.messageId === candidate.occurrence.messageId)) return false;
    if (prior.fieldId !== candidate.fieldId || prior.reviewStatus === 'rejected' || prior.subjectRef.scope !== candidate.subjectRef.scope || prior.subjectRef.id !== candidate.subjectRef.id) return false;
    if (correction.dimension !== 'period' && candidate.period !== undefined && prior.period !== candidate.period) return false;
    if (correction.dimension !== 'unit' && candidate.unit !== undefined && prior.unit !== candidate.unit) return false;
    if (correction.dimension === 'incomeBasis' && (!candidate.incomeBasis || candidate.value !== undefined)) return false;
    if (correction.dimension === 'value' && candidate.value === undefined) return false;
    if (correction.dimension === 'period' && candidate.period === undefined) return false;
    if (correction.dimension === 'unit' && candidate.unit === undefined) return false;
  }
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
    if (ref.start !== undefined && ref.end !== undefined) return ref.end <= m.content.text.length && isBoundary(m.content.text, ref.start) && isBoundary(m.content.text, ref.end) && (!ref.quote || m.content.text.slice(ref.start, ref.end) === ref.quote);
    return !ref.quote || m.content.text.includes(ref.quote);
  });
}
