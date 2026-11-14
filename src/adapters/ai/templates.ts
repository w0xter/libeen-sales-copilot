import type { DraftGenerator, Result, Draft } from '../../contracts';
import { failure, validateDraftRequest } from './validation';

const templates: Record<string, Record<string, string>> = {
  CLARIFY: {
    debt: 'Para entender bien lo que nos contáis, ¿los ingresos que indicáis ya incluyen el descuento de la cuota que habéis mencionado?',
    month: '¿En qué mes os gustaría mudaros aproximadamente?',
    interest: '¿Os gustaría explorar el modelo SmartHousing con una persona del equipo?',
    general: '¿Podrías aclararnos ese dato para que una persona del equipo pueda revisar vuestra situación?',
  },
  PROPOSE_CALL: { call: 'Si os parece bien, podemos proponeros una llamada con una persona del equipo para comentar los siguientes pasos.' },
  ANSWER_QUESTION: { handoff: 'Gracias por plantearlo. Una persona del equipo podrá revisar vuestra pregunta y responderos con la información disponible.' },
};
export type DraftInput = Parameters<DraftGenerator['generate']>[0];
export function optionsFor(input: DraftInput): string[] {
  const action = input.proposal.actionType;
  if (action === 'CLARIFY') {
    if (input.policyDecision.ruleIds.includes('R05')) return ['debt'];
    if (input.policyDecision.ruleIds.includes('R10')) return ['month'];
    const interest = input.caseSnapshot.knowledge.facts.find(f => f.fieldId === 'product_intent' && f.subjectRef.scope === 'case');
    if (!interest || ['unknown', 'ambiguous', 'conflicting'].includes(interest.status)) return ['interest'];
    return ['general'];
  }
  return Object.keys(templates[action] ?? {});
}
export function buildDraft(input: DraftInput, mode: 'replay' | 'openai', key: string): Result<Draft> {
  const allowed = validateDraftRequest(input); if (!allowed.ok) return allowed;
  const text = optionsFor(input).includes(key) ? templates[input.proposal.actionType]?.[key] : undefined;
  if (!text) return failure('DRAFT_GENERATION_FAILED', 'No hay borrador seguro para esta acción');
  return { ok: true, value: { draftId: `draft-${input.proposal.proposalId}`, proposalId: input.proposal.proposalId, text, status: 'generated', aiMode: mode } };
}
export function chooseReplayTemplate(input: DraftInput): string {
  if (input.proposal.actionType === 'PROPOSE_CALL') return 'call';
  if (input.proposal.actionType === 'ANSWER_QUESTION') return 'handoff';
  if (input.policyDecision.ruleIds.includes('R05')) return 'debt';
  if (input.policyDecision.ruleIds.includes('R10')) return 'month';
  return optionsFor(input)[0] ?? 'general';
}
