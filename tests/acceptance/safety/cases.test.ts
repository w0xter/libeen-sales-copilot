import { describe, expect, it } from 'vitest';
import { CaseOrchestrator } from '../../../src/application/cases/orchestrator';
import { MemoryCaseRepository } from '../../../src/adapters/persistence/memory-case-repository';
import { createAIAdapters } from '../../../src/adapters/ai';
import { cases, scenarios } from '../../../src/fixtures';
import { demoBundle, configBundleRef } from '../../../src/config';
import type { CaseSnapshot, CaseEvent } from '../../../src/contracts';

function setup(caseId: 'javier' | 'rosa') {
  const fixture = cases.find(c => c.caseId === caseId)!;
  const snapshot: CaseSnapshot = { caseId, revision: 0, messages: structuredClone(fixture.messages), assertions: [], knowledge: { facts: [] }, goal: { id: 'qualification', description: 'Orientación', status: 'active' }, workflowProgress: { workflowId: demoBundle.workflow.id, workflowVersion: demoBundle.workflow.version, milestones: [] }, blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef, status: 'NEEDS_ADVISOR' };
  const ai = createAIAdapters({ AI_MODE: 'replay' });
  if (!ai.ok) throw Error('Replay unavailable');
  const repository = new MemoryCaseRepository([snapshot]);
  return new CaseOrchestrator({ repository, ...ai.value, getConfig: () => demoBundle });
}
async function analyze(caseId: 'javier' | 'rosa') {
  const orchestrator = setup(caseId);
  const event: CaseEvent = { eventId: `${caseId}-analysis`, caseId, type: 'CASE_ANALYSIS_REQUESTED', actor: 'advisor', occurredAt: '2026-05-03T10:00:00Z', expectedRevision: 0, payload: {} };
  const result = await orchestrator.handleEvent(event);
  if (!result.ok) throw Error(result.error.message);
  return { orchestrator, view: result.value };
}

describe('synthetic safety scenarios', () => {
  it('preserves Javier range and unavailable audio, prioritizing trust and human review', async () => {
    const { view } = await analyze('javier');
    const income = view.snapshot.knowledge.facts.find(f => f.fieldId === 'declared_monthly_income');
    expect(income).toMatchObject({ status: 'approximate', value: { min: 2000, max: 3000 }, incomeBasis: 'unknown', subjectRef: { scope: 'participant' } });
    expect(view.snapshot.messages.find(m => m.messageId === 'javier-m4')?.content).toEqual({ type: 'audio_unavailable', durationSeconds: 72 });
    expect(view.snapshot.assertions.some(a => a.evidenceRefs.some(e => e.messageId === 'javier-m4'))).toBe(false);
    expect(view.snapshot.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'TRUST', status: 'open' })]));
    expect(view.activeProposal?.actionType).toBe('HANDOFF');
    expect(view.snapshot.decisions.at(-1)).toMatchObject({ ruleIds: expect.arrayContaining(['R07']), evidenceRefs: expect.arrayContaining([expect.objectContaining({ messageId: 'javier-m5' })]), configBundleRef, aiMode: 'replay' });
    expect(view.draft).toBeNull();
  });
  it('preserves Rosa zero savings and conditional rental question while escalating urgency and written approval', async () => {
    const { view } = await analyze('rosa');
    expect(view.snapshot.knowledge.facts.find(f => f.fieldId === 'available_savings')).toMatchObject({ status: 'known', value: 0 });
    expect(view.snapshot.knowledge.facts.find(f => f.fieldId === 'product_intent')).toBeUndefined();
    expect(view.snapshot.blockers.map(b => b.type)).toEqual(expect.arrayContaining(['URGENT', 'BINDING_CLAIM']));
    expect(view.activeProposal?.actionType).toBe('HANDOFF');
    expect(view.snapshot.status).toBe('ON_HOLD_REVIEW');
    expect(view.snapshot.decisions.at(-1)).toMatchObject({ ruleIds: expect.arrayContaining(['R02']), evidenceRefs: expect.arrayContaining([expect.objectContaining({ messageId: 'rosa-m3' })]) });
    expect(view.draft).toBeNull();
    expect(view.snapshot.workflowProgress.milestones.find(m => m.milestoneId === 'M3')?.status).not.toBe('completed');
  });
  it('stops contact when Javier opts out even with unresolved objections', async () => {
    const { orchestrator, view } = await analyze('javier');
    const message = scenarios.find(s => s.id === 'javier-opt-out')!.additions[0];
    const event: CaseEvent = { eventId: 'opt-out-message', caseId: 'javier', type: 'MESSAGE_RECEIVED', actor: 'customer', occurredAt: message.occurredAt, expectedRevision: view.snapshot.revision, simulated: true, payload: { message } };
    const result = await orchestrator.handleEvent(event);
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.error.message);
    expect(result.value.activeProposal?.actionType).toBe('STOP_CONTACT');
    expect(result.value.snapshot.status).toBe('DO_NOT_CONTACT');
    expect(result.value.draft).toBeNull();
    expect(result.value.snapshot.decisions.at(-1)?.ruleIds).toContain('R01');
  });
});
