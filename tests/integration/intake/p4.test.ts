import { describe, expect, it } from 'vitest';
import { cases } from '../../../src/fixtures';
import type { Message } from '../../../src/intake/extraction';
import { runIntake } from '../../../src/intake/run-intake';

type Field = 'interest' | 'location' | 'horizon' | 'buyers' | 'income' | 'savings' | 'debts';
const c = (field: Field, value: string, messageId: string, quote: string, extra = {}) => ({ field, value, messageId, quote, precision: 'explicit', subject: 'joint', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null, ...extra });
const original = (id: string): Message[] => cases.find(x => x.caseId === id)!.messages.map(m => ({ id: m.messageId, role: m.role === 'customer' ? 'customer' : 'advisor', text: m.content.type === 'text' ? m.content.text : null }));
const simulated = (candidates: unknown[]) => async () => ({ candidates });
const laura = [c('location','Valencia','laura-m1','Valencia'), c('horizon','antes del verano','laura-m1','antes del verano'), c('buyers','2','laura-m1','mi pareja y yo'), c('income','3800 EUR/mes','laura-m3','3.800 € netos',{incomeBasis:'net'}), c('savings','18000 EUR','laura-m3','18.000'), c('debts','250 EUR/mes','laura-m4','250 € al mes')];

describe('P4: recorrido con respuestas simuladas', () => {
  it('Alcalá conserva datos y prioriza la base de ingresos', async () => {
    const messages: Message[] = [{id:'c',role:'customer',text:'Alcalá, dos, 3100 al mes, 9000 ahorrados, cuota 120, seis meses, SmartHousing'}];
    const candidates = [c('location','Alcalá','c','Alcalá'),c('buyers','2','c','dos'),c('income','3100 EUR/mes','c','3100 al mes'),c('savings','9000 EUR','c','9000 ahorrados'),c('debts','120 EUR/mes','c','cuota 120'),c('horizon','seis meses','c','seis meses'),c('interest','sí','c','SmartHousing')];
    const result = await runIntake(messages, simulated(candidates));
    expect(result.extraction.ok && result.extraction.fields.income[0].quote).toBe('3100 al mes');
    expect(result.issues.ok && result.issues.issues.some(i => i.field === 'debts')).toBe(true);
    expect(result.intervention).toMatchObject({kind:'question',field:'income'});
  });
  it('Laura cambia de cuota a interés tras aclaración', async () => {
    const messages = original('laura');
    const first = await runIntake(messages, simulated(laura));
    const updated = [...messages, {id:'clarification',role:'customer' as const,text:'Sí, los 3.800 € ya son después del coche.'}];
    const second = await runIntake(updated, simulated(laura.map(x => x.field === 'debts' ? {...x, debtIncluded:'included'} : x)));
    expect(first.intervention).toMatchObject({kind:'question',field:'debts'});
    expect(second.intervention).toMatchObject({kind:'question',field:'interest'});
  });
  it('Javier original conserva rango y audio inaccesible', async () => {
    const result = await runIntake(original('javier'), simulated([c('income','2000–3000','javier-m3','entre 2000 y 3000',{precision:'range',subject:'individual'})]));
    expect(result.extraction.ok && result.extraction.fields.income[0].value).toBe('2000–3000');
    expect(result.issues.ok && result.issues.issues.some(i => i.category === 'inaccessible' && i.messageId === 'javier-m4')).toBe(true);
    expect(result.issues.ok && result.issues.issues.some(i => i.category === 'sensitive')).toBe(false);
  });
  it('Rosa original conserva ahorro cero y muestra el límite del detector', async () => {
    const result = await runIntake(original('rosa'), simulated([c('savings','0','rosa-m1','Ahorros no tenemos')]));
    expect(result.extraction.ok && result.extraction.fields.savings[0].value).toBe('0');
    expect(result.issues.ok && result.issues.issues.some(i => i.category === 'sensitive')).toBe(false);
  });
  it('chat inédito conserva datos y señala faltantes y descarte', async () => {
    const messages: Message[] = [{id:'new',role:'customer',text:'Busco en León, puedo aportar 6000 euros y quizá en un año.'}];
    const result = await runIntake(messages, simulated([c('location','León','new','León'),c('savings','6000 euros','new','6000 euros'),c('horizon','un año','new','un año'),{}]));
    expect(result.extraction.ok && result.extraction.discarded).toBe(1);
    expect(result.issues.ok && result.issues.incomplete).toBe(true);
    expect(result.intervention).toMatchObject({kind:'question',field:'interest'});
  });
  it('descarta cifra atribuida al asesor', async () => {
    const messages: Message[] = [{id:'a',role:'advisor',text:'¿Ingresáis 5000 euros?'},{id:'c',role:'customer',text:'No puedo confirmarlo.'}];
    const result = await runIntake(messages, simulated([c('income','5000 euros','a','5000 euros')]));
    expect(result.extraction.ok && result.extraction.fields.income).toEqual([]);
    expect(result.extraction.ok && result.extraction.discarded).toBe(1);
  });
  it('propaga error del proveedor por B, D y E', async () => {
    const result = await runIntake(original('laura'), async () => { throw new Error('unavailable'); });
    expect(result.extraction).toEqual({ok:false,error:'provider_error'});
    expect(result.issues).toEqual({ok:false,error:'provider_error'});
    expect(result.intervention).toEqual({kind:'error',error:'provider_error'});
  });
  it('una alerta sensible producida por D lleva a revisión humana', async () => {
    const messages: Message[] = [{id:'c',role:'customer',text:'Necesito aprobación por escrito.'}];
    const result = await runIntake(messages, simulated([]));
    expect(result.intervention).toMatchObject({kind:'human_review'});
  });
});
