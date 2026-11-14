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
  it('returns controlled model errors and selects singleton templates without a model', async () => {
    const broken = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test' }, { complete: async () => { throw new Error('secret should never appear'); } });
    if (!broken.ok) throw Error('mode');
    const error = await broken.value.interpreter.interpret(input('laura'));
    expect(error).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
    expect(JSON.stringify(error)).not.toContain('secret');
    const unsafe = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test' }, { complete: async () => ({ key: 'approved' }) });
    if (!unsafe.ok) throw Error('mode');
    expect(await unsafe.value.draftGenerator.generate({ caseSnapshot: snapshot('laura'), proposal, agentProfile: demoBundle.agentProfile, policyDecision: policy })).toMatchObject({ ok: true, value: { status: 'generated', aiMode: 'openai' } });
  });

  it('accepts valid, evidenced real-mode output and times out stalled calls', async () => {
    const candidate = { assertions: [{ assertionId: 'a', fieldId: 'available_savings', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, value: 0, rawValue: 'Ahorros no tenemos', source: 'customer_message', evidenceRefs: [{ messageId: 'rosa-m1' }], observedAt: '2026-05-01T10:01:00Z', precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: '1.0.0' }], blockers: [], warnings: [] };
    const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test' }, { complete: async (_instructions, _input, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : candidate });
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

describe('safe transport diagnostics', () => {
  it('classifies SDK failures without exposing provider messages or arbitrary identifiers', async () => {
    const OpenAI = (await import('openai')).default;
    const { classifyModelError } = await import('../../../src/adapters/ai/openai');
    const headers = new Headers({ 'x-request-id': 'req_safe123' });
    for (const [status, category] of [[401, 'authentication'], [403, 'authentication'], [429, 'rate_limit'], [400, 'request_schema'], [422, 'request_schema'], [503, 'provider']] as const) {
      const diagnostic = classifyModelError(new OpenAI.APIError(status, { code: 'safe_code', message: 'secret payload' }, 'secret payload', headers));
      expect(diagnostic).toMatchObject({ category, status, requestId: 'req_safe123' });
      expect(JSON.stringify(diagnostic)).not.toContain('secret');
    }
    expect(classifyModelError(new OpenAI.APIConnectionError({ cause: Object.assign(new Error('secret'), { code: 'ENOTFOUND' }) }))).toMatchObject({ category: 'network' });
    expect(classifyModelError(new OpenAI.APIConnectionTimeoutError({}))).toMatchObject({ category: 'timeout' });
    expect(classifyModelError(new SyntaxError('secret'))).toMatchObject({ category: 'parse_schema' });
  });
  it('requests cancellation when a model call exceeds its deadline', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    let signal: AbortSignal | undefined;
    const result = await new OpenAIInterpreter({ complete: async (_a, _b, _c, received) => { signal = received; return new Promise(() => {}); } }, 5).interpret(input('laura'));
    expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
    expect(signal?.aborted).toBe(true);
  });
});

describe('deterministic draft selection', () => {
  it('selects the sole allowed template without an inference request', async () => {
    let calls = 0;
    const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test' }, { complete: async () => { calls++; throw Error('unexpected'); } });
    if (!a.ok) throw Error('mode');
    expect(await a.value.draftGenerator.generate({ caseSnapshot: snapshot('laura'), proposal, agentProfile: demoBundle.agentProfile, policyDecision: policy })).toMatchObject({ ok: true, value: { text: expect.stringContaining('cuota'), aiMode: 'openai', status: 'generated' } });
    expect(calls).toBe(0);
  });
});

describe('independent blocker verification', () => {
  it('detects protected signals omitted by extraction', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extractor = { assertions: [], blockers: [], warnings: [] };
    const verifier = { findings: [{ type: 'URGENT', messageId: 'rosa-m1', quote: 'dos semanas' }, { type: 'BINDING_CLAIM', messageId: 'rosa-m3', quote: 'por escrito' }], dismissals: [], inconclusive: false };
    const result = await new OpenAIInterpreter({ complete: async (_i, _input, kind) => kind === 'verification' ? verifier : extractor }).interpret(input('rosa'));
    expect(result).toMatchObject({ ok: true, value: { blockers: expect.arrayContaining([expect.objectContaining({ type: 'URGENT' }), expect.objectContaining({ type: 'BINDING_CLAIM' })]) } });
  });
  it('holds analysis when a candidate and independent assessment disagree', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extractor = { assertions: [], blockers: [{ type: 'TRUST', description: 'confianza', messageId: 'laura-m4' }], warnings: [] };
    const result = await new OpenAIInterpreter({ complete: async (_i, _input, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : extractor }).interpret(input('laura'));
    expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID' } });
  });
});

describe('interpretation context', () => {
  it('supplies bounded prior facts as context with their evidence, not advisor instructions', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const data = input('laura');
    data.caseSnapshot.knowledge.facts = [{ fieldId: 'declared_monthly_income', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, status: 'approximate', value: 3800, evidenceRefs: [{ messageId: 'laura-m3' }] }];
    let projected: unknown;
    await new OpenAIInterpreter({ complete: async (_instructions, supplied, kind) => { if (kind === 'interpretation') { projected = supplied; return { assertions: [], blockers: [], warnings: [] }; } return { findings: [], dismissals: [], inconclusive: false }; } }).interpret(data);
    expect(projected).toMatchObject({ context: { facts: [expect.objectContaining({ fieldId: 'declared_monthly_income', evidenceRefs: [{ messageId: 'laura-m3' }] })] } });
  });
});

describe('incremental financial correction', () => {
  it('uses an evidenced earlier assertion when a basis-only correction arrives alone', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const data = input('laura');
    data.messages = [...data.messages, ...scenarios.find(s => s.id === 'laura-gross-correction')!.additions];
    data.caseSnapshot.assertions = [{ assertionId: 'old', fieldId: 'declared_monthly_income', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, value: 3800, unit: 'EUR', period: 'month', incomeBasis: 'net', rawValue: 'Unos 3.800 € netos', source: 'customer_message', evidenceRefs: [{ messageId: 'laura-m3' }], observedAt: '2026-05-01T10:03:00Z', precision: 'approximate', reviewStatus: 'unreviewed', schemaVersion: '1.0.0' }];
    const correction = { fieldId: 'declared_monthly_income', scope: 'buying_unit', subjectId: 'buying_unit', value: 3800, unit: 'EUR', period: 'month', incomeBasis: 'gross', messageId: data.messages.at(-1)!.messageId, precision: 'explicit' };
    const result = normalizeModelInterpretation({ assertions: [correction], blockers: [], warnings: [] }, data);
    expect(result).toMatchObject({ ok: true, value: { assertions: [{ precision: 'ambiguous', incomeBasis: 'gross', evidenceRefs: [{ messageId: correction.messageId }] }] } });
    if (result.ok) expect(result.value.assertions[0].value).toBeUndefined();
  });
});

describe('safety verification failure handling', () => {
  it('fails closed on unavailable verifier and unrelated evidence', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extractor = { assertions: [], blockers: [], warnings: [] };
    const unavailable = new OpenAIInterpreter({ complete: async (_i, _v, kind) => { if (kind === 'verification') throw Error('unavailable'); return extractor; } });
    expect(await unavailable.interpret(input('rosa'))).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
    const badEvidence = new OpenAIInterpreter({ complete: async (_i, _v, kind) => kind === 'verification' ? { findings: [{ type: 'URGENT', messageId: 'rosa-m1', quote: 'inventado' }], dismissals: [], inconclusive: false } : extractor });
    expect(await badEvidence.interpret(input('rosa'))).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
});

describe('incremental basis correction wording', () => {
  it('preserves an earlier evidenced income when the customer corrects its basis without repeating the amount', async () => {
    const { normalizeModelInterpretation } = await import('../../../src/adapters/ai/openai');
    const data = input('laura');
    const message = { ...data.messages[2], messageId: 'basis-new', occurredAt: '2026-05-03T10:00:00Z', content: { type: 'text' as const, text: 'Perdona, los ingresos que os dije eran brutos.' } };
    data.messages = [...data.messages, message];
    const old = { fieldId: 'declared_monthly_income', scope: 'buying_unit', subjectId: 'buying_unit', value: 3800, unit: 'EUR', period: 'month', incomeBasis: 'net', messageId: 'laura-m3', precision: 'approximate' };
    const result = normalizeModelInterpretation({ assertions: [old, { ...old, incomeBasis: 'gross', messageId: message.messageId }], blockers: [], warnings: [] }, data);
    expect(result).toMatchObject({ ok: true, value: { assertions: [expect.anything(), expect.objectContaining({ precision: 'ambiguous', incomeBasis: 'gross', evidenceRefs: [expect.objectContaining({ messageId: 'basis-new' })] })] } });
    if (result.ok) expect(result.value.assertions[1].value).toBeUndefined();
  });
});

describe('unilateral noncritical safety findings', () => {
  it('ignores a verifier-only time objection', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const data = input('laura');
    const interpreter = new OpenAIInterpreter({ complete: async (_instructions, _data, kind) => kind === 'verification' ? { findings: [{ type: 'TIME', messageId: 'laura-m1', quote: 'antes del verano' }], dismissals: [], inconclusive: false } : { assertions: [], blockers: [], warnings: [] } });
    expect(await interpreter.interpret(data)).toMatchObject({ ok: true, value: { blockers: [] } });
  });
  it('retains independently discovered urgent and opt-out signals', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const data = input('rosa');
    const interpreter = new OpenAIInterpreter({ complete: async (_instructions, _data, kind) => kind === 'verification' ? { findings: [{ type: 'URGENT', messageId: 'rosa-m1', quote: 'necesitamos salir del piso en dos semanas' }], dismissals: [], inconclusive: false } : { assertions: [], blockers: [], warnings: [] } });
    expect(await interpreter.interpret(data)).toMatchObject({ ok: true, value: { blockers: [expect.objectContaining({ type: 'URGENT' })] } });
  });
});

describe('paired blocker decisions from deterministic transport', () => {
  it.each(['TRUST', 'COST', 'URGENT', 'BINDING_CLAIM', 'OPT_OUT'] as const)('retains an agreed %s finding with customer evidence', async type => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const message = input('laura').messages[0];
    if (message.content.type !== 'text') throw Error('text required');
    const extraction = { assertions: [], blockers: [{ type, description: 'safety concern', messageId: message.messageId }], warnings: [] };
    const verification = { findings: [{ type, messageId: message.messageId, quote: message.content.text }], dismissals: [], inconclusive: false };
    const interpreter = new OpenAIInterpreter({ complete: async (_i, _data, kind) => kind === 'verification' ? verification : extraction });
    expect(await interpreter.interpret(input('laura'))).toMatchObject({ ok: true, value: { blockers: [expect.objectContaining({ type, status: 'open' })] } });
  });
  it.each(['TRUST', 'URGENT', 'BINDING_CLAIM', 'OPT_OUT'] as const)('holds when extraction and verification disagree about %s', async type => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const interpreter = new OpenAIInterpreter({ complete: async (_i, _data, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : { assertions: [], blockers: [{ type, description: 'safety concern', messageId: 'laura-m1' }], warnings: [] } });
    expect(await interpreter.interpret(input('laura'))).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID', retryable: true } });
  });
});


describe('severity-aware reconciliation', () => {
  it.each([
    ['javier', 'OPT_OUT', 'COST'],
    ['rosa', 'URGENT', 'FIT'],
  ] as const)('preserves %s protected action despite an extra commercial label', async (caseId, protectedType, extraType) => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const { evaluatePolicy } = await import('../../../src/domain/policies/evaluate-policy');
    const data = input(caseId);
    const message = data.messages.find(m => m.role === 'customer' && m.content.type === 'text')!;
    if (message.content.type !== 'text') throw Error('text required');
    const extraction = { assertions: [], blockers: [{ type: protectedType, description: 'protected', messageId: message.messageId }], warnings: [] };
    const findings = [protectedType, extraType].map(type => ({ type, messageId: message.messageId, quote: message.content.type === 'text' ? message.content.text : '' }));
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings, dismissals: [], inconclusive: false } : extraction }).interpret(data);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.blockers.map(b => b.type)).toEqual([protectedType]);
    expect(evaluatePolicy({ knowledge: { facts: [] }, events: [], blockers: result.value.blockers, policy: demoBundle.businessPolicy, actionCatalog: demoBundle.actionCatalog }).allowedActions).toEqual([protectedType === 'OPT_OUT' ? 'STOP_CONTACT' : 'HANDOFF']);
  });
  it('holds an unconfirmed commercial candidate without persisting it', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [], blockers: [{ type: 'COST', description: 'price', messageId: 'laura-m1' }], warnings: [] };
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : extraction }).interpret(input('laura'));
    expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID', retryable: true } });
  });
});


it('accepts an evidence-backed review that a price enquiry is not an objection', async () => {
  const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
  const data = input('laura');
  const message = { ...data.messages[0], messageId: 'price-question', content: { type: 'text' as const, text: '¿Cuánto cuesta?' } };
  data.messages = [message];
  const extraction = { assertions: [], blockers: [{ type: 'COST', description: 'coste', messageId: message.messageId }], warnings: [] };
  const review = { findings: [], dismissals: [{ type: 'COST', messageId: message.messageId, quote: '¿Cuánto cuesta?', reason: 'Pide información sin expresar objeción.' }], inconclusive: false };
  const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? review : extraction }).interpret(data);
  expect(result).toMatchObject({ ok: true, value: { blockers: [] } });
});

describe('U0 grounding regressions', () => {
  const sample = (text: string) => {
    const data = input('laura');
    data.messages = [{ ...data.messages[0], messageId: 'u0', content: { type: 'text' as const, text } }];
    return data;
  };
  it('anchors a minor reviewer quotation error to the original agreed trust message', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const text = 'Antes de daros los datos bancarios, ¿cómo sé que esta empresa es fiable y no una estafa?';
    const extraction = { assertions: [], blockers: [{ type: 'TRUST', description: 'fiabilidad', messageId: 'u0' }], warnings: [] };
    const review = { findings: [{ type: 'TRUST', messageId: 'u0', quote: 'Antes de daros los datos bancarios, ¿cómo sé que esta empresa es fiable y no es una estafa?' }], dismissals: [], inconclusive: false };
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? review : extraction }).interpret(sample(text));
    expect(result).toMatchObject({ ok: true, value: { blockers: [{ type: 'TRUST', evidenceRefs: [{ messageId: 'u0', quote: text }] }] } });
  });
  it.each([
    ['TRUST', 'En los cálculos de vivienda, ¿restáis la cuota mensual de financiación de nuestro coche de 180 euros? Es lo que me genera dudas.'],
    ['BINDING_CLAIM', 'Querría leer las condiciones generales del servicio, sin que eso implique solicitar aprobación.'],
  ])('accepts an explicitly reviewed unsupported %s candidate', async (type, text) => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [], blockers: [{ type, description: 'candidate', messageId: 'u0' }], warnings: [] };
    const review = { findings: [], dismissals: [{ type, messageId: 'u0', quote: text, reason: 'El contexto es informativo y no expresa esa preocupación.' }], inconclusive: false };
    expect(await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? review : extraction }).interpret(sample(text))).toMatchObject({ ok: true, value: { blockers: [] } });
  });
  it('does not promote a reference city to a desired location without reviewer confirmation', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [{ fieldId: 'desired_locations', scope: 'case', subjectId: 'case', value: ['Madrid'], unit: null, period: null, incomeBasis: null, messageId: 'u0', precision: 'explicit' }], blockers: [], warnings: [] };
    const review = { findings: [], dismissals: [], inconclusive: false };
    expect(await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? review : extraction }).interpret(sample('Mi ciudad de referencia es Madrid.'))).toMatchObject({ ok: true, value: { assertions: [] } });
  });
});

describe('U0 review boundaries', () => {
  const sample = (texts: string[]) => {
    const data = input('laura');
    data.messages = texts.map((text, index) => ({ ...data.messages[0], messageId: `u${index}`, content: { type: 'text' as const, text } }));
    return data;
  };
  it.each(['Mi ciudad de referencia es Madrid.', 'Actualmente vivo en Madrid.'])('rejects unconfirmed location: %s', async text => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [{ fieldId: 'desired_locations', scope: 'case', subjectId: 'case', value: ['Madrid'], unit: null, period: null, incomeBasis: null, messageId: 'u0', precision: 'explicit' }], blockers: [], warnings: [] };
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : extraction }).interpret(sample([text]));
    expect(result).toMatchObject({ ok: true, value: { assertions: [] } });
  });
  it.each(['Estamos buscando vivienda en Madrid', 'Queremos comprar en Madrid o alrededores'])('keeps a confirmed search location: %s', async text => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [{ fieldId: 'desired_locations', scope: 'case', subjectId: 'case', value: ['Madrid'], unit: null, period: null, incomeBasis: null, messageId: 'u0', precision: 'explicit' }], blockers: [], warnings: [] };
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings: [{ type: 'DESIRED_LOCATION', messageId: 'u0', quote: text }], dismissals: [], inconclusive: false } : extraction }).interpret(sample([text]));
    expect(result).toMatchObject({ ok: true, value: { assertions: [expect.objectContaining({ fieldId: 'desired_locations', value: ['Madrid'] })] } });
  });
  it('preserves the complete shared monthly debt extracted from a financial question', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const text = '¿Restáis la cuota mensual de financiación de nuestro coche de 180 euros?';
    const extraction = { assertions: [{ fieldId: 'monthly_debt', scope: 'buying_unit', subjectId: 'buying_unit', value: 180, unit: 'EUR', period: 'month', incomeBasis: null, messageId: 'u0', precision: 'explicit' }], blockers: [], warnings: [] };
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : extraction }).interpret(sample([text]));
    expect(result).toMatchObject({ ok: true, value: { assertions: [expect.objectContaining({ fieldId: 'monthly_debt', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, value: 180, unit: 'EUR', period: 'month' })] } });
  });
  it('retains a genuine finding elsewhere when dismissing a negated candidate', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const texts = ['No solicito aprobación al pedir las condiciones.', 'Necesito que me garanticéis la aprobación por escrito.'];
    const extraction = { assertions: [], blockers: [{ type: 'BINDING_CLAIM', description: 'candidate', messageId: 'u0' }], warnings: [] };
    const review = { findings: [{ type: 'BINDING_CLAIM', messageId: 'u1', quote: texts[1] }], dismissals: [{ type: 'BINDING_CLAIM', messageId: 'u0', quote: texts[0], reason: 'Niega que solicite aprobación.' }], inconclusive: false };
    expect(await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? review : extraction }).interpret(sample(texts))).toMatchObject({ ok: true, value: { blockers: [expect.objectContaining({ type: 'BINDING_CLAIM', evidenceRefs: [expect.objectContaining({ messageId: 'u1' })] })] } });
  });
  it('does not allow an unrelated dismissal to resolve a protected candidate', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const text = 'Me preocupa si esta empresa es fiable.';
    const extraction = { assertions: [], blockers: [{ type: 'TRUST', description: 'candidate', messageId: 'u0' }], warnings: [] };
    const review = { findings: [], dismissals: [{ type: 'COST', messageId: 'u0', quote: text, reason: 'No es una objeción de coste.' }], inconclusive: false };
    expect(await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? review : extraction }).interpret(sample([text]))).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID' } });
  });
  it('rejects an invented quote even when the same candidate was proposed', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [], blockers: [{ type: 'TRUST', description: 'candidate', messageId: 'u0' }], warnings: [] };
    const review = { findings: [{ type: 'TRUST', messageId: 'u0', quote: 'La empresa me parece una estafa inventada' }], dismissals: [], inconclusive: false };
    expect(await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? review : extraction }).interpret(sample(['Me preocupa si esta empresa es fiable.']))).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
});

describe('protected candidate dismissal reconciliation', () => {
  const text = 'Querría leer las condiciones generales del servicio, sin que eso implique solicitar aprobación.';
  const id = 'F01D1-documentation_request-P2-V2-m1';
  const dataFor = (texts = [text]) => {
    const data = input('laura');
    data.messages = texts.map((value, index) => ({ ...data.messages[0], messageId: index ? `other-${index}` : id, content: { type: 'text' as const, text: value } }));
    return data;
  };
  const extraction = { assertions: [], blockers: [{ type: 'BINDING_CLAIM', description: 'approval', messageId: id }], warnings: [] };
  const dismissal = { type: 'BINDING_CLAIM', messageId: id, quote: text, reason: 'This is a request to read general terms and conditions, explicitly stating it does not imply requesting approval.' };
  const review = (overrides: Record<string, unknown> = {}) => ({ findings: [], dismissals: [dismissal], inconclusive: false, ...overrides });
  const interpret = async (verdict: unknown, data = dataFor()) => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    return new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? verdict : extraction }).interpret(data);
  };
  const action = async (blockers: CaseSnapshot['blockers']) => {
    const { evaluatePolicy } = await import('../../../src/domain/policies/evaluate-policy');
    const { planAction } = await import('../../../src/domain/actions/plan-action');
    const decision = evaluatePolicy({ knowledge: { facts: [] }, events: [], blockers, policy: demoBundle.businessPolicy, actionCatalog: demoBundle.actionCatalog });
    return planAction({ decision, catalog: demoBundle.actionCatalog, profile: demoBundle.agentProfile, proposalId: 'test', caseRevision: 0, configBundleRef });
  };
  it('accepts the reported documentation dismissal and allows clarification', async () => {
    const result = await interpret(review(), dataFor([`${text} Mi ciudad de referencia es Madrid.`]));
    expect(result).toMatchObject({ ok: true, value: { blockers: [] } });
    if (result.ok) expect(await action(result.value.blockers)).toMatchObject({ ok: true, value: { actionType: 'CLARIFY' } });
  });
  it('preserves a confirmed written approval request and hands off', async () => {
    const request = 'Necesito aprobación por escrito.';
    const result = await interpret(review({ findings: [{ type: 'BINDING_CLAIM', messageId: id, quote: request }], dismissals: [] }), dataFor([request]));
    expect(result).toMatchObject({ ok: true, value: { blockers: [expect.objectContaining({ type: 'BINDING_CLAIM' })] } });
    if (result.ok) expect(await action(result.value.blockers)).toMatchObject({ ok: true, value: { actionType: 'HANDOFF' } });
  });
  it('preserves a confirmed finding even when the reviewer also dismisses it', async () => {
    const result = await interpret(review({ findings: [{ type: 'BINDING_CLAIM', messageId: id, quote: text }] }));
    expect(result).toMatchObject({ ok: true, value: { blockers: [expect.objectContaining({ type: 'BINDING_CLAIM' })] } });
    if (result.ok) expect(await action(result.value.blockers)).toMatchObject({ ok: true, value: { actionType: 'HANDOFF' } });
  });
  it('preserves a genuine finding in another sentence of the same message', async () => {
    const genuine = 'Necesito aprobación por escrito.';
    const result = await interpret(review({ findings: [{ type: 'BINDING_CLAIM', messageId: id, quote: genuine }] }), dataFor([`${text} ${genuine}`]));
    expect(result).toMatchObject({ ok: true, value: { blockers: [expect.objectContaining({ type: 'BINDING_CLAIM' })] } });
    if (result.ok) expect(await action(result.value.blockers)).toMatchObject({ ok: true, value: { actionType: 'HANDOFF' } });
  });
  it('preserves a genuine protected finding in another message', async () => {
    const genuine = 'Necesito aprobación por escrito.';
    const result = await interpret(review({ findings: [{ type: 'BINDING_CLAIM', messageId: 'other-1', quote: genuine }] }), dataFor([text, genuine]));
    expect(result).toMatchObject({ ok: true, value: { blockers: [expect.objectContaining({ type: 'BINDING_CLAIM', evidenceRefs: [expect.objectContaining({ messageId: 'other-1' })] })] } });
    if (result.ok) expect(await action(result.value.blockers)).toMatchObject({ ok: true, value: { actionType: 'HANDOFF' } });
  });
  it.each([
    ['wrong type', review({ dismissals: [{ ...dismissal, type: 'FIT' }] }), 'MODEL_OUTPUT_INVALID'],
    ['wrong message', review({ dismissals: [{ ...dismissal, messageId: 'other-1' }] }), 'MODEL_OUTPUT_INVALID'],
    ['invented quote', review({ dismissals: [{ ...dismissal, quote: 'inventado' }] }), 'EVIDENCE_INVALID'],
    ['partial sentence', review({ dismissals: [{ ...dismissal, quote: 'sin que eso implique solicitar aprobación.' }] }), 'MODEL_OUTPUT_INVALID'],
    ['missing dismissal', review({ dismissals: [] }), 'MODEL_OUTPUT_INVALID'],
    ['uncertain review', review({ inconclusive: true }), 'MODEL_OUTPUT_INVALID'],
    ['missing review', null, 'MODEL_OUTPUT_INVALID'],
  ])('fails safely for %s', async (_label, verdict, code) => {
    expect(await interpret(verdict, dataFor([text, text]))).toMatchObject({ ok: false, error: { code } });
  });
});

describe('U0 optional metadata normalization', () => {
  it.each([null, 'null', 'Null', 'NULL', 'nUlL', ' NULL '])('normalizes optional metadata %s before model output validation', async optional => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [{ fieldId: 'available_savings', scope: 'buying_unit', subjectId: 'buying_unit', value: 0, unit: optional, period: optional, incomeBasis: optional, messageId: 'rosa-m1', precision: 'explicit' }], blockers: [], warnings: [] };
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : extraction }).interpret(input('rosa'));
    expect(result).toMatchObject({ ok: true, value: { assertions: [expect.objectContaining({ value: 0 })] } });
  });
  it('normalizes direct contract output and preserves valid metadata and text', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const data = input('rosa');
    data.messages = [{ ...data.messages[0], messageId: 'null', content: { type: 'text', text: 'Ahorros null: 0 euros' } }];
    const assertion = { assertionId: 'a', fieldId: 'available_savings', subjectRef: { scope: 'buying_unit', id: 'buying_unit' }, value: 0, unit: 'EUR', period: ' NULL ', incomeBasis: 'unknown', rawValue: 'Ahorros null: 0 euros', source: 'customer_message', evidenceRefs: [{ messageId: 'null', quote: 'Ahorros null: 0 euros' }], observedAt: data.messages[0].occurredAt, precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: '1.0.0' };
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : { assertions: [assertion], blockers: [], warnings: [] } }).interpret(data);
    expect(result).toMatchObject({ ok: true, value: { assertions: [expect.objectContaining({ unit: 'EUR', incomeBasis: 'unknown', rawValue: assertion.rawValue, evidenceRefs: assertion.evidenceRefs })] } });
    if (result.ok) expect(result.value.assertions[0]).not.toHaveProperty('period');
  });
  it.each(['none', 'N/A', 'false', '0', 'null euros'])('rejects invalid metadata %s', async invalid => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const extraction = { assertions: [{ fieldId: 'available_savings', scope: 'buying_unit', subjectId: 'buying_unit', value: 0, unit: invalid, period: null, incomeBasis: null, messageId: 'rosa-m1', precision: 'explicit' }], blockers: [], warnings: [] };
    expect(await new OpenAIInterpreter({ complete: async () => extraction }).interpret(input('rosa'))).toMatchObject({ ok: false, error: { code: 'MODEL_OUTPUT_INVALID' } });
  });
  it('sends a nonurgent TIME candidate to the reviewer after normalizing metadata', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const data = input('laura');
    const text = 'El año que viene, aún no tenemos ninguna prisa.';
    data.messages = [{ ...data.messages[0], messageId: 'time', content: { type: 'text', text } }];
    const extraction = { assertions: [{ fieldId: 'desired_locations', scope: 'case', subjectId: 'case', value: ['Madrid'], unit: 'null', period: 'null', incomeBasis: 'null', messageId: 'time', precision: 'ambiguous' }], blockers: [{ type: 'TIME', description: 'tiempo', messageId: 'time' }], warnings: [] };
    let reviewed = false;
    const result = await new OpenAIInterpreter({ complete: async (_i, d, kind) => { if (kind !== 'verification') return extraction; reviewed = true; expect(d).toMatchObject({ proposedBlockers: [expect.objectContaining({ type: 'TIME' })] }); return { findings: [], dismissals: [{ type: 'TIME', messageId: 'time', quote: text, reason: 'No hay prisa.' }], inconclusive: false }; } }).interpret(data);
    expect(reviewed).toBe(true);
    expect(result).toMatchObject({ ok: true, value: { blockers: [] } });
    if (result.ok) {
      const { evaluatePolicy } = await import('../../../src/domain/policies/evaluate-policy');
      expect(evaluatePolicy({ knowledge: { facts: [] }, events: [], blockers: result.value.blockers, policy: demoBundle.businessPolicy, actionCatalog: demoBundle.actionCatalog }).allowedActions).toContain('CLARIFY');
    }
  });
});

describe('U0 financial attribution instructions and preservation', () => {
  it('instructs the model to attribute amounts to their owners and preserve ambiguity', async () => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    let instructions = '';
    await new OpenAIInterpreter({ complete: async (text, _d, kind) => { if (kind === 'verification') return { findings: [], dismissals: [], inconclusive: false }; instructions = text; return { assertions: [], blockers: [], warnings: [] }; } }).interpret(input('javier'));
    expect(instructions).toContain('not the number of buyers');
    expect(instructions).toContain('Never sum individual incomes, split joint income');
    expect(instructions).toContain('When ownership is unclear');
    expect(instructions).toContain('JSON literal null, without quotation marks');
  });
  it.each([
    ['Soy autónomo, gano entre 2.000 y 3.000', [{ scope: 'participant', subjectId: 'participant-1', value: { min: 2000, max: 3000 } }]],
    ['Entre los dos ingresamos 3.800', [{ scope: 'buying_unit', subjectId: 'buying_unit', value: 3800 }]],
    ['Entre mi marido y yo, 1.400', [{ scope: 'buying_unit', subjectId: 'buying_unit', value: 1400 }]],
    ['Yo gano 2.400 y mi pareja 1.800', [{ scope: 'participant', subjectId: 'participant-1', value: 2400 }, { scope: 'participant', subjectId: 'participant-2', value: 1800 }]],
    ['Tenemos unos ingresos de 3.000', []],
  ])('preserves model attribution without inventing aggregates: %s', async (text, claims) => {
    const { OpenAIInterpreter } = await import('../../../src/adapters/ai/openai');
    const data = input('javier');
    data.messages = [{ ...data.messages[0], messageId: 'income', content: { type: 'text', text } }];
    const assertions = claims.map(claim => ({ ...claim, fieldId: 'declared_monthly_income', unit: 'EUR', period: 'month', incomeBasis: 'unknown', messageId: 'income', precision: 'explicit' }));
    const result = await new OpenAIInterpreter({ complete: async (_i, _d, kind) => kind === 'verification' ? { findings: [], dismissals: [], inconclusive: false } : { assertions, blockers: [], warnings: [] } }).interpret(data);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.assertions).toHaveLength(claims.length);
    for (const [index, claim] of claims.entries()) expect(result.value.assertions[index]).toMatchObject({ subjectRef: { scope: claim.scope, id: claim.subjectId }, value: claim.value, unit: 'EUR', period: 'month', incomeBasis: 'unknown', evidenceRefs: [{ messageId: 'income' }] });
  });
});
