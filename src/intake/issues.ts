import type { extract, Message } from './extraction';
import { intakeRules, type IntakeRules } from './rules';

type Extraction = Awaited<ReturnType<typeof extract>>;
type Fields = Extract<Extraction, { ok: true }>['fields'];
type Field = keyof Fields;
export type Issue = {
  id: string;
  category: 'missing' | 'ambiguous' | 'inaccessible' | 'sensitive';
  description: string;
  field?: Field;
  messageId?: string;
  quote?: string;
  review: 'clarification' | 'human';
  reason?: 'debt_inclusion' | 'income_basis';
};


/** Propuestas revisables; la extracción original permanece en poder del consumidor. */
export function identifyIssues(extraction: Extraction, messages: Message[], rules: IntakeRules = intakeRules):
  | { ok: false; error: Extract<Extraction, { ok: false }>['error'] }
  | { ok: true; issues: Issue[]; incomplete: boolean } {
  if (!extraction.ok) return { ok: false, error: extraction.error };
  const issues: Issue[] = [];
  const add = (issue: Omit<Issue, 'id'>) => issues.push({ id: `issue-${issues.length + 1}`, ...issue });
  for (const field of rules.requiredFields) {
    if (!extraction.fields[field].length) add({ category: 'missing', field, description: `Falta información sobre ${field}.`, review: 'clarification' });
  }
  for (const signal of extraction.semanticIssues ?? []) {
    const income = extraction.fields.income.find(c => c.messageId === signal.messageId && c.quote === signal.quote);
    // Una aproximación conocida no exige una cifra exacta. No descartar conflictos.
    const approximationOnly = signal.category === 'ambiguous' && signal.field === 'income' && income?.precision === 'approximate' && income.incomeBasis !== 'unknown' && income.subject !== 'unknown' && /aproximad/i.test(signal.explanation) && /importe exacto|cifra exacta/i.test(signal.explanation) && !/contradic|conflict|incompatib|brut|sujeto/i.test(signal.explanation);
    const clarifiedHistory = signal.category === 'ambiguous' && signal.field === 'income' && income?.precision === 'approximate' && /posteriormente se aclara/i.test(signal.explanation) && !/contradic|conflict|incompatib/i.test(signal.explanation) && extraction.fields.income.some(c => c.messageId !== signal.messageId && c.debtIncluded !== 'unknown' && /cuota/i.test(c.quote));
    const moneyCandidate = (signal.field === 'income' || signal.field === 'savings') && extraction.fields[signal.field].find(c => c.messageId === signal.messageId && c.quote === signal.quote);
    // Solo descripciones completas que expresan aproximación y nada más.
    const onlyApproximationDescription = /^(?:(?:el |la )?(?:importe|cantidad|cifra) aproximad[oa] de (?:los |las )?(?:ingresos|ahorros)(?: conjuntos?| declarados?)?|(?:los |las )?(?:ingresos|ahorros) son aproximados?)\.?$/i.test(signal.explanation.trim());
    const approxWithoutMaterialDoubt = signal.category === 'ambiguous' && moneyCandidate && moneyCandidate.precision === 'approximate' && moneyCandidate.subject !== 'unknown' && (signal.field !== 'income' || moneyCandidate.incomeBasis !== 'unknown') && (!moneyCandidate.uncertainty || /^aproximad[oa](?: \(['"]?(?:unos?|m[aá]s o menos|aproximadamente)['"]?\))?\.?$/i.test(moneyCandidate.uncertainty.trim())) && (moneyCandidate.quote.match(/\d[\d.,]*/g) ?? []).length === 1 && !/\b(?:o|quiz[aá]|duda|no s[eé])\b/i.test(moneyCandidate.quote.replace(/m[aá]s o menos/gi, 'aproximadamente')) && onlyApproximationDescription;
    if (!signal.reason && (approximationOnly || clarifiedHistory || approxWithoutMaterialDoubt)) continue;
    // Compatibilidad con respuestas anteriores al motivo tipado. No convertir
    // contradicciones ni incidencias sensibles en una pregunta de cuota.
    const legacyDebtInclusion = !signal.reason && signal.category === 'ambiguous' && (signal.field === 'debts' || signal.field === 'income') && /cuota/i.test(signal.explanation) && /(?:inclui|inclusi[oó]n|descontad)/i.test(signal.explanation) && /ingres/i.test(signal.explanation) && !/contradic|conflict|incompatib/i.test(signal.explanation);
    const reason = signal.category === 'ambiguous' && !/contradic|conflict|incompatib/i.test(signal.explanation) && (signal.field === 'income' || signal.field === 'debts')
      ? signal.reason === 'debt_inclusion' || legacyDebtInclusion ? 'debt_inclusion' : signal.reason === 'income_basis' && signal.field === 'income' ? 'income_basis' : undefined
      : undefined;
    if (issues.some(i => i.category === signal.category && i.field === (signal.field ?? undefined) && i.messageId === signal.messageId && i.quote === signal.quote)) continue;
    add({ category: signal.category, ...(signal.field ? { field: signal.field } : {}), messageId: signal.messageId, quote: signal.quote, description: signal.explanation, ...(reason ? { reason } : {}), review: signal.category === 'sensitive' ? 'human' : 'clarification' });
  }
  // Una cuota declarada con inclusión desconocida requiere revisión incluso si
  // el proveedor omite la señal. No deducir la respuesta de mensajes posteriores.
  const unresolvedDebts = extraction.fields.debts.filter(c => c.debtIncluded === 'unknown' && !/^\s*0(?:[.,]0+)?\s*(?:€|eur(?:os?)?)?(?:\s*\/\s*mes)?\s*$/i.test(c.value));
  if (unresolvedDebts.length) {
    const first = unresolvedDebts[0];
    const firstIndex = messages.findIndex(m => m.id === first.messageId);
    const laterCustomer = messages.slice(firstIndex + 1).some(m => m.role === 'customer');
    const requiresHuman = extraction.fields.debts.length > 1 || extraction.fields.income.length > 1 || laterCustomer;
    // La incidencia derivada representa la misma duda que una señal del modelo.
    for (let i = issues.length - 1; i >= 0; i--) if (issues[i].category === 'ambiguous' && issues[i].reason === 'debt_inclusion') issues.splice(i, 1);
    add({ category: 'ambiguous', field: 'debts', reason: 'debt_inclusion', messageId: first.messageId, quote: first.quote,
      description: requiresHuman ? 'Revisa la conversación para aclarar si la cuota está descontada de los ingresos.' : 'No se conoce si la cuota está descontada de los ingresos.',
      review: requiresHuman ? 'human' : 'clarification' });
  }
  for (const field of Object.keys(extraction.fields) as Field[]) {
    const candidates = extraction.fields[field];
    for (const c of candidates) {
      const source = { field, messageId: c.messageId, quote: c.quote };
      if (extraction.semanticIssues === undefined) {
      if (c.uncertainty || c.precision === 'uncertain') add({ category: 'ambiguous', ...source, description: c.uncertainty || 'El dato se ha extraído con precisión incierta.', review: 'clarification' });
      if (field === 'income' && c.incomeBasis === 'unknown') add({ category: 'ambiguous', ...source, description: 'No se conoce si los ingresos son netos o brutos.', reason: 'income_basis', review: 'clarification' });
      if (['income', 'savings', 'debts'].includes(field) && c.subject === 'unknown') add({ category: 'ambiguous', ...source, description: 'No se conoce el sujeto del dato económico.', review: 'clarification' });
      }
      const message = messages.find(m => m.id === c.messageId);
      if (!message || message.role !== 'customer' || message.text === null || !message.text.includes(c.quote)) add({ category: 'inaccessible', ...source, description: 'La fuente no permite atribuir con seguridad este dato al cliente.', review: 'human' });
    }
    // Solo cantidades simples: no interpretar rangos ni resolver rectificaciones.
    if (extraction.semanticIssues === undefined && ['income', 'savings', 'debts'].includes(field) && candidates.length > 1) {
      const simple = candidates.filter(c => (c.value.match(/\d[\d.,]*/g) || []).length === 1);
      for (let i = 0; i < simple.length; i++) for (let j = i + 1; j < simple.length; j++) {
        const a = simple[i], b = simple[j];
        if (a.value.match(/\d[\d.,]*/)?.[0] !== b.value.match(/\d[\d.,]*/)?.[0] && (a.subject === b.subject || a.subject === 'unknown' || b.subject === 'unknown') && !/\b(?:corrijo|rectifico|quise decir)\b/i.test(b.quote)) {
          add({ category: 'ambiguous', field, messageId: b.messageId, quote: b.quote, description: `Posibles cantidades incompatibles; comparar con el mensaje ${a.messageId}.`, review: 'clarification' });
        }
      }
    }
  }
  for (const message of messages) {
    if (message.role !== 'customer') continue;
    if (message.text === null) {
      add({ category: 'inaccessible', messageId: message.id, description: 'Mensaje del cliente sin texto accesible.', review: 'human' });
      continue;
    }
    for (const sentence of message.text.split(/[.!?¿¡;]+/).map(s => s.trim()).filter(Boolean)) {
      if (issues.some(i => i.category === 'sensitive' && i.messageId === message.id && i.quote && (sentence.includes(i.quote) || i.quote.includes(sentence)))) continue;
      // La detección solo actúa ante formulaciones afirmativas evidentes.
      if (/\b(?:no|nunca|si|quizás|quizá|hipotéticamente)\b/i.test(sentence)) {
        if (/\bno\s+(?:me\s+)?(?:contact(?:éis|en|es)|llam(?:éis|en|es)|escrib(?:áis|an|as))\b/i.test(sentence)) add({ category: 'sensitive', messageId: message.id, quote: sentence, description: 'Posible petición de no contacto; requiere revisión humana.', review: 'human' });
        else if (/\bno conf[ií]o\b/i.test(sentence)) add({ category: 'sensitive', messageId: message.id, quote: sentence, description: 'Posible objeción de confianza; requiere revisión humana.', review: 'human' });
        continue;
      }
      if (/\b(?:necesito|quiero|solicito|pido)\b.*\b(?:aprobaci[oó]n|garant[ií]a)\b/i.test(sentence)) add({ category: 'sensitive', messageId: message.id, quote: sentence, description: 'Posible solicitud de aprobación o garantía; requiere revisión humana.', review: 'human' });
      if (/\b(?:urgente|urgencia)\b/i.test(sentence) && /\b(?:vivienda|casa|alojamiento|mud(?:ar|anza))\b/i.test(sentence)) add({ category: 'sensitive', messageId: message.id, quote: sentence, description: 'Posible urgencia de vivienda; requiere revisión humana.', review: 'human' });
    }
  }
  // Un opt-out total posterior debe ser el motivo visible, sin ocultar otros riesgos.
  const totalOptOut = /\bno\s+quiero\s+que\s+(?:volv[aá]is\s+a\s+)?contactarme\s+de\s+ninguna\s+manera\b/i;
  const latest = [...messages].reverse().find(m => m.role === 'customer' && m.text && totalOptOut.test(m.text));
  if (latest?.text) {
    let issue = issues.find(i => i.category === 'sensitive' && i.messageId === latest.id && i.quote && totalOptOut.test(i.quote));
    if (!issue) {
      const quote = latest.text.match(totalOptOut)![0];
      add({ category: 'sensitive', messageId: latest.id, quote, description: 'El cliente solicita no ser contactado de ninguna manera.', review: 'human' });
      issue = issues[issues.length - 1];
    }
    issues.splice(issues.indexOf(issue), 1);
    const firstSensitive = issues.findIndex(i => i.category === 'sensitive');
    issues.splice(firstSensitive < 0 ? issues.length : firstSensitive, 0, issue);
  }
  return { ok: true, issues, incomplete: extraction.discarded > 0 };
}
