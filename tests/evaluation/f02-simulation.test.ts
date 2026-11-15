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
  it('retains a partial correction run when an initial interpretation fails', async () => {
    const report = await simulate({ ids: ['C01'], repeat: 1, model: 'test', maxRequests: 20 });
    expect(report.attempts).toBe(16);
    expect(report.pairs[0].single?.stages).toBe(2);
    expect(report.pairs[0].multipass?.status).toBe('error');
    expect(report.pairs[0].multipass?.stages).toBe(2);
    expect(report.pairs[0].single?.status).toBe('incomplete');
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
