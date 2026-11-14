import { describe, expect, it } from 'vitest';
import recorded from '../../docs/evaluation/evidence/F01_2026-11-14_INITIAL.json';
import { cases } from '../../src/fixtures';
import { configBundleRef, demoBundle } from '../../src/config';
import { evaluate } from '../../src/application/cases/evaluate';
import { InterpretationSchema, type CaseSnapshot } from '../../src/contracts';

describe('independent checks of recorded synthetic model results', () => {
  for (const [scenario, id, action] of [['B01', 'laura', 'CLARIFY'], ['B05', 'javier', 'HANDOFF'], ['B08', 'rosa', 'HANDOFF']] as const) {
    it(`${scenario} produces the registered policy action`, () => {
      const entry = recorded.find(r => 'scenario' in r && r.scenario === scenario);
      if (!entry || !('result' in entry) || typeof entry.result !== 'object' || !entry.result || !('value' in entry.result)) throw Error('missing recorded result');
      const interpretation = InterpretationSchema.parse(entry.result.value);
      const messages = cases.find(c => c.caseId === id)!.messages;
      const snapshot: CaseSnapshot = { caseId: id, revision: 0, messages, assertions: interpretation.assertions, knowledge: { facts: [] }, goal: { id: 'g', description: 'Orientar', status: 'active' }, workflowProgress: { workflowId: 'wf', workflowVersion: '1', milestones: [] }, blockers: interpretation.blockers, proposals: [], drafts: [], events: [], decisions: [], configBundleRef, status: 'NEEDS_ADVISOR' };
      const result = evaluate(snapshot, demoBundle, `independent-${scenario}`, 'openai');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.snapshot.proposals.at(-1)?.actionType).toBe(action);
    });
  }
});
