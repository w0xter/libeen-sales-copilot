import type { EvidenceRef, Message } from '../contracts';

/** The three base transcripts are from the fictional exercise appendix. IDs and timestamps are invented. */
export interface SyntheticCase { caseId: string; origin: 'exercise_appendix'; timestampsSynthetic: true; messages: Message[] }
const text = (caseId: string, n: number, role: 'customer' | 'advisor', value: string): Message => ({ messageId: `${caseId}-m${n}`, conversationId: `${caseId}-conversation`, role, occurredAt: `2026-05-01T10:0${n}:00Z`, content: { type: 'text', text: value }, simulated: true });
export const cases: SyntheticCase[] = [
  { caseId: 'laura', origin: 'exercise_appendix', timestampsSynthetic: true, messages: [
    text('laura', 1, 'customer', '¡Hola! Hemos visto vuestro anuncio en Instagram. Somos mi pareja y yo, buscamos piso en Valencia para mudarnos antes del verano.'),
    text('laura', 2, 'advisor', '¡Hola! Encantados. Para ver si encajáis, ¿cuánto ganáis al mes entre los dos, después de deudas, y cuánto tenéis ahorrado para la entrada?'),
    text('laura', 3, 'customer', 'Unos 3.800 € netos entre los dos. Ahorrado tenemos 18.000 más o menos. Yo tengo 31 y él 34.'),
    text('laura', 4, 'customer', 'Ah, y pagamos un préstamo del coche de 250 € al mes, no sé si cuenta.'),
  ] },
  { caseId: 'javier', origin: 'exercise_appendix', timestampsSynthetic: true, messages: [
    text('javier', 1, 'customer', 'buenas, cuanto cuesta esto? me interesa algo por madrid o alrededores'),
    text('javier', 2, 'advisor', '¡Hola, Javier! Depende de la casa y de tu situación. ¿Compras solo o con alguien? ¿Y cuánto ganas al mes, más o menos?'),
    text('javier', 3, 'customer', 'solo. soy autonomo, depende del mes, entre 2000 y 3000'),
    { messageId: 'javier-m4', conversationId: 'javier-conversation', role: 'customer', occurredAt: '2026-05-01T10:04:00Z', content: { type: 'audio_unavailable', durationSeconds: 72 }, simulated: true },
    text('javier', 5, 'customer', 'y esto es fiable? no sera una estafa no'),
  ] },
  { caseId: 'rosa', origin: 'exercise_appendix', timestampsSynthetic: true, messages: [
    text('rosa', 1, 'customer', 'Buenos días. Somos mi marido y yo. Él tiene 67 años y está jubilado, yo trabajo a media jornada. Entre los dos, 1.400 €. Ahorros no tenemos, pero necesitamos salir del piso en dos semanas.'),
    text('rosa', 2, 'customer', 'Si no podéis vendernos, ¿nos alquiláis algo solo de alquiler?'),
    text('rosa', 3, 'customer', 'Mi hijo dice que os pida por escrito que estamos aprobados antes de seguir.'),
  ] },
];

/** Additional messages are invented test variations, not part of the exercise appendix. */
export interface SyntheticScenario {
  id: string; caseId: string; origin: 'synthetic_variation' | 'exercise_appendix';
  additions: Message[]; evidenceRefs: EvidenceRef[];
  expected: { m3?: string; m5?: string; action: string; productInterest?: string; debtSemantics?: string; savings?: number; income?: { min: number; max: number; basis: string }; note: string };
  policyOverride?: { requireSpecificMoveMonthBeforeCall: boolean };
  simulatedFailure?: 'MODEL_UNAVAILABLE' | 'MODEL_OUTPUT_INVALID';
}
const addition = (id: string, caseId: string, value: string): Message => ({ messageId: `${id}-addition`, conversationId: `${caseId}-conversation`, role: 'customer', occurredAt: '2026-05-02T10:00:00Z', content: { type: 'text', text: value }, simulated: true });
const scenario = (id: string, caseId: string, evidence: string[], expected: SyntheticScenario['expected'], options: Partial<SyntheticScenario> = {}): SyntheticScenario => ({ id, caseId, origin: 'synthetic_variation', additions: [], expected, ...options, evidenceRefs: [...evidence.map(messageId => ({ messageId })), ...(options.additions ?? []).map(message => ({ messageId: message.messageId }))] });
export const scenarios: SyntheticScenario[] = [
  scenario('laura-initial', 'laura', ['laura-m1', 'laura-m2', 'laura-m3', 'laura-m4'], { m3: 'blocked', action: 'CLARIFY', productInterest: 'unknown', debtSemantics: 'unknown', note: 'Ingresos y ahorro conjuntos; no restar la cuota ni presumir interés informado.' }, { origin: 'exercise_appendix' }),
  scenario('laura-included', 'laura', ['laura-m3', 'laura-m4'], { m3: 'financially_sufficient', action: 'CLARIFY', productInterest: 'unknown', debtSemantics: 'included', note: 'No descontar la cuota de nuevo; confirmar interés antes de proponer llamada.' }, { additions: [addition('laura-included', 'laura', 'Sí, los 3.800 € ya son después del coche.')] }),
  scenario('laura-excluded', 'laura', ['laura-m3', 'laura-m4'], { m3: 'financially_sufficient', action: 'CLARIFY', productInterest: 'unknown', debtSemantics: 'excluded', note: 'Conservar ingresos y cuota por separado; confirmar interés.' }, { additions: [addition('laura-excluded', 'laura', 'No, los 3.800 € son antes de pagar el coche.')] }),
  scenario('laura-ambiguous', 'laura', ['laura-m3', 'laura-m4'], { m3: 'blocked', action: 'CLARIFY', debtSemantics: 'unknown', note: 'Reformular o derivar sin afirmar solvencia.' }, { additions: [addition('laura-ambiguous', 'laura', 'No sé si ya lo conté.')] }),
  scenario('laura-gross-correction', 'laura', ['laura-m3'], { m3: 'blocked', action: 'CLARIFY', note: 'Corrección material de neto a bruto; no suponer neto.' }, { additions: [addition('laura-gross-correction', 'laura', 'Me equivoqué: eran brutos.')] }),
  scenario('laura-r10-off', 'laura', ['laura-m1', 'laura-m3', 'laura-m4'], { m3: 'completed', action: 'PROPOSE_CALL', productInterest: 'confirmed', debtSemantics: 'included', note: 'Variante presupone interés informado confirmado y deuda aclarada.' }, { additions: [addition('laura-r10-off', 'laura', 'Sí, queremos explorar SmartHousing y los 3.800 € ya son después del coche.')], policyOverride: { requireSpecificMoveMonthBeforeCall: false } }),
  scenario('laura-r10-on', 'laura', ['laura-m1', 'laura-m3', 'laura-m4'], { m3: 'completed', action: 'CLARIFY', productInterest: 'confirmed', debtSemantics: 'included', note: 'Pedir mes concreto sin reabrir M3.' }, { additions: [addition('laura-r10-on', 'laura', 'Sí, queremos explorar SmartHousing y los 3.800 € ya son después del coche.')], policyOverride: { requireSpecificMoveMonthBeforeCall: true } }),
  scenario('laura-draft-approved', 'laura', ['laura-m1'], { m5: 'pending', action: 'WAIT', note: 'Aprobación humana no equivale a envío ni acuerdo.' }),
  scenario('laura-confirmed', 'laura', ['laura-m1'], { m5: 'completed', action: 'WAIT', note: 'Aceptación simulada, sin reserva real.' }, { additions: [addition('laura-confirmed', 'laura', 'Sí, acepto una llamada.')]}),
  scenario('javier-trust', 'javier', ['javier-m1', 'javier-m3', 'javier-m5'], { action: 'HANDOFF', income: { min: 2000, max: 3000, basis: 'unknown' }, note: 'Sin fuentes comerciales autorizadas, derivar; no inferir contenido del audio.' }, { origin: 'exercise_appendix' }),
  scenario('javier-opt-out', 'javier', ['javier-m5'], { action: 'STOP_CONTACT', note: 'No continuar contacto comercial.' }, { additions: [addition('javier-opt-out', 'javier', 'No quiero que me contactéis más.')] }),
  scenario('rosa-urgent', 'rosa', ['rosa-m1', 'rosa-m2', 'rosa-m3'], { action: 'HANDOFF', savings: 0, note: 'Urgencia y solicitud vinculante requieren revisión; alquiler es consulta condicional.' }, { origin: 'exercise_appendix' }),
  scenario('rosa-rental-only', 'rosa', ['rosa-m2'], { action: 'HANDOFF', savings: 0, note: 'Ruta alternativa solo tras confirmación explícita.' }, { additions: [addition('rosa-rental-only', 'rosa', 'Solo busco alquiler clásico.')] }),
  scenario('laura-conflict', 'laura', ['laura-m3'], { m3: 'blocked', action: 'CLARIFY', note: 'Afirmaciones incompatibles requieren aclaración.' }, { additions: [addition('laura-conflict', 'laura', 'En realidad ganamos 2.000 € netos entre los dos.')] }),
  scenario('laura-model-error', 'laura', ['laura-m4'], { m3: 'blocked', action: 'HANDOFF', note: 'Conservar el mensaje y no aceptar hechos inventados.' }, { simulatedFailure: 'MODEL_UNAVAILABLE' }),
  scenario('laura-invalid-output', 'laura', ['laura-m4'], { m3: 'blocked', action: 'HANDOFF', note: 'Rechazar salida inválida y conservar estado válido.' }, { simulatedFailure: 'MODEL_OUTPUT_INVALID' }),
];

/** Semantic oracle for original transcripts; no derived individual income or audio content. */
export const expectedFacts = {
  laura: [
    { fieldId: 'desired_locations', subject: 'case', status: 'known', value: ['Valencia'], evidenceRefs: [{ messageId: 'laura-m1' }] },
    { fieldId: 'moving_horizon', subject: 'case', status: 'approximate', value: 'antes del verano', evidenceRefs: [{ messageId: 'laura-m1' }] },
    { fieldId: 'buyer_count', subject: 'buying_unit', status: 'known', value: 2, evidenceRefs: [{ messageId: 'laura-m1' }] },
    { fieldId: 'declared_monthly_income', subject: 'buying_unit', status: 'approximate', value: 3800, unit: 'EUR', period: 'month', incomeBasis: 'net', evidenceRefs: [{ messageId: 'laura-m3' }] },
    { fieldId: 'available_savings', subject: 'buying_unit', status: 'approximate', value: 18000, unit: 'EUR', evidenceRefs: [{ messageId: 'laura-m3' }] },
    { fieldId: 'monthly_debt', subject: 'buying_unit', status: 'known', value: 250, unit: 'EUR', period: 'month', evidenceRefs: [{ messageId: 'laura-m4' }] },
    { fieldId: 'debt_deduction_semantics', subject: 'buying_unit', status: 'unknown', evidenceRefs: [] },
    { fieldId: 'product_intent', subject: 'case', status: 'unknown', evidenceRefs: [] },
  ],
  javier: [
    { fieldId: 'desired_locations', subject: 'case', status: 'known', value: ['madrid', 'alrededores'], evidenceRefs: [{ messageId: 'javier-m1' }] },
    { fieldId: 'buyer_count', subject: 'buying_unit', status: 'known', value: 1, evidenceRefs: [{ messageId: 'javier-m3' }] },
    { fieldId: 'employment_context', subject: 'participant', status: 'known', value: 'autónomo', evidenceRefs: [{ messageId: 'javier-m3' }] },
    { fieldId: 'declared_monthly_income', subject: 'participant', status: 'approximate', value: { min: 2000, max: 3000 }, unit: 'EUR', period: 'month', incomeBasis: 'unknown', evidenceRefs: [{ messageId: 'javier-m3' }] },
  ],
  rosa: [
    { fieldId: 'buyer_count', subject: 'buying_unit', status: 'known', value: 2, evidenceRefs: [{ messageId: 'rosa-m1' }] },
    { fieldId: 'declared_monthly_income', subject: 'buying_unit', status: 'known', value: 1400, unit: 'EUR', incomeBasis: 'unknown', evidenceRefs: [{ messageId: 'rosa-m1' }] },
    { fieldId: 'available_savings', subject: 'buying_unit', status: 'known', value: 0, unit: 'EUR', evidenceRefs: [{ messageId: 'rosa-m1' }] },
    { fieldId: 'moving_horizon', subject: 'case', status: 'known', value: 'dos semanas', evidenceRefs: [{ messageId: 'rosa-m1' }] },
    { fieldId: 'product_intent', subject: 'case', status: 'unknown', evidenceRefs: [] },
  ],
} as const;
