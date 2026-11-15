import type { Message } from './extraction';
import type { Candidate, Review } from './review';
import { candidateKey, conflictsForReview } from './reanalysis';

export const fieldNames = ['interest', 'location', 'horizon', 'buyers', 'income', 'savings', 'debts'] as const;
export type Field = typeof fieldNames[number];
export type EffectiveValue = { value: string; provenance: 'candidate' | 'confirmed' | 'corrected' | 'adopted'; source: Message | null; quote: string; note: string; metadata: Pick<Candidate, 'precision' | 'subject' | 'incomeBasis' | 'debtIncluded' | 'uncertainty'> | null };
export type EffectiveField = { humanReviews: Review[]; status: 'missing' | 'discarded' | 'conflict' | 'available'; selected: EffectiveValue | null; evidence: { candidate: Candidate; source: Message | null }[] };
export type EffectiveSheet = Record<Field, EffectiveField>;
type Input = { candidates: Candidate[]; messages: Message[]; reviews: Record<string, Review>; baselines: Record<string, string[]>; resolutions: Record<string, 'keep' | 'adopt'> };

export function deriveEffective(input: Input): EffectiveSheet {
  const { candidates, messages, reviews, baselines, resolutions } = input;
  const source = (c: Candidate) => messages.find(m => m.id === c.messageId) ?? null;
  const key = (c: Candidate) => { const m = source(c); return m ? candidateKey(c, m) : ''; };
  const result = {} as EffectiveSheet;
  for (const field of fieldNames) {
    const items = candidates.filter(c => c.field === field);
    const evidence = items.map(candidate => ({ candidate, source: source(candidate) }));
    const fieldReviews = Object.entries(reviews).filter(([, r]) => r.candidate.field === field);
    const humanReviews = fieldReviews.map(([, r]) => r);
    const keys = items.map(key);
    const ambiguous = keys.some((k, i) => !k || keys.indexOf(k) !== i);
    const relevant = fieldReviews.filter(([k]) => keys.includes(k));
    if (ambiguous || fieldReviews.length !== relevant.length || relevant.length > 1) { result[field] = { status: 'conflict', selected: null, evidence, humanReviews }; continue; }
    const [reviewKey, review] = relevant[0] ?? [];
    if (review?.status === 'discarded') {
      result[field] = { status: items.length > 1 ? 'conflict' : 'discarded', selected: null, evidence, humanReviews }; continue;
    }
    if (review && ((review.status === 'confirmed' && items.length > 1) || (review.status === 'corrected' && (baselines[reviewKey]?.length ?? 0) > 1))) { result[field] = { status: 'conflict', selected: null, evidence, humanReviews }; continue; }
    let chosen: Candidate | undefined;
    let provenance: EffectiveValue['provenance'] = 'candidate';
    if (review) {
      const changed = conflictsForReview(review, items).filter(c => !baselines[reviewKey]?.includes(JSON.stringify([key(c), c.value])));
      const decisions = changed.map(c => resolutions[JSON.stringify([reviewKey, key(c), c.value])]);
      const adopted = changed.filter((_, i) => decisions[i] === 'adopt');
      if (decisions.some(d => !d) || adopted.length > 1) { result[field] = { status: 'conflict', selected: null, evidence, humanReviews }; continue; }
      if (adopted.length === 1) { chosen = adopted[0]; provenance = 'adopted'; }
      else {
        chosen = items.find(c => key(c) === reviewKey);
        provenance = review.status;
      }
    } else {
      if (!items.length) { result[field] = { status: 'missing', selected: null, evidence, humanReviews }; continue; }
      if (items.length > 1) { result[field] = { status: 'conflict', selected: null, evidence, humanReviews }; continue; }
      chosen = items[0];
    }
    if (!chosen) { result[field] = { status: 'conflict', selected: null, evidence, humanReviews }; continue; }
    const corrected = provenance === 'corrected';
    result[field] = { status: 'available', evidence, humanReviews, selected: { value: corrected ? review.value : chosen.value, provenance, source: corrected ? review.source : source(chosen), quote: corrected ? review.candidate.quote : chosen.quote, note: corrected ? review.note : '', metadata: corrected ? null : { precision: chosen.precision, subject: chosen.subject, incomeBasis: chosen.incomeBasis, debtIncluded: chosen.debtIncluded, uncertainty: chosen.uncertainty } } };
  }
  return result;
}
