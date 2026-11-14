import { describe, expect, it } from 'vitest';
import { demoBundle } from '../../../src/config';
import { runPipeline } from '../../../src/adapters/ai/multipass/pipeline';

describe('fake multipass pipeline', () => {
  it('runs five passes and consolidates a complete empty review', async () => {
    const roles: string[] = [];
    const result = await runPipeline({ runId: 'run', snapshot: { caseId: 'case', messages: [], factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile, knownSubjects: [], historicalAssertions: [], historicalBlockers: [], materialFieldIds: [] }, transport: { execute: async request => { roles.push(request.role); if (request.role === 'S1') return { status: 'complete', candidates: [] }; if (request.role === 'S2') return { status: 'complete', reviews: [], verdicts: [] }; return { claims: [] }; } } });
    expect(result.result.status).toBe('consolidated');
    expect(roles).toEqual(['E1', 'E2', 'E3', 'S1', 'S2']);
    expect(result.trace.consumed).toBe(5);
  });
});

import { cases } from '../../../src/fixtures';
import type { FakeTransport, Request } from '../../../src/adapters/ai/multipass/scheduler';
import type { Snapshot } from '../../../src/adapters/ai/multipass/pipeline';

const base = (): Snapshot => ({ caseId: 'case', messages: [], factSchema: demoBundle.factSchema, agentProfile: demoBundle.agentProfile, knownSubjects: [{ scope: 'case', id: 'case' }, { scope: 'buying_unit', id: 'unit' }, { scope: 'participant', id: 'person' }], historicalAssertions: [], historicalBlockers: [], materialFieldIds: ['declared_monthly_income', 'available_savings', 'monthly_debt'] });
const empty = (role: Request['role']) => role === 'S1' ? { status: 'complete', candidates: [] } : role === 'S2' ? { status: 'complete', reviews: [], verdicts: [] } : { claims: [] };
const run = (transport: FakeTransport, snapshot = base(), extra: { signal?: AbortSignal; timeoutMs?: number; totalTimeoutMs?: number } = {}) => runPipeline({ runId: 'test', snapshot, transport, ...extra });

describe('pipeline boundaries', () => {
  it('starts initial passes concurrently, keeps S1 blind and waits before S2', async () => {
    const starts: string[] = []; const releases: (() => void)[] = [];
    const work = run({ execute: async request => { starts.push(request.role); if (request.role === 'S1') expect(request.input).not.toHaveProperty('candidates'); if (request.role !== 'S2') await new Promise<void>(resolve => releases.push(resolve)); return empty(request.role); } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(starts).toEqual(['E1', 'E2', 'E3', 'S1']);
    releases.forEach(release => release());
    const result = await work;
    expect(starts).toEqual(['E1', 'E2', 'E3', 'S1', 'S2']);
    expect(result.result.status).toBe('consolidated');
  });
  it('repairs one invalid response within the shared budget', async () => {
    const result = await run({ execute: async r => r.role === 'E1' ? null : r.role === 'Repair' ? { claims: [] } : empty(r.role) });
    expect(result.result.status).toBe('consolidated');
    expect(result.trace.consumed).toBe(6);
    expect(result.trace.attempts.Repair).toBe(1);
  });
  it.each(['S1', 'S2'] as const)('fails safely when %s is invalid and repair fails', async role => {
    const result = await run({ execute: async r => r.role === role || r.role === 'Repair' ? null : empty(r.role) });
    expect(result.result.status).toBe('failed');
    expect(result.trace.consumed).toBeLessThanOrEqual(7);
  });
  it('times out an unresponsive protected scan without treating it as clear', async () => {
    const result = await run({ execute: async r => r.role === 'S1' ? new Promise(() => {}) : empty(r.role) }, base(), { timeoutMs: 10 });
    expect(result.result.status).toBe('failed');
    expect(result.trace.operations.find(o => o.role === 'S1')?.status).toBe('timeout');
  });
  it('honors external cancellation and a global deadline', async () => {
    const controller = new AbortController();
    const pending = run({ execute: async () => new Promise(() => {}) }, base(), { signal: controller.signal });
    controller.abort();
    expect((await pending).result.status).toBe('failed');
    const timed = await run({ execute: async () => new Promise(() => {}) }, base(), { totalTimeoutMs: 10 });
    expect(timed.result.status).toBe('failed');
    expect(timed.trace.operations.every(o => o.status === 'timeout')).toBe(true);
  });
  it('isolates a frozen snapshot from later mutation', async () => {
    const snapshot = base(); let release!: () => void;
    const seen: string[] = [];
    const pending = run({ execute: async r => { const input = r.input as { snapshot: Snapshot }; if (r.role === 'E1') await new Promise<void>(resolve => { release = resolve; }); seen.push(input.snapshot.caseId); expect(Object.isFrozen(input.snapshot.factSchema)).toBe(true); return empty(r.role); } }, snapshot);
    await new Promise(resolve => setTimeout(resolve, 0)); snapshot.caseId = 'changed'; release();
    expect((await pending).result.status).toBe('consolidated');
    expect(seen).toEqual(['case', 'case', 'case', 'case', 'case']);
  });
  it.each([
    ['laura', 'laura-m3', '3.800 €', 'declared_monthly_income', 3800, 'buying_unit'],
    ['javier', 'javier-m3', 'entre 2000 y 3000', 'declared_monthly_income', { min: 2000, max: 3000 }, 'participant'],
    ['rosa', 'rosa-m1', 'Ahorros no tenemos', 'available_savings', 0, 'buying_unit'],
  ] as const)('integrates simulated responses over original %s messages', async (name, messageId, focus, fieldId, value, scope) => {
    const snapshot = base(); snapshot.messages = cases.find(c => c.caseId === name)!.messages;
    const message = snapshot.messages.find(m => m.messageId === messageId)!;
    if (message.content.type !== 'text') throw new Error('expected text');
    const text = message.content.text; const start = text.indexOf(focus);
    const claim = { fieldId, subjectRef: { scope, id: scope === 'participant' ? 'person' : 'unit' }, value, unit: 'EUR', precision: name === 'rosa' ? 'explicit' : 'approximate', occurrence: { messageId, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + focus.length, text: focus } }, evidenceRefs: [{ messageId, quote: text }] };
    const result = await run({ execute: async r => {
      if (r.role === 'S1') return empty(r.role);
      if (r.role === 'S2') {
        const input = r.input as { groups: { groupId: string; candidates: { candidateId: string; evidenceRefs: typeof claim.evidenceRefs; occurrence: typeof claim.occurrence }[] }[] };
        return { status: 'complete', verdicts: [], reviews: input.groups.flatMap(g => g.candidates.map(c => ({ groupId: g.groupId, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', justification: 'synthetic', evidenceRefs: c.evidenceRefs, identitySpan: c.occurrence.focusSpan }))) };
      }
      return { claims: [claim] };
    } }, snapshot);
    expect(result.result.status).toBe('consolidated');
    if (result.result.status === 'consolidated') { expect(result.result.interpretation.assertions).toHaveLength(1); expect(result.result.interpretation.assertions[0].value).toEqual(value); }
  });
});

it('does not consolidate when S2 omits a candidate review', async () => {
  const snapshot = base(); snapshot.messages = cases.find(c => c.caseId === 'rosa')!.messages;
  const m = snapshot.messages.find(m => m.messageId === 'rosa-m1')!; if (m.content.type !== 'text') throw new Error();
  const text = m.content.text; const focus = 'Ahorros no tenemos'; const start = text.indexOf(focus);
  const claim = { fieldId: 'available_savings', subjectRef: { scope: 'buying_unit', id: 'unit' }, value: 0, unit: 'EUR', precision: 'explicit', occurrence: { messageId: m.messageId, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + focus.length, text: focus } }, evidenceRefs: [{ messageId: m.messageId, quote: text }] };
  const result = await run({ execute: async r => r.role.startsWith('E') ? { claims: [claim] } : empty(r.role) }, snapshot);
  expect(result.result.status).not.toBe('consolidated');
});

it('preserves a protected signal first identified by S2', async () => {
  const snapshot = base(); snapshot.messages = cases.find(c => c.caseId === 'javier')!.messages;
  const evidenceRefs = [{ messageId: 'javier-m5', quote: 'y esto es fiable? no sera una estafa no' }];
  const result = await run({ execute: async r => r.role === 'S2' ? { status: 'complete', reviews: [], candidates: [{ signalId: 's2-trust', category: 'TRUST', evidenceRefs }], verdicts: [{ signalId: 's2-trust', status: 'confirmed', justification: 'synthetic', evidenceRefs }] } : empty(r.role) }, snapshot);
  expect(result.result.status).toBe('consolidated');
  if (result.result.status === 'consolidated') expect(result.result.interpretation.blockers.map(b => b.type)).toEqual(['TRUST']);
});

it('retains grouping diagnostics and refuses an invented adjudication within seven attempts', async () => {
  const snapshot = base(); snapshot.messages = cases.find(c => c.caseId === 'laura')!.messages;
  const m = snapshot.messages.find(m => m.messageId === 'laura-m3')!; if (m.content.type !== 'text') throw new Error();
  const text = m.content.text; const focus = '3.800 €'; const start = text.indexOf(focus);
  const claim = { fieldId: 'declared_monthly_income', subjectRef: { scope: 'buying_unit', id: 'unit' }, value: 3800, unit: 'EUR', precision: 'explicit', occurrence: { messageId: m.messageId, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + focus.length, text: focus } }, evidenceRefs: [{ messageId: m.messageId, quote: text }] };
  const result = await run({ execute: async r => {
    if (r.role === 'E1') return null;
    if (r.role === 'Repair') return { claims: [claim, claim] };
    if (r.role === 'E2' || r.role === 'E3') return { claims: [{ ...claim, value: r.role === 'E2' ? 3800 : 3000 }] };
    if (r.role === 'S1') return empty(r.role);
    if (r.role === 'S2') {
      const input = r.input as { groups: { groupId: string; candidates: { candidateId: string; evidenceRefs: typeof claim.evidenceRefs }[] }[] };
      return { status: 'complete', verdicts: [], reviews: input.groups.flatMap(g => g.candidates.map(c => ({ groupId: g.groupId, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', justification: 'synthetic', evidenceRefs: c.evidenceRefs }))) };
    }
    const input = r.input as { dispute: { disputeId: string } };
    return { disputeId: input.dispute.disputeId, resolution: { status: 'selected', candidateId: 'invented', justification: 'synthetic', evidenceRefs: claim.evidenceRefs } };
  } }, snapshot);
  expect(result.trace.consumed).toBe(7);
  expect(result.diagnostics.map(d => d.code)).toContain('duplicate_extractor');
  expect(result.result.status).toBe('human_review_required');
  expect(result.trace.resolutions).toBe(0);
});

it('fails safely if S2 omits an ordinary candidate review', async () => {
  const snapshot = base(); snapshot.messages = cases.find(c => c.caseId === 'laura')!.messages;
  const m = snapshot.messages.find(m => m.messageId === 'laura-m1')!; if (m.content.type !== 'text') throw new Error();
  const text = m.content.text; const start = text.indexOf('Valencia');
  const claim = { fieldId: 'desired_locations', subjectRef: { scope: 'case', id: 'case' }, value: ['Valencia'], precision: 'explicit', occurrence: { messageId: m.messageId, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + 8, text: 'Valencia' } }, evidenceRefs: [{ messageId: m.messageId, quote: text }] };
  const result = await run({ execute: async r => r.role.startsWith('E') ? { claims: [claim] } : empty(r.role) }, snapshot);
  expect(result.result.status).not.toBe('consolidated');
});
