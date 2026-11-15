import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { simulate } from './f02-simulation';

const run = process.env.F02_SIMULATE === '1' ? it : it.skip;
run('produces an offline simulated comparison', async () => {
  const config = JSON.parse(process.env.F02_SIM_CONFIG ?? '{}');
  const result = await simulate(config);
  writeFileSync(process.env.F02_SIM_OUTPUT!, JSON.stringify(result), { mode: 0o600 });
}, 60000);
