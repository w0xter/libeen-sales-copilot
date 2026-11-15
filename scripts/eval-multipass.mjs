#!/usr/bin/env node
// Offline planning only. No provider modules are imported or invoked.
import { writeFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const cases = { B01: 1, B05: 1, B06: 1, B08: 1, B10: 1, C01: 2 };
const opts = { case: 'B01', strategy: 'both', model: 'gpt-4.1-mini', mode: 'interpreter', repeat: '1', 'max-requests': '20', 'max-cost': null, 'max-seconds': null, output: null, 'dry-run': false, simulate: false };
const fail = message => { console.error(`Error: ${message}`); process.exit(2); };
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i].replace(/^--/, '');
  if (!(key in opts) || !process.argv[i].startsWith('--')) fail('Invalid option');
  if (key === 'dry-run' || key === 'simulate') { opts[key] = true; continue; }
  if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) fail(`Missing ${key}`);
  opts[key] = process.argv[++i];
}
if (opts['dry-run'] === opts.simulate) fail('Choose exactly one of --dry-run or --simulate; real execution is disabled');
if (!['single', 'multipass', 'both'].includes(opts.strategy) || !['interpreter', 'end-to-end'].includes(opts.mode)) fail('Invalid strategy or mode');
if (!/^[a-zA-Z0-9._-]{1,100}$/.test(opts.model)) fail('Invalid model');
const repeat = Number(opts.repeat), limit = Number(opts['max-requests']);
if (!/^\d+$/.test(opts.repeat) || !Number.isSafeInteger(repeat) || repeat < 1 || repeat > 10 || !/^\d+$/.test(opts['max-requests']) || !Number.isSafeInteger(limit) || limit < 1 || limit > 20) fail('Invalid repeat or request budget (maximum 20)');
for (const key of ['max-cost', 'max-seconds']) if (opts[key] !== null && (!/^\d+(\.\d+)?$/.test(opts[key]) || Number(opts[key]) <= 0)) fail(`Invalid ${key}`);
const ids = opts.case.split(',').sort();
if (new Set(ids).size !== ids.length || ids.some(id => !Object.hasOwn(cases, id))) fail('Unknown or repeated case');
if (ids.includes('C01') && opts.mode !== 'end-to-end') fail('C01 requires end-to-end');
const rows = ids.map(id => {
  const analyses = cases[id], drafts = opts.mode === 'end-to-end' ? analyses : 0;
  return { id, analyses, review: 'not_independently_reviewed', single: { typical: analyses * 2, maximum: analyses * 2 + drafts }, multipass: { typical: analyses * 5, maximum: analyses * 7 + drafts } };
});
const strategies = opts.strategy === 'both' ? ['single', 'multipass'] : [opts.strategy];
const total = key => rows.reduce((sum, row) => sum + strategies.reduce((n, strategy) => n + row[strategy][key], 0), 0) * repeat;
const simulationCeiling = rows.reduce((sum, row) => sum + row.analyses * strategies.reduce((n, strategy) => n + (strategy === 'single' ? 2 : 7), 0), 0) * repeat;
const ceiling = opts.simulate ? simulationCeiling : total('maximum');
if (ceiling > limit) fail(`Request ceiling ${ceiling} exceeds budget ${limit}`);
if (opts.simulate) {
  const dir = mkdtempSync(join(tmpdir(), 'f02-simulation-'));
  const target = join(dir, 'report.json');
  try {
    const config = { ids, repeat, model: opts.model, maxRequests: limit, timeoutMs: opts['max-seconds'] === null ? 30000 : Number(opts['max-seconds']) * 1000, strategies };
    const child = spawnSync(process.execPath, [resolve('node_modules/vitest/vitest.mjs'), 'run', 'tests/evaluation/f02-simulate-cli.test.ts'], { encoding: 'utf8', env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test', F02_SIMULATE: '1', F02_SIM_CONFIG: JSON.stringify(config), F02_SIM_OUTPUT: target }, timeout: config.timeoutMs + 10000 });
    if (child.status !== 0) throw Error('Simulation worker failed');
    const report = JSON.parse(readFileSync(target, 'utf8'));
    report.monetaryLimitApplied = false;
    report.requestedMaxCost = opts['max-cost'] === null ? null : Number(opts['max-cost']);
    const json = JSON.stringify(report) + '\n';
    if (opts.output) writeFileSync(opts.output, json, { flag: 'wx', mode: 0o600 });
    process.stdout.write(json);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  process.exit(0);
}
const plan = { format: 'f02-preflight-v1', dryRun: true, executionAvailable: false, model: opts.model, strategy: opts.strategy, mode: opts.mode, repeat, source: 'F01 six-scenario runner; synthetic fixtures', oracle: 'F01 expectations; independent review not established', cases: rows, totals: { typical: total('typical'), maximum: total('maximum') }, budgets: { requests: limit, cost: opts['max-cost'] === null ? null : Number(opts['max-cost']), seconds: opts['max-seconds'] === null ? null : Number(opts['max-seconds']) }, costEstimate: null, timeEstimate: null, limitations: ['No real execution or comparison implemented', 'Cost and time limits are recorded only; no runtime enforcement', 'No independent human-reviewed oracle', 'Token usage unavailable from existing transports'] };
plan.planHash = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const json = JSON.stringify(plan, null, 2) + '\n';
if (opts.output) writeFileSync(opts.output, json, { flag: 'wx', mode: 0o600 });
process.stdout.write(json);
