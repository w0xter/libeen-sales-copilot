import { FactAssertionSchema, type FactAssertion, type FactSchema, type Message, type Result } from '../../contracts';

const invalid = (code: 'INVALID_INPUT' | 'EVIDENCE_INVALID'): Result<never> => ({ ok: false, error: { code, message: code === 'EVIDENCE_INVALID' ? 'La evidencia no es válida' : 'La afirmación no es válida', retryable: false } });

/** Reject ungrounded or structurally invalid candidate assertions before reconciliation. */
export function validateAssertions(assertions: FactAssertion[], messages: Message[], schema: FactSchema): Result<FactAssertion[]> {
  const ids = new Set<string>();
  for (const candidate of assertions) {
    const parsed = FactAssertionSchema.safeParse(candidate);
    if (!parsed.success || ids.has(candidate.assertionId)) return invalid('INVALID_INPUT');
    ids.add(candidate.assertionId);
    const field = schema.fields.find(f => f.id === candidate.fieldId);
    if (!field || candidate.schemaVersion !== field.schemaVersion || !field.scopes.includes(candidate.subjectRef.scope)) return invalid('INVALID_INPUT');
    if (candidate.unit && !field.units.includes(candidate.unit)) return invalid('INVALID_INPUT');
    const value = candidate.value;
    if (value === undefined && candidate.precision !== 'ambiguous') return invalid('INVALID_INPUT');
    if (value !== undefined) {
      const range = typeof value === 'object' && !Array.isArray(value);
      const correctType = field.type === 'money' || field.type === 'range' ? typeof value === 'number' || range :
        field.type === 'number' ? typeof value === 'number' : field.type === 'boolean' ? typeof value === 'boolean' :
        field.type === 'collection' ? Array.isArray(value) : typeof value === 'string';
      if (!correctType || (field.type === 'enum' && (typeof value !== 'string' || !field.enumOptions.includes(value)))) return invalid('INVALID_INPUT');
      const numbers = typeof value === 'number' ? [value] : range ? [value.min, value.max] : [];
      const constraint = field.structuralValidation;
      if (numbers.some(n => (constraint?.min !== undefined && n < constraint.min) || (constraint?.max !== undefined && n > constraint.max) || (constraint?.integer && !Number.isInteger(n)))) return invalid('INVALID_INPUT');
    }
    for (const ref of candidate.evidenceRefs) {
      const message = messages.find(m => m.messageId === ref.messageId);
      if (!message || message.content.type !== 'text') return invalid('EVIDENCE_INVALID');
      const text = message.content.text;
      if (ref.quote && !text.includes(ref.quote)) return invalid('EVIDENCE_INVALID');
      if (ref.start !== undefined && ref.end !== undefined && (ref.end > text.length || (ref.quote !== undefined && text.slice(ref.start, ref.end) !== ref.quote))) return invalid('EVIDENCE_INVALID');
    }
  }
  return { ok: true, value: assertions };
}
