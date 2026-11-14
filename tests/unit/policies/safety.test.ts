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
  it('preserves opt-out, urgent, and trust precedence after a reviewed agreement', () => {
    const agreement: CaseEvent = { eventId: 'agreement', caseId: 'c', actor: 'advisor', occurredAt: '2026-01-01T00:00:00Z', expectedRevision: 0, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true, payload: { description: 'Acepta', reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'm1', quote: 'Acepta' }] } };
    const event: CaseEvent = { eventId: 'stop', caseId: 'c', actor: 'advisor', occurredAt: '2026-01-01T00:00:01Z', expectedRevision: 1, type: 'DO_NOT_CONTACT_REQUESTED', payload: { evidenceRefs: [{ messageId: 'm2' }] } };
    expect(evaluatePolicy({ ...base, events: [agreement, event], blockers: [blocker('URGENT')] })).toMatchObject({ result: 'STOP_CONTACT' });
    for (const type of ['URGENT', 'BINDING_CLAIM', 'TRUST']) expect(evaluatePolicy({ ...base, events: [agreement], blockers: [blocker(type)] })).toMatchObject({ result: 'HUMAN_REVIEW_REQUIRED', allowedActions: ['HANDOFF'] });
  });
  it('protects opt-out even if editable rule priorities or rules change', () => {
    const event: CaseEvent = { eventId: 'e', caseId: 'c', actor: 'customer', occurredAt: '2026-01-01T00:00:00Z', expectedRevision: 0, type: 'DO_NOT_CONTACT_REQUESTED', payload: { evidenceRefs: [{ messageId: 'm1' }] } };
    const policy = { ...demoBundle.businessPolicy, rules: [] };
    expect(evaluatePolicy({ ...base, policy, events: [event], blockers: [blocker('BINDING_CLAIM')] })).toMatchObject({ result: 'STOP_CONTACT', allowedActions: ['STOP_CONTACT'] });
  });
});

describe('debt clarification evidence', () => {
  it('retains the source of a known payment when its deduction is unclear', () => {
    const decision = evaluatePolicy({ ...base, knowledge: { facts: [{ fieldId: 'monthly_debt', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, status: 'known', value: 250, unit: 'EUR', evidenceRefs: [{ messageId: 'laura-m4' }] }] } });
    expect(decision.ruleIds).toContain('R05');
    expect(decision.evidenceRefs).toContainEqual({ messageId: 'laura-m4' });
  });
});


it('routes ordinary objections through R07 without enabling a call', () => {
  for (const type of ['COST', 'PRODUCT', 'TIME', 'FIT']) {
    const decision = evaluatePolicy({ ...base, blockers: [blocker(type)] });
    expect(decision).toMatchObject({ ruleIds: expect.arrayContaining(['R07']), allowedActions: ['ANSWER_QUESTION', 'HANDOFF'] });
    expect(decision.allowedActions).not.toContain('PROPOSE_CALL');
  }
});
