import { fields, type Assertion, type Gold } from '../types';
import { metrics, type Counts } from './score';
import type { Message } from '../../../src/intake/extraction';

/** Conservative semantic v2: a match is a supported equivalence, not a semantic proof. */
export const semanticVersion = 'semantic-v2';
const normalized = (s: string) => s.normalize('NFKC').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ');
const aliases: Record<string, Record<string, string>> = {
 subjectRef: { hermana: 'sister', sister: 'sister', yo: 'speaker', speaker: 'speaker' },
 currency: { '€': 'eur', euro: 'eur', euros: 'eur', eur: 'eur' },
 period: { mensual: 'month', mes: 'month', month: 'month', anual: 'year', año: 'year', year: 'year', quincena: 'quincena', '30_days': '30_days' },
 obligation: { 'muebles financiados': 'furniture_financing', furniture_financing: 'furniture_financing' },
};
const nullOptional = new Set(['period', 'normalized', 'restrictedAmount', 'restrictedUntil', 'availableAmount', 'min', 'max', 'amountText']);
const category = (key: string) => ({ subjectRef: 'subject', scope: 'scope', state: 'modality', polarity: 'modality', certainty: 'modality', derivation: 'modality', basisDerivation: 'modality', precision: 'precision', period: 'temporality', normalized: 'temporality', availability: 'availability', restrictedAmount: 'availability', restrictedUntil: 'availability', availableAmount: 'availability', evidence: 'evidence' } as Record<string, string>)[key] ?? 'value';
function eq(key: string, a: unknown, b: unknown): boolean {
 if (typeof a === 'string' && typeof b === 'string') {
  const x = normalized(a), y = normalized(b);
  return (aliases[key]?.[x] ?? x) === (aliases[key]?.[y] ?? y);
 }
 return JSON.stringify(a) === JSON.stringify(b);
}
// Ignore punctuation and function words only; all substantive words, numbers and negations must remain in order.
function evidenceEquivalent(actual: string, gold: string): boolean {
 const tokens = (s: string) => normalized(s).match(/[\p{L}\p{N}]+/gu)?.filter(t => !['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del'].includes(t)) ?? [];
 const a = tokens(actual), g = tokens(gold);
 if (!g.length) return false;
 return a.some((_, i) => (i === 0 || !['no', 'sin', 'nunca', 'ni'].includes(a[i - 1])) && g.every((token, j) => a[i + j] === token));
}
function evidenceInContext(text: string, quote: string): boolean {
 const index = text.indexOf(quote);
 if (index < 0) return false;
 // A literal substring cannot omit an immediately preceding negation or conditional.
 return !/\b(?:no|sin|nunca|ni|si)\s+$/iu.test(text.slice(0, index));
}
function subjectEquivalent(a: Assertion, g: Assertion, message: Message | undefined): boolean {
 const x = a.value.subjectRef, y = g.value.subjectRef;
 if (x === y) return true;
 if (!message || message.role !== 'customer' || message.text === null || a.value.scope !== 'individual' || g.value.scope !== 'individual') return false;
 const text = normalized(message.text), quote = normalized(g.evidence.quote);
 if (!text.includes(normalized(a.evidence.quote)) || !text.includes(quote)) return false;
 const refs = [x, y].map(v => typeof v === 'string' ? normalized(v) : v);
 const individualSpeaker = (r: unknown) => r === undefined || r === 'customer' || r === 'speaker' || r === 'yo';
 const otherPeople = /\b(?:herman[oa]s?|madre|padre|hij[oa]s?|pareja|espos[oa]|marido|mujer|ell[ao]s?|vecin[oa]s?|amig[oa]s?|t[ií]as?|abuelas?|compa[nñ]eras?)\b/u.test(text);
 const firstPerson = /^(?:yo\s+)?(?:tengo|dispongo|pago|cobro|gano|percibo|ahorro|ingreso|declaro)\b/u.test(quote) || /^yo\b/u.test(quote);
 if (refs.every(individualSpeaker) && firstPerson && (!otherPeople || (refs.every(r => r !== undefined) && /\byo\b/u.test(quote)))) return true;
 const sister = (r: unknown) => r === 'sister' || r === 'hermana';
 if ((sister(refs[0]) && sister(refs[1])) || ((sister(refs[0]) && refs[1] === 'ella') || (sister(refs[1]) && refs[0] === 'ella'))) {
  const sisters = text.match(/\bhermana\b/gu) ?? [];
  const ambiguous = /\b(?:hermanas|madre|hija|pareja|esposa|mujer|ellas|vecina|amiga|t[ií]a|abuela|compa[nñ]era)\b/u.test(text) || /\b(?:mi|tu|su|la|una)\s+(?!hermana\b)[\p{L}]+/u.test(text.slice(text.indexOf('hermana') + 'hermana'.length, text.indexOf(quote)));
  return sisters.length === 1 && !ambiguous && (/\bella\b/u.test(quote) || /\bhermana\b/u.test(quote));
 }
 return false;
}
function compare(a: Assertion, g: Assertion, messages: Message[]): string[] {
 const errors: string[] = [];
 if (a.field !== g.field) return ['field'];
 if (a.derivation !== g.derivation || a.normalization?.unresolved.includes('modality')) errors.push('modality');
 const keys = new Set([...Object.keys(a.value), ...Object.keys(g.value)]);
 for (const key of keys) {
  if (key === 'relationEvidence') {
   if (typeof a.value[key] === 'string' && (!normalized(a.evidence.quote).includes(normalized(a.value[key] as string)) || (typeof g.value[key] === 'string' && !evidenceEquivalent(a.value[key] as string, g.value[key] as string)))) errors.push('evidence');
   continue;
  }
  const x = a.value[key], y = g.value[key];
  if (key === 'subjectRef') {
   if (a.normalization?.unresolved.includes(key)) errors.push('contract');
   else if (!subjectEquivalent(a, g, messages.find(m => m.id === g.evidence.messageId))) errors.push('subject');
   continue;
  }
  if (key === 'amountText') {
   if (typeof x === 'string') {
    if (!normalized(a.evidence.quote).includes(normalized(x))) errors.push('evidence');
    const number = normalized(x).match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/);
    if (number && typeof a.value.amount === 'number' && Number(number[0].replace(/\./g, '').replace(',', '.')) !== a.value.amount) errors.push('value');
   }
   continue;
  }
  if ((key === 'min' || key === 'max') && y == null && typeof x === 'number' && x === a.value.amount && x === g.value.amount) continue;
  if (x == null && y == null && nullOptional.has(key)) continue;
  if (x === undefined && y === undefined) continue;
  // A's unresolved fields are never promoted to verified matches.
  if (a.normalization?.unresolved.includes(key)) { errors.push('contract'); continue; }
  if (!eq(key, x, y)) errors.push(category(key));
 }
 const message = messages.find(m => m.id === a.evidence.messageId);
 if (a.evidence.messageId !== g.evidence.messageId || !message || message.role !== 'customer' || message.text === null || !evidenceInContext(message.text, a.evidence.quote) || !evidenceInContext(message.text, g.evidence.quote) || !evidenceEquivalent(a.evidence.quote, g.evidence.quote)) errors.push('evidence');
 return [...new Set(errors)];
}
export function scoreSemanticV2(actual: Assertion[], gold: Gold, messages: Message[]) {
 const matches = new Map<number, number>();
 const visit = (i: number, seen: Set<number>): boolean => {
  for (let j = 0; j < gold.assertions.length; j++) {
   if (seen.has(j) || compare(actual[i], gold.assertions[j], messages).length) continue;
   seen.add(j);
   if (!matches.has(j) || visit(matches.get(j)!, seen)) { matches.set(j, i); return true; }
  }
  return false;
 };
 actual.forEach((_, i) => visit(i, new Set()));
 const matchedActual = new Set(matches.values());
 const counts: Counts = { tp: matches.size, fp: actual.length - matches.size, fn: gold.assertions.length - matches.size };
 const byField = Object.fromEntries(fields.map(field => {
  const tp = [...matches.keys()].filter(j => gold.assertions[j].field === field).length;
  const c = { tp, fp: actual.filter(a => a.field === field).length - tp, fn: gold.assertions.filter(a => a.field === field).length - tp };
  return [field, { ...c, ...metrics(c) }];
 }));
 const discrepancies = actual.flatMap((a, i) => matchedActual.has(i) ? [] : [{ actualIndex: i, field: a.field, candidates: gold.assertions.flatMap((g, j) => g.field === a.field ? [{ goldIndex: j, categories: compare(a, g, messages) }] : []) }]);
 return { version: semanticVersion, counts, ...metrics(counts), byField, discrepancies, matches: [...matches].map(([goldIndex, actualIndex]) => ({ goldIndex, actualIndex })) };
}
