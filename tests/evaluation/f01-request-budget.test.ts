import { expect, it } from 'vitest';
import { RequestBudget } from './f01-request-budget';

it('reserves a shared cap before concurrent multipass and draft attempts', async () => {
  const budget = new RequestBudget(3);
  const attempts = await Promise.allSettled(Array.from({ length: 8 }, async () => { const index = budget.reserve(); await Promise.resolve(); return index; }));
  expect(attempts.filter(a => a.status === 'fulfilled')).toHaveLength(3);
  expect(attempts.filter(a => a.status === 'rejected')).toHaveLength(5);
  expect(budget.count).toBe(3);
});
