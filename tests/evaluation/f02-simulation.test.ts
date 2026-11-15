import { describe, expect, it } from 'vitest';
import { AttemptBudget, pairResults, simulate } from './f02-simulation';

describe('offline comparison', () => {
  it.each(['B01', 'B05', 'B08', 'B06', 'B10'] as const)('runs both production interpreters on the same %s input', async id => {
    const result = await simulate({ ids: [id], repeat: 1, model: 'test', maxRequests: 20 });
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].single?.inputHash).toBe(result.pairs[0].multipass?.inputHash);
    expect(result.attempts).toBe(7);
    expect(JSON.stringify(result)).not.toContain('3.800');
  });
  it('pairs by id independent of order and rejects duplicates', () => {
    const a = { runId: 'x', id: 'B01', iteration: 1, strategy: 'single' as const };
    const b = { ...a, strategy: 'multipass' as const };
    expect(pairResults([b, a], 'x')).toHaveLength(1);
    expect(() => pairResults([a, a], 'x')).toThrow();
    expect(() => pairResults([a], 'other')).toThrow();
  });
  it('retains history for the correction and reports human review', async () => {
    const report = await simulate({ ids: ['C01'], repeat: 1, model: 'test', maxRequests: 20 });
    expect(report.attempts).toBe(14);
    expect(report.pairs[0].single?.stages).toBe(2);
    expect(report.pairs[0].multipass?.status).toBe('human_review');
    expect(report.pairs[0].multipass?.stages).toBe(2);
    expect(report.pairs[0].single?.status).toBe('complete');
  });
  it('honors cancellation and a shared deadline', async () => {
    const controller = new AbortController();
    const cancelled = new AttemptBudget(20, 1000, controller.signal);
    controller.abort();
    await expect(cancelled.call(async () => 1)).rejects.toThrow();
    expect(cancelled.attempts).toBe(0);
    const timed = new AttemptBudget(20, 5);
    await expect(timed.call(() => new Promise(() => {}))).rejects.toThrow();
    expect(timed.attempts).toBe(1);
    await expect(timed.call(async () => 1)).rejects.toThrow();
  });
  it('reserves attempts atomically even when work fails', async () => {
    const budget = new AttemptBudget(20);
    await Promise.allSettled(Array.from({ length: 30 }, () => budget.call(async () => { throw Error('invalid'); })));
    expect(budget.attempts).toBe(20);
  });
});

it('propagates cancellation into in-flight transport work', async () => {
  const controller = new AbortController();
  const budget = new AttemptBudget(20, 1000, controller.signal);
  let received: AbortSignal | undefined;
  const pending = budget.call(async signal => { received = signal; return new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(Error('aborted')))); });
  await Promise.resolve();
  controller.abort();
  await expect(pending).rejects.toThrow();
  expect(received?.aborted).toBe(true);
  expect(budget.attempts).toBe(1);
});

it.each([
  ['B01', 4, []], ['B05', 3, ['TRUST']], ['B06', 3, ['TRUST']],
  ['B08', 3, ['URGENT', 'BINDING_CLAIM']], ['B10', 3, ['TRUST', 'OPT_OUT']],
] as const)('runs scripted claims and protected scans for %s', async (id, minimum, signals) => {
  const report = await simulate({ ids: [id], repeat: 1, model: 'test', maxRequests: 20 });
  for (const row of [report.pairs[0].single!, report.pairs[0].multipass!]) {
    expect(row.status).toBe('complete');
    expect(row.assertionCount).toBeGreaterThanOrEqual(minimum);
    expect(row.signals.sort()).toEqual([...signals].sort());
  }
});

it('detects a financial mutation in responses through the production interpreter', async () => {
  const report = await simulate({ ids:['B01'], repeat:1, model:'test', maxRequests:20, strategies:['single'], mutate: (role,response) => {
    if (role !== 'interpretation') return response;
    const output = structuredClone(response) as {assertions:{fieldId:string;value:unknown}[]};
    output.assertions.find(a=>a.fieldId==='declared_monthly_income')!.value=3000;
    return output;
  }});
  const row = report.pairs[0].single!;
  // The adapter can reject the unsupported amount; that is a detected, safe failure.
  expect(row.status === 'error' || row.metrics.value.numerator < row.metrics.value.denominator).toBe(true);
});

it('transfers nonempty prior assertions into the second C01 stage', async () => {
  const report = await simulate({ids:['C01'],repeat:1,model:'test',maxRequests:20});
  expect(report.pairs[0].single!.stageInputs[1].historyCount).toBeGreaterThan(0);
  expect(report.pairs[0].single!.correction).toEqual({assertions:1,inventedAmount:false});
  expect(report.pairs[0].multipass!.stageInputs[1].historyCount).toBeGreaterThan(0);
});

it('distinguishes Javier conversation variants without serializing messages', async () => {
  const base = await simulate({ids:['B05'],repeat:1,model:'test',maxRequests:20});
  const variant = await simulate({ids:['B06'],repeat:1,model:'test',maxRequests:20});
  const optout = await simulate({ids:['B10'],repeat:1,model:'test',maxRequests:20});
  expect(base.pairs[0].single!.inputHash).not.toBe(variant.pairs[0].single!.inputHash);
  expect(optout.pairs[0].single!.signals).toContain('OPT_OUT');
  expect(JSON.stringify(variant)).not.toContain('quién responde');
});
it('records a failed simulated transport attempt', async () => {
  const result = await simulate({ids:['B01'],repeat:1,model:'test',maxRequests:20,strategies:['single'],mutate:()=>{throw Error('MODEL_REFUSAL');}});
  expect(result.attempts).toBe(1);
  expect(result.pairs[0].single!.status).toBe('error');
});
