import type { FactAssertion, FactSchema, Message } from '../../../contracts';
import { ClaimCandidateSchema, type ClaimCandidate, type ClaimGroup } from './contracts';
import { validateCandidate } from './evidence';
import { occurrenceKey } from './alignment';

type GroupContext = { factSchema: FactSchema; assertions: FactAssertion[]; caseId?: string };
type Diagnostic = { candidateId: string; code: 'invalid_candidate' | 'missing_focus' | 'ambiguous_occurrence' | 'duplicate_candidate' | 'duplicate_extractor' | 'subject_unverified' | 'subject_disagreement' };

export function groupClaims(candidates: ClaimCandidate[], messages: Message[], context: GroupContext): { groups: ClaimGroup[]; rejected: ClaimCandidate[]; diagnostics: Diagnostic[] } {
  const groups = new Map<string, ClaimGroup>();
  const rejected: ClaimCandidate[] = [];
  const diagnostics: Diagnostic[] = [];
  const ids = new Set<string>();
  const conflicted = new Set<string>();
  const sorted = [...candidates].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
  // Only independently validated focuses may influence alignment.
  const textual = sorted.flatMap(candidate => {
    if (!ClaimCandidateSchema.safeParse(candidate).success || !validateCandidate(candidate, context.factSchema, messages, context.assertions) || (candidate.subjectRef.scope === 'case' && context.caseId !== undefined && candidate.subjectRef.id !== context.caseId)) return [];
    const message = messages.find(m => m.messageId === candidate.occurrence.messageId);
    if (!message || message.content.type !== 'text') return [];
    const result = occurrenceKey(candidate.fieldId, candidate.occurrence, message.content.text);
    if (!result.key || result.numeric) return [];
    const focus = candidate.occurrence.focusSpan!;
    return [{ fieldId: candidate.fieldId, messageId: candidate.occurrence.messageId, start: focus.start, end: focus.end }];
  });
  for (const candidate of sorted) {
    const reject = (code: Diagnostic['code']) => { rejected.push(candidate); diagnostics.push({ candidateId: candidate.candidateId, code }); };
    if (!ClaimCandidateSchema.safeParse(candidate).success || !validateCandidate(candidate, context.factSchema, messages, context.assertions) || (candidate.subjectRef.scope === 'case' && context.caseId !== undefined && candidate.subjectRef.id !== context.caseId)) { reject('invalid_candidate'); continue; }
    if (ids.has(candidate.candidateId)) { reject('duplicate_candidate'); continue; }
    ids.add(candidate.candidateId);
    const message = messages.find(m => m.messageId === candidate.occurrence.messageId)!;
    if (message.content.type !== 'text') { reject('invalid_candidate'); continue; }
    const alignment = occurrenceKey(candidate.fieldId, candidate.occurrence, message.content.text);
    let key = alignment.key;
    if (!key) { reject(alignment.reason ?? 'missing_focus'); continue; }
    if (!alignment.numeric) {
      const focus = candidate.occurrence.focusSpan!;
      const peers = textual.filter(p => p.messageId === candidate.occurrence.messageId && p.fieldId === candidate.fieldId);
      const minimal = peers.filter(p => !peers.some(q => q.start >= p.start && q.end <= p.end && (q.start > p.start || q.end < p.end)));
      const overlaps = new Map(minimal.filter(p => p.start < focus.end && p.end > focus.start).map(p => [JSON.stringify([p.start, p.end]), p]));
      if (overlaps.size !== 1) { reject('ambiguous_occurrence'); continue; }
      const anchor = [...overlaps.values()][0];
      if (anchor.start < focus.start || anchor.end > focus.end) { reject('ambiguous_occurrence'); continue; }
      key = JSON.stringify([candidate.occurrence.messageId, candidate.fieldId, anchor.start, anchor.end]);
    }
    const group = groups.get(key);
    const extractorKey = JSON.stringify([key, candidate.extractorId]);
    if (conflicted.has(extractorKey)) { reject('duplicate_extractor'); continue; }
    const duplicate = group?.candidates.find(c => c.extractorId === candidate.extractorId);
    if (duplicate && group) {
      const { candidateId: ignoredFirst, ...first } = duplicate;
      const { candidateId: ignoredSecond, ...second } = candidate;
      void ignoredFirst; void ignoredSecond;
      if (JSON.stringify(first) !== JSON.stringify(second)) {
        group.candidates = group.candidates.filter(c => c !== duplicate);
        rejected.push(duplicate);
        diagnostics.push({ candidateId: duplicate.candidateId, code: 'duplicate_extractor' });
        conflicted.add(extractorKey);
        if (!group.candidates.length) groups.delete(key);
        else group.occurrence = group.candidates[0].occurrence;
      }
      reject('duplicate_extractor'); continue;
    }
    if (!context.assertions.some(a => a.subjectRef.scope === candidate.subjectRef.scope && a.subjectRef.id === candidate.subjectRef.id) && !(candidate.subjectRef.scope === 'case' && candidate.subjectRef.id === context.caseId)) diagnostics.push({ candidateId: candidate.candidateId, code: 'subject_unverified' });
    if (group && group.candidates.some(c => c.subjectRef.scope !== candidate.subjectRef.scope || c.subjectRef.id !== candidate.subjectRef.id)) diagnostics.push({ candidateId: candidate.candidateId, code: 'subject_disagreement' });
    if (group) group.candidates.push(candidate);
    else groups.set(key, { groupId: key, fieldId: candidate.fieldId, occurrence: candidate.occurrence, candidates: [candidate] });
  }
  return { groups: [...groups.values()].sort((a, b) => {
    const x = JSON.parse(a.groupId) as [string, string, number, number];
    const y = JSON.parse(b.groupId) as [string, string, number, number];
    return x[0].localeCompare(y[0], 'en') || x[1].localeCompare(y[1], 'en') || x[2] - y[2] || x[3] - y[3];
  }), rejected, diagnostics };
}
