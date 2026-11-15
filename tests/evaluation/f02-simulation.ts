import { score } from './f02-metrics';
import { createHash, randomUUID } from 'node:crypto';
import { cases, scenarios, expectedFacts } from '../../src/fixtures';
import { demoBundle, configBundleRef } from '../../src/config';
import { OpenAIInterpreter } from '../../src/adapters/ai/openai';
import { MultipassInterpreter } from '../../src/adapters/ai/multipass/interpreter';
import type { CaseSnapshot, Message } from '../../src/contracts';

type Id = 'B01'|'B05'|'B06'|'B08'|'B10'|'C01';
type Strategy = 'single'|'multipass';
type Item = { runId: string; id: string; iteration: number; strategy: Strategy };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Reservation happens synchronously, before any promise or injected transport. */
export class AttemptBudget {
  attempts = 0;
  private expired = false;
  private readonly deadline: number;
  constructor(private readonly maximum: number, timeoutMs = 30000, private readonly signal?: AbortSignal) {
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 20 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw Error('Invalid budget');
    this.deadline = Date.now() + timeoutMs;
  }
  async call<T>(work: () => Promise<T>): Promise<T> {
    if (this.expired || this.signal?.aborted || Date.now() >= this.deadline || this.attempts >= this.maximum) throw Error('budget exhausted');
    this.attempts++;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    try {
      return await Promise.race([Promise.resolve().then(work), new Promise<never>((_, reject) => {
        cancel = () => reject(Error('cancelled'));
        this.signal?.addEventListener('abort', cancel, { once: true });
        if (this.signal?.aborted) cancel();
        timer = setTimeout(() => { this.expired = true; reject(Error('deadline')); }, Math.max(0, this.deadline - Date.now()));
      })]);
    } finally { if (timer) clearTimeout(timer); if (cancel) this.signal?.removeEventListener('abort', cancel); }
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
function fixture(id: Id) {
  const name = id === 'B08' ? 'rosa' : ['B05','B06','B10'].includes(id) ? 'javier' : 'laura';
  const messages = structuredClone(cases.find(c => c.caseId === name)!.messages);
  if (id === 'B06') messages.find(m => m.messageId === 'javier-m5')!.content = { type: 'text', text: 'Antes de seguir necesito saber quién responde si esto no es fiable.' };
  if (id === 'B10') messages.push(structuredClone(scenarios.find(s => s.id === 'javier-opt-out')!.additions[0]));
  return { name, messages };
}
function seed(name: string, messages: Message[]): CaseSnapshot {
  return { caseId: name, revision: 0, messages, assertions: [], knowledge: { facts: [] }, goal: { id: 'qualification', description: 'Synthetic evaluation', status: 'active' }, workflowProgress: { workflowId: demoBundle.workflow.id, workflowVersion: demoBundle.workflow.version, milestones: [] }, blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef: structuredClone(configBundleRef), status: 'NEEDS_ADVISOR', analysisStatus: 'pending' };
}
function simulatedClaim(name: string, messages: Message[]) {
  const spec = name === 'laura' ? { id: 'laura-m3', focus: '3.800 €', fieldId: 'declared_monthly_income', value: 3800, scope: 'buying_unit', precision: 'approximate', incomeBasis: 'net', period: 'month' } : name === 'javier' ? { id: 'javier-m3', focus: 'entre 2000 y 3000', fieldId: 'declared_monthly_income', value: { min: 2000, max: 3000 }, scope: 'participant', precision: 'approximate', incomeBasis: 'unknown', period: 'month' } : { id: 'rosa-m1', focus: 'Ahorros no tenemos', fieldId: 'available_savings', value: 0, scope: 'buying_unit', precision: 'explicit', incomeBasis: undefined, period: undefined };
  const message = messages.find(m => m.messageId === spec.id)!;
  if (message.content.type !== 'text') throw Error('Invalid synthetic source');
  const text = message.content.text, start = text.indexOf(spec.focus);
  const subjectId = spec.scope === 'participant' ? 'person' : 'unit';
  const evidenceRefs = [{ messageId: spec.id, quote: text }];
  return { spec, text, subjectId, evidenceRefs, claim: { fieldId: spec.fieldId, subjectRef: { scope: spec.scope, id: subjectId }, value: spec.value, unit: 'EUR', ...(spec.period ? { period: spec.period } : {}), ...(spec.incomeBasis ? { incomeBasis: spec.incomeBasis } : {}), precision: spec.precision, occurrence: { messageId: spec.id, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + spec.focus.length, text: spec.focus } }, evidenceRefs } };
}
function multiResponse(role: string, input: unknown, claim: ReturnType<typeof simulatedClaim>['claim']) {
  if (role === 'S1') return { status: 'complete', candidates: [] };
  if (role === 'S2') {
    const review = input as { groups: { groupId: string; candidates: { candidateId: string; evidenceRefs: typeof claim.evidenceRefs; occurrence: typeof claim.occurrence }[] }[] };
    return { status: 'complete', verdicts: [], reviews: review.groups.flatMap(g => g.candidates.map(c => ({ groupId: g.groupId, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', justification: 'synthetic', evidenceRefs: c.evidenceRefs, identitySpan: c.occurrence.focusSpan, subjectAttribution: { kind: claim.subjectRef.scope === 'participant' ? 'local_speaker' : 'buying_unit', messageId: c.occurrence.messageId, evidenceRefs: c.evidenceRefs, justification: 'synthetic attribution' } }))) };
  }
  return { claims: [claim] };
}
export async function simulate(options: { ids: Id[]; repeat: number; model: string; maxRequests: number; timeoutMs?: number; signal?: AbortSignal; strategies?: Strategy[] }) {
  const runId = randomUUID(), budget = new AttemptBudget(options.maxRequests, options.timeoutMs, options.signal);
  const rows: (Item & { inputHash: string; stages: number; status: string; calls: number; latencyMs: number; metrics: ReturnType<typeof score>; tokens: null; cost: null })[] = [];
  for (const id of options.ids) for (let iteration = 1; iteration <= options.repeat; iteration++) {
    const data = fixture(id); const base = seed(data.name, data.messages);
    const input = { caseSnapshot: base, messages: data.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile };
    const inputHash = hash(input);
    const simulated = simulatedClaim(data.name, data.messages);
    for (const strategy of options.strategies ?? ['single','multipass'] as const) {
      const started = Date.now(), before = budget.attempts;
      const interpreter = strategy === 'single'
        ? new OpenAIInterpreter({ complete: async (_i, _v, kind) => budget.call(async () => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : { assertions: [{ fieldId: simulated.spec.fieldId, scope: simulated.spec.scope, subjectId: simulated.subjectId, value: simulated.spec.value, unit: 'EUR', period: simulated.spec.period ?? null, incomeBasis: simulated.spec.incomeBasis ?? null, precision: simulated.spec.precision, messageId: simulated.spec.id, quote: simulated.text }], blockers: [], warnings: [] }) })
        : new MultipassInterpreter({ execute: async request => budget.call(async () => multiResponse(request.role, request.input, simulated.claim)) });
      const local = structuredClone(input);
      let result = await interpreter.interpret(local);
      let stages = 1;
      if (id === 'C01' && result.ok) {
        const correction = structuredClone(scenarios.find(s => s.id === 'laura-gross-correction')!.additions[0]);
        local.caseSnapshot.assertions = structuredClone(result.value.assertions);
        local.caseSnapshot.blockers = structuredClone(result.value.blockers);
        local.messages.push(correction); local.caseSnapshot.messages = local.messages; local.caseSnapshot.revision++;
        result = await interpreter.interpret(local); stages++;
      }
      const protectedExpected = id === 'B08' ? ['URGENT', 'BINDING_CLAIM'] : id === 'B10' ? ['TRUST', 'OPT_OUT'] : ['B05','B06'].includes(id) ? ['TRUST'] : [];
      const knownFacts = id === 'C01' ? [] : expectedFacts[data.name as keyof typeof expectedFacts].filter(f => 'value' in f).map(f => ({ fieldId: f.fieldId, value: 'value' in f ? f.value : undefined, scope: f.subject, unit: 'unit' in f ? f.unit : undefined, period: 'period' in f ? f.period : undefined, incomeBasis: 'incomeBasis' in f ? f.incomeBasis : undefined, precision: f.status === 'approximate' ? 'approximate' : 'explicit', messageId: f.evidenceRefs[0]?.messageId }));
      const status = result.ok ? (id === 'C01' ? 'incomplete' : result.value.assertions.length ? 'complete' : 'abstained') : 'error';
      const metrics = score({ facts: knownFacts, protected: protectedExpected, forbidden: id === 'B01' ? ['TRUST','COST'] : ['B05','B06'].includes(id) ? ['COST'] : [] }, { status, facts: result.ok ? result.value.assertions.map(a => ({ fieldId: a.fieldId, value: a.value, scope: a.subjectRef.scope, unit: a.unit, period: a.period, incomeBasis: a.incomeBasis, precision: a.precision, evidence: a.evidenceRefs.map(e => e.messageId) })) : [], signals: result.ok ? result.value.blockers.map(b => b.type) : [] });
      rows.push({ runId, id, iteration, strategy, inputHash, stages, status, calls: budget.attempts - before, latencyMs: Date.now() - started, metrics, tokens: null, cost: null });
    }
  }
  return { evaluationMode: 'simulated', independentOracleReview: false, runId, model: options.model, configHash: hash(configBundleRef), scenarioCount: options.ids.length, attempts: budget.attempts, requestLimit: options.maxRequests, tokens: null, cost: null, pairs: pairResults(rows, runId), limitations: ['One fabricated extraction per scenario exercises transport plumbing, not empirical precision', 'Protected signal omissions are not assessed on failed interpretations', 'No draft generation or production orchestrator exercised'] };
}
