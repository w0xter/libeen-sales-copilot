import { describe, expect, it } from 'vitest';
import { applyExternalPolicy } from '../../src/config/external-policy';
import { demoBundle } from '../../src/config';

describe('external policy', () => {
  it('validates and versions the R10 setting without changing M3', () => {
    const on = applyExternalPolicy(demoBundle, { version: 'demo-v2', requireSpecificMoveMonthBeforeCall: true });
    expect(on.businessPolicy.advisoryCall.requireSpecificMoveMonthBeforeCall).toBe(true);
    expect(on.workflow.businessPolicyVersion).toBe('demo-v2');
    expect(on.workflow.milestones.find(m => m.id === 'M3')).toEqual(demoBundle.workflow.milestones.find(m => m.id === 'M3'));
    expect(() => applyExternalPolicy(demoBundle, { version: 'v', requireSpecificMoveMonthBeforeCall: 'true' })).toThrow();
  });
});
