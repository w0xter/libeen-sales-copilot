import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const run = (...args: string[]) => spawnSync(process.execPath, ['scripts/eval-openai.mjs', ...args], { encoding: 'utf8' });

it('plans multipass with seven passes and one draft per analysis', () => {
  const result = run('--case', 'laura', '--scenario', 'gross-correction', '--mode', 'end-to-end', '--strategy', 'multipass', '--max-requests', '18', '--dry-run');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('preflight ceiling=16');
  expect(result.stdout).toContain('multipass');
});

it('rejects a multipass batch that can exceed its request limit', () => {
  const result = run('--suite', 'canonical', '--mode', 'end-to-end', '--strategy', 'multipass', '--max-requests', '18', '--dry-run');
  expect(result.status).not.toBe(0);
});

it('plans two dataset cases without changing their deterministic selection', () => {
  const base = ['--dataset', 'f01', '--split', 'development', '--category', 'trust_real', '--sample', '2', '--seed', '42', '--mode', 'end-to-end', '--max-requests', '18', '--dry-run'];
  const single = run(...base);
  const multi = run(...base, '--strategy', 'multipass');
  expect(single.status).toBe(0); expect(multi.status).toBe(0);
  const a = JSON.parse(single.stdout.slice(0, single.stdout.indexOf('\nDRY RUN')));
  const b = JSON.parse(multi.stdout.slice(0, multi.stdout.indexOf('\nDRY RUN')));
  expect(b.selected).toEqual(a.selected);
  expect(b.requestCeiling).toBe(16);
});
