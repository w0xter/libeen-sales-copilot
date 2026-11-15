import { describe, expect, it } from 'vitest';
import { runIntake } from '../../../src/intake/run-intake';
import type { Message } from '../../../src/intake/extraction';

const c = (field: string, value: string, messageId: string, quote: string, extra = {}) => ({ field, value, messageId, quote, precision: 'explicit', subject: 'individual', incomeBasis: 'net', debtIncluded: 'unknown', uncertainty: null, ...extra });
const signal = (category: string, field: string | null, messageId: string, quote: string, explanation = 'Requiere atención') => ({ category, field, messageId, quote, explanation });

describe('señales semánticas en B/D/E', () => {
  it('prioriza revisión humana y valida que la evidencia pertenezca al cliente', async () => {
    const messages: Message[] = [{ id: 'a', role: 'advisor', text: 'No me contactéis.' }, { id: 'c', role: 'customer', text: 'No quiero que volváis a contactarme.' }];
    const result = await runIntake(messages, async () => ({ candidates: [], semanticIssues: [signal('sensitive', null, 'c', 'No quiero que volváis a contactarme.'), signal('sensitive', null, 'a', 'No me contactéis.'), signal('sensitive', null, 'c', 'inventado')] }));
    expect(result.intervention.kind).toBe('human_review');
    expect(result.issues.ok && result.issues.issues.filter(i => i.category === 'sensitive')).toHaveLength(1);
    expect(result.extraction.ok && result.extraction.discarded).toBe(2);
  });
  it('no revive dudas resueltas, deuda cero ni diferencias entre periodos', async () => {
    const messages: Message[] = [{ id: 'c', role: 'customer', text: 'Deudas 0. En mayo 1600 y en junio 2000. Cuota de 240.' }, { id: 'd', role: 'customer', text: 'La cuota ya estaba descontada.' }];
    const candidates = [c('debts', '0', 'c', 'Deudas 0'), c('income', '1600 mayo', 'c', 'En mayo 1600', { uncertainty: 'Un mes' }), c('income', '2000 junio', 'c', 'en junio 2000'), c('debts', '240', 'c', 'Cuota de 240', { uncertainty: 'No recordaba' }), c('debts', '240', 'd', 'La cuota ya estaba descontada.', { debtIncluded: 'included' })];
    const result = await runIntake(messages, async () => ({ candidates, semanticIssues: [] }));
    expect(result.issues.ok && result.issues.issues.filter(i => i.category === 'ambiguous')).toEqual([]);
  });
  it('conserva una contradicción material única y revisa una garantía condicional', async () => {
    const messages: Message[] = [{ id: 'c', role: 'customer', text: 'En junio fueron 2000 o 1200. Si garantizáis la aprobación, sigo.' }];
    const result = await runIntake(messages, async () => ({ candidates: [], semanticIssues: [signal('ambiguous', 'income', 'c', 'En junio fueron 2000 o 1200.'), signal('ambiguous', 'income', 'c', 'En junio fueron 2000 o 1200.'), signal('sensitive', null, 'c', 'Si garantizáis la aprobación, sigo.')] }));
    expect(result.issues.ok && result.issues.issues.filter(i => i.category === 'ambiguous')).toHaveLength(1);
    expect(result.intervention.kind).toBe('human_review');
  });
  it('rechaza una estructura semántica malformada', async () => {
    const result = await runIntake([], async () => ({ candidates: [], semanticIssues: 'bad' }));
    expect(result.intervention).toEqual({ kind: 'error', error: 'invalid_response' });
  });
});

describe('regresiones LBE-09 y LBE-21', () => {
  it('recupera una cita con elipsis inicial y registra los descartes sin modificar la respuesta pública', async () => {
    const { extract } = await import('../../../src/intake/extraction');
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: 'Compraría yo sola y preferiría mudarme en abril de 2028.' }];
    const diagnostics: unknown[] = [];
    const result = await extract(messages, async () => ({ candidates: [c('horizon', 'abril de 2028', 'm1', '... preferiría mudarme en abril de 2028.'), c('income', '5', 'm1', '... inventado')], semanticIssues: [] }), x => diagnostics.push(x));
    expect(result.ok && result.fields.horizon[0].quote).toBe('preferiría mudarme en abril de 2028.');
    expect(result.ok && result.discarded).toBe(1);
    expect(diagnostics).toEqual([expect.objectContaining({ kind: 'candidate', reason: 'quote_not_found', item: expect.objectContaining({ field: 'income' }) })]);
    expect(result).not.toHaveProperty('diagnostics');
  });
  it('prioriza el opt-out total posterior y conserva otras alertas sensibles', async () => {
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: 'No me llaméis.' }, { id: 'm2', role: 'customer', text: 'No confío en vosotros.' }, { id: 'm3', role: 'customer', text: 'No quiero que volváis a contactarme de ninguna manera, ni por aquí ni por teléfono.' }];
    const result = await runIntake(messages, async () => ({ candidates: [], semanticIssues: [signal('sensitive', null, 'm1', 'No me llaméis.', 'Contacto anterior'), signal('sensitive', null, 'm2', 'No confío en vosotros.', 'Desconfianza'), signal('sensitive', null, 'm3', messages[2].text!, 'Opt-out total')] }));
    expect(result.intervention).toMatchObject({ kind: 'human_review', reason: 'Opt-out total' });
    expect(result.issues.ok && result.issues.issues.some(i => i.description === 'Desconfianza')).toBe(true);
  });
});
