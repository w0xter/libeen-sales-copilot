import type { extract, Message } from './extraction';

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
};

const essential: Field[] = ['interest', 'location', 'horizon', 'buyers', 'income', 'savings'];

/** Propuestas revisables; la extracción original permanece en poder del consumidor. */
export function identifyIssues(extraction: Extraction, messages: Message[]):
  | { ok: false; error: Extract<Extraction, { ok: false }>['error'] }
  | { ok: true; issues: Issue[]; incomplete: boolean } {
  if (!extraction.ok) return { ok: false, error: extraction.error };
  const issues: Issue[] = [];
  const add = (issue: Omit<Issue, 'id'>) => issues.push({ id: `issue-${issues.length + 1}`, ...issue });
  for (const field of essential) {
    if (!extraction.fields[field].length) add({ category: 'missing', field, description: `Falta información sobre ${field}.`, review: 'clarification' });
  }
  for (const field of Object.keys(extraction.fields) as Field[]) {
    const candidates = extraction.fields[field];
    for (const c of candidates) {
      const source = { field, messageId: c.messageId, quote: c.quote };
      if (c.uncertainty || c.precision === 'uncertain') add({ category: 'ambiguous', ...source, description: c.uncertainty || 'El dato se ha extraído con precisión incierta.', review: 'clarification' });
      if (field === 'income' && c.incomeBasis === 'unknown') add({ category: 'ambiguous', ...source, description: 'No se conoce si los ingresos son netos o brutos.', review: 'clarification' });
      if (field === 'debts' && c.debtIncluded === 'unknown') add({ category: 'ambiguous', ...source, description: 'No se conoce si la cuota está descontada de los ingresos.', review: 'clarification' });
      if (['income', 'savings', 'debts'].includes(field) && c.subject === 'unknown') add({ category: 'ambiguous', ...source, description: 'No se conoce el sujeto del dato económico.', review: 'clarification' });
      const message = messages.find(m => m.id === c.messageId);
      if (!message || message.role !== 'customer' || message.text === null || !message.text.includes(c.quote)) add({ category: 'inaccessible', ...source, description: 'La fuente no permite atribuir con seguridad este dato al cliente.', review: 'human' });
    }
    // Solo cantidades simples: no interpretar rangos ni resolver rectificaciones.
    if (['income', 'savings', 'debts'].includes(field) && candidates.length > 1) {
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
  return { ok: true, issues, incomplete: extraction.discarded > 0 };
}
