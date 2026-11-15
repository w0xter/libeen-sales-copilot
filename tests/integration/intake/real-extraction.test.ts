import { describe, expect, it } from 'vitest';
import { cases } from '../../../src/fixtures';
import { extract, openAITransport, type Message } from '../../../src/intake/extraction';

const text = (id: string, role: Message['role'], value: string): Message => ({ id, role, text: value });
const alcala: Message[] = [
  text('a1', 'advisor', 'Contadme qué estáis buscando y en qué zona.'),
  text('c1', 'customer', 'Mi pareja y yo queremos comprar por Alcalá de Henares o cerca. Nos gustaría mudarnos dentro de unos cinco o seis meses.'),
  text('a2', 'advisor', '¿Tenéis una idea de vuestros ingresos y ahorros?'),
  text('c2', 'customer', 'Entre los dos entran unos 3.100 € al mes, pero no te sabría decir si te interesa el bruto o el neto. Tenemos aproximadamente 9.000 € guardados. Y de la moto pago una cuota de 120 € al mes.'),
  text('a3', 'advisor', '¿Os interesa conocer SmartHousing?'),
  text('c3', 'customer', 'Sí, nos interesa explorar SmartHousing, pero primero queremos entender cómo funciona.'),
];
const variation: Message[] = [text('v1', 'customer', 'Busco con mi hermana una vivienda en Getafe. Quizás dentro de nueve meses. Ganamos juntas alrededor de 2.700 euros mensuales, sin saber si son netos o brutos. Hemos guardado unos 7.500 euros y pagamos 90 euros al mes por un préstamo. Nos gustaría conocer SmartHousing.')];
const attribution = [text('a', 'advisor', 'Entonces ganáis 5.000 € netos entre los dos, ¿verdad?'), text('c', 'customer', 'No puedo confirmar esa cifra todavía.')];
const real = process.env.RUN_REAL_EXTRACTION === '1' ? describe : describe.skip;

real('P1: proveedor real, conversaciones ficticias', () => {
  it('analiza chats nuevos y casos de referencia sin replay', async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('Falta OPENAI_API_KEY');
    const transport = openAITransport(key, process.env.OPENAI_MODEL || 'gpt-4.1-mini');
    const inputs: [string, Message[]][] = [
      ['alcala', alcala], ['variation', variation],
      ...cases.map(c => [c.caseId, c.messages.map(m => ({ id: m.messageId, role: m.role === 'customer' ? 'customer' as const : 'advisor' as const, text: m.content.type === 'text' ? m.content.text : null }))] as [string, Message[]]),
      ['attribution', attribution],
    ];
    for (const [name, messages] of inputs) {
      const result = await extract(messages, transport);
      console.log(JSON.stringify({ name, result }));
      expect(result.ok, `${name}: proveedor o respuesta fallidos`).toBe(true);
      if (!result.ok) continue;
      if (name === 'alcala' || name === 'variation') {
        expect.soft(Object.values(result.fields).filter(v => v.length).length).toBeGreaterThanOrEqual(3);
        expect.soft(result.fields.debts.every(v => v.debtIncluded === 'unknown')).toBe(true);
      }
      if (name === 'attribution') expect.soft(result.fields.income).toEqual([]);
      if (name === 'laura') {
        expect.soft(result.fields.interest).toEqual([]);
        expect.soft(result.fields.debts.every(v => v.debtIncluded === 'unknown')).toBe(true);
      }
      if (name === 'javier') expect.soft(Object.values(result.fields).flat().every(v => v.messageId !== 'javier-m4')).toBe(true);
      if (name === 'rosa') {
        expect.soft(result.fields.savings.some(v => /\b0\b|cero/i.test(v.value))).toBe(true);
        expect.soft(result.fields.interest).toEqual([]);
        expect.soft(result.fields.location).toEqual([]);
      }
    }
  }, 240000);
});
