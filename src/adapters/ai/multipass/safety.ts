import { z } from 'zod';
import { EvidenceRefSchema, BlockerSchema, type Blocker, type EvidenceRef, type Message } from '../../../contracts';

const id = z.string().min(1);
export const ProtectedCategorySchema = z.enum(['OPT_OUT', 'URGENT', 'BINDING_CLAIM', 'TRUST', 'PRIVACY']);
export const SafetyCandidateSchema = z.strictObject({ signalId: id, category: ProtectedCategorySchema, evidenceRefs: z.array(EvidenceRefSchema).min(1) });
export const SafetyVerdictSchema = z.strictObject({ signalId: id, status: z.enum(['confirmed', 'dismissed', 'uncertain']), justification: id, evidenceRefs: z.array(EvidenceRefSchema).min(1) });
export const SafetyFindingSchema = z.strictObject({ signalId: id, category: ProtectedCategorySchema, status: z.enum(['proposed', 'confirmed', 'dismissed', 'uncertain']), justification: id, evidenceRefs: z.array(EvidenceRefSchema).min(1) });
export const SafetyInputSchema = z.strictObject({ scanStatus: z.literal('complete'), reviewStatus: z.literal('complete'), candidates: z.array(SafetyCandidateSchema), verdicts: z.array(SafetyVerdictSchema), historicalBlockers: z.array(BlockerSchema) });
export type SafetyInput = z.infer<typeof SafetyInputSchema>;
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

// A quote without offsets must occur exactly once; otherwise it does not identify an occurrence.
function evidenceKey(ref: EvidenceRef, messages: Message[]): string | undefined {
  const message = messages.find(m => m.messageId === ref.messageId);
  if (!message || message.content.type !== 'text' || !ref.quote) return undefined;
  const text = message.content.text;
  const start = ref.start ?? text.indexOf(ref.quote);
  if (start < 0 || (ref.start === undefined && text.indexOf(ref.quote, start + 1) !== -1)) return undefined;
  const end = ref.end ?? start + ref.quote.length;
  return text.slice(start, end) === ref.quote ? JSON.stringify([ref.messageId, start, end]) : undefined;
}

export function sameEvidence(left: EvidenceRef[], right: EvidenceRef[], messages: Message[]): boolean {
  const keys = new Set(left.map(ref => evidenceKey(ref, messages)).filter(Boolean));
  return right.some(ref => { const key = evidenceKey(ref, messages); return key !== undefined && keys.has(key); });
}

export function reconcileSafety(candidates: SafetyCandidate[], verdicts: SafetyVerdict[], messages: Message[], historical: Blocker[]) {
  const findings: { signalId: string; category: SafetyCandidate['category']; status: 'proposed' | 'confirmed' | 'dismissed' | 'uncertain'; justification: string; evidenceRefs: EvidenceRef[] }[] = [];
  const blockers = [...historical];
  let humanReviewRequired = new Set(historical.map(b => b.id)).size !== historical.length;
  for (const candidate of [...candidates].sort((a, b) => a.signalId.localeCompare(b.signalId))) {
    const valid = SafetyCandidateSchema.safeParse(candidate).success && evidenceAnchored(candidate.evidenceRefs, messages);
    const matching = verdicts.filter(v => v.signalId === candidate.signalId);
    const verdict = matching.length === 1 && SafetyVerdictSchema.safeParse(matching[0]).success && evidenceAnchored(matching[0].evidenceRefs, messages) && sameEvidence(candidate.evidenceRefs, matching[0].evidenceRefs, messages) ? matching[0] : undefined;
    const status = valid && verdict ? verdict.status : 'uncertain';
    findings.push({ ...candidate, status, justification: verdict?.justification ?? 'Insufficient validated safety review', evidenceRefs: verdict?.evidenceRefs ?? candidate.evidenceRefs });
    if (status === 'uncertain') humanReviewRequired = true;
    if (status === 'confirmed') {
      const existing = blockers.find(b => b.id === candidate.signalId) ?? blockers.find(b => b.type === candidate.category && b.status === 'open' && sameEvidence(b.evidenceRefs, candidate.evidenceRefs, messages));
      if (!existing) blockers.push({ id: candidate.signalId, type: candidate.category, description: verdict!.justification, status: 'open', evidenceRefs: verdict!.evidenceRefs });
      else if (existing.type !== candidate.category || existing.status !== 'open' || !sameEvidence(existing.evidenceRefs, candidate.evidenceRefs, messages)) humanReviewRequired = true;
    }
  }
  if (new Set(candidates.map(c => c.signalId)).size !== candidates.length || verdicts.some(v => !candidates.some(c => c.signalId === v.signalId))) humanReviewRequired = true;
  return { findings, blockers, humanReviewRequired };
}
