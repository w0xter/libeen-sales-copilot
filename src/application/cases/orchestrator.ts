import { CaseEventSchema, DraftSchema, type ApplicationResult, type CaseEvent, type CaseRepository, type CaseSnapshot, type ConfigBundle, type DraftGenerator, type Interpreter } from '../../contracts';
import { validateConfig } from '../../config';
import { evaluate } from './evaluate';
import { bundleRef, failure, project, sameRef, validateCandidates } from './helpers';
import { applyLifecycle } from './lifecycle';

interface OrchestratorOptions { repository: CaseRepository; interpreter: Interpreter; draftGenerator: DraftGenerator; mode: 'replay' | 'openai'; getConfig: () => ConfigBundle }

export class CaseOrchestrator {
  constructor(private readonly options: OrchestratorOptions) {}
  async getCase(caseId: string): Promise<ApplicationResult> {
    const found = await this.options.repository.get(caseId);
    if (!found.ok) return found;
    const snapshot = structuredClone(found.value);
    const currentRef = bundleRef(this.options.getConfig());
    for (const proposal of snapshot.proposals) {
      const changed = snapshot.events.some(e => e.expectedRevision >= proposal.originCaseRevision && ['MESSAGE_RECEIVED', 'FACT_CORRECTED', 'CASE_REEVALUATION_REQUESTED', 'CASE_ANALYSIS_REQUESTED', 'DO_NOT_CONTACT_REQUESTED'].includes(e.type));
      if (!sameRef(proposal.configBundleRef, currentRef) || changed) proposal.status = 'superseded';
    }
    return { ok: true, value: project(snapshot, this.options.mode) };
  }
  async resetCase(caseId: string): Promise<ApplicationResult> {
    const found = await this.options.repository.reset(caseId);
    return found.ok ? { ok: true, value: project(found.value, this.options.mode) } : found;
  }
  async handleEvent(input: CaseEvent): Promise<ApplicationResult> {
    const parsed = CaseEventSchema.safeParse(input);
    if (!parsed.success) return failure('INVALID_INPUT', 'Evento inválido');
    const event = parsed.data;
    const configResult = validateConfig(this.options.getConfig());
    if (!configResult.ok) return configResult;
    const config = configResult.value;
    const initial = await this.options.repository.get(event.caseId);
    if (!initial.ok) return initial;
    if (event.type === 'MESSAGE_RECEIVED' && (event.actor !== 'customer' || event.payload.message.role !== 'customer' || !event.simulated || !event.payload.message.simulated)) return failure('INVALID_INPUT', 'Solo se admiten mensajes simulados del cliente');
    let committed: Awaited<ReturnType<CaseRepository['appendEvent']>>;
    if (event.type === 'MESSAGE_RECEIVED') committed = await this.options.repository.appendEvent(event);
    else if (initial.value.events.some(e => e.eventId === event.eventId)) committed = await this.options.repository.appendEventWithSnapshot(event, initial.value);
    else {
      if (initial.value.revision !== event.expectedRevision) {
        const retry = await this.options.repository.appendEventWithSnapshot(event, initial.value);
        if (!retry.ok) return retry;
        return this.getCase(event.caseId);
      }
      const projection = applyLifecycle(initial.value, event, config);
      if (!projection.ok) return projection;
      committed = await this.options.repository.appendEventWithSnapshot(event, projection.value);
    }
    if (!committed.ok) return committed;
    if (committed.value.duplicate) return this.getCase(event.caseId);
    const current = await this.options.repository.get(event.caseId);
    if (!current.ok) return current;
    if (current.value.revision !== committed.value.receipt.revision) return failure('REVISION_CONFLICT', 'El caso ha cambiado');
    if (['DRAFT_EDITED', 'DRAFT_APPROVED', 'DRAFT_DISCARDED', 'MESSAGE_SIMULATED_AS_SENT'].includes(event.type)) return { ok: true, value: project(current.value, this.options.mode) };
    if (event.type === 'MESSAGE_RECEIVED' || event.type === 'CASE_ANALYSIS_REQUESTED') return this.interpret(current.value, event.eventId, config);
    return this.commitEvaluation(current.value, event.eventId, config);
  }
  private async interpret(snapshot: CaseSnapshot, eventId: string, config: ConfigBundle): Promise<ApplicationResult> {
    let output: Awaited<ReturnType<Interpreter['interpret']>>;
    try { output = await this.options.interpreter.interpret({ caseSnapshot: snapshot, messages: snapshot.messages, factSchema: config.factSchema, agentProfile: config.agentProfile }); }
    catch { output = failure('MODEL_UNAVAILABLE', 'El servicio de modelo no está disponible'); }
    if (!output.ok) return this.markAnalysisFailed(snapshot, output.error);
    const valid = validateCandidates(output.value, snapshot, config);
    if (!valid.ok) return this.markAnalysisFailed(snapshot, valid.error);
    const assertions = new Map(snapshot.assertions.map(a => [a.assertionId, a]));
    for (const assertion of valid.value.assertions) {
      const previous = assertions.get(assertion.assertionId);
      if (previous && JSON.stringify(previous) !== JSON.stringify(assertion)) return this.markAnalysisFailed(snapshot, { code: 'MODEL_OUTPUT_INVALID', message: 'Identificador de afirmación incompatible', retryable: false });
      assertions.set(assertion.assertionId, assertion);
    }
    const blockers = new Map(snapshot.blockers.map(b => [b.id, b]));
    for (const blocker of valid.value.blockers) {
      const previous = blockers.get(blocker.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(blocker)) return this.markAnalysisFailed(snapshot, { code: 'MODEL_OUTPUT_INVALID', message: 'Identificador de aviso incompatible', retryable: false });
      blockers.set(blocker.id, blocker);
    }
    return this.commitEvaluation({ ...snapshot, assertions: [...assertions.values()], blockers: [...blockers.values()] }, eventId, config, valid.value.warnings);
  }
  private async markAnalysisFailed(snapshot: CaseSnapshot, error: import('../../contracts').ApplicationError): Promise<ApplicationResult> {
    const next: CaseSnapshot = { ...snapshot, revision: snapshot.revision + 1, analysisStatus: 'analysis_failed', proposals: snapshot.proposals.map(p => ({ ...p, status: 'superseded' })) };
    const saved = await this.options.repository.saveIfRevision(next, snapshot.revision);
    return saved.ok ? { ok: true, value: project(saved.value, this.options.mode, [error]) } : saved;
  }
  private async commitEvaluation(snapshot: CaseSnapshot, eventId: string, config: ConfigBundle, warnings: string[] = []): Promise<ApplicationResult> {
    if (!sameRef(bundleRef(config), bundleRef(this.options.getConfig()))) return failure('STALE_PROPOSAL', 'La configuración ha cambiado; vuelve a evaluar');
    const evaluated = evaluate(snapshot, config, eventId, this.options.mode);
    if (!evaluated.ok) return evaluated;
    const saved = await this.options.repository.saveIfRevision(evaluated.value.snapshot, snapshot.revision);
    if (!saved.ok) return saved;
    const proposal = saved.value.proposals.findLast(p => p.status === 'active');
    const action = proposal && config.actionCatalog.actions.find(a => a.id === proposal.actionType);
    if (!proposal || !action?.requiresDraft) return { ok: true, value: project(saved.value, this.options.mode, [], warnings) };
    let draft: Awaited<ReturnType<DraftGenerator['generate']>>;
    try { draft = await this.options.draftGenerator.generate({ caseSnapshot: saved.value, proposal, agentProfile: config.agentProfile, policyDecision: evaluated.value.decision }); }
    catch { draft = failure('DRAFT_GENERATION_FAILED', 'No se pudo generar el borrador'); }
    if (!draft.ok) return { ok: true, value: project(saved.value, this.options.mode, [draft.error], warnings) };
    if (!sameRef(bundleRef(config), bundleRef(this.options.getConfig()))) return failure('STALE_PROPOSAL', 'La configuración ha cambiado; vuelve a evaluar');
    if (!DraftSchema.safeParse(draft.value).success || draft.value.proposalId !== proposal.proposalId || draft.value.status !== 'generated' || draft.value.aiMode !== this.options.mode) return { ok: true, value: project(saved.value, this.options.mode, [{ code: 'DRAFT_GENERATION_FAILED', message: 'Borrador inválido', retryable: false }], warnings) };
    const final: CaseSnapshot = { ...saved.value, revision: saved.value.revision + 1, drafts: [...saved.value.drafts, draft.value], status: 'READY_TO_REPLY' };
    const result = await this.options.repository.saveIfRevision(final, saved.value.revision);
    return result.ok ? { ok: true, value: project(result.value, this.options.mode, [], warnings) } : result;
  }
}
