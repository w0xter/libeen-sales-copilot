import { fields, type Field } from '../types';
import { metrics, type Counts, type scoreCase } from './score';
type Row = { caseId: string; iteration: number; arm: 'A' | 'B' | 'C'; score: ReturnType<typeof scoreCase> | null };
export function pairedComparison(rows: Row[]) {
 const keys = new Map<string, { A?: Row; B?: Row }>();
 for (const row of rows) if (row.arm !== 'C') {
  const key = `${row.iteration}:${row.caseId}`; const pair = keys.get(key) ?? {}; pair[row.arm] = row; keys.set(key, pair);
 }
 const pairs = [...keys.values()].filter((p): p is { A: Row & { score: NonNullable<Row['score']> }; B: Row & { score: NonNullable<Row['score']> } } => !!p.A?.score && !!p.B?.score);
 const group = (selectedFields: readonly Field[]) => {
  const aggregate = (arm: 'A' | 'B', upper: boolean) => {
   const counts = pairs.reduce<Counts>((sum, pair) => {
    for (const f of selectedFields) {
     const base = pair[arm].score.byField[f];
     const tp = upper ? pair[arm].score.byFieldBounds[f].possibleMatches : base.tp;
     sum.tp += tp; sum.fp += base.tp + base.fp - tp; sum.fn += base.tp + base.fn - tp;
    }
    return sum;
   }, { tp: 0, fp: 0, fn: 0 });
   return { ...counts, ...metrics(counts) };
  };
  const aLow = aggregate('A', false), aHigh = aggregate('A', true), b = aggregate('B', false);
  return { aLower: aLow, aUpper: aHigh, b, aF1Interval: { min: aLow.f1, max: aHigh.f1 }, bMinusAF1Interval: { min: b.f1 === null || aHigh.f1 === null ? null : b.f1 - aHigh.f1, max: b.f1 === null || aLow.f1 === null ? null : b.f1 - aLow.f1 } };
 };
 return { pairedCases: pairs.length, incompletePairs: keys.size - pairs.length, interest: group(['interest']), otherFields: group(fields.filter(f => f !== 'interest')), allFields: group(fields) };
}

/** Paired semantic counts use only complete A/B attempts; historical bounds remain unchanged. */
export function pairedSemanticComparison(rows: { caseId: string; iteration: number; arm: 'A' | 'B' | 'C'; semanticScore: { counts: Counts } | null }[]) {
 const keys = new Map<string, { A?: Counts; B?: Counts }>();
 for (const row of rows) {
  if (row.arm === 'C') continue;
  const key = `${row.iteration}:${row.caseId}`, pair = keys.get(key) ?? {};
  if (row.semanticScore) pair[row.arm] = row.semanticScore.counts;
  keys.set(key, pair);
 }
 const pairs = [...keys.values()].filter((p): p is { A: Counts; B: Counts } => !!p.A && !!p.B);
 const aggregate = (arm: 'A' | 'B') => {
  const counts = pairs.reduce<Counts>((sum, p) => ({ tp: sum.tp + p[arm].tp, fp: sum.fp + p[arm].fp, fn: sum.fn + p[arm].fn }), { tp: 0, fp: 0, fn: 0 });
  return { counts, ...metrics(counts) };
 };
 return { version: 'semantic-v1', pairedCases: pairs.length, incompletePairs: keys.size - pairs.length, A: aggregate('A'), B: aggregate('B') };
}
