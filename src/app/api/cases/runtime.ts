import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyExternalPolicy } from '../../../config/external-policy';
import { CaseOrchestrator } from '../../../application/cases/orchestrator';
import { MemoryCaseRepository } from '../../../adapters/persistence/memory-case-repository';
import { createAIAdapters, type AIAdapters } from '../../../adapters/ai';
import { demoBundle, configBundleRef } from '../../../config';
import { cases } from '../../../fixtures';
import type { CaseSnapshot } from '../../../contracts';

function initialCases(config: typeof demoBundle): CaseSnapshot[] {
  return cases.map(item => ({
    caseId: item.caseId, revision: 0, messages: structuredClone(item.messages), assertions: [], knowledge: { facts: [] },
    goal: { id: 'qualification', description: 'Orientación comercial SmartHousing', status: 'active' },
    workflowProgress: { workflowId: config.workflow.id, workflowVersion: config.workflow.version, milestones: [] },
    blockers: [], proposals: [], drafts: [], events: [], decisions: [], configBundleRef: { ...structuredClone(configBundleRef), businessPolicy: config.businessPolicy.version }, status: 'NEEDS_ADVISOR', analysisStatus: 'pending',
  }));
}

/** One in-memory store per server process, without retaining secrets in responses. */
function makeRuntime(): CaseOrchestrator {
  const config = applyExternalPolicy(demoBundle, JSON.parse(readFileSync(join(process.cwd(), 'config/business-policy.json'), 'utf8')));
  const adapters = createAIAdapters();
  const unavailable: AIAdapters = adapters.ok ? adapters.value : {
    mode: 'openai',
    interpreter: { interpret: async () => adapters },
    draftGenerator: { generate: async () => adapters },
  };
  return new CaseOrchestrator({ repository: new MemoryCaseRepository(initialCases(config)), ...unavailable, getConfig: () => config });
}
const globalRuntime = globalThis as typeof globalThis & { __libeenCaseRuntime?: CaseOrchestrator };
export function getRuntime(): CaseOrchestrator {
  if (typeof window !== 'undefined') throw new Error('Server runtime is unavailable in the browser');
  return globalRuntime.__libeenCaseRuntime ??= makeRuntime();
}
