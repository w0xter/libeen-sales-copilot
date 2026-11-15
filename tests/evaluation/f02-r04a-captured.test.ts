import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { demoBundle } from '../../src/config';
import { MultipassInterpreter, type MultipassDiagnostic } from '../../src/adapters/ai/multipass/interpreter';
import { fixture, seed } from './f02-fixtures';

type Call = {index:number;kind:string;status:string;output?:unknown};
const enabled = process.env.F02_CAPTURED_ZIP ? it : it.skip;
enabled.each([
  ['B08', { expected:18, actual:18, missing:1, foreign:1, duplicates:0 }],
  ['B10', { expected:11, actual:6, missing:5, foreign:0, duplicates:0 }],
] as const)('retains the captured %s incomplete S2 as fail-closed', async (id, counts) => {
  const zip = process.env.F02_CAPTURED_ZIP!;
  expect(createHash('sha256').update(readFileSync(zip)).digest('hex')).toBe('d28d6f8bb31b4fc0d1cdb809256677e4e6a85a26cce1e6c84e8257ac9823380f');
  const report = JSON.parse(execFileSync('unzip', ['-p', zip, `f02-24-20261115-multipass/${id}.json`], {encoding:'utf8'})) as {runs:{calls:Call[]}[]};
  const calls = report.runs[0].calls.filter(c=>c.kind.startsWith('multipass_')).sort((a,b)=>a.index-b.index);
  const unexpected: string[] = [];
  let diagnostic: MultipassDiagnostic | undefined;
  const {name,messages} = fixture(id);
  const interpreter = new MultipassInterpreter({execute:async request => {
    const index = calls.findIndex(call=>call.kind===`multipass_${request.role}`);
    if (index < 0) { unexpected.push(request.role); throw Error('missing captured operation'); }
    const [call] = calls.splice(index,1);
    if (call.status!=='response' || !('output' in call)) throw Error('missing captured response');
    return structuredClone(call.output);
  }}, value=>{diagnostic=value;});
  const result = await interpreter.interpret({caseSnapshot:seed(name,messages),messages,factSchema:demoBundle.factSchema,agentProfile:demoBundle.agentProfile});
  expect(unexpected).toEqual([]);
  expect(calls).toEqual([]);
  expect(result).toMatchObject({ok:false,error:{code:'MODEL_OUTPUT_INVALID',message:'La interpretación no superó la validación'}});
  expect(diagnostic).toMatchObject({finalStatus:'failed',failureCode:'incomplete_contextual_review',reviewCounts:counts});
});
