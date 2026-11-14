import { describe, expect, it } from 'vitest';
import { CaseOrchestrator } from '../../../src/application/cases/orchestrator';
import { MemoryCaseRepository } from '../../../src/adapters/persistence/memory-case-repository';
import { createAIAdapters } from '../../../src/adapters/ai';
import { cases, scenarios } from '../../../src/fixtures';
import { demoBundle, configBundleRef } from '../../../src/config';
import type { CaseSnapshot, CaseEvent, Interpreter, DraftGenerator } from '../../../src/contracts';

function seed(): CaseSnapshot { return { caseId: 'laura', revision: 0, messages: structuredClone(cases[0].messages), assertions: [], knowledge: { facts: [] }, goal: { id: 'goal', description: 'Orientación', status: 'active' }, workflowProgress: { workflowId: demoBundle.workflow.id, workflowVersion: demoBundle.workflow.version, milestones: [] }, blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef, status: 'NEEDS_ADVISOR' }; }
const analyze: CaseEvent = { eventId: 'analysis-1', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, type: 'CASE_ANALYSIS_REQUESTED', payload: {} };
const incoming: CaseEvent = { eventId: 'message-1', caseId: 'laura', actor: 'customer', occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, simulated: true, type: 'MESSAGE_RECEIVED', payload: { message: { messageId: 'new-message', conversationId: 'laura-conversation', role: 'customer', occurredAt: '2026-05-03T10:00:00Z', content: { type: 'text', text: 'Texto sin replay' }, simulated: true } } };
function setup(interpreter?: Interpreter, draftGenerator?: DraftGenerator) { const ai = createAIAdapters({ AI_MODE: 'replay' }); if (!ai.ok) throw Error('replay missing'); const repository = new MemoryCaseRepository([seed()]); const orchestrator = new CaseOrchestrator({ repository, interpreter: interpreter ?? ai.value.interpreter, draftGenerator: draftGenerator ?? ai.value.draftGenerator, mode: 'replay', getConfig: () => demoBundle }); return { repository, orchestrator }; }

describe('case orchestrator', () => {
  it('analyzes Laura with replay and records evidence and a reviewable draft', async () => {
    const { orchestrator } = setup();
    const result = await orchestrator.handleEvent(analyze);
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.error.message);
    expect(result.value.snapshot.knowledge.facts.find(f => f.fieldId === 'declared_monthly_income')).toMatchObject({ value: 3800, subjectRef: { scope: 'buying_unit' } });
    expect(result.value.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M3')?.status).toBe('blocked');
    expect(result.value.activeProposal?.actionType).toBe('CLARIFY');
    expect(result.value.draft?.status).toBe('generated');
    expect(result.value.snapshot.decisions[0].evidenceRefs.length).toBeGreaterThan(0);
  });
  it('keeps a message when interpretation fails and never invents facts', async () => {
    const failing: Interpreter = { interpret: async () => ({ ok: false, error: { code: 'MODEL_UNAVAILABLE', message: 'No disponible', retryable: true } }) };
    const { orchestrator, repository } = setup(failing);
    const result = await orchestrator.handleEvent(incoming);
    expect(result.ok && result.value.errors[0].code).toBe('MODEL_UNAVAILABLE');
    const stored = await repository.get('laura');
    expect(stored.ok && stored.value.messages.some(m => m.messageId === 'new-message')).toBe(true);
    expect(stored.ok && stored.value.knowledge.facts).toEqual([]);
  });
  it('preserves evaluated facts and proposal when draft generation fails', async () => {
    const failing: DraftGenerator = { generate: async () => ({ ok: false, error: { code: 'DRAFT_GENERATION_FAILED', message: 'Sin borrador', retryable: true } }) };
    const { orchestrator } = setup(undefined, failing);
    const result = await orchestrator.handleEvent(analyze);
    expect(result.ok && result.value.errors[0].code).toBe('DRAFT_GENERATION_FAILED');
    expect(result.ok && result.value.snapshot.knowledge.facts.length).toBeGreaterThan(0);
    expect(result.ok && result.value.activeProposal?.actionType).toBe('CLARIFY');
    expect(result.ok && result.value.draft).toBeNull();
  });
});

describe('event integrity', () => {
  it('does not repeat analysis on identical event retries', async () => {
    const ai = createAIAdapters({ AI_MODE: 'replay' }); if (!ai.ok) throw Error('missing replay');
    let calls = 0;
    const interpreter: Interpreter = { interpret: async input => { calls++; return ai.value.interpreter.interpret(input); } };
    const { orchestrator } = setup(interpreter);
    const first = await orchestrator.handleEvent(analyze);
    const second = await orchestrator.handleEvent(analyze);
    expect(first.ok && second.ok && second.value.snapshot.revision).toBe(first.ok && first.value.snapshot.revision);
    expect(calls).toBe(1);
    expect(await orchestrator.handleEvent({ ...analyze, payload: {}, occurredAt: '2026-05-04T10:00:00Z' })).toMatchObject({ ok: false, error: { code: 'IDEMPOTENCY_CONFLICT' } });
  });
  it('approves atomically without treating the draft as delivery or customer agreement', async () => {
    const { orchestrator } = setup();
    const result = await orchestrator.handleEvent(analyze);
    if (!result.ok || !result.value.draft || !result.value.activeProposal) throw Error('no draft');
    const approval: CaseEvent = { eventId: 'approve', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T11:00:00Z', expectedRevision: result.value.snapshot.revision, type: 'DRAFT_APPROVED', payload: { draftId: result.value.draft.draftId, proposalId: result.value.activeProposal.proposalId } };
    const approved = await orchestrator.handleEvent(approval);
    expect(approved.ok && approved.value.draft?.status).toBe('approved');
    expect(approved.ok && approved.value.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M5')?.status).not.toBe('completed');
    expect(approved.ok && approved.value.snapshot.events.some(e => e.type === 'MESSAGE_SIMULATED_AS_SENT')).toBe(false);
    expect((await orchestrator.handleEvent(approval)).ok).toBe(true);
  });
  it('rejects stale proposals after newer incoming messages even if analysis fails', async () => {
    const { orchestrator } = setup();
    const first = await orchestrator.handleEvent(analyze);
    if (!first.ok || !first.value.draft || !first.value.activeProposal) throw Error('no draft');
    const added = { ...incoming, expectedRevision: first.value.snapshot.revision } as CaseEvent;
    const second = await orchestrator.handleEvent(added);
    expect(second.ok && second.value.errors[0].code).toBe('MODEL_UNAVAILABLE');
    if (!second.ok) throw Error('message not saved');
    const approval: CaseEvent = { eventId: 'stale-approval', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T11:00:00Z', expectedRevision: second.value.snapshot.revision, type: 'DRAFT_APPROVED', payload: { draftId: first.value.draft.draftId, proposalId: first.value.activeProposal.proposalId } };
    expect(await orchestrator.handleEvent(approval)).toMatchObject({ ok: false, error: { code: 'STALE_PROPOSAL' } });
  });
  it('rejects model output claiming advisor authority', async () => {
    const ai = createAIAdapters({ AI_MODE: 'replay' }); if (!ai.ok) throw Error('no replay');
    const interpreter: Interpreter = { interpret: async input => {
      const value = await ai.value.interpreter.interpret(input);
      if (!value.ok) return value;
      return { ok: true, value: { ...value.value, assertions: value.value.assertions.map((a, i) => i ? a : { ...a, source: 'advisor_correction', reviewStatus: 'confirmed_by_advisor' }) } };
    } };
    const { orchestrator } = setup(interpreter);
    const result = await orchestrator.handleEvent(analyze);
    expect(result.ok && result.value.errors[0].code).toBe('MODEL_OUTPUT_INVALID');
    expect(result.ok && result.value.snapshot.knowledge.facts).toEqual([]);
  });
});

describe('policy reevaluation', () => {
  it('changes the proposal when R10 changes while preserving financial M3', async () => {
    const ai = createAIAdapters({ AI_MODE: 'replay' }); if (!ai.ok) throw Error('no replay');
    let config = structuredClone(demoBundle);
    const repo = new MemoryCaseRepository([seed()]);
    const orchestrator = new CaseOrchestrator({ repository: repo, interpreter: ai.value.interpreter, draftGenerator: ai.value.draftGenerator, mode: 'replay', getConfig: () => config });
    const original = await orchestrator.handleEvent(analyze); if (!original.ok) throw Error('analysis failed');
    const addition = scenarios.find(s => s.id === 'laura-r10-off')!.additions[0];
    const message: CaseEvent = { eventId: 'clarification', caseId: 'laura', actor: 'customer', occurredAt: addition.occurredAt, expectedRevision: original.value.snapshot.revision, simulated: true, type: 'MESSAGE_RECEIVED', payload: { message: addition } };
    const before = await orchestrator.handleEvent(message); if (!before.ok) throw Error(before.error.message);
    expect(before.value.activeProposal?.actionType).toBe('PROPOSE_CALL');
    expect(before.value.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M3')?.status).toBe('completed');
    config = structuredClone(config); config.businessPolicy.advisoryCall.requireSpecificMoveMonthBeforeCall = true; config.businessPolicy.version = 'demo-v2'; config.workflow.businessPolicyVersion = 'demo-v2';
    const after = await orchestrator.handleEvent({ eventId: 'r10-recheck', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-04T10:00:00Z', expectedRevision: before.value.snapshot.revision, type: 'CASE_REEVALUATION_REQUESTED', payload: {} });
    expect(after.ok && after.value.activeProposal?.actionType).toBe('CLARIFY');
    expect(after.ok && after.value.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M3')?.status).toBe('completed');
    expect(after.ok && after.value.snapshot.proposals.find(p => p.proposalId === before.value.activeProposal?.proposalId)?.status).toBe('superseded');
  });
});

describe('concurrent interpretation', () => {
  it('rejects results calculated before another committed message', async () => {
    const ai = createAIAdapters({ AI_MODE: 'replay' }); if (!ai.ok) throw Error('no replay');
    let release!: () => void; let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    const interpreter: Interpreter = { interpret: async input => { started(); await hold; return ai.value.interpreter.interpret(input); } };
    const { repository, orchestrator } = setup(interpreter);
    const pending = orchestrator.handleEvent(analyze); await ready;
    const concurrent = { ...incoming, expectedRevision: 1 } as CaseEvent;
    expect((await repository.appendEvent(concurrent)).ok).toBe(true);
    release();
    expect(await pending).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } });
    const current = await repository.get('laura');
    expect(current.ok && current.value.messages.some(m => m.messageId === 'new-message')).toBe(true);
    expect(current.ok && current.value.knowledge.facts).toEqual([]);
  });
});

describe('evidence and simulated delivery', () => {
  it('rejects a confirmation with a mismatched evidence quotation', async () => {
    const { orchestrator } = setup();
    const result = await orchestrator.handleEvent({ eventId: 'bad-confirm', caseId: 'laura', actor: 'customer', occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, type: 'CUSTOMER_CONFIRMED_NEXT_STEP', payload: { description: 'call', evidenceRefs: [{ messageId: 'laura-m1', quote: 'No aparece' }] } });
    expect(result).toMatchObject({ ok: false, error: { code: 'EVIDENCE_INVALID' } });
  });
  it('does not record two simulated sends for one approved draft', async () => {
    const { orchestrator } = setup(); const first = await orchestrator.handleEvent(analyze);
    if (!first.ok || !first.value.draft || !first.value.activeProposal) throw Error('no draft');
    const payload = { draftId: first.value.draft.draftId, proposalId: first.value.activeProposal.proposalId };
    const approval: CaseEvent = { eventId: 'approve-send', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T11:00:00Z', expectedRevision: first.value.snapshot.revision, type: 'DRAFT_APPROVED', payload };
    const approved = await orchestrator.handleEvent(approval); if (!approved.ok) throw Error('approval failed');
    const sent: CaseEvent = { eventId: 'send-1', caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T11:01:00Z', expectedRevision: approved.value.snapshot.revision, simulated: true, type: 'MESSAGE_SIMULATED_AS_SENT', payload };
    const once = await orchestrator.handleEvent(sent); if (!once.ok) throw Error('send failed');
    expect(await orchestrator.handleEvent({ ...sent, eventId: 'send-2', expectedRevision: once.value.snapshot.revision })).toMatchObject({ ok: false, error: { code: 'POLICY_DENIED' } });
  });
});
