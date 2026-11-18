#!/usr/bin/env node
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch (error) { if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context); throw error; } } });
const { loadFixtures } = await import('./runner/fixtures.ts');
const { scoreSemantic } = await import('./evaluators/semantic.ts');
const { metrics } = await import('./evaluators/score.ts');
const path = process.argv[2];
if (!path) throw Error('Usage: node --experimental-strip-types rescore-development.mjs /path/to/results.jsonl');
const cases = loadFixtures(resolve('experiments/structured-extraction-v1'), 'development').cases;
const byId = new Map(cases.map(c => [c.fixture.caseId, c.gold]));
const raw = readFileSync(path);
const sha256 = data => createHash('sha256').update(data).digest('hex');
const rows = raw.toString('utf8').trim().split('\n').map(JSON.parse);
if (rows.some(r => !byId.has(r.caseId))) throw Error('Only development rows are allowed');
const result = {};
for (const arm of ['A', 'B']) {
 const selected = rows.filter(r => r.arm === arm && !r.result.error);
 const totals = { tp: 0, fp: 0, fn: 0 };
 const details = selected.map(r => {
  const score = scoreSemantic(r.result.accepted, byId.get(r.caseId));
  for (const k of Object.keys(totals)) totals[k] += score.counts[k];
  return { caseId: r.caseId, counts: score.counts, discrepancies: score.discrepancies };
 });
 result[arm] = { cases: selected.length, counts: totals, ...metrics(totals), details };
}
console.log(JSON.stringify({ version: 'semantic-v1', source: path, sourceSha256: sha256(raw), evaluatorSha256: sha256(readFileSync(resolve('experiments/structured-extraction-v1/evaluators/semantic.ts'))), frozenGoldCommit: '0c0b06bb363c857e7c20e25597d075e8321652da', result }, null, 2));
