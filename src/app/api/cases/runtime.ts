import { CaseOrchestrator } from '../../../application/cases/orchestrator';
import { MemoryCaseRepository } from '../../../adapters/persistence/memory-case-repository';
import { createAIAdapters, type AIAdapters } from '../../../adapters/ai';
import { demoBundle, configBundleRef } from '../../../config';
import { cases } from '../../../fixtures';
import type { CaseSnapshot } from '../../../contracts';

function initialCases(): CaseSnapshot[] {
  return cases.map(item => ({
    caseId: item.caseId, revision: 0, messages: structuredClone(item.messages), assertions: [], knowledge: { facts: [] },
    goal: { id: 'qualification', description: 'Orientación comercial SmartHousing', status: 'active' },
    workflowProgress: { workflowId: demoBundle.workflow.id, workflowVersion: demoBundle.workflow.version, milestones: [] },
    blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef: structuredClone(configBundleRef), status: 'NEEDS_ADVISOR', analysisStatus: 'pending',
  }));
}

/** One in-memory store per server process, without retaining secrets in responses. */
function makeRuntime(): CaseOrchestrator {
  const adapters = createAIAdapters();
  const unavailable: AIAdapters = adapters.ok ? adapters.value : {
    mode: 'openai',
    interpreter: { interpret: async () => adapters },
    draftGenerator: { generate: async () => adapters },
  };
  return new CaseOrchestrator({ repository: new MemoryCaseRepository(initialCases()), ...unavailable, getConfig: () => demoBundle });
}
const globalRuntime = globalThis as typeof globalThis & { __libeenCaseRuntime?: CaseOrchestrator };
export function getRuntime(): CaseOrchestrator {
  if (typeof window !== 'undefined') throw new Error('Server runtime is unavailable in the browser');
  return globalRuntime.__libeenCaseRuntime ??= makeRuntime();
}
