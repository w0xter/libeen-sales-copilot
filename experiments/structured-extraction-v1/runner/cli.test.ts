import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('offline CLI', () => {
 it('creates separate complete runs without credentials', () => {
  const out = mkdtempSync(join(tmpdir(), 'libeen-test-'));
  try {
   for (let i = 0; i < 2; i++) execFileSync(process.execPath, ['--experimental-strip-types', 'experiments/structured-extraction-v1/cli.mjs', '--split=development', '--mode=offline', `--output=${out}`], { env: { ...process.env, OPENAI_API_KEY: '' }, stdio: 'pipe' });
   const dirs = readdirSync(out); expect(dirs).toHaveLength(2);
   for (const dir of dirs) {
    const manifest = JSON.parse(readFileSync(join(out, dir, 'run-manifest.json'), 'utf8'));
    expect(manifest.mode).toBe('offline'); expect(manifest.order).toHaveLength(12); expect(manifest.blindHoldout).toBe(false);
    const lines = readFileSync(join(out, dir, 'results.jsonl'), 'utf8').trim().split('\n'); expect(lines).toHaveLength(36);
    const report = JSON.parse(readFileSync(join(out, dir, 'report.json'), 'utf8'));
    expect(report.warning).toMatch(/SIMULATED/);
    expect(report.comparisonAB.pairedCases).toBe(12);
    expect(report.comparisonAB.incompletePairs).toBe(0);
    expect(report.comparisonAB).toHaveProperty('interest.aF1Interval');
    expect(report.comparisonAB).toHaveProperty('otherFields.bMinusAF1Interval');
   }
  } finally { rmSync(out, { recursive: true, force: true }); }
 }, 15000);
});

it('reports a controlled A/B interest filter difference in a simulated development case', () => {
 const out = mkdtempSync(join(tmpdir(), 'libeen-paired-'));
 try {
  const quote = 'Me interesa participar en un programa de alquiler con derecho a compra';
  const mock = { A: { 'F1-01': { candidates: [{ field: 'interest', value: quote, messageId: 'F1-01', quote, precision: 'explicit', subject: 'unknown', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null }], semanticIssues: [] } }, B: { 'F1-01': { assertions: [{ field: 'interest', value: { polarity: 'positive' }, evidence: { messageId: 'F1-01', quote }, derivation: 'explicit' }] } } };
  const input = join(out, 'mock.json'); writeFileSync(input, JSON.stringify(mock));
  execFileSync(process.execPath, ['--experimental-strip-types', 'experiments/structured-extraction-v1/cli.mjs', '--mode=offline', '--arms=A,B', `--mock=${input}`, `--output=${out}`], { env: { ...process.env, OPENAI_API_KEY: '' }, stdio: 'pipe' });
  const dir = readdirSync(out).find(x => x.startsWith('run-'))!;
  const results = readFileSync(join(out, dir, 'results.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const a = results.find(r => r.caseId === 'F1-01' && r.arm === 'A');
  const b = results.find(r => r.caseId === 'F1-01' && r.arm === 'B');
  expect(a.rawScore.counts.tp).toBe(1); expect(a.score.counts.fn).toBe(1);
  expect(a.result.discards[0].reason).toBe('unsupported_interest'); expect(b.score.counts.tp).toBe(1);
  const report = JSON.parse(readFileSync(join(out, dir, 'report.json'), 'utf8'));
  expect(report.warning).toMatch(/SIMULATED/); expect(report.comparisonAB.pairedCases).toBe(12);
 } finally { rmSync(out, { recursive: true, force: true }); }
}, 15000);

it('returns an error status while preserving a run with failed responses', () => {
 const out = mkdtempSync(join(tmpdir(), 'libeen-failed-run-'));
 try {
  const input = join(out, 'mock.json'); writeFileSync(input, JSON.stringify({ B: { 'F1-01': { invalid: true } } }));
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'experiments/structured-extraction-v1/cli.mjs', '--mode=offline', '--arms=B', `--mock=${input}`, `--output=${out}`], { env: { ...process.env, OPENAI_API_KEY: '' }, encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/1.*error/i);
  const dir = readdirSync(out).find(x => x.startsWith('run-'))!;
  const report = JSON.parse(readFileSync(join(out, dir, 'report.json'), 'utf8'));
  expect(report.report.B.errors).toHaveLength(1);
 } finally { rmSync(out, { recursive: true, force: true }); }
}, 15000);
