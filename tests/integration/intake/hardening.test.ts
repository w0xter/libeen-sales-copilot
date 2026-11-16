import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runIntake } from '../../../src/intake/run-intake';
import type { Message } from '../../../src/intake/extraction';

const replay = (name: string) => {
  const body = JSON.parse(readFileSync(`docs/current/evaluation/continuation/real-${name}.json`, 'utf8')).body;
  return { messages: body.messages as Message[], raw: { candidates: Object.values(body.extraction.fields).flat(), semanticIssues: body.extraction.semanticIssues } };
};
const candidate = (quote: string, value = 'Interesado en SmartHousing') => ({ field: 'interest', value, messageId: 'm1', quote, precision: 'explicit', subject: 'individual', incomeBasis: 'unknown', debtIncluded: 'unknown', uncertainty: null });

describe('H0: respuestas reales conservadas, reprocesadas sin inferencia', () => {
  it.each(['laura-initial', 'rosa'])('%s no consolida interés sin declaración explícita', async name => {
    const { messages, raw } = replay(name);
    const result = await runIntake(messages, async () => raw);
    expect(result.extraction.ok && result.extraction.fields.interest).toEqual([]);
    expect(result.issues.ok && result.issues.issues).toContainEqual(expect.objectContaining({ category: 'missing', field: 'interest' }));
  });
  it.each(['laura-initial', 'marta'])('%s pregunta por la relación cuota-ingresos', async name => {
    const { messages, raw } = replay(name);
    const result = await runIntake(messages, async () => raw);
    expect(result.intervention).toMatchObject({ kind: 'question', field: 'debts', question: expect.stringMatching(/cuota.*descontad.*ingresos/i) });
  });
  it('Laura tras aclaración no pregunta de nuevo por ingresos o cuota', async () => {
    const { messages, raw } = replay('laura-continuation');
    const result = await runIntake(messages, async () => raw);
    expect(result.intervention).toMatchObject({ kind: 'question', field: 'interest' });
  });
});

describe('H0: variantes sintéticas con transporte controlado', () => {
  it.each([
    ['Queremos explorar SmartHousing.', true],
    ['Busco vivienda en Valencia.', false],
    ['Si no compramos, ¿ofrecéis alquiler?', false],
    ['No me interesa SmartHousing.', true],
    ['Si me interesa SmartHousing, os avisaré.', false],
    ['No sé si quiero explorar SmartHousing.', false],
  ])('interpreta la declaración %s', async (quote, accepted) => {
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
    const result = await runIntake(messages, async () => ({ candidates: [candidate(quote, quote)], semanticIssues: [] }));
    expect(result.extraction.ok && result.extraction.fields.interest.length).toBe(accepted ? 1 : 0);
  });
});

it('no convierte rechazo explícito en interés positivo por el valor del modelo', async () => {
  const quote = 'No me interesa SmartHousing.';
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
  const result = await runIntake(messages, async () => ({ candidates: [candidate(quote)], semanticIssues: [] }));
  expect(result.extraction.ok && result.extraction.fields.interest[0]?.value).not.toMatch(/Interesado en SmartHousing/i);
});

it.each(['incluida', 'excluida'])('mantiene fuente de aclaración de cuota %s sin inventar importe', async status => {
  const messages: Message[] = [
    { id: 'm1', role: 'customer', text: 'Tenemos 3000 euros netos conjuntos al mes y pagamos una cuota de 200 euros.' },
    { id: 'm2', role: 'customer', text: status === 'incluida' ? 'La cuota ya está descontada de los ingresos.' : 'La cuota no está descontada de los ingresos.' },
  ];
  const result = await runIntake(messages, async () => ({ candidates: [
    { ...candidate('Tenemos 3000 euros netos conjuntos al mes'), field: 'income', value: '3000 euros netos conjuntos al mes', incomeBasis: 'net', subject: 'joint' },
    { ...candidate('pagamos una cuota de 200 euros'), field: 'debts', value: '200 euros', subject: 'joint', debtIncluded: 'unknown' },
    { ...candidate(messages[1].text!), field: 'debts', value: 'cuota', messageId: 'm2', subject: 'joint', debtIncluded: status === 'incluida' ? 'included' : 'excluded' },
  ], semanticIssues: [] }));
  expect(result.extraction.ok && result.extraction.fields.debts.some(c => c.messageId === 'm2' && c.debtIncluded === (status === 'incluida' ? 'included' : 'excluded'))).toBe(true);
  expect(result.issues.ok && result.issues.issues).toContainEqual(expect.objectContaining({ category: 'ambiguous', field: 'debts', review: 'human' }));
});

it('conserva corrección de base sin atribuirle una cifra que no repite', async () => {
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: 'Cobro unos 3000 euros al mes.' }, { id: 'm2', role: 'customer', text: 'Corrijo: son brutos, no netos.' }];
  const result = await runIntake(messages, async () => ({ candidates: [
    { ...candidate('Cobro unos 3000 euros al mes.'), field: 'income', value: 'unos 3000 euros al mes', precision: 'approximate', incomeBasis: 'unknown' },
    { ...candidate('Corrijo: son brutos, no netos.'), field: 'income', value: 'brutos', messageId: 'm2', incomeBasis: 'gross' },
  ], semanticIssues: [] }));
  expect(result.extraction.ok && result.extraction.fields.income[1]).toMatchObject({ value: 'brutos', messageId: 'm2', incomeBasis: 'gross' });
});

it.each(['laura-initial', 'rosa'])('%s deja interés pendiente en ficha y CRM', async name => {
  const { deriveEffective } = await import('../../../src/intake/effective');
  const { suggestedStage } = await import('../../../src/intake/commercial');
  const { crmPreview } = await import('../../../src/intake/export');
  const { messages, raw } = replay(name);
  const result = await runIntake(messages, async () => raw);
  if (!result.extraction.ok || !result.issues.ok) throw new Error('extracción fallida');
  const candidates = Object.values(result.extraction.fields).flat();
  const sheet = deriveEffective({ candidates, messages, reviews: {}, baselines: {}, resolutions: {} });
  expect(sheet.interest.status).toBe('missing');
  expect(suggestedStage({ analyzed: true, alias: name, sheet, pendingIssues: [] })).toBe('En cualificación');
  expect(crmPreview({ alias: name, stage: 'En cualificación', sheet, issues: [], current: true })).toContain('Interés en SmartHousing: Sin informar');
});

it('no omite la negación del mensaje al citar una frase positiva parcial', async () => {
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: 'No quiero explorar SmartHousing.' }];
  const result = await runIntake(messages, async () => ({ candidates: [candidate('quiero explorar SmartHousing')], semanticIssues: [] }));
  expect(result.extraction.ok && result.extraction.fields.interest).toEqual([]);
});

it('Laura conserva fuente independiente para la inclusión de la cuota', async () => {
  const { messages, raw } = replay('laura-continuation');
  const result = await runIntake(messages, async () => raw);
  if (!result.extraction.ok) throw new Error('extracción fallida');
  expect(result.extraction.fields.debts[0]).toMatchObject({ messageId: 'm4', debtIncluded: 'included', debtInclusionSource: { messageId: 'm5', quote: expect.stringContaining('descontada la cuota del coche') } });
});

it.each([
  ['La cuota no está descontada de los ingresos.', 'excluded'],
  ['La cuota ya está descontada de los ingresos.', 'included'],
] as const)('atribuye inclusión %s a la fuente posterior', async (quote, inclusion) => {
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: 'Pago cuota de 200 euros.' }, { id: 'm2', role: 'customer', text: quote }];
  const result = await runIntake(messages, async () => ({ candidates: [
    { ...candidate('Pago cuota de 200 euros.'), field: 'debts', value: '200 euros' },
    { ...candidate(quote), field: 'income', value: 'aclaración', messageId: 'm2', debtIncluded: inclusion },
  ], semanticIssues: [] }));
  expect(result.extraction.ok && result.extraction.fields.debts[0]).toMatchObject({ debtIncluded: inclusion, debtInclusionSource: { messageId: 'm2', quote } });
});

it('no atribuye una aclaración a una cuota si hay varias deudas', async () => {
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: 'Pago 200 de coche y 100 de préstamo.' }, { id: 'm2', role: 'customer', text: 'La cuota ya está descontada de los ingresos.' }];
  const result = await runIntake(messages, async () => ({ candidates: [
    { ...candidate('200 de coche'), field: 'debts', value: '200' },
    { ...candidate('100 de préstamo'), field: 'debts', value: '100' },
    { ...candidate(messages[1].text!), field: 'income', value: 'aclaración', messageId: 'm2', debtIncluded: 'included' },
  ], semanticIssues: [] }));
  expect(result.extraction.ok && result.extraction.fields.debts.every(c => c.debtIncluded === 'unknown')).toBe(true);
});

it('replay de hardening: Laura no repite ingresos aproximados tras aclarar cuota', async () => {
  const body = JSON.parse(readFileSync('docs/current/evaluation/hardening/laura-continuation.json', 'utf8')).body;
  const raw = { candidates: Object.values(body.extraction.fields).flat().map((item: unknown) => {
    const candidate = { ...item as Record<string, unknown> };
    delete candidate.debtInclusionSource;
    return candidate;
  }), semanticIssues: body.extraction.semanticIssues };
  const result = await runIntake(body.messages, async () => raw);
  expect(result.intervention).toMatchObject({ kind: 'question', field: 'interest' });
});

it.each(['Importe aproximado de ingresos conjuntos.', 'Cantidad aproximada de ingresos.', 'Los ingresos son aproximados.'])('una descripción solo de aproximación no crea duda material: %s', async explanation => {
  const quote = 'Unos 3000 euros netos entre los dos.';
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
  const result = await runIntake(messages, async () => ({ candidates: [{ ...candidate(quote), field: 'income', value: 'unos 3000 euros netos conjuntos', precision: 'approximate', incomeBasis: 'net', subject: 'joint' }], semanticIssues: [{ category: 'ambiguous', field: 'income', messageId: 'm1', quote, explanation }] }));
  expect(result.issues.ok && result.issues.issues.filter(i => i.category === 'ambiguous')).toEqual([]);
});

it('no elimina un conflicto real aunque mencione aproximación', async () => {
  const quote = 'Unos 3000 euros netos entre los dos o quizá 2000.';
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
  const result = await runIntake(messages, async () => ({ candidates: [{ ...candidate(quote), field: 'income', value: '3000 o 2000', precision: 'approximate', incomeBasis: 'net', subject: 'joint' }], semanticIssues: [{ category: 'ambiguous', field: 'income', messageId: 'm1', quote, explanation: 'Importe aproximado, pero hay dos cantidades incompatibles.' }] }));
  expect(result.issues.ok && result.issues.issues.some(i => i.category === 'ambiguous' && i.field === 'income')).toBe(true);
});

it.each(['laura-final-initial', 'holdout-final'])('replay final %s pregunta por inclusión de cuota', async name => {
  const body = JSON.parse(readFileSync(`docs/current/evaluation/hardening/${name}.json`, 'utf8')).body;
  const raw = { candidates: Object.values(body.extraction.fields).flat(), semanticIssues: body.extraction.semanticIssues };
  const result = await runIntake(body.messages, async () => raw);
  expect(result.intervention).toMatchObject({ kind: 'question', question: expect.stringMatching(/cuota.*descontad.*ingresos/i) });
});

describe('contrato del motivo de incidencia', () => {
  it.each(['income', 'debts'] as const)('pregunta relación cuota-ingresos aunque el campo sea %s', async field => {
    const quote = 'Ingresamos 3000 netos al mes y pagamos una cuota de 200.';
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
    const result = await runIntake(messages, async () => ({ candidates: [
      { ...candidate(quote), field: 'income', value: '3000 netos', incomeBasis: 'net' },
      { ...candidate(quote), field: 'debts', value: 'cuota de 200' },
    ], semanticIssues: [{ category: 'ambiguous', field, reason: 'debt_inclusion', messageId: 'm1', quote, explanation: 'Revisar cómo se relacionan las cantidades.' }] }));
    expect(result.intervention).toMatchObject({ kind: 'question', field: 'debts', question: expect.stringMatching(/cuota.*descontad.*ingresos/i) });
  });
  it('conserva conflicto económico con motivo distinto sin reducirlo a inclusión', async () => {
    const quote = 'Ingresos netos 3000 o 2000 y cuota 200.';
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
    const result = await runIntake(messages, async () => ({ candidates: [{ ...candidate(quote), field: 'income', value: '3000 o 2000', incomeBasis: 'net' }], semanticIssues: [{ category: 'ambiguous', field: 'income', reason: 'other', messageId: 'm1', quote, explanation: 'Cantidades incompatibles.' }] }));
    expect(result.issues.ok && result.issues.issues).toContainEqual(expect.objectContaining({ category: 'ambiguous', field: 'income', description: 'Cantidades incompatibles.' }));
    expect(result.intervention).toMatchObject({ kind: 'question', field: 'income' });
  });
  it('prioriza base neta o bruta sobre inclusión cuando ambas están pendientes', async () => {
    const quote = 'Ingresos 3000 y cuota 200.';
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
    const result = await runIntake(messages, async () => ({ candidates: [], semanticIssues: [
      { category: 'ambiguous', field: 'income', reason: 'income_basis', messageId: 'm1', quote, explanation: 'Base por aclarar.' },
      { category: 'ambiguous', field: 'debts', reason: 'debt_inclusion', messageId: 'm1', quote, explanation: 'Relación por aclarar.' },
    ] }));
    expect(result.intervention).toMatchObject({ kind: 'question', field: 'income', question: expect.stringMatching(/netos o brutos/) });
  });
});

it('no transforma un conflicto descrito en una simple duda de cuota aunque el motivo sea erróneo', async () => {
  const quote = 'Son 3000 o 2000 netos y pago cuota de 200.';
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
  const result = await runIntake(messages, async () => ({ candidates: [{ ...candidate(quote), field: 'income', value: '3000 o 2000', incomeBasis: 'net' }], semanticIssues: [{ category: 'ambiguous', field: 'income', reason: 'debt_inclusion', messageId: 'm1', quote, explanation: 'Hay cantidades incompatibles en los ingresos.' }] }));
  expect(result.intervention).toMatchObject({ kind: 'question', field: 'income' });
  expect(result.issues.ok && result.issues.issues).toContainEqual(expect.objectContaining({ description: 'Hay cantidades incompatibles en los ingresos.' }));
});

it('replay del contrato: Laura requiere revisión humana de la aclaración', async () => {
  const body = JSON.parse(readFileSync('docs/current/evaluation/hardening/contract-laura-continuation.json', 'utf8')).body;
  const raw = { candidates: Object.values(body.extraction.fields).flat(), semanticIssues: body.extraction.semanticIssues };
  const result = await runIntake(body.messages, async () => raw);
  expect(result.intervention).toMatchObject({ kind: 'human_review' });
});

it('replay del contrato: una cuota incierta requiere aclaración aun sin señal semántica', async () => {
  const body = JSON.parse(readFileSync('docs/current/evaluation/hardening/contract-holdout.json', 'utf8')).body;
  const raw = { candidates: Object.values(body.extraction.fields).flat(), semanticIssues: body.extraction.semanticIssues };
  const result = await runIntake(body.messages, async () => raw);
  expect(result.intervention).toMatchObject({ kind: 'question', field: 'debts', question: expect.stringMatching(/cuota.*descontad.*ingresos/i) });
});

describe('PoC: revisión conservadora de cuotas', () => {
  it('genera una duda con fuente si el modelo omite la incidencia', async () => {
    const quote = 'Cobro 3000 netos al mes y pago una cuota de 200 euros.';
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
    const result = await runIntake(messages, async () => ({ candidates: [{ ...candidate(quote), field: 'debts', value: '200 euros al mes' }], semanticIssues: [] }));
    expect(result.issues.ok && result.issues.issues).toContainEqual(expect.objectContaining({ category: 'ambiguous', field: 'debts', reason: 'debt_inclusion', messageId: 'm1', quote }));
    expect(result.intervention).toMatchObject({ kind: 'question', field: 'debts', question: expect.stringMatching(/cuota.*descontad.*ingresos/i) });
  });
  it('pide revisión humana cuando hay varias cuotas sin atribuir una aclaración', async () => {
    const quote = 'Pago 200 de coche y 100 de préstamo.';
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
    const result = await runIntake(messages, async () => ({ candidates: [{ ...candidate('200 de coche'), field: 'debts', value: '200' }, { ...candidate('100 de préstamo'), field: 'debts', value: '100' }], semanticIssues: [] }));
    expect(result.intervention).toMatchObject({ kind: 'human_review' });
  });
  it('pide revisar una respuesta posterior sin inventar si resolvió la cuota', async () => {
    const body = JSON.parse(readFileSync('docs/current/evaluation/hardening/contract-laura-continuation.json', 'utf8')).body;
    const raw = { candidates: Object.values(body.extraction.fields).flat(), semanticIssues: body.extraction.semanticIssues };
    const result = await runIntake(body.messages, async () => raw);
    expect(result.intervention).toMatchObject({ kind: 'human_review' });
    expect(result.extraction.ok && result.extraction.fields.debts[0].debtIncluded).toBe('unknown');
  });
  it('no genera una duda de cuota para cero explícito', async () => {
    const quote = 'No tengo ninguna cuota: 0 euros.';
    const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
    const result = await runIntake(messages, async () => ({ candidates: [{ ...candidate(quote), field: 'debts', value: '0 euros' }], semanticIssues: [] }));
    expect(result.issues.ok && result.issues.issues.some(i => i.reason === 'debt_inclusion')).toBe(false);
  });
});

it('requiere revisión de una cuota si hay ingresos contradictorios', async () => {
  const quote = 'Ingreso 3000 o 2000 netos y pago una cuota de 200.';
  const messages: Message[] = [{ id: 'm1', role: 'customer', text: quote }];
  const result = await runIntake(messages, async () => ({ candidates: [
    { ...candidate(quote), field: 'income', value: '3000 netos', incomeBasis: 'net' },
    { ...candidate(quote), field: 'income', value: '2000 netos', incomeBasis: 'net' },
    { ...candidate(quote), field: 'debts', value: '200 euros' },
  ], semanticIssues: [] }));
  expect(result.intervention).toMatchObject({ kind: 'human_review' });
});
