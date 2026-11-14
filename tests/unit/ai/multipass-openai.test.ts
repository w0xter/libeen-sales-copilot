import { describe, expect, it, vi } from 'vitest';
import { zodTextFormat } from 'openai/helpers/zod';
import { wireSchema, normalizeWire } from '../../../src/adapters/ai/multipass/wire';
import { openAIMultipassTransport } from '../../../src/adapters/ai/multipass/openai-transport';
import { createAIAdapters } from '../../../src/adapters/ai';
import { cases } from '../../../src/fixtures';
import { configBundleRef, demoBundle } from '../../../src/config';
import type { CaseSnapshot } from '../../../src/contracts';
import type { Request } from '../../../src/adapters/ai/multipass/scheduler';

const roles = ['E1', 'E2', 'E3', 'S1', 'S2', 'J'] as const;
const ref = { messageId: 'm', quote: '0', start: 0, end: 1 };
const claim = { fieldId: 'available_savings', subjectRef: { scope: 'buying_unit', id: 'u' }, value: 0, unit: null, period: null, incomeBasis: 'unknown', precision: 'approximate', occurrence: { messageId: 'm', statementSpan: { start: 0, end: 1, text: '0' }, focusSpan: null, previousAssertionId: null }, evidenceRefs: [ref], correction: null };
const request = (role: Request['role'], input: unknown = {}): Request => ({ role, input, runId: 'r', attemptId: 'a', correlationId: 'a', instructionVersion: 'v', schemaVersion: 'v', configVersion: 'v', signal: new AbortController().signal });
const response = (value: unknown) => ({ status: 'completed', output: [], output_text: JSON.stringify(value) });
const snapshot = (name: string): CaseSnapshot => ({ caseId: name, revision: 0, messages: cases.find(c => c.caseId === name)!.messages, assertions: [], knowledge: { facts: [] }, goal: { id: 'g', description: 'Orientar', status: 'active' }, workflowProgress: { workflowId: 'wf', workflowVersion: '1', milestones: [] }, blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef, status: 'NEEDS_ADVISOR' });

describe('multipass wire', () => {
  it.each(roles)('generates strict required-property JSON Schema for %s', role => {
    const schema = zodTextFormat(wireSchema(role), 'test').schema;
    const walk = (v: unknown) => {
      if (!v || typeof v !== 'object') return;
      const o = v as Record<string, unknown>;
      if (o.type === 'object') { expect(o.additionalProperties).toBe(false); expect(o.required).toEqual(Object.keys(o.properties as object)); }
      Object.values(o).forEach(x => Array.isArray(x) ? x.forEach(walk) : walk(x));
    };
    walk(schema);
  });
  it('preserves zero, false, range and unknown while removing nullable metadata', () => {
    for (const value of [0, false, { min: 0, max: 2 }]) {
      const result = normalizeWire('E1', { claims: [{ ...claim, value }] }) as { claims: Record<string, unknown>[] };
      expect(result.claims[0]).toMatchObject({ value, incomeBasis: 'unknown' });
      expect(result.claims[0]).not.toHaveProperty('unit');
    }
    const absent = normalizeWire('E1', { claims: [{ ...claim, value: null, precision: 'ambiguous' }] }) as { claims: Record<string, unknown>[] };
    expect(absent.claims[0]).not.toHaveProperty('value');
    expect(() => normalizeWire('E1', { claims: [{ ...claim, value: 0, unit: undefined }] })).toThrow();
  });
});

describe('SDK transport integration without network', () => {
  it('sends role-specific prompts, schema and abort signals', async () => {
    const calls: { instructions: string; text: { format: { name: string } }; input: string }[] = [];
    const client = { responses: { create: async (body: never, options: { signal: AbortSignal }) => { calls.push(body); expect(options.signal).toBeInstanceOf(AbortSignal); return response({ claims: [] }); } } };
    const transport = openAIMultipassTransport('test', 'model', client);
    await transport.execute(request('E1'));
    expect(calls[0].instructions).toContain('Extractor E1');
    expect(calls[0].text.format.name).toBe('multipass_e1');
  });
  it('fails safely on refusal and incomplete responses', async () => {
    for (const bad of [{ status: 'incomplete', output: [], output_text: '' }, { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }], output_text: '' }]) {
      const transport = openAIMultipassTransport('test', 'model', { responses: { create: async () => bad } });
      await expect(transport.execute(request('E1'))).rejects.toThrow();
    }
  });
  it.each(['laura', 'javier', 'rosa'])('passes %s through factory, SDK transport and pipeline without HTTP', async name => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const calls: string[] = [];
    const client = { responses: { create: async (body: never) => {
      const format = (body as { text: { format: { name: string } } }).text.format.name; calls.push(format);
      return response(format === 'multipass_s1' ? { status: 'complete', candidates: [] } : format === 'multipass_s2' ? { status: 'complete', reviews: [], candidates: [], verdicts: [] } : { claims: [] });
    } } };
    try {
      const transport = openAIMultipassTransport('test', 'model', client);
      const adapters = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', AI_INTERPRETER_STRATEGY: 'multipass' }, { complete: async () => { throw Error('single not used'); } }, transport);
      expect(adapters.ok).toBe(true); if (!adapters.ok) return;
      const caseSnapshot = snapshot(name);
      const result = await adapters.value.interpreter.interpret({ caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
      expect(result.ok).toBe(true);
      expect(calls.sort()).toEqual(['multipass_e1', 'multipass_e2', 'multipass_e3', 'multipass_s1', 'multipass_s2'].sort());
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});

it('regenerates with the original role schema and no invalid payload', async () => {
  let captured: { instructions: string; text: { format: { name: string } }; input: string } | undefined;
  const client = { responses: { create: async (body: never) => { captured = body; return response({ claims: [] }); } } };
  await openAIMultipassTransport('test', 'model', client).execute(request('Repair', { targetRole: 'E2', originalInput: { snapshot: { caseId: 'x' } }, snapshot: {} }));
  expect(captured?.instructions).toContain('Regenerate');
  expect(captured?.instructions).toContain('Extractor E2');
  expect(captured?.text.format.name).toBe('multipass_e2');
  expect(captured?.input).toBe(JSON.stringify({ snapshot: { caseId: 'x' } }));
});

it('does not present reviewer votes or extractor identity to adjudication', async () => {
  let payload = '';
  const client = { responses: { create: async (body: never) => { payload = (body as { input: string }).input; return response({ disputeId: 'd', resolution: { status: 'unresolved', candidateId: null, justification: 'uncertain', evidenceRefs: null } }); } } };
  const input = { snapshot: {}, dispute: { disputeId: 'd', candidateIds: ['a', 'b'] }, group: { candidates: [{ candidateId: 'a', extractorId: 'E1', value: 1 }, { candidateId: 'b', extractorId: 'E2', value: 1 }] }, reviews: [{ support: 'supported' }] };
  await openAIMultipassTransport('test', 'model', client).execute(request('J', input));
  expect(payload).not.toContain('extractorId'); expect(payload).not.toContain('reviews');
  expect(JSON.parse(payload).alternatives).toHaveLength(1);
});

it('does not accept a newly invented participant in an initial case', async () => {
  const caseSnapshot = snapshot('javier');
  const message = caseSnapshot.messages.find(m => m.messageId === 'javier-m3')!;
  if (message.content.type !== 'text') throw Error('expected text');
  const text = message.content.text; const focus = 'autonomo'; const start = text.indexOf(focus);
  const assertion = { ...claim, fieldId: 'employment_context', subjectRef: { scope: 'participant', id: 'invented' }, value: 'autónomo', incomeBasis: null, precision: 'explicit', occurrence: { messageId: message.messageId, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + focus.length, text: focus }, previousAssertionId: null }, evidenceRefs: [{ messageId: message.messageId, quote: text, start: 0, end: text.length }] };
  const client = { responses: { create: async (body: never) => {
    const b = body as { text: { format: { name: string } }; input: string };
    const role = b.text.format.name;
    if (role === 'multipass_s1') return response({ status: 'complete', candidates: [] });
    if (role === 'multipass_s2') {
      const data = JSON.parse(b.input) as { groups: { groupId: string; candidates: { candidateId: string }[] }[] };
      return response({ status: 'complete', candidates: [], verdicts: [], reviews: data.groups.flatMap(g => g.candidates.map(c => ({ groupId: g.groupId, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', identitySpan: { start, end: start + focus.length, text: focus }, evidenceRefs: assertion.evidenceRefs, justification: 'supported' }))) });
    }
    return response({ claims: [assertion] });
  } } };
  const adapters = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', AI_INTERPRETER_STRATEGY: 'multipass' }, { complete: async () => null }, openAIMultipassTransport('test', 'model', client));
  if (!adapters.ok) throw Error('factory');
  expect(await adapters.value.interpreter.interpret({ caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile })).toMatchObject({ ok: false });
});

it('does not turn a failed protected review into public success', async () => {
  const client = { responses: { create: async (body: never) => {
    const name = (body as { text: { format: { name: string } } }).text.format.name;
    if (name === 'multipass_s2') throw Error('provider secret');
    return response(name === 'multipass_s1' ? { status: 'complete', candidates: [] } : { claims: [] });
  } } };
  const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', AI_INTERPRETER_STRATEGY: 'multipass' }, { complete: async () => null }, openAIMultipassTransport('test', 'model', client));
  if (!a.ok) throw Error('factory');
  const caseSnapshot = snapshot('rosa');
  const result = await a.value.interpreter.interpret({ caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
  expect(result).toMatchObject({ ok: false, error: { code: 'MODEL_UNAVAILABLE' } });
  expect(JSON.stringify(result)).not.toContain('provider secret');
});

type FullSpec = { fieldId: string; messageId: string; focus: string; value: unknown; scope: 'case' | 'buying_unit' | 'participant'; unit?: string; period?: string; incomeBasis?: string; precision?: string };
const fullSpecs: Record<string, FullSpec[]> = {
  laura: [
    { fieldId: 'desired_locations', messageId: 'laura-m1', focus: 'Valencia', value: ['Valencia'], scope: 'case' },
    { fieldId: 'declared_monthly_income', messageId: 'laura-m3', focus: '3.800 €', value: 3800, scope: 'buying_unit', unit: 'EUR', period: 'month', incomeBasis: 'net', precision: 'approximate' },
    { fieldId: 'available_savings', messageId: 'laura-m3', focus: '18.000', value: 18000, scope: 'buying_unit', unit: 'EUR', precision: 'approximate' },
    { fieldId: 'monthly_debt', messageId: 'laura-m4', focus: '250 €', value: 250, scope: 'buying_unit', unit: 'EUR', period: 'month' },
  ],
  javier: [
    { fieldId: 'buyer_count', messageId: 'javier-m3', focus: 'solo', value: 1, scope: 'buying_unit' },
    { fieldId: 'employment_context', messageId: 'javier-m3', focus: 'autonomo', value: 'autónomo', scope: 'participant' },
    { fieldId: 'declared_monthly_income', messageId: 'javier-m3', focus: 'entre 2000 y 3000', value: { min: 2000, max: 3000 }, scope: 'participant', unit: 'EUR', incomeBasis: 'unknown', precision: 'approximate' },
  ],
  rosa: [
    { fieldId: 'declared_monthly_income', messageId: 'rosa-m1', focus: '1.400 €', value: 1400, scope: 'buying_unit', unit: 'EUR', incomeBasis: 'unknown' },
    { fieldId: 'available_savings', messageId: 'rosa-m1', focus: 'Ahorros no tenemos', value: 0, scope: 'buying_unit', unit: 'EUR' },
    { fieldId: 'moving_horizon', messageId: 'rosa-m1', focus: 'dos semanas', value: 'dos semanas', scope: 'case' },
  ],
};
function fullClient(name: string) {
  const caseSnapshot = snapshot(name); const calls: string[] = [];
  const wireRef = (messageId: string, quote: string) => ({ messageId, quote, start: null, end: null });
  const signals = name === 'javier' ? [{ signalId: 'trust', category: 'TRUST', evidenceRefs: [wireRef('javier-m5', 'y esto es fiable? no sera una estafa no')] }] : name === 'rosa' ? [
    { signalId: 'urgent', category: 'URGENT', evidenceRefs: [wireRef('rosa-m1', 'necesitamos salir del piso en dos semanas')] },
    { signalId: 'binding', category: 'BINDING_CLAIM', evidenceRefs: [wireRef('rosa-m3', 'Mi hijo dice que os pida por escrito que estamos aprobados antes de seguir.')] },
    { signalId: 'opt', category: 'OPT_OUT', evidenceRefs: [wireRef('rosa-m2', 'Si no podéis vendernos, ¿nos alquiláis algo solo de alquiler?')] },
  ] : [];
  const client = { responses: { create: async (body: never) => {
    const b = body as { model: string; instructions: string; text: { format: { name: string } }; input: string }; const role = b.text.format.name; calls.push(role);
    const input = JSON.parse(b.input);
    if (role === 'multipass_s1') return response({ status: 'complete', candidates: signals });
    if (role === 'multipass_s2') return response({ status: 'complete', candidates: [], verdicts: signals.map(s => ({ signalId: s.signalId, status: s.signalId === 'opt' ? 'dismissed' : 'confirmed', justification: 'contexto simulado', evidenceRefs: s.evidenceRefs })), reviews: input.groups.flatMap((g: { groupId: string; candidates: { candidateId: string; occurrence: { focusSpan: unknown }; evidenceRefs: { messageId: string; quote: string }[] }[] }) => g.candidates.map(c => ({ groupId: g.groupId, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', identitySpan: c.occurrence.focusSpan, evidenceRefs: c.evidenceRefs.map(e => wireRef(e.messageId, e.quote)), justification: 'contexto simulado' }))) });
    if (role === 'multipass_j') return response({ disputeId: input.dispute.disputeId, resolution: { status: 'unresolved', candidateId: null, justification: 'incertidumbre', evidenceRefs: null } });
    const claims = fullSpecs[name].map(s => {
      const m = caseSnapshot.messages.find(m => m.messageId === s.messageId)!; if (m.content.type !== 'text') throw Error('expected text');
      const text = m.content.text; const start = text.indexOf(s.focus); if (start < 0) throw Error('missing focus');
      const id = s.scope === 'case' ? name : s.scope === 'buying_unit' ? `${name}:buying_unit` : `${name}:speaker:${s.messageId}`;
      return { fieldId: s.fieldId, subjectRef: { scope: s.scope, id }, value: s.value, unit: s.unit ?? null, period: s.period ?? null, incomeBasis: s.incomeBasis ?? null, precision: s.precision ?? 'explicit', occurrence: { messageId: s.messageId, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + s.focus.length, text: s.focus }, previousAssertionId: null }, evidenceRefs: [wireRef(s.messageId, text)], correction: null };
    });
    return response({ claims });
  } } };
  return { client, calls, caseSnapshot };
}
it.each(['laura', 'javier', 'rosa'])('consolidates full %s through the SDK without historical subjects', async name => {
  const { client, calls, caseSnapshot } = fullClient(name);
  const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', AI_INTERPRETER_STRATEGY: 'multipass' }, { complete: async () => null }, openAIMultipassTransport('test', 'model', client));
  if (!a.ok) throw Error('factory');
  const result = await a.value.interpreter.interpret({ caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.assertions).toHaveLength(fullSpecs[name].length);
  for (const spec of fullSpecs[name]) expect(result.value.assertions).toContainEqual(expect.objectContaining({ fieldId: spec.fieldId, value: spec.value }));
  expect(calls).toHaveLength(5);
  expect(result.value.blockers.map(b => b.type).sort()).toEqual(name === 'javier' ? ['TRUST'] : name === 'rosa' ? ['BINDING_CLAIM', 'URGENT'] : []);
});

it('uses six SDK calls when one malformed extraction is regenerated', async () => {
  const calls: string[] = [];
  const client = { responses: { create: async (body: never) => {
    const b = body as { instructions: string; text: { format: { name: string } } }; const role = b.text.format.name; calls.push(role);
    if (role === 'multipass_e1' && !b.instructions.includes('Regenerate')) return response({ claims: 'invalid' });
    if (role === 'multipass_s1') return response({ status: 'complete', candidates: [] });
    if (role === 'multipass_s2') return response({ status: 'complete', reviews: [], candidates: [], verdicts: [] });
    return response({ claims: [] });
  } } };
  const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', AI_INTERPRETER_STRATEGY: 'multipass' }, { complete: async () => null }, openAIMultipassTransport('test', 'model', client));
  if (!a.ok) throw Error('factory'); const caseSnapshot = snapshot('laura');
  const result = await a.value.interpreter.interpret({ caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
  expect(result.ok).toBe(true); expect(calls).toHaveLength(6); expect(calls.filter(c => c === 'multipass_e1')).toHaveLength(2);
});

it('does not choose an arbitrary regeneration after two invalid SDK responses', async () => {
  const calls: string[] = [];
  const client = { responses: { create: async (body: never) => {
    const role = (body as { text: { format: { name: string } } }).text.format.name; calls.push(role);
    return response(role === 'multipass_s1' ? { status: 'complete', candidates: [] } : { claims: role === 'multipass_e3' ? [] : 'invalid' });
  } } };
  const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', AI_INTERPRETER_STRATEGY: 'multipass' }, { complete: async () => null }, openAIMultipassTransport('test', 'model', client));
  if (!a.ok) throw Error('factory'); const caseSnapshot = snapshot('rosa');
  const result = await a.value.interpreter.interpret({ caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
  expect(result.ok).toBe(false); expect(calls).toHaveLength(4);
});

it.each(['S1', 'S2'] as const)('fails safely when SDK %s outputs remain invalid', async failing => {
  const calls: string[] = [];
  const client = { responses: { create: async (body: never) => {
    const role = (body as { text: { format: { name: string } } }).text.format.name; calls.push(role);
    if (role === `multipass_${failing.toLowerCase()}`) return response({ unexpected: true });
    if (role === 'multipass_s1') return response({ status: 'complete', candidates: [] });
    if (role === 'multipass_s2') return response({ status: 'complete', reviews: [], candidates: [], verdicts: [] });
    return response({ claims: [] });
  } } };
  const a = createAIAdapters({ AI_MODE: 'openai', OPENAI_API_KEY: 'test', AI_INTERPRETER_STRATEGY: 'multipass' }, { complete: async () => null }, openAIMultipassTransport('test', 'model', client));
  if (!a.ok) throw Error('factory'); const caseSnapshot = snapshot('rosa');
  const result = await a.value.interpreter.interpret({ caseSnapshot, messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile });
  expect(result.ok).toBe(false); expect(calls.length).toBeLessThanOrEqual(6);
});

it.each(['operation timeout', 'global timeout', 'cancellation'] as const)('aborts SDK requests on %s', async kind => {
  const { runPipeline } = await import('../../../src/adapters/ai/multipass/pipeline');
  const seen: AbortSignal[] = []; const controller = new AbortController();
  const client = { responses: { create: async (_body: never, options: { signal: AbortSignal }) => { seen.push(options.signal); return new Promise<ReturnType<typeof response>>(() => {}); } } };
  const caseSnapshot = snapshot('laura');
  const pending = runPipeline({ runId: 'abort-test', snapshot: { caseId: 'laura', messages: caseSnapshot.messages, factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile, knownSubjects: [], historicalAssertions: [], historicalBlockers: [], materialFieldIds: [] }, transport: openAIMultipassTransport('test', 'model', client), timeoutMs: kind === 'operation timeout' ? 10 : 1000, totalTimeoutMs: kind === 'global timeout' ? 10 : 1000, signal: controller.signal });
  if (kind === 'cancellation') { await new Promise(resolve => setTimeout(resolve, 0)); controller.abort(); }
  const { result, trace } = await pending;
  expect(result.status).toBe('failed'); expect(seen).toHaveLength(4); expect(seen.every(s => s.aborted)).toBe(true);
  expect(trace.operations.every(op => op.status === (kind === 'cancellation' ? 'cancelled' : 'timeout'))).toBe(true);
  expect(JSON.stringify(trace)).not.toContain('laura-m3');
});

it('rejects unexpected fields, malformed evidence and invalid adjudication variants', () => {
  expect(() => normalizeWire('E1', { claims: [{ ...claim, extra: 'invented' }] })).toThrow();
  expect(() => normalizeWire('E1', { claims: [{ ...claim, evidenceRefs: [{ ...ref, end: null }] }] })).toThrow();
  expect(() => normalizeWire('J', { disputeId: 'd', resolution: { status: 'selected', candidateId: null, justification: 'x', evidenceRefs: null } })).toThrow();
  expect(() => normalizeWire('J', { disputeId: 'd', resolution: { status: 'unresolved', candidateId: 'invented', justification: 'x', evidenceRefs: null } })).toThrow();
});
