import { execFileSync, spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const run = (...args: string[]) => spawnSync(process.execPath, ['scripts/eval-multipass.mjs', ...args], { encoding: 'utf8', env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test', OPENAI_API_KEY: 'secret-test-value' } });

describe('F02 offline preflight', () => {
  it('calculates paired per-analysis budgets including correction and draft', () => {
    const result = run('--dry-run', '--case', 'C01', '--mode', 'end-to-end', '--model', 'test-model', '--max-requests', '20', '--strategy', 'multipass');
    expect(result.status).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.cases[0]).toMatchObject({ id: 'C01', analyses: 2, single: { typical: 4, maximum: 6 }, multipass: { typical: 10, maximum: 16 } });
    expect(plan.totals.maximum).toBe(16);
  });
  it('blocks a request ceiling above the limit without leaking the key', () => {
    const result = run('--dry-run', '--case', 'B01', '--repeat', '3');
    expect(result.status).not.toBe(0);
    expect(result.stderr).not.toContain('secret-test-value');
  });
  it('requires dry-run and does not send requests', () => {
    expect(run('--case', 'B01').status).not.toBe(0);
    const result = run('--dry-run', '--case', 'B01');
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('secret-test-value');
    expect(result.stdout).not.toContain('3.800');
  });
  it('keeps ordering independent and records a fixed model', () => {
    const parse = (...args: string[]) => JSON.parse(execFileSync(process.execPath, ['scripts/eval-multipass.mjs', '--dry-run', '--strategy', 'single', '--model', 'model-x', ...args], { encoding: 'utf8' }));
    const a = parse('--case', 'B05,B01');
    const b = parse('--case', 'B01,B05');
    expect(a.cases).toEqual(b.cases);
    expect(a.model).toBe('model-x');
  });
});
