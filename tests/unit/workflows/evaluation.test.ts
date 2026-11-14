import { describe, expect, it } from 'vitest';
import { demoBundle } from '../../../src/config';
import type { CaseKnowledge, CaseEvent, FactView } from '../../../src/contracts';
import { evaluateCondition } from '../../../src/domain/workflows/conditions';
import { evaluateWorkflow } from '../../../src/domain/workflows/evaluate-workflow';
import { evaluatePolicy } from '../../../src/domain/policies/evaluate-policy';

const ref = [{ messageId: 'source' }];
const fact = (fieldId: string, value: string | number | string[], scope: 'case' | 'buying_unit' = 'case', extra = {}): FactView => ({ fieldId, subjectRef: { scope, id: scope }, status: 'known', value, evidenceRefs: ref, ...extra });
const context = (debt?: string): CaseKnowledge => ({ facts: [fact('initial_intent', 'consulta'), fact('product_intent', 'explore_smart_housing'), fact('desired_locations', ['Valencia']), fact('moving_horizon', 'antes del verano'), fact('buyer_count', 2, 'buying_unit'), fact('declared_monthly_income', 3800, 'buying_unit', { incomeBasis: 'net' }), fact('available_savings', 18000, 'buying_unit'), ...(debt ? [fact('debt_deduction_semantics', debt, 'buying_unit')] : [])] });
const eventBase = { eventId: 'event', caseId: 'laura', actor: 'advisor' as const, occurredAt: '2026-05-01T10:00:00Z', expectedRevision: 0 };
const evaluate = (knowledge: CaseKnowledge, events: CaseEvent[] = [], r10 = false) => {
  const policy = structuredClone(demoBundle.businessPolicy);
  policy.advisoryCall.requireSpecificMoveMonthBeforeCall = r10;
  const input = { knowledge, events, blockers: [] };
  const decision = evaluatePolicy({ ...input, policy, actionCatalog: demoBundle.actionCatalog });
  return { decision, progress: evaluateWorkflow({ ...input, definition: demoBundle.workflow, policyDecision: decision }) };
};

describe('workflow conditions and milestones', () => {
  it('keeps debt unknown blocked and resolves included or excluded without arithmetic', () => {
    expect(evaluate(context()).progress.milestones.find(m => m.milestoneId === 'M3')?.status).toBe('blocked');
    for (const value of ['included', 'excluded']) {
      const result = evaluate(context(value));
      expect(result.progress.milestones.find(m => m.milestoneId === 'M3')?.status).toBe('completed');
      expect(result.decision.result).toBe('READY_FOR_ADVISORY_CALL');
    }
  });
  it('changes the call route for R10 without reopening financial M3', () => {
    const off = evaluate(context('included'));
    const on = evaluate(context('included'), [], true);
    expect(off.decision.result).toBe('READY_FOR_ADVISORY_CALL');
    expect(on.decision).toMatchObject({ result: 'NEED_CLARIFICATION', ruleIds: expect.arrayContaining(['R10']) });
    expect(on.progress.milestones.find(m => m.milestoneId === 'M3')?.status).toBe('completed');
  });
  it('honors each optional policy requirement without changing the workflow definition', () => {
    const checks = [
      ['requireProductInterest', 'product_intent'], ['requireLocation', 'desired_locations'],
      ['requireBuyerCount', 'buyer_count'], ['requireMovingHorizon', 'moving_horizon'],
      ['requireDeclaredIncomeContext', 'declared_monthly_income'], ['requireDeclaredSavings', 'available_savings'],
      ['requireDisclosedDebtSemanticsResolved', 'debt_deduction_semantics'],
    ] as const;
    for (const [option, fieldId] of checks) {
      const knowledge = context('included');
      knowledge.facts = knowledge.facts.filter(f => f.fieldId !== fieldId);
      const policy = structuredClone(demoBundle.businessPolicy);
      const input = { knowledge, events: [], blockers: [], policy, actionCatalog: demoBundle.actionCatalog };
      expect(evaluatePolicy(input).result, option).toBe('NEED_CLARIFICATION');
      policy.advisoryCall[option] = false;
      expect(evaluatePolicy(input).result, option).toBe('READY_FOR_ADVISORY_CALL');
    }
  });
  it('does not turn a draft approval into customer agreement', () => {
    const approval: CaseEvent = { ...eventBase, type: 'DRAFT_APPROVED', payload: { draftId: 'draft', proposalId: 'proposal' } };
    const result = evaluate(context('included'), [approval]);
    expect(result.progress.milestones.find(m => m.milestoneId === 'M5')?.status).not.toBe('completed');
  });
  it('reopens the financial milestone when income is corrected to gross', () => {
    const knowledge = context('included');
    const income = knowledge.facts.find(f => f.fieldId === 'declared_monthly_income')!;
    income.incomeBasis = 'gross';
    expect(evaluate(knowledge).progress.milestones.find(m => m.milestoneId === 'M3')?.status).toBe('blocked');
  });
  it('completes the next step only on an independent confirmed event', () => {
    const confirmed: CaseEvent = { ...eventBase, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', actor: 'advisor', simulated: true, payload: { description: 'Acepta llamada', reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'm1', quote: 'Acepto' }] } };
    const knowledge = context('included');
    const policyDecision = evaluatePolicy({ knowledge, events: [], blockers: [], policy: demoBundle.businessPolicy, actionCatalog: demoBundle.actionCatalog });
    const progress = evaluateWorkflow({ knowledge, events: [confirmed], blockers: [], definition: demoBundle.workflow, policyDecision });
    expect(progress.milestones.find(m => m.milestoneId === 'M5')?.status).toBe('completed');
  });
  it('allows an explicitly confirmed advisor handoff as an alternate terminal route', () => {
    const handoff: CaseEvent = { ...eventBase, type: 'HUMAN_HANDOFF_CONFIRMED', payload: { reason: 'Revisión humana' } };
    const missing = evaluate({ facts: [] }, [handoff]);
    expect(missing.progress.milestones.find(m => m.milestoneId === 'M3')?.status).not.toBe('completed');
    expect(missing.progress.milestones.find(m => m.milestoneId === 'M5')?.status).toBe('completed');
    const spoofed: CaseEvent = { ...handoff, actor: 'customer' };
    expect(evaluate({ facts: [] }, [spoofed]).progress.milestones.find(m => m.milestoneId === 'M5')?.status).not.toBe('completed');
    const customer: CaseEvent = { ...eventBase, actor: 'advisor', type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true, payload: { description: 'Acepta llamada', reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'm1', quote: 'Acepto' }] } };
    expect(evaluate({ facts: [] }, [customer]).progress.milestones.find(m => m.milestoneId === 'M5')?.status).not.toBe('completed');
  });
  it('does not accept an unreviewed customer event as a confirmation', () => {
    const spoofed = { ...eventBase, actor: 'customer', type: 'CUSTOMER_CONFIRMED_NEXT_STEP', payload: { description: 'Accepted', evidenceRefs: ref } } as unknown as CaseEvent;
    expect(evaluate(context('included'), [spoofed]).progress.milestones.find(m => m.milestoneId === 'M5')?.status).not.toBe('completed');
  });
  it('treats explicit zero as known but never merges distinct subjects', () => {
    const zero = { id: 'savings', op: 'fact_present' as const, fieldId: 'available_savings' };
    const knowledge = { facts: [fact('available_savings', 0, 'buying_unit')] };
    expect(evaluateCondition(zero, { knowledge, events: [], blockers: [] }).result).toBe('satisfied');
    const second = fact('available_savings', 20, 'buying_unit');
    second.subjectRef.id = 'another';
    expect(evaluateCondition(zero, { knowledge: { facts: [...knowledge.facts, second] }, events: [], blockers: [] }).result).toBe('conflict');
  });
  it('does not coerce unknown and conflict when negating predicates', () => {
    const condition = { id: 'not-income', op: 'NOT' as const, condition: { id: 'net', op: 'fact_income_basis' as const, fieldId: 'income', basis: 'net' as const } };
    expect(evaluateCondition(condition, { knowledge: { facts: [] }, events: [], blockers: [] }).result).toBe('unknown');
    expect(evaluateCondition(condition, { knowledge: { facts: [{ fieldId: 'income', subjectRef: { scope: 'buying_unit', id: 'u' }, status: 'conflicting', values: [1, 2], evidenceRefs: ref }] }, events: [], blockers: [] }).result).toBe('conflict');
  });
});
