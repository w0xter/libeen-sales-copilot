import { describe, expect, it } from 'vitest';
import { ActionProposalSchema, ApplicationErrorSchema, CaseEventSchema, ConditionSchema, DraftSchema, FactAssertionSchema, FactViewSchema, FieldDefinitionSchema, InterpretationSchema, MessageSchema, PolicyRuleSchema } from '../../src/contracts';

const ref = { messageId: 'm1', quote: '0 euros' };
const subjectRef = { scope: 'buying_unit', id: 'household' };
const bundle = { workflow: '1', factSchema: '1', agentProfile: '1', businessPolicy: '1', reviewPolicy: '1', actionCatalog: '1' };
const base = { eventId: 'e1', caseId: 'c1', actor: 'advisor', occurredAt: '2026-01-01T00:00:00Z', expectedRevision: 0 };

describe('public contract boundaries', () => {
  it('distinguishes unknown from explicit zero and rejects fabricated unknown values', () => {
    expect(FactViewSchema.safeParse({ fieldId: 'savings', subjectRef, status: 'known', value: 0, evidenceRefs: [ref] }).success).toBe(true);
    expect(FactViewSchema.safeParse({ fieldId: 'savings', subjectRef, status: 'unknown', evidenceRefs: [] }).success).toBe(true);
    expect(FactViewSchema.safeParse({ fieldId: 'savings', subjectRef, status: 'unknown', value: 0, evidenceRefs: [] }).success).toBe(false);
  });
  it('accepts evidenced assertions and rejects absent evidence and unknown keys', () => {
    const assertion = { assertionId: 'a1', fieldId: 'savings', subjectRef, value: 0, rawValue: '0 euros', source: 'customer_message', evidenceRefs: [ref], observedAt: '2026-01-01T00:00:00Z', precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: '1' };
    expect(FactAssertionSchema.safeParse(assertion).success).toBe(true);
    expect(FactAssertionSchema.safeParse({ ...assertion, evidenceRefs: [] }).success).toBe(false);
    expect(FactAssertionSchema.safeParse({ ...assertion, imaginary: true }).success).toBe(false);
  });
  it('keeps event types and payloads distinct, including simulated delivery and customer agreement', () => {
    const approval = { ...base, type: 'DRAFT_APPROVED', payload: { draftId: 'd1', proposalId: 'p1' } };
    expect(CaseEventSchema.safeParse(approval).success).toBe(true);
    expect(CaseEventSchema.safeParse({ ...approval, type: 'MESSAGE_SIMULATED_AS_SENT' }).success).toBe(false);
    expect(CaseEventSchema.safeParse({ ...base, type: 'MESSAGE_SIMULATED_AS_SENT', simulated: true, payload: { draftId: 'd1', proposalId: 'p1' } }).success).toBe(true);
    expect(CaseEventSchema.safeParse({ ...base, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true, payload: { evidenceRefs: [ref], description: 'Accepts call', reviewedByAdvisor: true } }).success).toBe(true);
    expect(CaseEventSchema.safeParse({ ...base, type: 'MILESTONE_COMPLETED', payload: {} }).success).toBe(false);
  });
  it('requires a versioned proposal and stable error codes', () => {
    const p = { proposalId: 'p1', originCaseRevision: 2, configBundleRef: bundle, actionType: 'ASK_CLARIFICATION', reason: 'Missing detail', evidenceRefs: [ref], status: 'active' };
    expect(ActionProposalSchema.safeParse(p).success).toBe(true);
    expect(ActionProposalSchema.safeParse({ ...p, originCaseRevision: -1 }).success).toBe(false);
    for (const code of ['REVISION_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'STALE_PROPOSAL', 'EVIDENCE_INVALID', 'MODEL_OUTPUT_INVALID']) expect(ApplicationErrorSchema.safeParse({ code, message: 'Safe error', retryable: false }).success).toBe(true);
    expect(ApplicationErrorSchema.safeParse({ code: 'UNRECOGNISED', message: 'x', retryable: false }).success).toBe(false);
  });
  it('represents proposal, draft, approval, simulated delivery and agreement separately', () => {
    const draft = { draftId: 'd1', proposalId: 'p1', text: 'Would you like to talk?', status: 'generated', aiMode: 'replay' };
    expect(DraftSchema.safeParse(draft).success).toBe(true);
    expect(DraftSchema.safeParse({ ...draft, status: 'approved' }).success).toBe(true);
    expect(DraftSchema.safeParse({ ...draft, status: 'sent' }).success).toBe(false);
    expect(DraftSchema.safeParse({ ...draft, status: 'agreed' }).success).toBe(false);
    expect(CaseEventSchema.safeParse({ ...base, type: 'DRAFT_APPROVED', payload: { draftId: 'd1', proposalId: 'p1' }, simulated: true }).success).toBe(false);
  });
  it('does not accept model-proposed authoritative milestone changes or extra fields', () => {
    expect(InterpretationSchema.safeParse({ assertions: [], blockers: [], warnings: [] }).success).toBe(true);
    expect(InterpretationSchema.safeParse({ assertions: [], blockers: [], warnings: [], milestones: ['M5'] }).success).toBe(false);
  });
  it('preserves income basis and permits typed structural validation', () => {
    const income = { fieldId: 'income', subjectRef, status: 'known', value: 3800, incomeBasis: 'gross', evidenceRefs: [ref] };
    expect(FactViewSchema.safeParse(income).success).toBe(true);
    expect(FactViewSchema.safeParse({ ...income, incomeBasis: 'verified' }).success).toBe(false);
    const field = { id: 'buyer_count', label: 'Buyers', description: 'Declared count', type: 'number', scopes: ['buying_unit'], cardinality: 'one', units: [], enumOptions: [], sensitivity: 'normal', schemaVersion: '1', structuralValidation: { min: 1, integer: true } };
    expect(FieldDefinitionSchema.safeParse(field).success).toBe(true);
    expect(FieldDefinitionSchema.safeParse({ ...field, structuralValidation: { min: 2, max: 1 } }).success).toBe(false);
  });
  it('accepts declarative policy rules and rejects executable or incoherent triggers', () => {
    const rule = { id: 'R10', condition: { id: 'horizon', op: 'fact_present', fieldId: 'specific_move_month' }, conditionResults: ['unknown'], requiredOption: 'requireSpecificMoveMonthBeforeCall', result: 'NEED_CLARIFICATION', allowedActions: ['ASK_CLARIFICATION'], prohibitedActions: ['PROPOSE_CALL'], priority: 5, reviewRequired: true, reason: 'Ask for month' };
    expect(PolicyRuleSchema.safeParse(rule).success).toBe(true);
    expect(PolicyRuleSchema.safeParse({ ...rule, script: 'execute()' }).success).toBe(false);
    const { condition: _condition, ...withoutCondition } = rule;
    void _condition;
    expect(PolicyRuleSchema.safeParse(withoutCondition).success).toBe(false);
  });
  it('validates a structured income-basis predicate', () => {
    const condition = { id: 'income-net', op: 'fact_income_basis', fieldId: 'income', subjectScope: 'buying_unit', basis: 'net' };
    expect(ConditionSchema.safeParse(condition).success).toBe(true);
    expect(ConditionSchema.safeParse({ ...condition, basis: 'verified' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ ...condition, extra: true }).success).toBe(false);
  });
  it('validates negation and open blocker conditions without accepting malformed operands', () => {
    const blocker = { id: 'trust', op: 'blocker_open', blockerTypes: ['TRUST'] };
    expect(ConditionSchema.safeParse(blocker).success).toBe(true);
    expect(ConditionSchema.safeParse({ id: 'no-trust', op: 'NOT', condition: blocker }).success).toBe(true);
    expect(ConditionSchema.safeParse({ ...blocker, blockerTypes: [] }).success).toBe(false);
    expect(ConditionSchema.safeParse({ id: 'no-trust', op: 'NOT', condition: blocker, code: 'run()' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ id: 'no-trust', op: 'NOT' }).success).toBe(false);
  });
  it('represents unavailable audio without invented text', () => {
    const message = { messageId: 'm1', conversationId: 'conv1', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'audio_unavailable' } };
    expect(MessageSchema.safeParse(message).success).toBe(true);
    expect(MessageSchema.safeParse({ ...message, content: { type: 'audio_unavailable', durationSeconds: 72 } }).success).toBe(true);
    expect(MessageSchema.safeParse({ ...message, content: { type: 'audio_unavailable', durationSeconds: -1 } }).success).toBe(false);
    expect(MessageSchema.safeParse({ ...message, content: { type: 'audio_unavailable', text: 'invented' } }).success).toBe(false);
  });
});

describe('advisor-reviewed simulated agreement', () => {
  const reviewed = { ...base, actor: 'advisor', type: 'CUSTOMER_CONFIRMED_NEXT_STEP', simulated: true, payload: { description: 'Acepta llamada', reviewedByAdvisor: true, evidenceRefs: [{ messageId: 'm1', quote: 'Sí, acepto una llamada.' }] } };
  it('requires explicit advisor review, simulation and a quoted customer message', () => {
    expect(CaseEventSchema.safeParse(reviewed).success).toBe(true);
    expect(CaseEventSchema.safeParse({ ...reviewed, actor: 'customer' }).success).toBe(false);
    expect(CaseEventSchema.safeParse({ ...reviewed, simulated: false }).success).toBe(false);
    expect(CaseEventSchema.safeParse({ ...reviewed, payload: { description: 'Acepta', evidenceRefs: [{ messageId: 'm1' }] } }).success).toBe(false);
    expect(CaseEventSchema.safeParse({ ...reviewed, payload: { ...reviewed.payload, reviewedByAdvisor: false } }).success).toBe(false);
  });
});
