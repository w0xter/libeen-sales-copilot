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

});
