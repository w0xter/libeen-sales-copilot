#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

// Keep the original six-scenario runner unchanged unless a dataset is requested.
if (process.argv.includes('--dataset')) {
  const result = spawnSync(process.execPath, [resolve('scripts/eval-openai-dataset.mjs'), ...process.argv.slice(2)], { cwd: process.cwd(), stdio: 'inherit', env: process.env });
  if (result.error) { console.error('Could not start dataset runner:', result.error.code ?? 'unknown'); process.exit(2); }
  process.exit(result.status ?? 1);
}

const usage = `Libeen backend OpenAI evaluation (real, billable model requests)

  pnpm eval:openai --case laura --repeat 3
  pnpm eval:openai --suite canonical --mode end-to-end
  pnpm eval:openai --case laura --scenario gross-correction --mode end-to-end
  pnpm eval:openai --case javier --scenario trust-paraphrase
  pnpm eval:openai --case javier --scenario opt-out
  pnpm eval:openai --case rosa --repeat 3 --output .eval-results/rosa.json
  pnpm eval:openai --suite canonical --dry-run

Options:
  --suite canonical|followups    Default: canonical
  --case laura|javier|rosa|all   Default: all (canonical suite)
  --scenario initial|gross-correction|trust-paraphrase|opt-out
                                 Default: initial; requires a single case
  --mode interpreter|end-to-end  Default: interpreter
  --repeat N                     Independent repetitions (default: 1, max: 10)
  --max-requests N               Hard budget (default and maximum: 20)
  --output PATH                  JSON file or output directory; default .eval-results/
  --allow-failures               Exit 0 for completed evaluation even with semantic failures
  --dry-run                      Show selected runs and request ceiling; no API calls
  --help                         Show this message

Loads .env.local or .env via Node's built-in env loader, without printing credentials.
Model must be explicitly set in OPENAI_MODEL. All inputs are synthetic.
`;

const fail = (message) => { console.error(`Error: ${message}\n\n${usage}`); process.exit(2); };
const opts = {
  suite: 'canonical', caseId: 'all', scenario: 'initial', mode: 'interpreter',
  repeat: 1, maxRequests: 20, output: '.eval-results',
  allowFailures: false, dryRun: false
};
const values = new Map([
  ['--suite', 'suite'], ['--case', 'caseId'], ['--scenario', 'scenario'],
  ['--mode', 'mode'], ['--repeat', 'repeat'],
  ['--max-requests', 'maxRequests'], ['--output', 'output']
]);
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--help' || arg === '-h') { console.log(usage); process.exit(0); }
  if (arg === '--dry-run') { opts.dryRun = true; continue; }
  if (arg === '--allow-failures') { opts.allowFailures = true; continue; }
  const key = values.get(arg);
  if (!key || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) fail(`Invalid argument: ${arg}`);
  const value = process.argv[++i];
  if (key === 'repeat' || key === 'maxRequests') {
    if (!/^\d+$/.test(value)) fail(`${arg} must be a positive integer`);
    opts[key] = Number(value);
  } else opts[key] = value;
}
if (!['canonical', 'followups'].includes(opts.suite)) fail('Invalid --suite');
if (!['all', 'laura', 'javier', 'rosa'].includes(opts.caseId)) fail('Invalid --case');
if (!['interpreter', 'end-to-end'].includes(opts.mode)) fail('Invalid --mode');
if (!Number.isSafeInteger(opts.repeat) || opts.repeat < 1 || opts.repeat > 10) fail('Invalid --repeat');
if (!Number.isSafeInteger(opts.maxRequests) || opts.maxRequests < 1 || opts.maxRequests > 20) fail('Budget must be between 1 and 20');
const scenarioMap = {
  laura: { initial: 'B01', 'gross-correction': 'C01' },
  javier: { initial: 'B05', 'trust-paraphrase': 'B06', 'opt-out': 'B10' },
  rosa: { initial: 'B08' }
};
let scenarioIds;
if (opts.suite === 'followups') {
  if (opts.caseId !== 'all' || opts.scenario !== 'initial') fail('Followups suite cannot be combined with --case or --scenario');
  scenarioIds = ['C01', 'B06', 'B10'];
} else if (opts.caseId === 'all') {
  if (opts.scenario !== 'initial') fail('Select a single --case for non-initial scenarios');
  scenarioIds = ['B01', 'B05', 'B08'];
} else {
  const id = scenarioMap[opts.caseId]?.[opts.scenario];
  if (!id) fail('The scenario is not available for the selected case');
  scenarioIds = [id];
}
if (scenarioIds.includes('C01') && opts.mode !== 'end-to-end') fail('C01 needs --mode end-to-end to test the prior case state and later correction');
const ceiling = scenarioIds.reduce((sum, id) => sum + (id === 'C01' ? 4 : 2), 0) * opts.repeat;
if (ceiling > opts.maxRequests) fail(`Maximum expected ${ceiling} provider requests exceeds --max-requests ${opts.maxRequests}. Reduce --repeat or select fewer scenarios.`);
console.log(`Cases: ${scenarioIds.join(', ')} × ${opts.repeat} | mode=${opts.mode} | max requests=${opts.maxRequests} | preflight ceiling=${ceiling}`);
if (opts.dryRun) { console.log('DRY RUN: no API calls, no artifact generated.'); process.exit(0); }

for (const filename of ['.env.local', '.env']) {
  if (existsSync(filename)) process.loadEnvFile(filename);
}
if (!process.env.OPENAI_API_KEY?.trim() || !process.env.OPENAI_MODEL?.trim()) {
  fail('OPENAI_API_KEY and OPENAI_MODEL must be set in the environment or .env.local/.env');
}
const vitest = resolve('node_modules/vitest/vitest.mjs');
if (!existsSync(vitest)) fail('Install dependencies first with pnpm install --frozen-lockfile');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const requested = isAbsolute(opts.output) ? opts.output : resolve(opts.output);
const outputFile = extname(requested) === '.json' ? requested : join(requested, `f01-${stamp}.json`);
mkdirSync(dirname(outputFile), { recursive: true });

const config = { scenarioIds, repeat: opts.repeat, mode: opts.mode, maxRequests: opts.maxRequests, allowFailures: opts.allowFailures };
const child = spawnSync(process.execPath, [vitest, 'run', 'tests/evaluation/f01-cli.test.ts', '--reporter=verbose'], {
  cwd: process.cwd(),
  env: {
    ...process.env, AI_MODE: 'openai', F01_EVAL_RUN: '1',
    F01_EVAL_CONFIG: JSON.stringify(config),
    F01_EVAL_OUTPUT_FILE: outputFile
  },
  stdio: 'inherit'
});
if (child.error) { console.error(`Unable to start the evaluation: ${child.error.code ?? 'process error'}`); process.exit(2); }
if (!existsSync(outputFile)) {
  console.error('No evaluation artifact produced; see test output.');
  process.exit(child.status || 1);
}
try {
  const report = JSON.parse(readFileSync(outputFile, 'utf8'));
  console.log('\n=== F-01 backend evaluation ===');
  for (const row of report.runs ?? []) {
    console.log(`${row.scenario} #${row.iteration}: ${row.verdict} | action=${row.observed?.action ?? 'none'} | checks=${row.checks?.filter(x => x.pass).length ?? 0}/${row.checks?.length ?? 0}`);
  }
  console.log(`Provider requests: ${report.requestCount}/${opts.maxRequests} | summary: ${JSON.stringify(report.summary)}`);
  console.log(`JSON report: ${outputFile}`);
  const nonpassing = (report.summary?.FAIL ?? 0) + (report.summary?.PARTIAL ?? 0) + (report.summary?.BLOCKED ?? 0);
  process.exit(child.status || (!opts.allowFailures && nonpassing ? 1 : 0));
} catch {
  console.error(`Unable to read the evaluation artifact: ${outputFile}`);
  process.exit(1);
}
