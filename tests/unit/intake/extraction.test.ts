import { describe, expect, it } from 'vitest';
import { extract, type Message } from '../../../src/intake/extraction';

const messages: Message[] = [
  { id: 'a', role: 'advisor', text: '¿Ganáis 5.000 €?' },
  { id: 'c', role: 'customer', text: 'No puedo confirmarlo. Tenemos unos 9.000 € ahorrados.' },
];
const candidate = { field: 'savings', value: '9000 EUR', messageId: 'c', quote: 'unos 9.000 € ahorrados', precision: 'approximate', subject: 'joint', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null };

describe('extracción mínima', () => {
  it('conserva candidatos válidos y descarta fuentes inválidas sin perderlos', async () => {
    const result = await extract(messages, async input => {
      expect(input).toEqual(messages);
      return { candidates: [candidate, { ...candidate, field: 'income', messageId: 'a', quote: '5.000 €' }, { ...candidate, field: 'savings', quote: 'texto inexistente' }] };
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fields.savings).toEqual([candidate]);
    expect(result.fields.income).toEqual([]);
    expect(result.discarded).toBe(2);
  });

  it('distingue ausencia válida de respuesta malformada y fallo del proveedor', async () => {
    const empty = await extract(messages, async () => ({ candidates: [] }));
    expect(empty.ok && empty.fields.savings).toEqual([]);
    expect(await extract(messages, async () => ({ wrong: [] }))).toMatchObject({ ok: false, error: 'invalid_response' });
    expect(await extract(messages, async () => { throw new Error('provider'); })).toMatchObject({ ok: false, error: 'provider_error' });
  });

  it('rechaza evidencia de audio y conserva cero declarado', async () => {
    const input: Message[] = [{ id: 'audio', role: 'customer', text: null }, { id: 'zero', role: 'customer', text: 'No tengo ahorros.' }];
    const result = await extract(input, async () => ({ candidates: [{ ...candidate, value: '0 EUR', messageId: 'zero', quote: 'No tengo ahorros.', precision: 'explicit' }, { ...candidate, messageId: 'audio', quote: 'audio' }] }));
    expect(result.ok && result.fields.savings.map(item => item.value)).toEqual(['0 EUR']);
  });
});
