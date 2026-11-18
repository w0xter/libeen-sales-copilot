import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import OpenAI from 'openai';
import { z } from 'zod';
import { openAITransport } from '../../../src/intake/extraction';
import { assertionSchema, instructions } from '../adapters/minimal';
import { fields, type Transport } from '../types';
import { metrics, type Counts } from '../evaluators/score';
import { pairedComparison, pairedSemanticComparison } from '../evaluators/paired';
import { frozen, loadFixtures } from './fixtures';
import { runCase } from './run';
import { inputPrefix, minimalRequest } from './minimal-request';

const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export async function main(args: string[]) {
 const options = Object.fromEntries(args.map(arg => { const m = /^--([\w-]+)=(.*)$/.exec(arg); if (!m) throw Error(`Expected --name=value: ${arg}`); return [m[1], m[2]]; }));
 const allowed = ['split', 'arms', 'repeat', 'mode', 'model', 'model-c', 'mock', 'output'];
 for (const k of Object.keys(options)) if (!allowed.includes(k)) throw Error(`Unknown option: ${k}`);
 const split = options.split ?? 'development'; const mode = options.mode ?? 'offline';
 if (!['offline', 'real'].includes(mode)) throw Error('mode must be offline or real');
 const arms = (options.arms ?? 'A,B,C').split(',');
 if (!arms.length || new Set(arms).size !== arms.length || arms.some(a => !['A', 'B', 'C'].includes(a))) throw Error('Invalid arms');
 const repeat = Number(options.repeat ?? 1); if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) throw Error('repeat must be 1..10');
 const model = options.model ?? (mode === 'offline' ? 'mock-base' : 'gpt-4.1-mini');
 const modelC = options['model-c'] ?? (mode === 'offline' ? 'mock-capacity' : '');
 if (mode === 'real' && arms.includes('C') && !modelC) throw Error('Choose --model-c explicitly');
 const root = resolve('experiments/structured-extraction-v1'); const { cases, hashes } = loadFixtures(root, split);
 const mock = options.mock ? JSON.parse(readFileSync(resolve(options.mock), 'utf8')) as Record<string, Record<string, unknown>> : {};
 if (mode === 'real' && !process.env.OPENAI_API_KEY) throw Error('OPENAI_API_KEY required for real mode');
 const client = mode === 'real' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 30000 }) : null;
 const transport: Transport = async (messages, config) => {
  if (mode === 'offline') return { raw: mock[config.arm]?.[messages[0]?.id] ?? (config.arm === 'A' ? { candidates: [], semanticIssues: [] } : { assertions: [] }), provider: 'mock', parameters: {} };
  if (config.arm === 'A') return { raw: await openAITransport(process.env.OPENAI_API_KEY!, config.model)(messages), provider: 'openai', parameters: { transport: 'V0 openAITransport', usage: 'unavailable' } };
  const response = await client!.responses.create(minimalRequest(messages, config.model));
  if (response.status !== 'completed' || !response.output_text) throw Error('Incomplete response');
  let raw: unknown; try { raw = JSON.parse(response.output_text); } catch { raw = null; }
  return { raw, rawText: response.output_text, provider: 'openai', parameters: { format: 'json_object', retries: 0, timeoutMs: 30000 }, usage: { inputTokens: response.usage?.input_tokens, outputTokens: response.usage?.output_tokens } };
 };
 const outputRoot = resolve(options.output ?? join(root, 'runs')); mkdirSync(outputRoot, { recursive: true });
 const dir = mkdtempSync(join(outputRoot, 'run-'));
 const codePaths = ['adapters/baseline.ts', 'adapters/minimal.ts', 'evaluators/score.ts', 'evaluators/semantic.ts', 'evaluators/semantic-v2.ts', 'evaluators/paired.ts', 'runner/main.ts', 'runner/minimal-request.ts', 'runner/run.ts', 'runner/fixtures.ts', 'types.ts', 'cli.mjs', 'package.json'];
 const gitStatus = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
 const manifest = { dirtyPaths: gitStatus ? gitStatus.split('\n') : [], createdAt: new Date().toISOString(), mode, synthetic: true, split, blindHoldout: false, frozenGoldCommit: frozen, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), dirty: !!gitStatus, node: process.version, packageManager: 'pnpm@12.16.1', lockSha256: hash(readFileSync('pnpm-lock.yaml')), v0Sha256: hash(readFileSync('src/intake/extraction.ts')), versions: Object.fromEntries(['openai', 'zod', 'typescript', 'vitest'].map(p => [p, JSON.parse(readFileSync(`node_modules/${p}/package.json`, 'utf8')).version])), goldGitBlobs: hashes, sourceSha256: Object.fromEntries(codePaths.map(p => [p, hash(readFileSync(join(root, p)))])), promptSha256: hash(instructions), schemaSha256: hash(JSON.stringify(z.toJSONSchema(assertionSchema))), inputPrefixSha256: hash(inputPrefix), arms, model, modelC: arms.includes('C') ? modelC : null, repeat, order: cases.map(c => c.fixture.caseId), mockSha256: options.mock ? hash(readFileSync(resolve(options.mock))) : null, parameters: { retries: 0, timeoutMs: 30000, temperature: 'provider default; not specified by V0', maxOutputTokens: 'provider default; not specified by V0' }, limitations: ['A uses V0 structured output and SmartHousing-only interest filter; B/C use JSON object output and a JSON input label', 'A lacks some gold attributes; paired comparisons report strict/optimistic intervals and require human review', 'reserved_nonblind is not a blind holdout', 'Cost is unavailable unless supplied by the transport; no price estimates'] };
 writeFileSync(join(dir, 'run-manifest.json'), JSON.stringify(manifest, null, 2));
 const rows: (Awaited<ReturnType<typeof runCase>> & { iteration: number })[] = [];
 for (let iteration = 1; iteration <= repeat; iteration++) for (const c of cases) for (const arm of arms as ('A' | 'B' | 'C')[]) {
  const row = { iteration, ...await runCase(c, arm, arm === 'C' ? modelC : model, transport) }; rows.push(row);
  // Persist each result immediately so failures do not erase previous attempts.
  const { appendFileSync } = await import('node:fs'); appendFileSync(join(dir, 'results.jsonl'), JSON.stringify(row) + '\n');
 }
 const report = Object.fromEntries(arms.map(arm => {
  const selected = rows.filter(r => r.arm === arm); const valid = selected.filter(r => r.score !== null);
  const byField = Object.fromEntries(fields.map(f => {
   const c = valid.reduce<Counts>((a, r) => { const n = r.score!.byField[f]; return { tp: a.tp + n.tp, fp: a.fp + n.fp, fn: a.fn + n.fn }; }, { tp: 0, fp: 0, fn: 0 });
   const negatives = valid.filter(r => r.negativeFields.includes(f)).length;
   const falsePositiveCases = valid.filter(r => r.negativeFields.includes(f) && r.score!.falsePositives.some(a => a.field === f)).length;
   return [f, { ...c, ...metrics(c), negativeCases: negatives, falsePositiveCases, falsePositiveCasesPer100Negatives: negatives ? 100 * falsePositiveCases / negatives : null }];
  }));
  const counts = valid.reduce<Counts>((a, r) => { const n = r.score!.counts; return { tp: a.tp + n.tp, fp: a.fp + n.fp, fn: a.fn + n.fn }; }, { tp: 0, fp: 0, fn: 0 });
  const rawCounts = selected.reduce<Counts>((a, r) => { const n = r.rawScore?.counts; return n ? { tp: a.tp + n.tp, fp: a.fp + n.fp, fn: a.fn + n.fn } : a; }, { tp: 0, fp: 0, fn: 0 });
  const times = selected.map(r => r.latencyMs).sort((a, b) => a - b);
  const quantile = (p: number) => times.length ? times[Math.ceil(p * times.length) - 1] : null;
  const fieldMetrics = Object.values(byField);
  const macroValues = fieldMetrics.map(x => x.f1).filter((x): x is number => x !== null);
  const totals = selected.reduce((a, r) => ({ inputTokens: a.inputTokens + (r.result.usage?.inputTokens ?? 0), outputTokens: a.outputTokens + (r.result.usage?.outputTokens ?? 0), tokenCases: a.tokenCases + (r.result.usage?.inputTokens === undefined && r.result.usage?.outputTokens === undefined ? 0 : 1), reportedCost: a.reportedCost + (r.result.usage?.cost ?? 0), costCases: a.costCases + (r.result.usage?.cost === undefined ? 0 : 1) }), { inputTokens: 0, outputTokens: 0, tokenCases: 0, reportedCost: 0, costCases: 0 });
  const semanticCounts = valid.reduce<Counts>((a, r) => { const n = r.semanticScore!.counts; return { tp: a.tp + n.tp, fp: a.fp + n.fp, fn: a.fn + n.fn }; }, { tp: 0, fp: 0, fn: 0 });
  const semanticCountsV2 = valid.reduce<Counts>((a, r) => { const n = r.semanticScoreV2!.counts; return { tp: a.tp + n.tp, fp: a.fp + n.fp, fn: a.fn + n.fn }; }, { tp: 0, fp: 0, fn: 0 });
  const optimisticMatches = valid.reduce((n, r) => n + r.score!.bounds.possibleMatches, 0);
  const optimisticCounts = { tp: optimisticMatches, fp: counts.tp + counts.fp - optimisticMatches, fn: counts.tp + counts.fn - optimisticMatches };
  return [arm, { semanticV1: { counts: semanticCounts, ...metrics(semanticCounts) }, semanticV2: { counts: semanticCountsV2, ...metrics(semanticCountsV2) }, optimistic: { counts: optimisticCounts, ...metrics(optimisticCounts) }, macroF1: macroValues.length ? macroValues.reduce((a, b) => a + b, 0) / macroValues.length : null, raw: arm === 'A' ? { counts: rawCounts, ...metrics(rawCounts) } : null, latencyMs: { p50: quantile(.5), p95: quantile(.95) }, usage: { ...totals, inputTokens: totals.tokenCases ? totals.inputTokens : null, outputTokens: totals.tokenCases ? totals.outputTokens : null, reportedCost: totals.costCases ? totals.reportedCost : null }, cases: selected.length, scoredCases: valid.length, errors: selected.filter(r => r.result.error).map(r => ({ caseId: r.caseId, error: r.result.error })), counts, ...metrics(counts), byField, evidenceErrors: valid.reduce((a, r) => a + r.score!.evidenceErrors, 0) + selected.flatMap(r => r.result.discards).filter(d => ['unknown_message', 'not_customer', 'inaccessible', 'quote_not_found'].includes(d.reason)).length, interpretation: arm === 'A' ? 'Interpret strict and optimistic scores together; unresolved attributes require manual adjudication' : null, discards: selected.flatMap(r => r.result.discards), limitations: selected[0]?.result.limitations }];
 }));
 writeFileSync(join(dir, 'report.json'), JSON.stringify({ mode, warning: mode === 'offline' ? 'SIMULATED OUTPUTS: not experimental results' : null, comparisonAB: arms.includes('A') && arms.includes('B') ? pairedComparison(rows) : null, semanticComparisonAB: arms.includes('A') && arms.includes('B') ? pairedSemanticComparison(rows) : null, semanticV2ComparisonAB: arms.includes('A') && arms.includes('B') ? pairedSemanticComparison(rows.map(r => ({ ...r, semanticScore: r.semanticScoreV2 })), 'semantic-v2') : null, report }, null, 2));
 return dir;
}
