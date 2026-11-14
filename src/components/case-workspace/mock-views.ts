import { configBundleRef, demoBundle } from '../../config';
import { cases, expectedFacts } from '../../fixtures';
import { FactViewSchema, type CaseView, type FactView } from '../../contracts';

type CaseId = 'laura' | 'javier' | 'rosa';
const details: Record<CaseId, { reason: string; blocker: string; evidence: string; action: string; draft: string | null }> = {
  laura: { reason: 'Aclarar si la cuota del coche ya está descontada de los ingresos declarados.', blocker: 'La deducción de la deuda requiere aclaración.', evidence: 'laura-m4', action: 'CLARIFY', draft: 'Para entenderlo bien, ¿los 3.800 € que comentas ya tienen descontada la cuota del coche?' },
  javier: { reason: 'La pregunta de confianza requiere una fuente autorizada o revisión humana.', blocker: 'Objeción de confianza pendiente.', evidence: 'javier-m5', action: 'HANDOFF', draft: null },
  rosa: { reason: 'La urgencia y la solicitud de aprobación escrita requieren revisión humana.', blocker: 'Solicitud vinculante y necesidad urgente.', evidence: 'rosa-m3', action: 'HANDOFF', draft: null },
};

function buildMock(caseId: CaseId): CaseView {
  const source = cases.find(item => item.caseId === caseId)!;
  const detail = details[caseId];
  const facts: FactView[] = expectedFacts[caseId].map(item => {
    const { subject, ...fact } = item;
    return FactViewSchema.parse({ ...fact, subjectRef: { scope: subject, id: subject === 'case' ? caseId : subject } });
  });
  const proposal = { proposalId: `${caseId}-proposal`, originCaseRevision: 0, configBundleRef, actionType: detail.action, reason: detail.reason, evidenceRefs: [{ messageId: detail.evidence }], status: 'active' as const };
  const draft = detail.draft ? { draftId: `${caseId}-draft`, proposalId: proposal.proposalId, text: detail.draft, status: 'generated' as const, aiMode: 'replay' as const } : null;
  const blocker = { id: `${caseId}-blocker`, type: caseId === 'laura' ? 'AMBIGUITY' : caseId === 'javier' ? 'TRUST' : 'BINDING_CLAIM', description: detail.blocker, status: 'open' as const, evidenceRefs: [{ messageId: detail.evidence }] };
  return {
    snapshot: {
      caseId, revision: 0, messages: source.messages, assertions: [], knowledge: { facts },
      goal: { id: 'qualification', description: 'Orientación comercial SmartHousing', status: 'active' },
      workflowProgress: { workflowId: demoBundle.workflow.id, workflowVersion: demoBundle.workflow.version, milestones: demoBundle.workflow.milestones.map(m => ({ milestoneId: m.id, status: m.id === 'M3' && caseId === 'laura' ? 'blocked' : 'pending', guards: [], evidenceRefs: [], blockers: m.id === 'M3' && caseId === 'laura' ? [blocker] : [], workflowVersion: demoBundle.workflow.version })) },
      blockers: [blocker], proposals: [proposal], drafts: draft ? [draft] : [], events: [], decisions: [], configBundleRef,
      status: caseId === 'laura' ? 'NEEDS_ADVISOR' : 'ON_HOLD_REVIEW',
    }, activeProposal: proposal, draft, errors: [], warnings: [], aiMode: 'replay',
  };
}
export const mockViews: Record<CaseId, CaseView> = { laura: buildMock('laura'), javier: buildMock('javier'), rosa: buildMock('rosa') };
