import { z } from 'zod';
import { EvidenceRefSchema, type Blocker, type EvidenceRef, type Message } from '../../../contracts';

const id = z.string().min(1);
export const ProtectedCategorySchema = z.enum(['OPT_OUT', 'URGENT', 'BINDING_CLAIM', 'TRUST', 'PRIVACY']);
export const SafetyCandidateSchema = z.strictObject({ signalId: id, category: ProtectedCategorySchema, evidenceRefs: z.array(EvidenceRefSchema).min(1) });
export const SafetyVerdictSchema = z.strictObject({ signalId: id, status: z.enum(['confirmed', 'dismissed', 'uncertain']), justification: id, evidenceRefs: z.array(EvidenceRefSchema).min(1) });
export type SafetyCandidate = z.infer<typeof SafetyCandidateSchema>;
export type SafetyVerdict = z.infer<typeof SafetyVerdictSchema>;

export function evidenceAnchored(refs: EvidenceRef[], messages: Message[]): boolean {
  return refs.length > 0 && refs.every(ref => {
    const matches = messages.filter(m => m.messageId === ref.messageId);
    if (matches.length !== 1 || matches[0].role !== 'customer' || matches[0].content.type !== 'text' || !ref.quote) return false;
    const text = matches[0].content.text;
    return ref.start === undefined ? text.includes(ref.quote) : ref.end !== undefined && text.slice(ref.start, ref.end) === ref.quote;
  });
}

export function reconcileSafety(candidates: SafetyCandidate[], verdicts: SafetyVerdict[], messages: Message[], historical: Blocker[]) {
  const findings: { signalId: string; category: SafetyCandidate['category']; status: 'proposed' | 'confirmed' | 'dismissed' | 'uncertain'; justification: string; evidenceRefs: EvidenceRef[] }[] = [];
  const blockers = [...historical];
  let humanReviewRequired = false;
  for (const candidate of candidates) {
    const valid = SafetyCandidateSchema.safeParse(candidate).success && evidenceAnchored(candidate.evidenceRefs, messages);
    const matching = verdicts.filter(v => v.signalId === candidate.signalId);
    const verdict = matching.length === 1 && SafetyVerdictSchema.safeParse(matching[0]).success && evidenceAnchored(matching[0].evidenceRefs, messages) && matching[0].evidenceRefs.some(e => candidate.evidenceRefs.some(c => c.messageId === e.messageId)) ? matching[0] : undefined;
    const status = valid && verdict ? verdict.status : 'uncertain';
    findings.push({ ...candidate, status, justification: verdict?.justification ?? 'Insufficient validated safety review', evidenceRefs: verdict?.evidenceRefs ?? candidate.evidenceRefs });
    if (status === 'uncertain') humanReviewRequired = true;
    if (status === 'confirmed') blockers.push({ id: candidate.signalId, type: candidate.category, description: verdict!.justification, status: 'open', evidenceRefs: verdict!.evidenceRefs });
  }
  if (new Set(candidates.map(c => c.signalId)).size !== candidates.length || verdicts.some(v => !candidates.some(c => c.signalId === v.signalId))) humanReviewRequired = true;
  return { findings, blockers, humanReviewRequired };
}
