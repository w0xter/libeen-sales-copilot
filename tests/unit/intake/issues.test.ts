import { describe, expect, it } from 'vitest';
import { extract, type Message } from '../../../src/intake/extraction';
import { identifyIssues } from '../../../src/intake/issues';

type Field = 'interest' | 'location' | 'horizon' | 'buyers' | 'income' | 'savings' | 'debts';
const candidate = (field: Field, value: string, extra: Record<string, unknown> = {}) => ({ field, value, messageId: 'c', quote: 'datos', precision: 'explicit', subject: 'joint', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null, ...extra });
const base = [candidate('location', 'Valencia'), candidate('horizon', 'antes del verano'), candidate('buyers', '2'), candidate('income', '3800 EUR/mes', { incomeBasis: 'net' }), candidate('savings', '18000 EUR'), candidate('debts', '250 EUR/mes')];
const message = (text = 'datos'): Message[] => [{ id: 'c', role: 'customer', text }];
async function run(candidates: unknown[], messages = message(), discarded = false) {
  const extraction = await extract(messages, async () => ({ candidates: discarded ? [...candidates, {}] : candidates }));
  return { extraction, result: identifyIssues(extraction, messages) };
}

describe('incidencias de intake', () => {
  it('Laura conserva la ficha y señala interés ausente y cuota incierta', async () => {
    const { extraction, result } = await run(base);
    expect(extraction.ok && extraction.fields.income[0].value).toBe('3800 EUR/mes');
    expect(extraction.ok && extraction.fields.savings[0].value).toBe('18000 EUR');
    expect(extraction.ok && extraction.fields.debts[0].value).toBe('250 EUR/mes');
    expect(result.ok && result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'missing', field: 'interest' }), expect.objectContaining({ category: 'ambiguous', field: 'debts', messageId: 'c' })]));
  });
  it('Javier señala base, ahorro, audio y objeción sin perder ingresos', async () => {
    const messages: Message[] = [...message('datos. No confío en vosotros.'), { id: 'audio', role: 'customer', text: null }];
    const { extraction, result } = await run([candidate('income', '2000–3000 EUR/mes')], messages);
    expect(extraction.ok && extraction.fields.income).toHaveLength(1);
    expect(result.ok && result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'ambiguous', field: 'income' }), expect.objectContaining({ category: 'missing', field: 'savings' }), expect.objectContaining({ category: 'inaccessible', messageId: 'audio' }), expect.objectContaining({ category: 'sensitive', messageId: 'c' })]));
  });
  it('Rosa informa cero y pide revisión por aprobación escrita y urgencia', async () => {
    const { result } = await run([candidate('savings', '0 EUR')], message('datos. Necesito aprobación por escrito. Necesito vivienda urgente.'));
    expect(result.ok && result.issues.some(i => i.category === 'missing' && i.field === 'savings')).toBe(false);
    expect(result.ok && result.issues.filter(i => i.category === 'sensitive')).toHaveLength(2);
  });
  it('Alcalá conserva siete campos sin alertar por aproximaciones útiles', async () => {
    const all = [candidate('interest', 'sí'), ...base.map(c => c.field === 'income' ? { ...c, incomeBasis: 'unknown', precision: 'approximate' } : { ...c, precision: 'approximate' })];
    const { extraction, result } = await run(all);
    expect(extraction.ok && Object.values(extraction.fields).every(items => items.length === 1)).toBe(true);
    expect(result.ok && result.issues.filter(i => i.category === 'ambiguous').map(i => i.field)).toEqual(['income', 'debts']);
  });
  it('procesa extracción parcial y advierte de descartes', async () => {
    const { extraction, result } = await run([candidate('savings', '9000 EUR')], message(), true);
    expect(extraction.ok && extraction.fields.savings).toHaveLength(1);
    expect(result.ok && result.incomplete).toBe(true);
    expect(result.ok && result.issues.some(i => i.field === 'income' && i.category === 'missing')).toBe(true);
  });
  it('separa fallo de B de información ausente', () => {
    expect(identifyIssues({ ok: false, error: 'provider_error' }, message())).toEqual({ ok: false, error: 'provider_error' });
  });
  it('no convierte garantía negada o hipotética en petición', async () => {
    const { result } = await run([], message('No necesito una garantía. Si pidiera una garantía, sería más adelante.'));
    expect(result.ok && result.issues.filter(i => i.category === 'sensitive')).toHaveLength(0);
  });
  it('revisa la oposición al contacto del cliente, no la del asesor', async () => {
    const messages: Message[] = [{ id: 'a', role: 'advisor', text: 'No me llaméis.' }, { id: 'c', role: 'customer', text: 'datos. No me llaméis.' }];
    const { result } = await run([], messages);
    expect(result.ok && result.issues.filter(i => i.category === 'sensitive')).toEqual([expect.objectContaining({ messageId: 'c', review: 'human' })]);
  });
  it('señala incertidumbre, sujeto desconocido y cantidades incompatibles', async () => {
    const { result } = await run([candidate('income', '2000 EUR', { subject: 'unknown', uncertainty: 'Cantidad dudosa' }), candidate('income', '3000 EUR')]);
    expect(result.ok && result.issues.some(i => i.category === 'ambiguous' && i.description.includes('sujeto'))).toBe(true);
    expect(result.ok && result.issues.some(i => i.category === 'ambiguous' && i.description.includes('incompatibles'))).toBe(true);
    expect(result.ok && result.issues.some(i => i.category === 'ambiguous' && i.description.includes('Cantidad dudosa'))).toBe(true);
  });
});
