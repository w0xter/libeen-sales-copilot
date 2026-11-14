import { InterpretationSchema, type ApplicationError, type CaseSnapshot, type CaseView, type ConfigBundle, type ConfigBundleRef, type Interpretation, type Result } from '../../contracts';
import { validateAssertions } from '../../domain/facts';

export const failure = (code: ApplicationError['code'], message: string): Result<never> => ({ ok: false, error: { code, message, retryable: code === 'REVISION_CONFLICT' } });
export function bundleRef(config: ConfigBundle): ConfigBundleRef {
  return { workflow: config.workflow.version, factSchema: config.factSchema.version, agentProfile: config.agentProfile.version, businessPolicy: config.businessPolicy.version, reviewPolicy: config.reviewPolicy.version, actionCatalog: config.actionCatalog.version };
}
export const sameRef = (a: ConfigBundleRef, b: ConfigBundleRef) => Object.keys(a).every(key => a[key as keyof ConfigBundleRef] === b[key as keyof ConfigBundleRef]);
export function project(snapshot: CaseSnapshot, mode: 'replay' | 'openai', errors: ApplicationError[] = [], warnings: string[] = []): CaseView {
  const proposal = snapshot.proposals.findLast(p => p.status === 'active') ?? null;
  return { snapshot, activeProposal: proposal, draft: proposal ? snapshot.drafts.findLast(d => d.proposalId === proposal.proposalId) ?? null : null, errors, warnings, aiMode: mode };
}
/** Adapters are untrusted: neither shape nor claimed provenance confer advisor authority. */
export function validateCandidates(value: unknown, snapshot: CaseSnapshot, config: ConfigBundle): Result<Interpretation> {
  const parsed = InterpretationSchema.safeParse(value);
  if (!parsed.success || parsed.data.assertions.some(a => a.source !== 'customer_message' || a.reviewStatus !== 'unreviewed')) return failure('MODEL_OUTPUT_INVALID', 'La salida del modelo no es válida');
  const facts = validateAssertions(parsed.data.assertions, snapshot.messages, config.factSchema);
  if (!facts.ok) return failure(facts.error.code === 'EVIDENCE_INVALID' ? 'EVIDENCE_INVALID' : 'MODEL_OUTPUT_INVALID', 'La evidencia o los datos del modelo no son válidos');
  for (const assertion of parsed.data.assertions) {
    if (!assertion.evidenceRefs.some(ref => { const message = snapshot.messages.find(m => m.messageId === ref.messageId); return message?.role === 'customer' && message.content.type === 'text' && message.content.text.includes(assertion.rawValue); })) return failure('EVIDENCE_INVALID', 'La afirmación no coincide con el texto aportado');
  }
  for (const blocker of parsed.data.blockers) {
    if (blocker.status !== 'open' || !blocker.evidenceRefs.length) return failure('MODEL_OUTPUT_INVALID', 'El aviso del modelo no es válido');
    for (const ref of blocker.evidenceRefs) {
      const message = snapshot.messages.find(m => m.messageId === ref.messageId);
      if (!message || message.role !== 'customer' || message.content.type !== 'text' || (ref.quote && !message.content.text.includes(ref.quote)) || (ref.end !== undefined && (ref.end > message.content.text.length || (ref.quote !== undefined && message.content.text.slice(ref.start, ref.end) !== ref.quote)))) return failure('EVIDENCE_INVALID', 'La evidencia del aviso no es válida');
    }
  }
  return { ok: true, value: parsed.data };
}
