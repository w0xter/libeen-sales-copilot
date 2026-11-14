import { describe, expect, it, vi } from 'vitest';
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

it('abstains consistently without repair when multiple initial outputs are invalid regardless of completion order', async () => {
  const execute = async (delays: Record<string, number>) => {
    const repaired: string[] = [];
    const result = await run({ execute: async r => {
      await new Promise(resolve => setTimeout(resolve, delays[r.role] ?? 0));
      if (r.role === 'Repair') { repaired.push((r.input as { targetRole: string }).targetRole); return { claims: [] }; }
      return r.role === 'E1' || r.role === 'E2' ? null : empty(r.role);
    } });
    return { result: result.result, repaired, consumed: result.trace.consumed };
  };
  const first = await execute({ E1: 1, E2: 10 });
  const second = await execute({ E1: 10, E2: 1 });
  expect(first).toEqual(second);
  expect(first.repaired).toEqual([]);
  expect(first.consumed).toBe(4);
  expect(first.result.status).toBe('failed');
});

import type { RawClaim, ClaimGroup } from '../../../src/adapters/ai/multipass/contracts';
import type { SafetyCandidate, SafetyVerdict } from '../../../src/adapters/ai/multipass/safety';

type FactSpec = { messageId: string; focus: string; fieldId: string; value: RawClaim['value']; scope: 'case' | 'buying_unit' | 'participant'; unit?: string; period?: string; incomeBasis?: RawClaim['incomeBasis']; precision?: RawClaim['precision'] };
function claimsFor(snapshot: Snapshot, specs: FactSpec[]): RawClaim[] {
  return specs.map(spec => {
    const message = snapshot.messages.find(m => m.messageId === spec.messageId);
    if (!message || message.content.type !== 'text') throw new Error('text missing');
    const text = message.content.text; const start = text.indexOf(spec.focus);
    if (start < 0) throw new Error('focus missing');
    return { fieldId: spec.fieldId, subjectRef: { scope: spec.scope, id: spec.scope === 'case' ? 'case' : spec.scope === 'buying_unit' ? 'unit' : 'person' }, value: spec.value, precision: spec.precision ?? 'explicit', ...(spec.unit && { unit: spec.unit }), ...(spec.period && { period: spec.period }), ...(spec.incomeBasis && { incomeBasis: spec.incomeBasis }), occurrence: { messageId: spec.messageId, statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + spec.focus.length, text: spec.focus } }, evidenceRefs: [{ messageId: spec.messageId, quote: text }] };
  });
}
function fakeCase(claims: RawClaim[], signals: SafetyCandidate[] = [], verdicts: SafetyVerdict[] = [], options: { delays?: Record<string, number>; conflict?: boolean; adjudicate?: 'valid' | 'invalid' | 'unresolved' } = {}): FakeTransport {
  return { execute: async r => {
    if (options.delays?.[r.role]) await new Promise(resolve => setTimeout(resolve, options.delays![r.role]));
    if (r.role.startsWith('E')) return { claims: claims.map(c => options.conflict && r.role === 'E3' && c.fieldId === 'declared_monthly_income' ? { ...c, subjectRef: { scope: 'buying_unit', id: 'unit' } } : c) };
    if (r.role === 'S1') return { status: 'complete', candidates: signals };
    if (r.role === 'S2') {
      const input = r.input as { groups: ClaimGroup[] };
      return { status: 'complete', verdicts, reviews: input.groups.flatMap(g => g.candidates.map(c => ({ groupId: g.groupId, candidateId: c.candidateId, atomicity: 'atomic', support: 'supported', justification: 'synthetic contextual review', evidenceRefs: c.evidenceRefs, identitySpan: c.occurrence.focusSpan }))) };
    }
    if (r.role === 'J') {
      const input = r.input as { dispute: { disputeId: string }; group: ClaimGroup };
      const candidate = input.group.candidates.find(c => c.extractorId === 'E1') ?? input.group.candidates[0];
      return { disputeId: input.dispute.disputeId, resolution: options.adjudicate === 'valid' ? { status: 'selected', candidateId: candidate.candidateId, justification: 'synthetic selection', evidenceRefs: candidate.evidenceRefs } : options.adjudicate === 'invalid' ? { status: 'selected', candidateId: 'nonexistent', justification: 'synthetic selection', evidenceRefs: candidate.evidenceRefs } : { status: 'unresolved', justification: 'uncertain' } };
    }
    return null;
  } };
}
const caseSpecs: Record<string, FactSpec[]> = {
  laura: [
    { fieldId: 'desired_locations', messageId: 'laura-m1', focus: 'Valencia', value: ['Valencia'], scope: 'case' },
    { fieldId: 'declared_monthly_income', messageId: 'laura-m3', focus: '3.800 €', value: 3800, precision: 'approximate', unit: 'EUR', period: 'month', incomeBasis: 'net', scope: 'buying_unit' },
    { fieldId: 'available_savings', messageId: 'laura-m3', focus: '18.000', value: 18000, precision: 'approximate', unit: 'EUR', scope: 'buying_unit' },
    { fieldId: 'monthly_debt', messageId: 'laura-m4', focus: '250 €', value: 250, unit: 'EUR', period: 'month', scope: 'buying_unit' },
  ],
  javier: [
    { fieldId: 'buyer_count', messageId: 'javier-m3', focus: 'solo', value: 1, scope: 'buying_unit' },
    { fieldId: 'employment_context', messageId: 'javier-m3', focus: 'autonomo', value: 'autónomo', scope: 'participant' },
    { fieldId: 'declared_monthly_income', messageId: 'javier-m3', focus: 'entre 2000 y 3000', value: { min: 2000, max: 3000 }, precision: 'approximate', unit: 'EUR', period: 'month', incomeBasis: 'unknown', scope: 'participant' },
  ],
  rosa: [
    { fieldId: 'declared_monthly_income', messageId: 'rosa-m1', focus: '1.400 €', value: 1400, unit: 'EUR', incomeBasis: 'unknown', scope: 'buying_unit' },
    { fieldId: 'available_savings', messageId: 'rosa-m1', focus: 'Ahorros no tenemos', value: 0, unit: 'EUR', scope: 'buying_unit' },
    { fieldId: 'moving_horizon', messageId: 'rosa-m1', focus: 'dos semanas', value: 'dos semanas', scope: 'case' },
  ],
};
function signal(signalId: string, category: SafetyCandidate['category'], messageId: string, quote: string): SafetyCandidate { return { signalId, category, evidenceRefs: [{ messageId, quote }] }; }
const trust = signal('trust', 'TRUST', 'javier-m5', 'y esto es fiable? no sera una estafa no');
const urgency = signal('urgent', 'URGENT', 'rosa-m1', 'necesitamos salir del piso en dos semanas');
const binding = signal('binding', 'BINDING_CLAIM', 'rosa-m3', 'Mi hijo dice que os pida por escrito que estamos aprobados antes de seguir.');
const opt = signal('opt', 'OPT_OUT', 'rosa-m2', 'Si no podéis vendernos, ¿nos alquiláis algo solo de alquiler?');
const verdict = (s: SafetyCandidate, status: SafetyVerdict['status']): SafetyVerdict => ({ signalId: s.signalId, status, justification: 'synthetic contextual review', evidenceRefs: s.evidenceRefs });
const caseSnapshot = (name: string) => ({ ...base(), messages: cases.find(c => c.caseId === name)!.messages });

describe('complete transcripts through the pipeline', () => {
  it('consolidates all Laura occurrences without inferring a second debt deduction', async () => {
    const snapshot = caseSnapshot('laura'); const result = await run(fakeCase(claimsFor(snapshot, caseSpecs.laura)), snapshot);
    expect(result.result.status).toBe('consolidated');
    if (result.result.status !== 'consolidated') return;
    const facts = result.result.interpretation.assertions;
    expect(facts).toHaveLength(4);
    expect(facts.find(f => f.fieldId === 'declared_monthly_income')).toMatchObject({ value: 3800, incomeBasis: 'net', precision: 'approximate', subjectRef: { scope: 'buying_unit', id: 'unit' } });
    expect(facts.find(f => f.fieldId === 'available_savings')).toMatchObject({ value: 18000, precision: 'approximate' });
    expect(facts.find(f => f.fieldId === 'monthly_debt')).toMatchObject({ value: 250, period: 'month' });
    expect(facts.find(f => f.fieldId === 'desired_locations')?.value).toEqual(['Valencia']);
    expect(facts.some(f => f.fieldId === 'debt_deduction_semantics')).toBe(false);
    expect(new Set(facts.map(f => f.assertionId)).size).toBe(4);
  });
  it('consolidates Javier and retains genuine TRUST without inventing the audio', async () => {
    const snapshot = caseSnapshot('javier'); const result = await run(fakeCase(claimsFor(snapshot, caseSpecs.javier), [trust], [verdict(trust, 'confirmed')]), snapshot);
    expect(result.result.status).toBe('consolidated');
    if (result.result.status !== 'consolidated') return;
    const facts = result.result.interpretation.assertions;
    expect(facts).toHaveLength(3);
    expect(facts.find(f => f.fieldId === 'buyer_count')?.value).toBe(1);
    expect(facts.find(f => f.fieldId === 'employment_context')?.value).toBe('autónomo');
    expect(facts.find(f => f.fieldId === 'declared_monthly_income')).toMatchObject({ value: { min: 2000, max: 3000 }, incomeBasis: 'unknown', precision: 'approximate', subjectRef: { scope: 'participant', id: 'person' } });
    expect(facts.flatMap(f => f.evidenceRefs).some(e => e.messageId === 'javier-m4')).toBe(false);
    expect(result.result.interpretation.blockers.map(b => b.type)).toEqual(['TRUST']);
  });
  it('keeps Javier subject disagreement in human review', async () => {
    const snapshot = caseSnapshot('javier'); const result = await run(fakeCase(claimsFor(snapshot, caseSpecs.javier), [trust], [verdict(trust, 'confirmed')], { conflict: true }), snapshot);
    expect(result.result.status).toBe('human_review_required');
    if (result.result.status === 'human_review_required') expect(result.result.safetyFindings).toContainEqual(expect.objectContaining({ category: 'TRUST', status: 'confirmed' }));
  });
  it('consolidates Rosa with zero savings and both protected blockers, dismissing conditional OPT_OUT', async () => {
    const snapshot = caseSnapshot('rosa'); const result = await run(fakeCase(claimsFor(snapshot, caseSpecs.rosa), [urgency, binding, opt], [verdict(urgency, 'confirmed'), verdict(binding, 'confirmed'), verdict(opt, 'dismissed')]), snapshot);
    expect(result.result.status).toBe('consolidated');
    if (result.result.status !== 'consolidated') return;
    const facts = result.result.interpretation.assertions;
    expect(facts).toHaveLength(3);
    expect(facts.find(f => f.fieldId === 'declared_monthly_income')).toMatchObject({ value: 1400, subjectRef: { scope: 'buying_unit', id: 'unit' } });
    expect(facts.find(f => f.fieldId === 'available_savings')?.value).toBe(0);
    expect(facts.find(f => f.fieldId === 'moving_horizon')?.value).toBe('dos semanas');
    expect(result.result.interpretation.blockers.map(b => b.type).sort()).toEqual(['BINDING_CLAIM', 'URGENT']);
    expect(result.result.safetyFindings.find(f => f.signalId === 'opt')?.status).toBe('dismissed');
  });
});

it('produces the same candidates and result under different completion orders', async () => {
  const snapshot = caseSnapshot('laura'); const claims = claimsFor(snapshot, caseSpecs.laura);
  const observed: string[][] = [];
  const execute = async (delays: Record<string, number>) => {
    const delegate = fakeCase(claims, [], [], { delays });
    return run({ execute: async r => {
      if (r.role === 'S2') observed.push((r.input as { groups: ClaimGroup[] }).groups.flatMap(g => g.candidates.map(c => `${c.candidateId}:${c.extractorId}`)));
      return delegate.execute(r);
    } }, snapshot);
  };
  const a = await execute({ E1: 12, E2: 8, E3: 4, S1: 1 });
  const b = await execute({ E1: 1, E2: 4, E3: 8, S1: 12 });
  expect(a.result).toEqual(b.result);
  expect(a.trace.consumed).toBe(5); expect(b.trace.consumed).toBe(5);
  expect(observed[0]).toEqual(observed[1]);
  expect(observed[0]).toContain('E1-0:E1'); expect(observed[0]).toContain('E2-0:E2'); expect(observed[0]).toContain('E3-0:E3');
});

it.each(['valid', 'invalid'] as const)('applies %s focused adjudication to a real value dispute', async mode => {
  const snapshot = caseSnapshot('laura'); const claims = claimsFor(snapshot, [caseSpecs.laura[1]]);
  const delegate = fakeCase(claims, [], [], { adjudicate: mode });
  const result = await run({ execute: async r => r.role === 'E3' ? { claims: [{ ...claims[0], incomeBasis: 'gross' }] } : delegate.execute(r) }, snapshot);
  expect(result.trace.consumed).toBe(6);
  if (mode === 'valid') {
    expect(result.result.status).toBe('consolidated');
    if (result.result.status === 'consolidated') expect(result.result.interpretation.assertions[0]).toMatchObject({ value: 3800, incomeBasis: 'net' });
  } else expect(result.result.status).toBe('human_review_required');
});

it.each(['uncertain', 'missing', 'contradictory'] as const)('keeps an %s protected signal out of consolidated results', async kind => {
  const snapshot = caseSnapshot('javier');
  const verdicts = kind === 'missing' ? [] : [kind === 'contradictory' ? { ...verdict(trust, 'confirmed'), evidenceRefs: [{ messageId: 'javier-m5', quote: 'inexistent evidence' }] } : verdict(trust, 'uncertain')];
  const result = await run(fakeCase([], [trust], verdicts), snapshot);
  expect(result.result.status).toBe('human_review_required');
});

it.each(['duplicate', 'foreign'] as const)('rejects %s contextual candidate reviews', async mode => {
  const snapshot = caseSnapshot('laura'); const delegate = fakeCase(claimsFor(snapshot, [caseSpecs.laura[0]]));
  const result = await run({ execute: async r => {
    const response = await delegate.execute(r);
    if (r.role !== 'S2') return response;
    const value = response as { status: string; reviews: Record<string, unknown>[]; verdicts: unknown[] };
    return { ...value, reviews: mode === 'duplicate' ? [...value.reviews, value.reviews[0]] : value.reviews.map((item, i) => i ? item : { ...item, candidateId: 'foreign' }) };
  } }, snapshot);
  expect(result.result).toMatchObject({ status: 'failed', code: 'incomplete_contextual_review' });
});

it.each([['2.400 €', '1.800 €', 2400, 1800], ['2.000 €', '2.000 €', 2000, 2000]] as const)('keeps two individual income occurrences separate: %s / %s', async (first, second, a, b) => {
  const text = `Yo gano ${first} y mi pareja ${second}.`;
  const snapshot = base(); snapshot.knownSubjects.push({ scope: 'participant', id: 'partner' });
  snapshot.messages = [{ messageId: 'm', conversationId: 'c', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text', text } }];
  const start1 = text.indexOf(first); const start2 = text.lastIndexOf(second);
  const make = (value: number, start: number, focus: string, id: string): RawClaim => ({ fieldId: 'declared_monthly_income', value, unit: 'EUR', precision: 'explicit', subjectRef: { scope: 'participant', id }, occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + focus.length, text: focus } }, evidenceRefs: [{ messageId: 'm', start, end: start + focus.length, quote: focus }] });
  const result = await run(fakeCase([make(a, start1, first, 'person'), make(b, start2, second, 'partner')]), snapshot);
  expect(result.result.status).toBe('consolidated');
  if (result.result.status !== 'consolidated') return;
  const facts = result.result.interpretation.assertions;
  expect(facts).toHaveLength(2);
  expect(facts.map(f => f.value).sort()).toEqual([a, b].sort());
  expect(new Set(facts.map(f => f.assertionId)).size).toBe(2);
  expect(new Set(facts.map(f => f.subjectRef.id))).toEqual(new Set(['person', 'partner']));
});

it('retains a historical gross/net correction without inventing a new amount', async () => {
  const snapshot = base(); const first = 'Gano 2000 euros netos.'; const second = 'Me equivoqué, eran brutos.';
  snapshot.messages = [
    { messageId: 'old', conversationId: 'c', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text', text: first } },
    { messageId: 'new', conversationId: 'c', role: 'customer', occurredAt: '2026-01-02T00:00:00Z', content: { type: 'text', text: second } },
  ];
  snapshot.historicalAssertions = [{ assertionId: 'prior', fieldId: 'declared_monthly_income', subjectRef: { scope: 'participant', id: 'person' }, value: 2000, unit: 'EUR', incomeBasis: 'net', rawValue: first, source: 'customer_message', evidenceRefs: [{ messageId: 'old', quote: first }], observedAt: '2026-01-01T00:00:00Z', precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: snapshot.factSchema.version }];
  const start = second.indexOf('brutos');
  const claim: RawClaim = { fieldId: 'declared_monthly_income', subjectRef: { scope: 'participant', id: 'person' }, incomeBasis: 'gross', precision: 'ambiguous', correction: { dimension: 'incomeBasis', previousAssertionId: 'prior' }, occurrence: { messageId: 'new', statementSpan: { start: 0, end: second.length, text: second }, focusSpan: { start, end: start + 6, text: 'brutos' }, previousAssertionId: 'prior' }, evidenceRefs: [{ messageId: 'new', quote: second }] };
  const result = await run(fakeCase([claim]), snapshot);
  expect(result.result.status).toBe('human_review_required');
  if (result.result.status === 'human_review_required') {
    expect(result.result.disputes[0].previousAssertionIds).toEqual(['prior']);
    expect(result.result.disputes[0].evidenceRefs?.map(e => e.messageId)).toEqual(expect.arrayContaining(['old', 'new']));
  }
});

it('reuses the historical assertion on reanalysis without duplicates', async () => {
  const snapshot = base(); const text = 'Busco piso en Madrid.'; const start = text.indexOf('Madrid');
  snapshot.messages = [{ messageId: 'm', conversationId: 'c', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text', text } }];
  const refs = [{ messageId: 'm', start, end: start + 6, quote: 'Madrid' }];
  snapshot.historicalAssertions = [{ assertionId: 'prior', fieldId: 'desired_locations', subjectRef: { scope: 'case', id: 'case' }, value: ['Madrid'], rawValue: text, source: 'customer_message', evidenceRefs: refs, observedAt: '2026-01-01T00:00:00Z', precision: 'explicit', reviewStatus: 'unreviewed', schemaVersion: snapshot.factSchema.version }];
  const claim: RawClaim = { fieldId: 'desired_locations', subjectRef: { scope: 'case', id: 'case' }, value: ['Madrid'], precision: 'explicit', occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + 6, text: 'Madrid' } }, evidenceRefs: refs };
  const result = await run(fakeCase([claim]), snapshot);
  expect(result.result.status).toBe('consolidated');
  if (result.result.status === 'consolidated') expect(result.result.interpretation.assertions.map(a => a.assertionId)).toEqual(['prior']);
});

it('abstains on ambiguous textual identity and preserves the diagnostic', async () => {
  const snapshot = base(); const text = 'Yo gano 2.000 € y ella 2.000 €.';
  snapshot.messages = [{ messageId: 'm', conversationId: 'c', role: 'customer', occurredAt: '2026-01-01T00:00:00Z', content: { type: 'text', text } }];
  const focus = '2.000 € y ella 2.000 €'; const start = text.indexOf(focus);
  const claim: RawClaim = { fieldId: 'declared_monthly_income', subjectRef: { scope: 'participant', id: 'person' }, value: 2000, unit: 'EUR', precision: 'explicit', occurrence: { messageId: 'm', statementSpan: { start: 0, end: text.length, text }, focusSpan: { start, end: start + focus.length, text: focus } }, evidenceRefs: [{ messageId: 'm', quote: text }] };
  const result = await run(fakeCase([claim]), snapshot);
  expect(result.result.status).toBe('human_review_required');
  expect(result.diagnostics.some(d => d.code === 'ambiguous_occurrence')).toBe(true);
});

it('keeps contradictory contextual reviews in human review', async () => {
  const snapshot = caseSnapshot('laura'); const delegate = fakeCase(claimsFor(snapshot, [caseSpecs.laura[1]]));
  const result = await run({ execute: async r => {
    const response = await delegate.execute(r);
    if (r.role !== 'S2') return response;
    const value = response as { status: string; reviews: Record<string, unknown>[]; verdicts: unknown[] };
    return { ...value, reviews: value.reviews.map((item, i) => i === 0 ? { ...item, support: 'refuted' } : item) };
  } }, snapshot);
  expect(result.result.status).toBe('human_review_required');
});

it('rejects adjudication evidence that does not identify the disputed occurrence', async () => {
  const snapshot = caseSnapshot('laura'); const claims = claimsFor(snapshot, [caseSpecs.laura[1]]); const delegate = fakeCase(claims, [], [], { adjudicate: 'valid' });
  const result = await run({ execute: async r => {
    if (r.role === 'E3') return { claims: [{ ...claims[0], incomeBasis: 'gross' }] };
    const value = await delegate.execute(r);
    if (r.role !== 'J') return value;
    const answer = value as { disputeId: string; resolution: Record<string, unknown> };
    return { ...answer, resolution: { ...answer.resolution, evidenceRefs: [{ messageId: 'laura-m3', quote: 'invented' }] } };
  } }, snapshot);
  expect(result.result.status).toBe('human_review_required');
  expect(result.trace.resolutions).toBe(0);
});

it('does not spend beyond seven after invalid adjudication and repair', async () => {
  const snapshot = caseSnapshot('laura'); const claims = claimsFor(snapshot, [caseSpecs.laura[1]]); const delegate = fakeCase(claims);
  const calls: string[] = [];
  const result = await run({ execute: async r => { calls.push(r.role); if (r.role === 'E3') return { claims: [{ ...claims[0], incomeBasis: 'gross' }] }; if (r.role === 'J' || r.role === 'Repair') return null; return delegate.execute(r); } }, snapshot);
  expect(result.trace.consumed).toBe(7);
  expect(calls).toEqual(['E1', 'E2', 'E3', 'S1', 'S2', 'J', 'Repair']);
  expect(result.result.status).toBe('human_review_required');
});

it('cancels concurrent operations and aborts their signals', async () => {
  const controller = new AbortController(); const signals: AbortSignal[] = [];
  const work = run({ execute: async r => { signals.push(r.signal); return new Promise(() => {}); } }, base(), { signal: controller.signal });
  await new Promise(resolve => setTimeout(resolve, 0)); controller.abort();
  const result = await work;
  expect(signals).toHaveLength(4); expect(signals.every(s => s.aborted)).toBe(true);
  expect(result.result.status).toBe('failed');
  expect(result.trace.operations.every(op => op.status === 'cancelled')).toBe(true);
});

it('records bounded technical traces without customer text or transport errors', async () => {
  const snapshot = caseSnapshot('laura'); const secret = 'synthetic-secret-489';
  const result = await run({ execute: async r => { if (r.role === 'E1') throw new Error(secret); return empty(r.role); } }, snapshot);
  expect(result.result.status).toBe('failed');
  expect(result.trace.operations).toHaveLength(4);
  for (const op of result.trace.operations) expect(op).toMatchObject({ attemptId: expect.any(String), correlationId: expect.any(String), role: expect.any(String), status: expect.any(String), durationMs: expect.any(Number), configVersion: expect.any(String) });
  const serialized = JSON.stringify(result.trace);
  expect(serialized).not.toContain(secret);
  const customer = snapshot.messages.find(m => m.content.type === 'text');
  if (customer?.content.type === 'text') expect(serialized).not.toContain(customer.content.text);
  expect(result.trace.operations.find(o => o.role === 'E1')?.cause).toBe('transport_error');
});

it('does not let adjudication erase contradictory contextual reviews', async () => {
  const snapshot = caseSnapshot('laura'); const claims = claimsFor(snapshot, [caseSpecs.laura[1]]); const delegate = fakeCase(claims, [], [], { adjudicate: 'valid' });
  const result = await run({ execute: async r => {
    if (r.role === 'E3') return { claims: [{ ...claims[0], incomeBasis: 'gross' }] };
    const value = await delegate.execute(r);
    if (r.role !== 'S2') return value;
    const output = value as { status: string; reviews: { candidateId: string; support: string }[]; verdicts: unknown[] };
    return { ...output, reviews: output.reviews.map(review => review.candidateId === 'E3-0' ? { ...review, support: 'refuted' } : review) };
  } }, snapshot);
  expect(result.result.status).toBe('human_review_required');
});

it('does not mutate the input snapshot or invoke network transport', async () => {
  const snapshot = caseSnapshot('laura'); const before = structuredClone(snapshot);
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  try {
    const result = await run(fakeCase(claimsFor(snapshot, caseSpecs.laura)), snapshot);
    expect(result.result.status).toBe('consolidated');
    expect(snapshot).toEqual(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally { fetchSpy.mockRestore(); }
});
