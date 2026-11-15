import type { extract, Message } from './extraction';

type Extraction = Extract<Awaited<ReturnType<typeof extract>>, { ok: true }>;
export type Candidate = Extraction['fields'][keyof Extraction['fields']][number];
export type Review = { status: 'confirmed' | 'corrected' | 'discarded'; candidate: Candidate; source: Message; value: string; note: string };
type Action = { action: 'confirm' | 'discard' | 'restore' } | { action: 'correct'; value: string; note: string };

export function applyReview(candidate: Candidate, source: Message, action: Action): Review | null {
  if (action.action === 'restore') return null;
  return { status: action.action === 'confirm' ? 'confirmed' : action.action === 'discard' ? 'discarded' : 'corrected', candidate: { ...candidate }, source: { ...source }, value: action.action === 'correct' ? action.value : candidate.value, note: action.action === 'correct' ? action.note : '' };
}
