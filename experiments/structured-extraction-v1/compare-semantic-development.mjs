#!/usr/bin/env node
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch (error) { if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context); throw error; } } });
const { loadFixtures } = await import('./runner/fixtures.ts');
const { scoreSemantic } = await import('./evaluators/semantic.ts');
const { scoreSemanticV2 } = await import('./evaluators/semantic-v2.ts');
const { metrics } = await import('./evaluators/score.ts');
const path = process.argv[2];
if (!path) throw Error('Usage: node --experimental-strip-types compare-semantic-development.mjs /path/to/results.jsonl');
const cases = loadFixtures(resolve('experiments/structured-extraction-v1'), 'development').cases;
const byId = new Map(cases.map(c => [c.fixture.caseId, c]));
const raw = readFileSync(path), sha = data => createHash('sha256').update(data).digest('hex');
const rows = raw.toString('utf8').trim().split('\n').map(JSON.parse);
if (rows.some(r => !byId.has(r.caseId))) throw Error('Only development rows are allowed');
const totals = Object.fromEntries(['A', 'B'].map(arm => [arm, Object.fromEntries(['v1', 'v2'].map(v => [v, { tp: 0, fp: 0, fn: 0 }]))]));
const matrix = [];
for (const r of rows) {
 if (!['A', 'B'].includes(r.arm) || r.result.error) continue;
 const c = byId.get(r.caseId), a = r.result.accepted;
 const v1 = scoreSemantic(a, c.gold), v2 = scoreSemanticV2(a, c.gold, c.messages);
 for (const version of ['v1', 'v2']) for (const k of ['tp', 'fp', 'fn']) totals[r.arm][version][k] += ({v1,v2})[version].counts[k];
 const fields = new Set([...a.map(x => x.field), ...c.gold.assertions.map(x => x.field)]);
 for (const field of fields) {
  const fieldMatches = v => v.matches.filter(m => c.gold.assertions[m.goldIndex].field === field);
  matrix.push({ caseId: r.caseId, arm: r.arm, field, v1: v1.byField[field], v2: v2.byField[field], v1Matches: fieldMatches(v1), v2Matches: fieldMatches(v2), actual: a.filter(x => x.field === field), gold: c.gold.assertions.filter(x => x.field === field), v2Discrepancies: v2.discrepancies.filter(x => x.field === field), discards: r.result.discards });
 }
}
for (const arm of ['A','B']) for (const version of ['v1','v2']) totals[arm][version] = { counts: totals[arm][version], ...metrics(totals[arm][version]) };
console.log(JSON.stringify({ source: path, sourceSha256: sha(raw), evaluatorV1Sha256: sha(readFileSync(resolve('experiments/structured-extraction-v1/evaluators/semantic.ts'))), evaluatorV2Sha256: sha(readFileSync(resolve('experiments/structured-extraction-v1/evaluators/semantic-v2.ts'))), frozenGoldCommit: '0c0b06bb363c857e7c20e25597d075e8321652da', totals, matrix }, null, 2));
