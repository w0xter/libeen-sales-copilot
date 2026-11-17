import { extract, type DiscardDiagnostic, type Message } from '../../../src/intake/extraction';

type Transport = (messages: Message[]) => Promise<unknown>;
type ExtractionResult = Awaited<ReturnType<typeof extract>>;
type Accepted = Extract<ExtractionResult, { ok: true }>['fields'];

/** Calls the delivered V0 unchanged and captures both sides of its filters. */
export const baseline = {
  async run(messages: Message[], transport: Transport): Promise<{
    raw?: unknown;
    accepted?: Accepted;
    discards: DiscardDiagnostic[];
    error?: 'invalid_input' | 'invalid_response' | 'provider_error';
  }> {
    let raw: unknown;
    const discards: DiscardDiagnostic[] = [];
    const result = await extract(messages, async input => {
      raw = await transport(input);
      return raw;
    }, diagnostic => discards.push(diagnostic));
    return result.ok
      ? { raw, accepted: result.fields, discards }
      : { raw, discards, error: result.error };
  },
};

import type { Adapter, Assertion, TransportResult } from '../types';

/** Normalize only attributes represented by A or explicit local text; preserve uncertainty. */
export function normalizeBaseline(item: unknown): Assertion | null {
 if (!item || typeof item !== 'object') return null;
 const c = item as Record<string, unknown>;
 if (typeof c.field !== 'string' || typeof c.value !== 'string' || typeof c.messageId !== 'string' || typeof c.quote !== 'string' || !['interest', 'location', 'horizon', 'buyers', 'income', 'savings', 'debts'].includes(c.field)) return null;
 const raw = c.value.trim(), quote = c.quote, text = `${raw} ${quote}`;
 const value: Record<string, unknown> = {}; const unresolved: string[] = [];
 const uncertain = /[¿?]|\b(?:quiz[aá]s?|tal vez|si tuviera|podr[ií]a|no s[eé])\b/i.test(text) || c.precision === 'uncertain' || !!c.uncertainty;
 if (uncertain) unresolved.push('modality');
 if (c.field === 'interest') {
  const negative = /\b(?:no (?:me |nos )?interesa|no quiero|rechazo|descarto|no me interesa|no nos interesa)\b/i.test(text);
  const positive = /\b(?:me interesa|nos interesa|quiero|queremos|interesad[oa]s?|estoy mirando)\b/i.test(text);
  const product = /smart\s*housing|alquiler[^.!?]{0,60}(?:compra|comprar)/i.test(text);
  const informational = /informaci[oó]n|\bsaber\b|\bconocer\b|preguntar/i.test(text);
  if (!uncertain && !informational && product && negative) value.polarity = 'negative';
  else if (!uncertain && !informational && product && positive && !/\bno\b/i.test(text)) value.polarity = 'positive';
  else unresolved.push('polarity');
 } else if (c.field === 'location') {
  if (raw) value.area = raw;
  // A's evidentiary precision does not encode geographic granularity.
  unresolved.push('area', 'precision');
 } else if (c.field === 'buyers') {
  const words: Record<string, number> = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
  const n = /^\d+$/.test(raw) ? Number(raw) : words[raw.toLowerCase()];
  if (n !== undefined) value.count = n; else unresolved.push('count');
  unresolved.push('certainty');
 } else if (c.field === 'horizon') {
  value.text = raw; unresolved.push('text');
  const months: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
  const date = /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de (\d{4})$/i.exec(raw);
  if (date) value.normalized = `${date[2]}-${months[date[1].toLowerCase()]}`;
  else if (!/\d{4}/.test(raw)) value.normalized = null; else unresolved.push('normalized');
  unresolved.push('certainty');
 } else {
  const numberPattern = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
  const numbers = [...raw.matchAll(numberPattern)].map(m => Number(m[0].replace(/\./g, '').replace(',', '.')));
  const negativeDebt = c.field === 'debts' && /\b(?:sin|no (?:tengo|tenemos))\s+(?:cr[eé]ditos|deudas|cuotas)/i.test(text);
  const range = /\b(?:entre|desde)\b.*\b(?:y|hasta)\b/i.test(raw) || /\d\s*[-–]\s*\d/.test(raw);
  if (negativeDebt) value.amount = null;
  else if (range && numbers.length === 2 && numbers[0] <= numbers[1]) { value.amount = null; value.amountRange = { min: numbers[0], max: numbers[1] }; }
  else if (numbers.length === 1) value.amount = numbers[0];
  else if (c.field === 'savings' && /\b(?:sin ahorros|no (?:tengo|tenemos) ahorros|cero)\b/i.test(text)) value.amount = 0;
  else if (!(c.field === 'debts' && /\b(?:sin|no (?:tengo|tenemos))\s+(?:cr[eé]ditos|deudas|cuotas)/i.test(text))) unresolved.push('amount');
  if (negativeDebt) value.currency = null; else if (/€|euros?/i.test(text)) value.currency = 'EUR'; else unresolved.push('currency');
  if (c.subject === 'individual') value.scope = 'individual'; else if (c.subject === 'joint') value.scope = 'collective'; else unresolved.push('scope');
  const periods: [RegExp, string][] = [[/mensual|al mes|cada mes|\/mes/i, 'month'], [/anual|al año|por año/i, 'year'], [/quincena/i, 'quincena'], [/cada treinta días|cada 30 días/i, '30_days']];
  const found = periods.filter(([re]) => re.test(raw)).map(([, v]) => v);
  if (found.length === 1) value.period = found[0];
  else if (found.length > 1) unresolved.push('period');
  else if (periods.some(([re]) => re.test(quote)) && [...quote.matchAll(numberPattern)].length !== 1) unresolved.push('period');
  else value.period = periods.find(([re]) => re.test(quote))?.[1] ?? null;
  if (negativeDebt) { /* no monetary precision applies */ }
  else if (c.precision === 'explicit') value.precision = 'exact';
  else if (c.precision === 'approximate') value.precision = 'approximate';
  else if (c.precision === 'range' && /aprox|unos|alrededor/i.test(text)) value.precision = 'approximate_range';
  else unresolved.push('precision');
  if (c.field === 'income') {
   if (c.incomeBasis === 'net' || c.incomeBasis === 'gross') value.basis = c.incomeBasis; else unresolved.push('basis');
   if (/\b(?:netos?|brutos?|l[ií]quidos?)\b/i.test(quote)) value.basisDerivation = 'explicit'; else unresolved.push('basisDerivation');
   if (/ingresos? totales?|total de ingresos/i.test(text)) value.kind = 'total'; else unresolved.push('kind');
   unresolved.push('subjectRef', 'paymentsPerYear');
  } else if (c.field === 'savings') {
   if (/inmoviliz|bloquead|restric/i.test(quote)) unresolved.push('availability', 'restrictedAmount', 'restrictedUntil', 'availableAmount');
   else value.availability = value.amount === 0 && /sin ahorros|no (?:tengo|tenemos) ahorros|cero/i.test(text) ? 'none_declared' : 'not_established';
  } else {
   if (/\b(?:sin|no (?:tengo|tenemos))\s+(?:cr[eé]ditos|deudas|cuotas)/i.test(text)) value.state = 'none_declared';
   else if (/cuota|deuda|cr[eé]dito|financiaci[oó]n|pr[eé]stamo/i.test(text)) value.state = 'positive'; else unresolved.push('state');
   if (!negativeDebt) {
    if (c.debtIncluded === 'included' || c.debtIncluded === 'excluded' || c.debtIncluded === 'unknown') value.includedInIncome = c.debtIncluded; else unresolved.push('includedInIncome');
    unresolved.push('obligation', 'installmentIndex');
   }
  }
 }
 return { field: c.field as Assertion['field'], value, evidence: { messageId: c.messageId, quote }, derivation: 'explicit', normalization: { unresolved, originalValue: c.value } };
}
export const baselineAdapter: Adapter = { async run(messages, transport, model) {
  let captured: TransportResult | undefined;
  let errorDetail: string | undefined;
  const result = await baseline.run(messages, async input => {
    try { captured = await transport(input, { arm: 'A', model }); } catch (error) { errorDetail = error instanceof Error ? error.message : String(error); throw error; }
    return captured.raw;
  });
  const candidates = result.accepted ? Object.values(result.accepted).flat().map(normalizeBaseline).filter((x): x is Assertion => x !== null) : [];
  return { raw: result.raw, rawText: captured?.rawText, errorDetail, originalAccepted: result.accepted, accepted: candidates, discards: result.discards, error: result.error, usage: captured?.usage, provider: captured?.provider, parameters: captured?.parameters,
    limitations: ['A interest requires SmartHousing; gold does not', 'A values are free text and do not encode all gold attributes; A cannot encode all gold attributes; unresolved attributes require adjudication'] };
} };
