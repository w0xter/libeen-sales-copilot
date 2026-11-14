import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { cases, scenarios } from '../../src/fixtures';
import { configBundleRef, demoBundle } from '../../src/config';
import { OpenAIInterpreter, OpenAIDraftGenerator, openAITransport, classifyModelError, type ModelTransport } from '../../src/adapters/ai/openai';
import { evaluate } from '../../src/application/cases/evaluate';
import { CaseOrchestrator } from '../../src/application/cases/orchestrator';
import { MemoryCaseRepository } from '../../src/adapters/persistence/memory-case-repository';
import type { CaseEvent, CaseSnapshot, CaseView, Message } from '../../src/contracts';

// Intentionally skipped by normal pnpm test. Enable via scripts/eval-openai.mjs only.
const live = process.env.F01_EVAL_RUN === '1' ? it : it.skip;
type Scenario = 'B01' | 'B05' | 'B08' | 'B06' | 'B10' | 'C01';
type Settings = { scenarioIds: Scenario[]; repeat: number; mode: 'interpreter' | 'end-to-end'; maxRequests: number; allowFailures: boolean };
type Check = { name: string; pass: boolean; expected: unknown; actual: unknown };
type State = { snapshot: CaseSnapshot; action: string | null; errors: { code: string; message: string }[]; draft: string | null };
type Call = { index: number; kind: string; latencyMs: number; status: 'response' | 'error'; output?: unknown; diagnostic?: ReturnType<typeof classifyModelError> };
type Verdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'BLOCKED';

function fixture(id: Scenario) {
  const caseId = ['B05', 'B06', 'B10'].includes(id) ? 'javier' : id === 'B08' ? 'rosa' : 'laura';
  const base = cases.find(c => c.caseId === caseId);
  if (!base) throw Error('Missing canonical fixture');
  const messages = structuredClone(base.messages);
  if (id === 'B06') {
    const source = messages.find(m => m.messageId === 'javier-m5');
    if (!source) throw Error('Missing trust fixture');
    source.content = { type: 'text', text: 'Antes de seguir necesito saber quién responde si esto no es fiable.' };
  }
  if (id === 'B10') {
    const addition = scenarios.find(s => s.id === 'javier-opt-out')?.additions[0];
    if (!addition) throw Error('Missing opt-out fixture');
    messages.push(structuredClone(addition));
  }
  return { caseId, messages };
}

function seed(caseId: string, messages: Message[]): CaseSnapshot {
  return {
    caseId, revision: 0, messages, assertions: [], knowledge: { facts: [] },
    goal: { id: 'qualification', description: 'Orientación comercial sintética', status: 'active' },
    workflowProgress: { workflowId: demoBundle.workflow.id, workflowVersion: demoBundle.workflow.version, milestones: [] },
    blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef: structuredClone(configBundleRef),
    status: 'NEEDS_ADVISOR', analysisStatus: 'pending'
  };
}

const viewState = (v: CaseView): State => ({
  snapshot: v.snapshot, action: v.activeProposal?.actionType ?? null, draft: v.draft?.status ?? null,
  errors: v.errors.map(e => ({ code: e.code, message: e.message }))
});

async function execute(id: Scenario, index: number, transport: ModelTransport, mode: Settings['mode']): Promise<State> {
  const { caseId, messages } = fixture(id);
  const initial = seed(caseId, messages);
  const interpreter = new OpenAIInterpreter(transport);
  if (mode === 'interpreter') {
    if (id === 'C01') throw Error('C01 requires end-to-end');
    const interpreted = await interpreter.interpret({ caseSnapshot: initial, messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
    if (!interpreted.ok) return { snapshot: { ...initial, analysisStatus: 'analysis_failed' }, action: null, draft: null, errors: [{ code: interpreted.error.code, message: interpreted.error.message }] };
    const result = evaluate({ ...initial, assertions: interpreted.value.assertions, blockers: interpreted.value.blockers, analysisStatus: 'complete' }, demoBundle, `run-${id}-${index}`, 'openai');
    if (!result.ok) return { snapshot: { ...initial, analysisStatus: 'analysis_failed' }, action: null, draft: null, errors: [{ code: result.error.code, message: result.error.message }] };
    return { snapshot: result.value.snapshot, action: result.value.snapshot.proposals.at(-1)?.actionType ?? null, errors: [], draft: null };
  }
  const repository = new MemoryCaseRepository([initial]);
  const orchestrator = new CaseOrchestrator({ repository, interpreter, draftGenerator: new OpenAIDraftGenerator(transport), mode: 'openai', getConfig: () => demoBundle });
  const analyze: CaseEvent = {
    eventId: `eval-${id}-${index}-initial`, caseId, type: 'CASE_ANALYSIS_REQUESTED', actor: 'advisor',
    occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, payload: {}
  };
  let result = await orchestrator.handleEvent(analyze);
  if (id === 'C01') {
    const correction = scenarios.find(s => s.id === 'laura-gross-correction')?.additions[0];
    if (!correction) throw Error('Missing gross correction fixture');
    const stored = await repository.get(caseId);
    if (!stored.ok) throw Error('Cannot load case');
    const update: CaseEvent = {
      eventId: `eval-${id}-${index}-correction`, caseId, type: 'MESSAGE_RECEIVED', actor: 'customer',
      occurredAt: correction.occurredAt, expectedRevision: stored.value.revision, simulated: true,
      payload: { message: structuredClone(correction) }
    };
    result = await orchestrator.handleEvent(update);
  }
  if (result.ok) return viewState(result.value);
  const stored = await repository.get(caseId);
  return { snapshot: stored.ok ? stored.value : initial, action: null, draft: null, errors: [{ code: result.error.code, message: result.error.message }] };
}

function evaluateChecks(id: Scenario, state: State): Check[] {
  const facts = state.snapshot.knowledge.facts;
  const blockers = state.snapshot.blockers.filter(b => b.status === 'open').map(b => b.type);
  const fact = (fieldId: string, scope: string) => facts.find(f => f.fieldId === fieldId && f.subjectRef.scope === scope);
  const value = (f: (typeof facts)[number] | undefined): unknown => f && 'value' in f ? f.value : undefined;
  const hasEvidence = (f: (typeof facts)[number] | undefined, msg: string) => !!f?.evidenceRefs.some(e => e.messageId === msg);
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, expected: unknown, actual: unknown) => checks.push({ name, pass, expected, actual });
  add('analysis_complete', state.snapshot.analysisStatus === 'complete', 'complete', state.snapshot.analysisStatus ?? 'missing');
  const expectedAction = id === 'B05' || id === 'B06' || id === 'B08' ? 'HANDOFF' : id === 'B10' ? 'STOP_CONTACT' : 'CLARIFY';
  add('commercial_action', state.action === expectedAction, expectedAction, state.action);
  if (id === 'B01' || id === 'C01') {
    const income = fact('declared_monthly_income', 'buying_unit');
    const savings = fact('available_savings', 'buying_unit');
    const debt = fact('monthly_debt', 'buying_unit');
    add('joint_income', value(income) === 3800 && hasEvidence(income, 'laura-m3'), '3800 @ laura-m3', income);
    add('savings_approximate', value(savings) === 18000 && savings?.status === 'approximate', 'approximate 18000', savings);
    add('car_debt', value(debt) === 250 && hasEvidence(debt, 'laura-m4'), '250 @ laura-m4', debt);
    add('no_false_trust_or_cost', !blockers.includes('TRUST') && !blockers.includes('COST'), 'no TRUST / COST', blockers);
    add('M3_blocked', state.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M3')?.status === 'blocked', 'blocked', state.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M3')?.status);
    if (id === 'B01') {
      add('income_precision', income?.status === 'approximate' && income.incomeBasis === 'net', 'approximate/net', income);
      const semantics = fact('debt_deduction_semantics', 'buying_unit');
      add('debt_semantics_unknown', !semantics || ['unknown', 'ambiguous', 'conflicting'].includes(semantics.status) || value(semantics) === 'unknown', 'unresolved', semantics);
    } else {
      const correctionId = 'laura-gross-correction-addition';
      const corrections = state.snapshot.assertions.filter(a => a.fieldId === 'declared_monthly_income' && a.evidenceRefs.some(r => r.messageId === correctionId));
      add('income_ambiguous', income?.status === 'ambiguous', 'ambiguous', income?.status);
      add('correction_evidence', hasEvidence(income, correctionId) && corrections.length > 0, correctionId, income?.evidenceRefs);
      add('no_invented_repeated_amount', corrections.length > 0 && corrections.every(a => a.value === undefined), 'no new numeric value', corrections.map(a => a.value));
    }
  }
  if (['B05', 'B06', 'B10'].includes(id)) {
    const income = fact('declared_monthly_income', 'participant');
    const v = value(income);
    const amount = v && typeof v === 'object' && !Array.isArray(v) && 'min' in v && 'max' in v ? v : null;
    add('income_range', !!amount && amount.min === 2000 && amount.max === 3000, '{min:2000,max:3000}', v);
    add('income_basis_unknown', income?.incomeBasis === 'unknown', 'unknown', income?.incomeBasis);
    add('no_unavailable_audio_evidence', !state.snapshot.assertions.some(a => a.evidenceRefs.some(r => r.messageId === 'javier-m4')), 'no audio evidence', 'javier-m4');
    if (id === 'B10') add('opt_out', blockers.includes('OPT_OUT'), 'OPT_OUT', blockers);
    else {
      add('trust', blockers.includes('TRUST'), 'TRUST', blockers);
      add('no_false_cost', !blockers.includes('COST'), 'no COST for routine price question', blockers);
    }
  }
  if (id === 'B08') {
    const income = fact('declared_monthly_income', 'buying_unit');
    const savings = fact('available_savings', 'buying_unit');
    const intent = fact('product_intent', 'case');
    add('joint_income_unknown_basis', value(income) === 1400 && (!income?.incomeBasis || income.incomeBasis === 'unknown'), '1400 unknown gross/net', income);
    add('savings_zero', value(savings) === 0, '0', value(savings));
    add('urgent', blockers.includes('URGENT'), 'URGENT', blockers);
    add('binding_claim', blockers.includes('BINDING_CLAIM'), 'BINDING_CLAIM', blockers);
    add('conditional_rental', !(intent?.status === 'known' && value(intent) === 'classical_rental'), 'not exclusive rental', intent);
  }
  if (state.action === 'CLARIFY' && state.draft !== null) add('draft_reviewable', state.draft === 'generated', 'generated', state.draft);
  return checks;
}

live('evaluates OpenAI backend against synthetic semantic oracle', async () => {
  const cfg = JSON.parse(process.env.F01_EVAL_CONFIG ?? '{}') as Settings;
  const outputFile = process.env.F01_EVAL_OUTPUT_FILE;
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL || !outputFile) throw Error('Missing evaluation env');
  if (!Array.isArray(cfg.scenarioIds) || cfg.scenarioIds.length < 1) throw Error('Missing scenarios');
  const model = process.env.OPENAI_MODEL;
  const provider = openAITransport(process.env.OPENAI_API_KEY, model, 25000);
  const report = {
    generatedAt: new Date().toISOString(), model, mode: cfg.mode, source: 'synthetic fixtures',
    limitations: ['Small sample; not a general reliability estimate', 'Transport does not expose tokens', 'A second LLM verification is not proof of meaning'],
    requestCount: 0, maxRequests: cfg.maxRequests,
    runs: [] as Array<{
      scenario: Scenario; iteration: number; verdict: Verdict; checks: Check[];
      observed: { action: string | null; status: string; errors: State['errors']; facts: CaseSnapshot['knowledge']['facts']; blockers: CaseSnapshot['blockers']; milestones: CaseSnapshot['workflowProgress']['milestones']; draft: string | null };
      calls: Call[]
    }>,
    summary: { PASS: 0, PARTIAL: 0, FAIL: 0, BLOCKED: 0 }
  };
  const write = () => writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  try {
    for (const scenario of cfg.scenarioIds) for (let iteration = 1; iteration <= cfg.repeat; iteration++) {
      const calls: Call[] = [];
      let budgetExhausted = false;
      const transport: ModelTransport = { complete: async (instructions, input, kind, signal) => {
        if (report.requestCount >= cfg.maxRequests) { budgetExhausted = true; throw Error('Evaluation budget exhausted'); }
        const index = ++report.requestCount;
        const started = Date.now();
        try {
          const output = await provider.complete(instructions, input, kind, signal);
          calls.push({ index, kind: kind ?? 'interpretation', latencyMs: Date.now() - started, status: 'response', output });
          return output;
        } catch (error) {
          calls.push({ index, kind: kind ?? 'interpretation', latencyMs: Date.now() - started, status: 'error', diagnostic: classifyModelError(error) });
          throw error;
        }
      } };
      const state = await execute(scenario, iteration, transport, cfg.mode);
      const checks = evaluateChecks(scenario, state);
      const actionCheck = checks.find(c => c.name === 'commercial_action');
      const blocked = budgetExhausted || state.errors.some(e => e.code === 'MODEL_UNAVAILABLE') || calls.some(c => c.status === 'error' && c.diagnostic?.category === 'network');
      const verdict: Verdict = blocked ? 'BLOCKED' : checks.every(c => c.pass) ? 'PASS' : actionCheck?.pass ? 'PARTIAL' : 'FAIL';
      report.summary[verdict]++;
      report.runs.push({ scenario, iteration, verdict, checks, observed: {
        action: state.action, status: state.snapshot.analysisStatus ?? 'unknown', errors: state.errors,
        facts: state.snapshot.knowledge.facts, blockers: state.snapshot.blockers,
        milestones: state.snapshot.workflowProgress.milestones, draft: state.draft
      }, calls });
      write();
      console.log(`${scenario} #${iteration}: ${verdict}, action=${state.action ?? 'none'}, requests=${calls.length}`);
    }
  } finally { write(); }
  if (!cfg.allowFailures && report.runs.some(r => r.verdict !== 'PASS')) throw Error('Semantic evaluation failed; see report JSON');
}, 600_000);
