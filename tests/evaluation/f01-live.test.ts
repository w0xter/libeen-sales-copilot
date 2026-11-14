import { it } from 'vitest';
import { OpenAIInterpreter, openAITransport, type ModelTransport } from '../../src/adapters/ai/openai';
import { cases, scenarios } from '../../src/fixtures';
import { configBundleRef, demoBundle } from '../../src/config';
import type { CaseSnapshot } from '../../src/contracts';
import { evaluate } from '../../src/application/cases/evaluate';

// Opt-in only: each scenario uses at most two Responses requests; no retries.
const run = process.env.F01_LIVE === '1' ? it : it.skip;
run('records bounded synthetic F-01 semantic observations', async () => {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!key || !model) throw Error('Exact OPENAI_MODEL and OPENAI_API_KEY are required');
  let requests = 0;
  const provider = openAITransport(key, model, 25000);
  const transport: ModelTransport = { complete: async (instructions, input, kind, signal) => {
    if (++requests > 19) throw Error('evaluation budget exhausted');
    const started = Date.now();
    try { const output = await provider.complete(instructions, input, kind, signal); console.log(JSON.stringify({ request: requests, kind, latencyMs: Date.now() - started, result: 'response' })); return output; }
    catch (error) { console.log(JSON.stringify({ request: requests, kind, latencyMs: Date.now() - started, result: 'error', category: (await import('../../src/adapters/ai/openai')).classifyModelError(error).category })); throw error; }
  } };
  const suite: ReadonlyArray<readonly [string, string]> = process.env.F01_SUITE === 'initial' ? [['B01', 'laura'], ['B05', 'javier'], ['B08', 'rosa'], ['C01', 'laura']] : [['B01-repeat', 'laura'], ['B05-repeat', 'javier'], ['B08-repeat', 'rosa'], ['B10', 'javier'], ['B06', 'javier']];
  for (const [name, id] of suite) {
    if (process.env.F01_ONLY && process.env.F01_ONLY !== name) continue;
    let messages = [...cases.find(c => c.caseId === id)!.messages];
    if (name === 'C01') messages = [...messages, ...scenarios.find(s => s.id === 'laura-gross-correction')!.additions];
    if (name === 'B10') messages = [...messages, ...scenarios.find(s => s.id === 'javier-opt-out')!.additions];
    if (name === 'B06') messages = messages.map(m => m.messageId === 'javier-m5' ? { ...m, content: { type: 'text' as const, text: 'Antes de seguir necesito saber quién responde si esto no es fiable.' } } : m);
    const caseSnapshot: CaseSnapshot = { caseId: id, revision: 0, messages, assertions: [], knowledge: { facts: [] }, goal: { id: 'g', description: 'Orientar', status: 'active' }, workflowProgress: { workflowId: 'wf', workflowVersion: '1', milestones: [] }, blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef, status: 'NEEDS_ADVISOR' };
    const result = await new OpenAIInterpreter(transport).interpret({ caseSnapshot, messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
    const decision = result.ok ? evaluate({ ...caseSnapshot, assertions: result.value.assertions, blockers: result.value.blockers }, demoBundle, `eval-${name}`, 'openai') : null;
    console.log(JSON.stringify({ scenario: name, model, result, decision: decision?.ok ? { result: decision.value.decision.result, action: decision.value.snapshot.proposals.at(-1)?.actionType, milestones: decision.value.snapshot.workflowProgress.milestones } : decision }));
  }
}, 180000);
