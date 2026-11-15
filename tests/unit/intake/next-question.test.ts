import { describe, expect, it } from 'vitest';
import { extract, type Message } from '../../../src/intake/extraction';
import { identifyIssues, type Issue } from '../../../src/intake/issues';
import { nextQuestion } from '../../../src/intake/next-question';

type Field = 'interest' | 'location' | 'horizon' | 'buyers' | 'income' | 'savings' | 'debts';
const candidate = (field: Field, value: string, extra: Record<string, unknown> = {}) => ({ field, value, messageId: 'c', quote: 'datos', precision: 'explicit', subject: 'joint', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null, ...extra });
const messages: Message[] = [{ id: 'c', role: 'customer', text: 'datos' }];
const laura = [candidate('location', 'Valencia'), candidate('horizon', 'antes del verano'), candidate('buyers', '2'), candidate('income', '3800 EUR/mes', { incomeBasis: 'net' }), candidate('savings', '18000 EUR'), candidate('debts', '250 EUR/mes')];
async function run(candidates: unknown[], sensitive?: Issue, discarded = false) {
  const extraction = await extract(messages, async () => ({ candidates: discarded ? [...candidates, {}] : candidates }));
  const issues = identifyIssues(extraction, messages);
  if (sensitive && issues.ok) issues.issues.push(sensitive);
  return nextQuestion(extraction, issues);
}

describe('siguiente intervención', () => {
  it('Laura aclara la cuota antes del interés y después pregunta por SmartHousing', async () => {
    const first = await run(laura);
    expect(first).toMatchObject({ kind: 'question', field: 'debts', issueId: expect.any(String) });
    if (first.kind === 'question') expect(first.question).toMatch(/cuota/i);
    const clarified = laura.map(c => c.field === 'debts' ? { ...c, debtIncluded: 'included' } : c);
    const second = await run(clarified);
    expect(second).toMatchObject({ kind: 'question', field: 'interest' });
    if (second.kind === 'question') expect(second.question).toMatch(/SmartHousing/i);
  });
  it('Alcalá prioriza la base de ingresos frente a la cuota', async () => {
    const result = await run([candidate('interest', 'sí'), ...laura.map(c => c.field === 'income' ? { ...c, incomeBasis: 'unknown' } : c)]);
    expect(result).toMatchObject({ kind: 'question', field: 'income' });
    if (result.kind === 'question') expect(result.question).toMatch(/netos o brutos/i);
  });
  it.each(['Rosa: solicitud de aprobación', 'Javier: objeción de confianza'])('%s requiere asesor con una alerta simulada', async description => {
    const sensitive: Issue = { id: 'sensitive-simulated', category: 'sensitive', description, review: 'human', messageId: 'c' };
    const result = await run(laura, sensitive);
    expect(result).toMatchObject({ kind: 'human_review', label: 'Revisión del asesor', issueId: 'sensitive-simulated' });
    expect(result).not.toHaveProperty('question');
  });
  it('una extracción parcial utiliza la incidencia disponible antes de los faltantes', async () => {
    const result = await run([candidate('income', '3100 EUR/mes')], undefined, true);
    expect(result).toMatchObject({ kind: 'question', field: 'income' });
    if (result.kind === 'question') expect(result.question).toMatch(/netos o brutos/i);
  });
  it('un fallo de extracción se conserva sin inventar una pregunta', () => {
    const extraction = { ok: false, error: 'provider_error' } as const;
    expect(nextQuestion(extraction, identifyIssues(extraction, messages))).toEqual({ kind: 'error', error: 'provider_error' });
  });
  it('una ficha sin incidencias no añade acciones', async () => {
    const result = await run([candidate('interest', 'sí'), ...laura.map(c => c.field === 'debts' ? { ...c, debtIncluded: 'included' } : c)]);
    expect(result).toEqual({ kind: 'none', label: 'Sin preguntas pendientes prioritarias' });
  });
  it('elige faltantes según P0 aunque D los entregue desordenados', async () => {
    const extraction = await extract(messages, async () => ({ candidates: [] }));
    const issues = identifyIssues(extraction, messages);
    if (issues.ok) issues.issues.reverse();
    expect(nextQuestion(extraction, issues)).toMatchObject({ kind: 'question', field: 'interest' });
  });
});
