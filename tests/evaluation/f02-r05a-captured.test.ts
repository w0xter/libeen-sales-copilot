import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { MultipassInterpreter, type MultipassDiagnostic } from '../../src/adapters/ai/multipass/interpreter';
import { evaluate } from '../../src/application/cases/evaluate';
import { demoBundle } from '../../src/config';
import type { Message } from '../../src/contracts';
import { fixture, seed, type Id } from './f02-fixtures';

type Call = { index: number; kind: string; status: string; output?: unknown };
type Run = { scenario?: string; id?: string; observed: { status?: string; analysisStatus?: string; action: string | null; errors: { code: string; message: string }[] }; calls: Call[] };
type DatasetRecord = { id: string; messages: Message[]; gold: { transitions?: unknown[] } };
const files = ['B01','B05','B06','B08','B10','C01','binding_request','cost_real','basis_correction','amount_correction','documentation_request','price_question','time_nonurgent','trust_false_friend','trust_real','urgent_real'];
function unusedOperationsAllowed(id: string, remaining: {kind:string}[]): boolean {
  return remaining.length === 0 || (['F01D1-price_question-P1-V2','F01D1-price_question-P2-V2'].includes(id) && remaining.length === 1 && remaining[0].kind === 'multipass_J');
}
it('allows only the two documented single-J differences', () => {
  expect(unusedOperationsAllowed('F01D1-price_question-P1-V2', [{kind:'multipass_J'}])).toBe(true);
  expect(unusedOperationsAllowed('F01D1-price_question-P2-V2', [{kind:'multipass_J'}])).toBe(true);
  expect(unusedOperationsAllowed('B05', [{kind:'multipass_J'}])).toBe(false);
  expect(unusedOperationsAllowed('F01D1-price_question-P1-V2', [{kind:'multipass_J'},{kind:'multipass_J'}])).toBe(false);
  for (const kind of ['multipass_E1','multipass_S2','multipass_Repair']) expect(unusedOperationsAllowed('F01D1-price_question-P2-V2', [{kind}])).toBe(false);
  expect(unusedOperationsAllowed('B05', [])).toBe(true);
});
const enabled = process.env.F02_CAPTURED_ZIP ? it : it.skip;

enabled('compares R05a public outcomes and records captured adjudications no longer needed', async () => {
  const zip = process.env.F02_CAPTURED_ZIP!;
  const records: DatasetRecord[] = readFileSync('datasets/f01/v1/development.jsonl', 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const rows: unknown[] = [];
  let total = 0, replayed = 0;
  for (const file of files) {
    const report = JSON.parse(execFileSync('unzip', ['-p', zip, `f02-24-20261115-multipass/${file}.json`], { encoding: 'utf8', maxBuffer: 4_000_000 })) as { runs: Run[] };
    for (const run of report.runs) {
      total++;
      const id = run.scenario ?? run.id!;
      const originalStatus = run.observed.status ?? run.observed.analysisStatus;
      const record = records.find(r => r.id === id);
      const stages = id === 'C01' || Boolean(record?.gold.transitions?.length);
      const captured = run.calls.filter(c => c.kind.startsWith('multipass_')).sort((a,b) => a.index-b.index);
      if (stages) { rows.push({ id: id, replay: 'not_reconstructed', reason: 'multiple stages and historical state', captured: captured.map(c => ({ index: c.index, role: c.kind, status: c.status })) }); continue; }
      const data = record ? { name: record.id, messages: structuredClone(record.messages) } : fixture(id as Id);
      const initial = seed(data.name, data.messages);
      if (record) initial.goal.description = 'Synthetic model evaluation';
      else initial.goal.description = 'Orientación comercial sintética';
      const remaining = [...captured];
      let diagnostic: MultipassDiagnostic | undefined;
      const unexpected: string[] = [];
      const interpreter = new MultipassInterpreter({ execute: async request => {
        const index = remaining.findIndex(c => c.kind === `multipass_${request.role}`);
        if (index < 0) { unexpected.push(request.role); throw new Error(`No captured response for ${request.role}`); }
        const [call] = remaining.splice(index, 1);
        if (call.status !== 'response' || !('output' in call)) throw new Error('Captured transport error or missing output');
        return structuredClone(call.output);
      } }, value => { diagnostic = value; }, true);
      const result = await interpreter.interpret({ caseSnapshot: initial, messages: data.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
      expect(unexpected, `${id}: unexpected operations`).toEqual([]);
      expect(unusedOperationsAllowed(id, remaining), `${id}: unexpected unused captured operations`).toBe(true);
      let action: string | null = null;
      if (result.ok) {
        const domain = evaluate({ ...initial, assertions: result.value.assertions, blockers: result.value.blockers, analysisStatus: 'complete' }, demoBundle, `replay-${id}`, 'openai');
        expect(domain.ok, id).toBe(true);
        if (domain.ok) action = domain.value.snapshot.proposals.at(-1)?.actionType ?? null;
        expect(originalStatus, id).toBe('complete');
        expect(action, id).toBe(run.observed.action);
      } else {
        expect(originalStatus, id).toBe('analysis_failed');
        expect({ code: result.error.code, message: result.error.message }, id).toEqual(run.observed.errors[0]);
      }
      replayed++;
      rows.push({ id: id, unusedCapturedRoles: remaining.map(call => call.kind), original: run.observed, result: result.ok ? { status: 'complete', action, assertions: result.value.assertions, blockers: result.value.blockers } : { status: 'analysis_failed', error: result.error }, diagnostic, captured: captured.map(c => ({ index: c.index, role: c.kind, status: c.status })) });
    }
  }
  expect(total).toBe(24);
  expect(replayed).toBe(21);
  if (process.env.F02_R05A_OUTPUT) writeFileSync(process.env.F02_R05A_OUTPUT, JSON.stringify(rows, null, 2), { flag: 'wx' });
});
