import { describe, expect, it } from 'vitest';
import { demoBundle } from '../../../src/config';
import { evaluatePolicy } from '../../../src/domain/policies/evaluate-policy';
import type { Blocker, CaseEvent } from '../../../src/contracts';
const blocker = (type: string): Blocker => ({ id: type, type, status: 'open', description: type, evidenceRefs: [{ messageId: 'm1' }] });
const base = { knowledge: { facts: [] }, events: [], blockers: [], policy: demoBundle.businessPolicy, actionCatalog: demoBundle.actionCatalog };
describe('protected policy precedence', () => {
  it('prioritizes trust and urgent or binding requests over clarification', () => {
    const trust = evaluatePolicy({ ...base, blockers: [blocker('TRUST')] });
    expect(trust).toMatchObject({ result: 'HUMAN_REVIEW_REQUIRED', ruleIds: expect.arrayContaining(['R07']) });
    const urgent = evaluatePolicy({ ...base, blockers: [blocker('URGENT'), blocker('BINDING_CLAIM')] });
    expect(urgent).toMatchObject({ result: 'HUMAN_REVIEW_REQUIRED', allowedActions: ['HANDOFF'] });
  });
  it('does not let an inflated editable priority bypass an explicit trust objection', () => {
    const unsafe = { ...demoBundle.businessPolicy, rules: demoBundle.businessPolicy.rules.map(r => ({ ...r, priority: 100000 })) };
    expect(evaluatePolicy({ ...base, policy: unsafe, blockers: [blocker('TRUST')] })).toMatchObject({ result: 'HUMAN_REVIEW_REQUIRED', allowedActions: ['HANDOFF'] });
  });
  it('keeps binding and urgency protections when all editable requirements are disabled', () => {
    const policy = structuredClone(demoBundle.businessPolicy);
    policy.advisoryCall.requireProductInterest = false;
    policy.advisoryCall.requireLocation = false;
    policy.advisoryCall.requireBuyerCount = false;
    policy.advisoryCall.requireMovingHorizon = false;
    policy.advisoryCall.requireDeclaredIncomeContext = false;
    policy.advisoryCall.requireDeclaredSavings = false;
    policy.advisoryCall.requireDisclosedDebtSemanticsResolved = false;
    expect(evaluatePolicy({ ...base, policy, blockers: [blocker('BINDING_CLAIM')] })).toMatchObject({ result: 'HUMAN_REVIEW_REQUIRED', allowedActions: ['HANDOFF'] });
    expect(evaluatePolicy({ ...base, policy, blockers: [blocker('URGENT')] })).toMatchObject({ result: 'HUMAN_REVIEW_REQUIRED', allowedActions: ['HANDOFF'] });
  });
  it('protects opt-out even if editable rule priorities or rules change', () => {
    const event: CaseEvent = { eventId: 'e', caseId: 'c', actor: 'customer', occurredAt: '2026-01-01T00:00:00Z', expectedRevision: 0, type: 'DO_NOT_CONTACT_REQUESTED', payload: { evidenceRefs: [{ messageId: 'm1' }] } };
    const policy = { ...demoBundle.businessPolicy, rules: [] };
    expect(evaluatePolicy({ ...base, policy, events: [event], blockers: [blocker('BINDING_CLAIM')] })).toMatchObject({ result: 'STOP_CONTACT', allowedActions: ['STOP_CONTACT'] });
  });
});
