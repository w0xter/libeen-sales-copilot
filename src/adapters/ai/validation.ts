import { InterpretationSchema, type Interpretation, type Interpreter, type DraftGenerator, type Result, type ApplicationError } from '../../contracts';

type InterpretInput = Parameters<Interpreter['interpret']>[0];
export const failure = (code: ApplicationError['code'], message: string, retryable = false): Result<never> => ({ ok: false, error: { code, message, retryable } });

/** Model-produced claims have customer-message authority only; references must identify actual text. */
export function validateInterpretation(value: unknown, input: InterpretInput): Result<Interpretation> {
  const parsed = InterpretationSchema.safeParse(value);
  if (!parsed.success) return failure('MODEL_OUTPUT_INVALID', 'La salida del modelo no tiene el formato esperado');
  const ids = new Set<string>();
  for (const a of parsed.data.assertions) {
    if (a.source !== 'customer_message' || a.reviewStatus !== 'unreviewed' || ids.has(a.assertionId)) return failure('MODEL_OUTPUT_INVALID', 'La salida incluye autoridad o identificadores inválidos');
    ids.add(a.assertionId);
    const field = input.factSchema.fields.find(f => f.id === a.fieldId);
    if (!field || field.schemaVersion !== a.schemaVersion || !field.scopes.includes(a.subjectRef.scope) || (a.unit && !field.units.includes(a.unit))) return failure('MODEL_OUTPUT_INVALID', 'La salida contiene un campo no válido');
    if (a.value === undefined && a.precision !== 'ambiguous') return failure('MODEL_OUTPUT_INVALID', 'La salida omite un valor requerido');
    if (a.value !== undefined) {
      const v = a.value;
      const range = typeof v === 'object' && !Array.isArray(v);
      const valid = field.type === 'money' || field.type === 'range' ? typeof v === 'number' || range : field.type === 'number' ? typeof v === 'number' : field.type === 'boolean' ? typeof v === 'boolean' : field.type === 'collection' ? Array.isArray(v) : typeof v === 'string';
      if (!valid || (field.type === 'enum' && (typeof v !== 'string' || !field.enumOptions.includes(v)))) return failure('MODEL_OUTPUT_INVALID', 'La salida contiene un valor no válido');
      const numbers = typeof v === 'number' ? [v] : range ? [v.min, v.max] : [];
      const c = field.structuralValidation;
      if (numbers.some(n => (c?.min !== undefined && n < c.min) || (c?.max !== undefined && n > c.max) || (c?.integer && !Number.isInteger(n)))) return failure('MODEL_OUTPUT_INVALID', 'La salida contiene un valor fuera del esquema');
    }
    for (const ref of a.evidenceRefs) {
      const message = input.messages.find(m => m.messageId === ref.messageId);
      if (!message || message.role !== 'customer' || message.content.type !== 'text') return failure('EVIDENCE_INVALID', 'La evidencia no corresponde a texto del cliente');
      if (!message.content.text.includes(a.rawValue)) return failure('EVIDENCE_INVALID', 'El valor declarado no coincide con la evidencia');
      if ((ref.quote && !message.content.text.includes(ref.quote)) || (ref.end !== undefined && (ref.end > message.content.text.length || (ref.quote !== undefined && message.content.text.slice(ref.start, ref.end) !== ref.quote)))) return failure('EVIDENCE_INVALID', 'El fragmento de evidencia no coincide');
    }
  }
  for (const blocker of parsed.data.blockers) {
    if (blocker.status !== 'open') return failure('MODEL_OUTPUT_INVALID', 'El modelo no puede cerrar avisos');
    if (!blocker.evidenceRefs.length || blocker.evidenceRefs.some(ref => { const m = input.messages.find(x => x.messageId === ref.messageId); return !m || m.role !== 'customer' || m.content.type !== 'text' || (ref.quote && !m.content.text.includes(ref.quote)) || (ref.end !== undefined && (ref.end > m.content.text.length || (ref.quote !== undefined && m.content.text.slice(ref.start, ref.end) !== ref.quote))); })) return failure('EVIDENCE_INVALID', 'La evidencia del aviso no es válida');
  }
  return { ok: true, value: parsed.data };
}

export function validateDraftRequest(input: Parameters<DraftGenerator['generate']>[0]): Result<true> {
  const { proposal, caseSnapshot, policyDecision } = input;
  if (proposal.status !== 'active' || proposal.originCaseRevision !== caseSnapshot.revision || JSON.stringify(proposal.configBundleRef) !== JSON.stringify(caseSnapshot.configBundleRef)) return failure('STALE_PROPOSAL', 'La propuesta debe reevaluarse');
  if (!policyDecision.allowedActions.includes(proposal.actionType) || policyDecision.prohibitedActions.includes(proposal.actionType)) return failure('POLICY_DENIED', 'La acción no está permitida');
  return { ok: true, value: true };
}
