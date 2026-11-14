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
