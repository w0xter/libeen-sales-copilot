import { fields, type Assertion, type Field, type Gold } from '../types';

const canonical = (value: unknown): unknown => {
  if (typeof value === 'string') return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'relationEvidence').sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
};
const sameValue = (a: Assertion, b: Assertion) => !a.normalization?.unresolved.includes('modality') && a.field === b.field && a.derivation === b.derivation && JSON.stringify(canonical(a.value)) === JSON.stringify(canonical(b.value));
const evidence = (a: Assertion, b: Assertion) => a.evidence.messageId === b.evidence.messageId && a.evidence.quote.includes(b.evidence.quote);
export type Counts = { tp: number; fp: number; fn: number };
export function metrics({ tp, fp, fn }: Counts) {
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  return { precision, recall, f1: precision === null || recall === null || precision + recall === 0 ? (precision === 0 || recall === 0 ? 0 : null) : 2 * precision * recall / (precision + recall) };
}
export function scoreCase(actual: Assertion[], gold: Gold) {
  // Both bounds use maximum one-to-one matching; the upper bound is deliberately optimistic.
  const match = (compatible: (a: Assertion, b: Assertion) => boolean) => {
    const result = new Map<number, number>();
    const visit = (i: number, seen: Set<number>): boolean => {
      for (let j = 0; j < gold.assertions.length; j++) {
        if (seen.has(j) || !compatible(actual[i], gold.assertions[j]) || !evidence(actual[i], gold.assertions[j])) continue;
        seen.add(j);
        if (!result.has(j) || visit(result.get(j)!, seen)) { result.set(j, i); return true; }
      }
      return false;
    };
    actual.forEach((_, i) => visit(i, new Set()));
    return result;
  };
  const matches = match(sameValue);
  const possible = match((a, b) => {
    if (sameValue(a, b)) return true;
    if (!a.normalization || a.field !== b.field) return false;
    const unresolved = new Set(a.normalization.unresolved);
    return Object.entries(a.value).every(([key, value]) =>
      unresolved.has(key) || key === 'relationEvidence' || !(key in b.value) || JSON.stringify(canonical(value)) === JSON.stringify(canonical(b.value[key])));
  });
  const paired = new Set(matches.values());
  const byField = Object.fromEntries(fields.map((f: Field) => {
    const tp = [...matches.entries()].filter(([j]) => gold.assertions[j].field === f).length;
    return [f, { tp, fp: actual.filter(a => a.field === f).length - tp, fn: gold.assertions.filter(a => a.field === f).length - tp }];
  })) as Record<Field, Counts>;
  const byFieldBounds = Object.fromEntries(fields.map(f => {
    const lower = [...matches.keys()].filter(j => gold.assertions[j].field === f).length;
    const upper = [...possible.keys()].filter(j => gold.assertions[j].field === f).length;
    return [f, { definiteMatches: lower, possibleMatches: upper, definiteFalsePositives: actual.filter(a => a.field === f).length - upper, definiteOmissions: gold.assertions.filter(a => a.field === f).length - upper }];
  }));
  return { byFieldBounds, bounds: { definiteMatches: matches.size, possibleMatches: possible.size, definiteFalsePositives: actual.length - possible.size, definiteOmissions: gold.assertions.length - possible.size }, counts: { tp: matches.size, fp: actual.length - matches.size, fn: gold.assertions.length - matches.size }, byField,
    evidenceErrors: actual.filter((a, i) => !paired.has(i) && gold.assertions.some(g => sameValue(a, g) && !evidence(a, g))).length,
    falsePositives: actual.filter((_, i) => !paired.has(i)), omissions: gold.assertions.filter((_, j) => !matches.has(j)) };
}
