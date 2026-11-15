import { PROMPT_VERSION } from '../../src/adapters/ai/multipass/prompts';
import { fixture, seed, correction, type Id } from './f02-fixtures';
import { oracle } from './f02-oracle';
import { scripted, singleResponse, multiResponse } from './f02-scripts';
import { score, compareMetrics } from './f02-metrics';
import { createHash, randomUUID } from 'node:crypto';
import { demoBundle, configBundleRef } from '../../src/config';
import { OpenAIInterpreter } from '../../src/adapters/ai/openai';
import { MultipassInterpreter } from '../../src/adapters/ai/multipass/interpreter';

type Strategy = 'single'|'multipass';
type Item = { runId: string; id: string; iteration: number; strategy: Strategy };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Reservation happens synchronously, before any promise or injected transport. */
export class AttemptBudget {
  attempts = 0;
  interrupted = false;
  private expired = false;
  private readonly deadline: number;
  constructor(private readonly maximum: number, timeoutMs = 30000, private readonly signal?: AbortSignal) {
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 20 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw Error('Invalid budget');
    this.deadline = Date.now() + timeoutMs;
  }
  async call<T>(work: (signal: AbortSignal) => Promise<T>, upstream?: AbortSignal): Promise<T> {
    if (this.expired || this.signal?.aborted || upstream?.aborted || Date.now() >= this.deadline || this.attempts >= this.maximum) { this.interrupted = true; throw Error('budget exhausted'); }
    this.attempts++;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    try {
      return await Promise.race([Promise.resolve().then(() => work(controller.signal)), new Promise<never>((_, reject) => {
        cancel = () => { this.interrupted = true; controller.abort(); reject(Error('cancelled')); };
        this.signal?.addEventListener('abort', cancel, { once: true });
        upstream?.addEventListener('abort', cancel, { once: true });
        if (this.signal?.aborted || upstream?.aborted) cancel();
        timer = setTimeout(() => { this.expired = true; this.interrupted = true; controller.abort(); reject(Error('deadline')); }, Math.max(0, this.deadline - Date.now()));
      })]);
    } finally { if (timer) clearTimeout(timer); if (cancel) { this.signal?.removeEventListener('abort', cancel); upstream?.removeEventListener('abort', cancel); } }
  }
}
export function pairResults<T extends Item>(rows: T[], runId: string): { id: string; iteration: number; single: T | null; multipass: T | null }[] {
  const map = new Map<string, { id: string; iteration: number; single: T | null; multipass: T | null }>();
  for (const row of rows) {
    if (row.runId !== runId) throw Error('Mixed runs');
    const key = JSON.stringify([row.id, row.iteration]);
    const pair = map.get(key) ?? { id: row.id, iteration: row.iteration, single: null, multipass: null };
    if (pair[row.strategy]) throw Error('Duplicate result');
    pair[row.strategy] = row; map.set(key, pair);
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id) || a.iteration - b.iteration);
}
export async function simulate(options: { ids: Id[]; repeat: number; model: string; maxRequests: number; timeoutMs?: number; signal?: AbortSignal; strategies?: Strategy[]; commit?: string; workspaceDirty?: boolean; singlePromptSourceHash?: string; mutate?: (role:string, response:unknown) => unknown }) {
  const runId = randomUUID(), budget = new AttemptBudget(options.maxRequests, options.timeoutMs, options.signal);
  const rows: (Item & { inputHash: string; stages: number; status: string; calls: number; latencyMs: number; metrics: ReturnType<typeof score>; assertionCount: number; signals: string[]; stageInputs: { inputHash: string; historyCount: number }[]; correction: { assertions: number; inventedAmount: boolean } | null; reason: string | null; tokens: null; cost: null })[] = [];
  for (const id of options.ids) for (let iteration = 1; iteration <= options.repeat; iteration++) {
    const data = fixture(id); const base = seed(data.name, data.messages);
    const input = { caseSnapshot: base, messages: data.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
    const inputHash = hash(input);
    for (const strategy of options.strategies ?? ['single','multipass'] as const) {
      const started = Date.now(), before = budget.attempts;
      const local = structuredClone(input);
      const script = () => scripted(data.name, local.messages, local.caseSnapshot.assertions);
      const interpreter = strategy === 'single'
        ? new OpenAIInterpreter({ complete: async (_i, _v, kind, signal) => budget.call(async () => options.mutate ? options.mutate(kind ?? 'interpretation', singleResponse(kind, script())) : singleResponse(kind, script()), signal) })
        : new MultipassInterpreter({ execute: async request => budget.call(async () => options.mutate ? options.mutate(request.role, multiResponse(request.role, request.input, script())) : multiResponse(request.role, request.input, script()), request.signal) });
      const stageInputs = [{inputHash:hash(local),historyCount:local.caseSnapshot.assertions.length}];
      let result = await interpreter.interpret(local);
      let stages = 1;
      if (id === 'C01' && result.ok) {
        const update = correction();
        local.caseSnapshot.assertions = structuredClone(result.value.assertions);
        local.caseSnapshot.blockers = structuredClone(result.value.blockers);
        local.messages.push(update); local.caseSnapshot.messages = local.messages; local.caseSnapshot.revision++;
        stageInputs.push({inputHash:hash(local),historyCount:local.caseSnapshot.assertions.length});
        result = await interpreter.interpret(local); stages++;
      }
      const status = budget.interrupted ? 'incomplete' : result.ok ? (result.value.assertions.length ? 'complete' : 'abstained') : result.error.message.includes('revisión humana') ? 'human_review' : 'error';
      const metrics = score(oracle(id, data.name), { status, facts: result.ok ? result.value.assertions.map(a => ({ fieldId: a.fieldId, value: a.value, scope: a.subjectRef.scope, unit: a.unit, period: a.period, incomeBasis: a.incomeBasis, precision: a.precision, evidence: a.evidenceRefs })) : [], signals: result.ok ? result.value.blockers.map(b => b.type) : [], messages: local.messages.map(m => ({ messageId:m.messageId, role:m.role, ...(m.content.type === 'text' ? {text:m.content.text} : {}) })) });
      rows.push({ runId, id, iteration, strategy, inputHash, stages, status, calls: budget.attempts - before, latencyMs: Date.now() - started, metrics, assertionCount: result.ok ? result.value.assertions.length : 0, signals: result.ok ? result.value.blockers.map(b => b.type) : [], stageInputs, correction: id === 'C01' && result.ok ? { assertions: result.value.assertions.filter(a => a.fieldId === 'declared_monthly_income' && a.evidenceRefs.some(e => e.messageId === 'laura-gross-correction-addition')).length, inventedAmount: result.value.assertions.some(a => a.fieldId === 'declared_monthly_income' && a.value !== undefined && a.evidenceRefs.some(e => e.messageId === 'laura-gross-correction-addition')) } : null, reason: status === 'incomplete' ? 'budget_or_cancellation' : result.ok ? (status === 'abstained' ? 'no_assertions' : null) : result.error.code, tokens: null, cost: null });
    }
  }
  return { evaluationMode: 'simulated', independentOracleReview: false, runId, model: options.model, commit: options.commit ?? null, workspaceDirty: options.workspaceDirty ?? null, promptVersion: PROMPT_VERSION, singlePromptSourceHash: options.singlePromptSourceHash ?? null, configHash: hash({configBundleRef, factSchema:demoBundle.factSchema, agentProfile:demoBundle.agentProfile}), scenarioCount: options.ids.length, commercialActions: { value:null, reason:'policy_not_executed' }, subjectAttribution: { value:null, reason:'internal_s2_trace_not_exposed' }, oracleLimitations: ['C01 fact assertions have no automated oracle', 'Additional means not annotated, not necessarily invented', 'Person identity, S2 attribution and commercial actions are not directly scored'], attempts: budget.attempts, requestLimit: options.maxRequests, tokens: null, cost: null, pairs: pairResults(rows, runId).map(p => ({...p, differences: p.single && p.multipass ? { statusChanged: p.single.status !== p.multipass.status, coverageDelta: p.multipass.metrics.coverage.numerator - p.single.metrics.coverage.numerator, metrics: compareMetrics(p.single.metrics, p.multipass.metrics) } : null})), limitations: ['Scripted responses are synthetic and do not measure model accuracy', 'Protected signal omissions are not assessed on failed interpretations', 'No draft generation or production orchestrator exercised'] };
}
