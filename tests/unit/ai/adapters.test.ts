import { describe, expect, it } from 'vitest';
import { createAIAdapters } from '../../../src/adapters/ai';
import { cases, scenarios } from '../../../src/fixtures';
import { configBundleRef, demoBundle } from '../../../src/config';
import type { CaseSnapshot, ActionProposal, PolicyDecision } from '../../../src/contracts';

const snapshot = (caseId: string): CaseSnapshot => ({ caseId, revision: 0, messages: cases.find(c => c.caseId === caseId)!.messages, assertions: [], knowledge: { facts: [] }, goal: { id: 'g', description: 'Orientar', status: 'active' }, workflowProgress: { workflowId: 'wf', workflowVersion: '1', milestones: [] }, blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef, status: 'NEEDS_ADVISOR' });
const input = (caseId: string) => { const caseSnapshot = snapshot(caseId); return { caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile }; };
const proposal: ActionProposal = { proposalId: 'p', originCaseRevision: 0, configBundleRef, actionType: 'CLARIFY', reason: 'Aclarar deuda', evidenceRefs: [], status: 'active' };
const policy: PolicyDecision = { result: 'NEED_CLARIFICATION', allowedActions: ['CLARIFY'], prohibitedActions: ['PROPOSE_CALL'], ruleIds: ['R05'], priority: 1, reviewRequired: true, reasons: [], evidenceRefs: [] };

describe('AI adapters', () => {
  it('replays evidence-based canonical facts deterministically and marks replay', async () => {
    const adapters = createAIAdapters({ AI_MODE: 'replay' });
    expect(adapters.ok).toBe(true); if (!adapters.ok) return;
    const one = await adapters.value.interpreter.interpret(input('laura'));
    expect(one).toEqual(await adapters.value.interpreter.interpret(input('laura')));
    expect(one).toMatchObject({ ok: true, value: { warnings: expect.arrayContaining([expect.stringContaining('replay')]), assertions: expect.arrayContaining([expect.objectContaining({ fieldId: 'declared_monthly_income', value: 3800, subjectRef: expect.objectContaining({ scope: 'buying_unit' }) })]) } });
    const draft = await adapters.value.draftGenerator.generate({ caseSnapshot: snapshot('laura'), proposal, agentProfile: demoBundle.agentProfile, policyDecision: policy });
    expect(draft).toMatchObject({ ok: true, value: { aiMode: 'replay', status: 'generated' } });
  });
  it('retains Javier range and excludes unavailable audio and Rosa explicit zero', async () => {
    const adapters = createAIAdapters({ AI_MODE: 'replay' }); if (!adapters.ok) throw Error('mode');
    const javier = await adapters.value.interpreter.interpret(input('javier'));
    expect(javier).toMatchObject({ ok: true, value: { assertions: expect.arrayContaining([expect.objectContaining({ fieldId: 'declared_monthly_income', value: { min: 2000, max: 3000 }, incomeBasis: 'unknown' })]) } });
    if (javier.ok) expect(javier.value.assertions.flatMap(a => a.evidenceRefs).some(r => r.messageId === 'javier-m4')).toBe(false);
    const rosa = await adapters.value.interpreter.interpret(input('rosa'));
    expect(rosa).toMatchObject({ ok: true, value: { assertions: expect.arrayContaining([expect.objectContaining({ fieldId: 'available_savings', value: 0 })]) } });
  });
  it('fails closed for unrecognized replay content or modes rather than inventing extraction', async () => {
    expect(createAIAdapters({ AI_MODE: 'unexpected' })).toMatchObject({ ok: false });
    expect(createAIAdapters({ AI_MODE: 'openai' })).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
    const a = createAIAdapters({ AI_MODE: 'replay' }); if (!a.ok) throw Error('mode');
    const i = input('laura'); i.messages = [...i.messages, { ...scenarios[1].additions[0], messageId: 'arbitrary', content: { type: 'text', text: 'Something unknown' } }];
    expect(await a.value.interpreter.interpret(i)).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
  });
  it('blocks prohibited, stale or unsafe draft proposals', async () => {
    const a = createAIAdapters({ AI_MODE: 'replay' }); if (!a.ok) throw Error('mode');
    const common = { caseSnapshot: snapshot('laura'), agentProfile: demoBundle.agentProfile, policyDecision: policy };
    expect(await a.value.draftGenerator.generate({ ...common, proposal: { ...proposal, actionType: 'PROPOSE_CALL' } })).toMatchObject({ ok: false, error: { code: 'POLICY_DENIED' } });
    expect(await a.value.draftGenerator.generate({ ...common, proposal: { ...proposal, originCaseRevision: 1 } })).toMatchObject({ ok: false, error: { code: 'STALE_PROPOSAL' } });
  });
  it('rejects malformed outputs, forged advisor authority and unavailable evidence in real mode', async () => {
    const baseAssertion = { assertionId: 'a', fieldId: 'available_savings', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, value: 0, rawValue: 'Ahorros no tenemos', source: 'customer_message', evidenceRefs: [{ messageId: 'rosa-m1' }], observedAt: '2026-05-01T10:01:00Z', precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: '1.0.0' };
    for (const [payload, code] of [
      [{ assertions: 'bad', blockers: [], warnings: [] }, 'MODEL_OUTPUT_INVALID'],
      [{ assertions: [{ ...baseAssertion, source: 'advisor_correction', reviewStatus: 'confirmed_by_advisor' }], blockers: [], warnings: [] }, 'MODEL_OUTPUT_INVALID'],
      [{ assertions: [{ ...baseAssertion, evidenceRefs: [{ messageId: 'missing' }] }], blockers: [], warnings: [] }, 'EVIDENCE_INVALID'],
      [{ assertions: [{ ...baseAssertion, evidenceRefs: [{ messageId: 'javier-m4' }] }], blockers: [], warnings: [] }, 'EVIDENCE_INVALID'],
    ] as const) {
      const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', OPENAI_MODEL: 'model-a' }, { complete: async () => payload });
      if (!a.ok) throw Error('mode');
      expect(await a.value.interpreter.interpret(input('rosa'))).toMatchObject({ ok: false, error: { code } });
    }
  });
  it('returns controlled errors for model failure and disallows unsafe template selections', async () => {
    const broken = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test' }, { complete: async () => { throw new Error('secret should never appear'); } });
    if (!broken.ok) throw Error('mode');
    const error = await broken.value.interpreter.interpret(input('laura'));
    expect(error).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
    expect(JSON.stringify(error)).not.toContain('secret');
    const unsafe = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test' }, { complete: async () => ({ key: 'approved' }) });
    if (!unsafe.ok) throw Error('mode');
    expect(await unsafe.value.draftGenerator.generate({ caseSnapshot: snapshot('laura'), proposal, agentProfile: demoBundle.agentProfile, policyDecision: policy })).toMatchObject({ ok: false, error: { code: 'DRAFT_GENERATION_FAILED' } });
  });

  it('accepts valid, evidenced real-mode output and times out stalled calls', async () => {
    const candidate = { assertions: [{ assertionId: 'a', fieldId: 'available_savings', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, value: 0, rawValue: 'Ahorros no tenemos', source: 'customer_message', evidenceRefs: [{ messageId: 'rosa-m1' }], observedAt: '2026-05-01T10:01:00Z', precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: '1.0.0' }], blockers: [], warnings: [] };
    const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test' }, { complete: async () => candidate });
    if (!a.ok) throw Error('mode');
    expect(await a.value.interpreter.interpret(input('rosa'))).toMatchObject({ ok: true, value: candidate });
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const stalled = new OpenAIInterpreter({ complete: async () => new Promise(() => {}) }, 5);
    expect(await stalled.interpret(input('rosa'))).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE', retryable: true } });
  });

  it('replays explicit debt clarification and preserves a gross correction as uncertain', async () => {
    const a = createAIAdapters({ AI_MODE: 'replay' }); if (!a.ok) throw Error('mode');
    const included = input('laura'); included.messages = [...included.messages, ...scenarios.find(s => s.id === 'laura-included')!.additions];
    expect(await a.value.interpreter.interpret(included)).toMatchObject({ ok: true, value: { assertions: expect.arrayContaining([expect.objectContaining({ fieldId: 'debt_deduction_semantics', value: 'included' })]) } });
    const corrected = input('laura'); corrected.messages = [...corrected.messages, ...scenarios.find(s => s.id === 'laura-gross-correction')!.additions];
    expect(await a.value.interpreter.interpret(corrected)).toMatchObject({ ok: true, value: { assertions: expect.arrayContaining([expect.objectContaining({ fieldId: 'declared_monthly_income', incomeBasis: 'gross', precision: 'ambiguous' })]) } });
  });

  it('asks about product interest when unknown while preserving debt and month priority', async () => {
    const a = createAIAdapters({ AI_MODE: 'replay' }); if (!a.ok) throw Error('mode');
    const caseSnapshot = snapshot('laura');
    const common = { caseSnapshot, proposal, agentProfile: demoBundle.agentProfile, policyDecision: { ...policy, ruleIds: ['R03'] } };
    const unknown = await a.value.draftGenerator.generate(common);
    expect(unknown).toMatchObject({ ok: true, value: { text: expect.stringContaining('SmartHousing') } });
    caseSnapshot.knowledge.facts = [{ fieldId: 'product_intent', subjectRef: { scope: 'case', id: 'case' }, status: 'ambiguous', evidenceRefs: [] }];
    expect(await a.value.draftGenerator.generate(common)).toMatchObject({ ok: true, value: { text: expect.stringContaining('SmartHousing') } });
    const debt = await a.value.draftGenerator.generate({ ...common, policyDecision: { ...policy, ruleIds: ['R05', 'R03'] } });
    expect(debt).toMatchObject({ ok: true, value: { text: expect.stringContaining('cuota') } });
    const month = await a.value.draftGenerator.generate({ ...common, policyDecision: { ...policy, ruleIds: ['R10', 'R03'] } });
    expect(month).toMatchObject({ ok: true, value: { text: expect.stringContaining('mes') } });
    caseSnapshot.knowledge.facts = [{ fieldId: 'product_intent', subjectRef: { scope: 'case', id: 'case' }, status: 'known', value: 'explore_smart_housing', evidenceRefs: [{ messageId: 'laura-m1' }] }];
    const known = await a.value.draftGenerator.generate(common);
    expect(known).toMatchObject({ ok: true, value: { text: expect.not.stringContaining('SmartHousing') } });
  });

});

describe('model-facing interpretation', () => {
  it('converts nullable optional fields while retaining exact customer evidence', async () => {
    const candidate = { assertions: [{ fieldId: 'available_savings', scope: 'buying_unit', subjectId: 'buying_unit', value: 0, unit: 'EUR', period: null, incomeBasis: null, quote: 'Ahorros no tenemos', messageId: 'rosa-m1', precision: 'explicit' }], blockers: [], warnings: [] };
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const result = normalizeModelInterpretation(candidate, input('rosa'));
    expect(result).toMatchObject({ ok: true, value: { assertions: [expect.objectContaining({ value: 0, rawValue: 'Ahorros no tenemos', source: 'customer_message' })] } });
    expect(normalizeModelInterpretation({ ...candidate, assertions: [{ ...candidate.assertions[0], messageId: 'missing' }] }, input('rosa'))).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
});

describe('structured output failures', () => {
  it('rejects unsupported fields, invalid types and forged evidence without dropping assertions', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const a = { fieldId: 'available_savings', scope: 'buying_unit', subjectId: 'buying_unit', value: 0, unit: 'EUR', period: null, incomeBasis: null, quote: 'Ahorros no tenemos', messageId: 'rosa-m1', precision: 'explicit' };
    for (const change of [{ fieldId: 'not_a_field' }, { value: ['0'] }, { quote: 'inventado' }]) {
      expect(normalizeModelInterpretation({ assertions: [{ ...a, ...change }], blockers: [], warnings: [] }, input('rosa')).ok).toBe(false);
    }
  });
  it('distinguishes incomplete or refused responses without exposing provider details', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    for (const message of ['MODEL_REFUSAL', 'MODEL_INCOMPLETE']) {
      const result = await new OpenAIInterpreter({ complete: async () => { throw new Error(message); } }).interpret(input('rosa'));
      expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID' } });
    }
  });
});

describe('schema and source grounding', () => {
  it('constrains value types and enum options by configured field', async () => {
    const { modelSchemaFor } = await import('../../../src/adapters/ai/openai');
    const schema = modelSchemaFor(demoBundle.factSchema);
    const assertion = { fieldId: 'monthly_debt', scope: 'buying_unit', subjectId: 'buying_unit', value: ['250'], unit: 'EUR', period: 'month', incomeBasis: null, messageId: 'laura-m4', precision: 'explicit' };
    expect(schema.safeParse({ assertions: [assertion], blockers: [], warnings: [] }).success).toBe(false);
    expect(schema.safeParse({ assertions: [{ ...assertion, value: 250 }], blockers: [], warnings: [] }).success).toBe(true);
    expect(schema.safeParse({ assertions: [{ ...assertion, fieldId: 'product_intent', scope: 'case', value: 'invented' }], blockers: [], warnings: [] }).success).toBe(false);
  });
  it('resolves message references to original customer text and rejects missing or audio sources', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const a = { fieldId: 'available_savings', scope: 'buying_unit', subjectId: 'buying_unit', value: 0, unit: 'EUR', period: null, incomeBasis: null, messageId: 'rosa-m1', precision: 'explicit' };
    const valid = normalizeModelInterpretation({ assertions: [a], blockers: [], warnings: [] }, input('rosa'));
    expect(valid).toMatchObject({ ok: true, value: { assertions: [{ rawValue: expect.stringContaining('Ahorros no tenemos'), evidenceRefs: [{ messageId: 'rosa-m1' }] }] } });
    expect(normalizeModelInterpretation({ assertions: [{ ...a, messageId: 'missing' }], blockers: [], warnings: [] }, input('rosa')).ok).toBe(false);
  });
});

describe('semantic grounding safeguards', () => {
  it('rejects a financial amount absent from a basis correction message', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const data = input('laura');
    data.messages = [...data.messages, { messageId: 'correction', conversationId: 'laura-conversation', role: 'customer', occurredAt: '2026-05-03T09:00:00Z', content: { type: 'text', text: 'Me corrijo: las cifras eran brutas.' }, simulated: true }];
    const a = { fieldId: 'declared_monthly_income', scope: 'buying_unit', subjectId: 'buying_unit', value: 3800, unit: 'EUR', period: 'month', incomeBasis: 'gross', messageId: 'correction', precision: 'explicit' };
    expect(normalizeModelInterpretation({ assertions: [a], blockers: [], warnings: [] }, data)).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
  it('keeps an exclusive intent based on a question ambiguous', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const a = { fieldId: 'product_intent', scope: 'case', subjectId: 'case', value: 'classical_rental', unit: null, period: null, incomeBasis: null, messageId: 'rosa-m2', precision: 'explicit' };
    expect(normalizeModelInterpretation({ assertions: [a], blockers: [], warnings: [] }, input('rosa'))).toMatchObject({ ok: true, value: { assertions: [{ precision: 'ambiguous' }] } });
  });
});

describe('amount observation precision', () => {
  it('preserves approximations attached to amounts without changing an exact amount in the same message', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const data = input('laura');
    const base = { scope: 'buying_unit', subjectId: 'buying_unit', unit: 'EUR', incomeBasis: null, precision: 'explicit' };
    const result = normalizeModelInterpretation({ assertions: [
      { ...base, fieldId: 'declared_monthly_income', value: 3800, period: 'month', messageId: 'laura-m3' },
      { ...base, fieldId: 'available_savings', value: 18000, period: null, messageId: 'laura-m3' },
      { ...base, fieldId: 'monthly_debt', value: 250, period: 'month', messageId: 'laura-m4' }
    ], blockers: [], warnings: [] }, data);
    expect(result).toMatchObject({ ok: true, value: { assertions: [ { precision: 'approximate' }, { precision: 'approximate' }, { precision: 'explicit' } ] } });
  });
});

describe('historical basis corrections', () => {
  it('retains the earlier amount and records a later basis correction without attributing the amount to it', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const { reconcileFacts } = await import('../../../src/domain/facts');
    const data = input('laura');
    data.messages = [...data.messages, ...scenarios.find(s => s.id === 'laura-gross-correction')!.additions];
    const earlier = { fieldId: 'declared_monthly_income', scope: 'buying_unit', subjectId: 'buying_unit', value: 3800, unit: 'EUR', period: 'month', incomeBasis: 'net', messageId: 'laura-m3', precision: 'explicit' };
    const correction = { ...earlier, incomeBasis: 'gross', messageId: data.messages.at(-1)!.messageId };
    const result = normalizeModelInterpretation({ assertions: [earlier, correction], blockers: [], warnings: [] }, data);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.assertions[1]).toMatchObject({ precision: 'ambiguous', incomeBasis: 'gross', evidenceRefs: [{ messageId: correction.messageId }] });
    expect(result.value.assertions[1].value).toBeUndefined();
    expect(reconcileFacts({ assertions: result.value.assertions, messages: data.messages, factSchema: data.factSchema })).toMatchObject({ ok: true, value: { facts: [{ status: 'ambiguous', value: 3800, evidenceRefs: expect.arrayContaining([{ messageId: 'laura-m3', quote: expect.any(String) }, { messageId: correction.messageId, quote: expect.any(String) }]) }] } });
  });
});
