import { CaseOrchestrator } from '../../../src/application/cases/orchestrator';
import { MemoryCaseRepository } from '../../../src/adapters/persistence/memory-case-repository';
import { createAIAdapters } from '../../../src/adapters/ai';
import { cases, scenarios } from '../../../src/fixtures';
import { demoBundle, configBundleRef } from '../../../src/config';
import type { CaseEvent, CaseSnapshot, CaseView, ConfigBundle, Result } from '../../../src/contracts';

export function makeCase() {
  const ai = createAIAdapters({ AI_MODE: 'replay' });
  if (!ai.ok) throw new Error(ai.error.message);
  let config: ConfigBundle = structuredClone(demoBundle);
  const seed: CaseSnapshot = { caseId: 'laura', revision: 0, messages: structuredClone(cases[0].messages), assertions: [], knowledge: { facts: [] }, goal: { id: 'goal', description: 'Orientación comercial', status: 'active' }, workflowProgress: { workflowId: config.workflow.id, workflowVersion: config.workflow.version, milestones: [] }, blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef: structuredClone(configBundleRef), status: 'NEEDS_ADVISOR' };
  const orchestrator = new CaseOrchestrator({ repository: new MemoryCaseRepository([seed]), ...ai.value, getConfig: () => config });
  const setR10 = (enabled: boolean) => { config = structuredClone(config); config.businessPolicy.advisoryCall.requireSpecificMoveMonthBeforeCall = enabled; config.businessPolicy.version = enabled ? 'demo-r10-on' : 'demo-r10-off'; config.workflow.businessPolicyVersion = config.businessPolicy.version; };
  return { orchestrator, setR10 };
}
export function unwrap(result: Result<CaseView>): CaseView { if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`); return result.value; }
export function analysis(revision = 0): CaseEvent { return { eventId: `analysis-${revision}`, caseId: 'laura', actor: 'advisor', occurredAt: '2026-05-03T10:00:00Z', expectedRevision: revision, type: 'CASE_ANALYSIS_REQUESTED', payload: {} }; }
export function customerMessage(scenarioId: string, revision: number): CaseEvent {
  const message = scenarios.find(s => s.id === scenarioId)?.additions[0];
  if (!message) throw new Error(`Missing fixture ${scenarioId}`);
  return { eventId: `event-${scenarioId}`, caseId: 'laura', actor: 'customer', occurredAt: message.occurredAt, expectedRevision: revision, simulated: true, type: 'MESSAGE_RECEIVED', payload: { message: structuredClone(message) } };
}
export const fact = (view: CaseView, id: string) => view.snapshot.knowledge.facts.find(f => f.fieldId === id);
export const milestone = (view: CaseView, id: string) => view.snapshot.workflowProgress.milestones.find(m => m.milestoneId === id);
