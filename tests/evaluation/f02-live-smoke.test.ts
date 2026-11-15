import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { it } from 'vitest';
import { demoBundle } from '../../src/config';
import { OpenAIInterpreter, openAITransport, type ModelTransport } from '../../src/adapters/ai/openai';
import { MultipassInterpreter } from '../../src/adapters/ai/multipass/interpreter';
import { openAIMultipassTransport } from '../../src/adapters/ai/multipass/openai-transport';
import type { FakeTransport } from '../../src/adapters/ai/multipass/scheduler';
import { AttemptBudget } from './f02-simulation';
import { correction, fixture, seed } from './f02-fixtures';

// One-off observational experiment. Skipped by normal pnpm test.
// It calls real OpenAI only with explicit opt-in AND explicit credentials.
// Do not use it to claim a statistical win or production readiness.
const live = process.env.F02_LIVE_C01 === '1' ? it : it.skip;
const sha256 = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

live('compares one real C01 staged interpretation: single vs multipass', async () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !model) throw new Error('Set OPENAI_API_KEY and OPENAI_MODEL before opt-in');

  // Two stages: single 2+2, multipass up to 7+7. Reserve BEFORE a provider attempt.
  // This is a hard REQUEST cap, NOT a monetary or token limit.
  const budget = new AttemptBudget(18, 300_000);
  const runId = randomUUID();
  const runs: unknown[] = [];

  for (const strategy of ['single', 'multipass'] as const) {
    const { name, messages } = fixture('C01');
    const caseSnapshot = seed(name, messages);
    const baseline = sha256({ messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
    const before = budget.attempts;
    const started = Date.now();

    const interpreter = strategy === 'single'
      ? new OpenAIInterpreter((() => {
          const provider = openAITransport(apiKey, model, 25_000);
          const transport: ModelTransport = {
            complete: (instructions, input, kind, signal) =>
              budget.call(innerSignal => provider.complete(instructions, input, kind, innerSignal), signal)
          };
          return transport;
        })())
      : new MultipassInterpreter((() => {
          const provider = openAIMultipassTransport(apiKey, model);
          const transport: FakeTransport = {
            execute: request => budget.call(innerSignal => provider.execute({ ...request, signal: innerSignal }), request.signal)
          };
          return transport;
        })());

    const interpretStage = async (stage: 'initial' | 'correction') => {
      const stageInput = {
        caseSnapshot,
        messages: caseSnapshot.messages,
        factSchema: demoBundle.factSchema,
        agentProfile: demoBundle.agentProfile
      };
      const inputHash = sha256({
        messages: stageInput.messages,
        history: stageInput.caseSnapshot.assertions,
        blockers: stageInput.caseSnapshot.blockers
      });
      const stageStarted = Date.now();
      const result = await interpreter.interpret(stageInput);
      const observed = result.ok
        ? {
            status: 'complete',
            assertions: result.value.assertions,
            blockers: result.value.blockers,
            warnings: result.value.warnings
          }
        : {
            status: result.error.message.includes('revisión humana') ? 'human_review' : 'error',
            error: { code: result.error.code, message: result.error.message }
          };
      return { result, record: { stage, inputHash, historyCount: caseSnapshot.assertions.length, latencyMs: Date.now() - stageStarted, observed } };
    };

    const first = await interpretStage('initial');
    const stages = [first.record];
    if (first.result.ok) {
      // Each strategy carries forward ONLY its own validated candidate history.
      caseSnapshot.assertions = structuredClone(first.result.value.assertions);
      caseSnapshot.blockers = structuredClone(first.result.value.blockers);
      caseSnapshot.messages.push(correction());
      caseSnapshot.revision++;
      const second = await interpretStage('correction');
      stages.push(second.record);
    }

    runs.push({
      strategy,
      initialInputHash: baseline,
      requestCount: budget.attempts - before,
      latencyMs: Date.now() - started,
      stages,
      completedBothStages: stages.length === 2 && stages[1].observed.status === 'complete'
    });
  }

  const report = {
    format: 'f02-c01-oneoff-live-v1',
    evaluationMode: 'real_provider_observational',
    generatedAt: new Date().toISOString(),
    runId, model,
    caseId: 'C01',
    interpretationMode: 'staged-interpreter',
    independentOracleReview: false,
    policyExecuted: false,
    draftsGenerated: false,
    requestLimit: 18,
    attempts: budget.attempts,
    interrupted: budget.interrupted,
    tokens: null,
    cost: null,
    monetaryLimitApplied: false,
    limitations: [
      'One sample per strategy; not a statistical comparison',
      'Stage-two history is strategy-dependent; manually review it',
      'No commercial policy, CaseOrchestrator, or DraftGenerator run',
      'The transport does not report token usage or actual cost',
      'Financial attribution and corrections require human inspection'
    ],
    runs
  };
  mkdirSync('.eval-results', { recursive: true });
  const output = join('.eval-results', `f02-c01-live-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({
    report: output,
    model,
    attempts: budget.attempts,
    requestLimit: 18,
    strategies: runs,
    cost: 'not_measured'
  }, null, 2));
}, 360_000);
