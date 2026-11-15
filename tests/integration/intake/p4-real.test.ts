import { describe, expect, it } from 'vitest';
import { openAITransport, type Message } from '../../../src/intake/extraction';
import { runIntake } from '../../../src/intake/run-intake';

const real = process.env.RUN_P4_REAL === '1' ? describe : describe.skip;
real('P4: inferencia real con conversación ficticia inédita', () => {
  it('muestra las tres salidas del recorrido', async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('Falta OPENAI_API_KEY');
    const messages: Message[] = [
      { id: 'n1', role: 'customer', text: 'Quiero buscar piso en León con mi hermano, calculamos mudarnos dentro de un año.' },
      { id: 'n2', role: 'advisor', text: '¿Qué ingresos y ahorros tenéis disponibles?' },
      { id: 'n3', role: 'customer', text: 'Entre ambos cobramos unos 2.600 euros netos al mes. Tenemos guardados unos 6.000 euros; no sé todavía qué opciones ofrece SmartHousing.' },
    ];
    const result = await runIntake(messages, openAITransport(key, process.env.OPENAI_MODEL || 'gpt-4.1-mini'));
    console.log('P4_REAL', JSON.stringify(result));
    expect(result.extraction.ok, 'Fallo del proveedor o respuesta inválida').toBe(true);
    if (result.extraction.ok) expect(Object.values(result.extraction.fields).filter(items => items.length).length).toBeGreaterThanOrEqual(3);
  }, 60000);
});
