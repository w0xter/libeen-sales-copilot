import { ConfigBundleSchema, type Condition, type ConfigBundle, type Result } from '../contracts';

const version = '1.0.0';
const field = (id: string, label: string, type: ConfigBundle['factSchema']['fields'][number]['type'], scopes: ConfigBundle['factSchema']['fields'][number]['scopes'], extra: Partial<ConfigBundle['factSchema']['fields'][number]> = {}): ConfigBundle['factSchema']['fields'][number] => ({ id, label, description: label, type, scopes, cardinality: 'one', units: [], enumOptions: [], sensitivity: 'normal', schemaVersion: version, ...extra });
const present = (fieldId: string): Condition => ({ id: `${fieldId}-present`, op: 'fact_present', fieldId });
const clear = (fieldId: string): Condition => ({ id: `${fieldId}-clear`, op: 'fact_unambiguous', fieldId });
const all = (id: string, conditions: Condition[]): Condition => ({ id, op: 'ALL', conditions });
const matches = (fieldId: string, value: string): Condition => ({ id: `${fieldId}-${value}`, op: 'fact_matches', fieldId, value });
const actions = ['CLARIFY', 'ANSWER_QUESTION', 'PROPOSE_CALL', 'HANDOFF', 'WAIT', 'STOP_CONTACT'];
const rule = (id: string, priority: number, result: ConfigBundle['businessPolicy']['rules'][number]['result'], allowedActions: string[], reason: string, trigger: Partial<ConfigBundle['businessPolicy']['rules'][number]> = {}): ConfigBundle['businessPolicy']['rules'][number] => ({ id, priority, result, allowedActions, prohibitedActions: actions.filter(a => !allowedActions.includes(a)), reviewRequired: true, reason, ...trigger });
const incomeNet: Condition = { id: 'income-net', op: 'fact_income_basis', fieldId: 'declared_monthly_income', basis: 'net' };
const noCriticalBlocker: Condition = { id: 'no-critical-blocker', op: 'NOT', condition: { id: 'critical-blocker', op: 'blocker_open', blockerTypes: ['BINDING_CLAIM', 'URGENT', 'TRUST', 'PRODUCT', 'COST', 'PRIVACY', 'TIME', 'FIT', 'OPT_OUT'] } };
const debtResolved: Condition = { id: 'debt-resolved', op: 'ANY', conditions: [matches('debt_deduction_semantics', 'included'), matches('debt_deduction_semantics', 'excluded'), matches('debt_deduction_semantics', 'no_disclosed_debt')] };
const milestones: ConfigBundle['workflow']['milestones'] = [
  { id: 'M0', purpose: 'Interpretar el contacto inicial', prerequisites: [], completion: present('initial_intent'), onIncomplete: ['CLARIFY'], onBlocked: ['HANDOFF'], allowedSuccessors: ['M1'], terminalRoute: false, evidencePolicy: ['message'] },
  { id: 'M1', purpose: 'Confirmar interés informado en SmartHousing', prerequisites: ['M0'], completion: matches('product_intent', 'explore_smart_housing'), onIncomplete: ['CLARIFY'], onBlocked: ['ANSWER_QUESTION', 'HANDOFF'], allowedSuccessors: ['M2'], terminalRoute: false, evidencePolicy: ['message'] },
  { id: 'M2', purpose: 'Comprender la necesidad de vivienda', prerequisites: ['M1'], completion: all('housing-context', [present('desired_locations'), present('moving_horizon'), present('buyer_count')]), onIncomplete: ['CLARIFY'], onBlocked: ['HANDOFF'], allowedSuccessors: ['M3'], terminalRoute: false, evidencePolicy: ['message'] },
  { id: 'M3', purpose: 'Comprender la situación económica autodeclarada', prerequisites: ['M2'], completion: all('financial-context', [clear('declared_monthly_income'), incomeNet, clear('available_savings'), debtResolved]), onIncomplete: ['CLARIFY'], onBlocked: ['CLARIFY', 'HANDOFF'], allowedSuccessors: ['M4'], terminalRoute: false, evidencePolicy: ['message', 'advisor_correction'] },
  { id: 'M4', purpose: 'Orientar el siguiente paso sin aprobación financiera', prerequisites: ['M3'], completion: { id: 'orientation', op: 'policy_result', result: 'READY_FOR_ADVISORY_CALL' }, onIncomplete: ['CLARIFY'], onBlocked: ['HANDOFF'], allowedSuccessors: ['M5'], terminalRoute: false, evidencePolicy: ['decision'] },
  { id: 'M5', purpose: 'Registrar el siguiente paso acordado', prerequisites: ['M4'], completion: { id: 'confirmed-next-step', op: 'ANY', conditions: [{ id: 'customer-confirmed', op: 'event_confirmed', eventType: 'CUSTOMER_CONFIRMED_NEXT_STEP' }, { id: 'handoff-confirmed', op: 'event_confirmed', eventType: 'HUMAN_HANDOFF_CONFIRMED' }] }, onIncomplete: ['WAIT'], onBlocked: ['HANDOFF'], allowedSuccessors: [], terminalRoute: true, evidencePolicy: ['message', 'human_confirmation'] },
];

export const demoBundle: ConfigBundle = {
  factSchema: { id: 'smart-housing-facts', version, fields: [
    field('initial_intent', 'Intención inicial', 'text', ['case']),
    field('product_intent', 'Interés en producto', 'enum', ['case'], { enumOptions: ['explore_smart_housing', 'question', 'classical_rental', 'undetermined'] }),
    field('desired_locations', 'Ubicaciones deseadas', 'collection', ['case']),
    field('moving_horizon', 'Horizonte de mudanza', 'text', ['case']),
    field('specific_move_month', 'Mes concreto de mudanza', 'text', ['case']),
    field('buyer_count', 'Número de compradores', 'number', ['buying_unit'], { structuralValidation: { min: 1, integer: true } }),
    field('declared_monthly_income', 'Ingresos mensuales autodeclarados', 'money', ['participant', 'buying_unit'], { units: ['EUR'], sensitivity: 'sensitive', structuralValidation: { min: 0 } }),
    field('employment_context', 'Situación laboral', 'text', ['participant']),
    field('available_savings', 'Ahorros disponibles autodeclarados', 'money', ['participant', 'buying_unit'], { units: ['EUR'], sensitivity: 'sensitive', structuralValidation: { min: 0 } }),
    field('monthly_debt', 'Cuota mensual declarada', 'money', ['participant', 'buying_unit'], { units: ['EUR'], cardinality: 'many', sensitivity: 'sensitive', structuralValidation: { min: 0 } }),
    field('debt_deduction_semantics', 'Tratamiento de deuda en ingresos', 'enum', ['buying_unit'], { enumOptions: ['included', 'excluded', 'no_disclosed_debt', 'unknown'] }),
    field('requested_next_step', 'Próximo paso solicitado', 'enum', ['case'], { enumOptions: ['call', 'information', 'follow_up', 'no_contact', 'undetermined'] }),
  ] },
  workflow: { id: 'smart-housing-qualification', version, goal: 'Orientación comercial SmartHousing', factSchemaVersion: version, businessPolicyVersion: 'demo-v1', milestones },
  agentProfile: { id: 'advisor-copilot', version, role: 'Asistente interno de asesor', compatibleWorkflows: ['smart-housing-qualification'], conversationStrategy: ['Responder preguntas explícitas antes de preguntas no urgentes', 'No repetir datos conocidos'], decisionStrategy: ['Priorizar protección y revisión humana'], capabilities: actions, contextStrategy: ['Usar solo evidencia disponible'], communicationStyle: ['Claro, empático y sin promesas'], fallbackBehavior: ['Derivar cuando falten fuentes autorizadas'], observabilityHints: ['Identificar modo, evidencias y versiones'] },
  businessPolicy: { id: 'libeen-demo-routing', version: 'demo-v1', synthetic: true, financialApprovalEnabled: false, advisoryCall: { requireProductInterest: true, requireLocation: true, requireBuyerCount: true, requireMovingHorizon: true, requireSpecificMoveMonthBeforeCall: false, requireDeclaredIncomeContext: true, requireDeclaredSavings: true, requireDisclosedDebtSemanticsResolved: true, preventWhenCriticalBlockerOpen: true }, rules: [
    rule('R01', 100, 'STOP_CONTACT', ['STOP_CONTACT'], 'El cliente solicita no ser contactado', { eventTypesAny: ['DO_NOT_CONTACT_REQUESTED'] }),
    rule('R02', 90, 'HUMAN_REVIEW_REQUIRED', ['HANDOFF'], 'Una solicitud vinculante requiere revisión humana', { blockerTypesAny: ['BINDING_CLAIM', 'URGENT'] }),
    rule('R03', 50, 'NEED_CLARIFICATION', ['CLARIFY', 'HANDOFF'], 'Falta información decisiva', { condition: all('required-context', [matches('product_intent', 'explore_smart_housing'), present('desired_locations'), present('moving_horizon'), present('buyer_count'), clear('declared_monthly_income'), incomeNet, clear('available_savings')]), conditionResults: ['unknown', 'unsatisfied', 'conflict'] }),
    rule('R04', 1, 'WAIT', ['WAIT'], 'Se evalúa el contexto comercial mínimo', { condition: all('minimum-context', [matches('product_intent', 'explore_smart_housing'), present('desired_locations'), present('moving_horizon'), present('buyer_count'), clear('declared_monthly_income'), clear('available_savings')]), conditionResults: ['satisfied'] }),
    rule('R05', 60, 'NEED_CLARIFICATION', ['CLARIFY', 'HANDOFF'], 'Aclarar si la cuota conocida ya se descontó', { condition: debtResolved, conditionResults: ['unknown', 'unsatisfied', 'conflict'] }),
    rule('R06', 10, 'READY_FOR_ADVISORY_CALL', ['PROPOSE_CALL'], 'Contexto suficiente para proponer una llamada humana', { condition: all('call-context', [matches('product_intent', 'explore_smart_housing'), present('desired_locations'), present('moving_horizon'), present('buyer_count'), clear('declared_monthly_income'), incomeNet, clear('available_savings'), debtResolved, noCriticalBlocker]), conditionResults: ['satisfied'] }),
    rule('R07', 70, 'HUMAN_REVIEW_REQUIRED', ['ANSWER_QUESTION', 'HANDOFF'], 'Responder la objeción con fuente autorizada o derivar', { blockerTypesAny: ['TRUST', 'PRODUCT', 'COST', 'PRIVACY', 'TIME', 'FIT'] }),
    rule('R08', 5, 'WAIT', ['WAIT'], 'Registrar una confirmación del siguiente paso', { eventTypesAny: ['CUSTOMER_CONFIRMED_NEXT_STEP', 'HUMAN_HANDOFF_CONFIRMED'] }),
    rule('R09', 15, 'WAIT', ['WAIT'], 'Un borrador aprobado no significa envío ni acuerdo', { eventTypesAny: ['DRAFT_APPROVED'] }),
    rule('R10', 45, 'NEED_CLARIFICATION', ['CLARIFY'], 'Pedir el mes concreto antes de recomendar llamada', { requiredOption: 'requireSpecificMoveMonthBeforeCall', condition: present('specific_move_month'), conditionResults: ['unknown', 'unsatisfied', 'conflict'] }),
  ] },
  reviewPolicy: { id: 'human-review', version, protectedRuleIds: ['R01', 'R02', 'R09'], prohibitedClaims: ['aprobación financiera', 'vivienda garantizada', 'términos vinculantes', 'cita confirmada sin evidencia'] },
  actionCatalog: { id: 'advisor-actions', version, actions: actions.map(id => ({ id, description: id, requiresDraft: ['CLARIFY', 'ANSWER_QUESTION', 'PROPOSE_CALL'].includes(id), requiresHumanReview: true })) },
};

/** Checks structural and cross-catalog references before configuration can be used. */
export function validateConfig(input: unknown): Result<ConfigBundle> {
  const parsed = ConfigBundleSchema.safeParse(input);
  const fail = (): Result<ConfigBundle> => ({ ok: false, error: { code: 'INVALID_CONFIGURATION', message: 'Configuración incompatible', retryable: false } });
  if (!parsed.success) return fail();
  const b = parsed.data;
  const ids = (values: string[]) => new Set(values).size === values.length;
  const fields = new Set(b.factSchema.fields.map(f => f.id));
  const milestoneIds = new Set(b.workflow.milestones.map(m => m.id));
  const actionIds = new Set(b.actionCatalog.actions.map(a => a.id));
  const ruleIds = new Set(b.businessPolicy.rules.map(r => r.id));
  if (![b.factSchema.fields.map(f => f.id), b.workflow.milestones.map(m => m.id), b.actionCatalog.actions.map(a => a.id), b.businessPolicy.rules.map(r => r.id)].every(ids)) return fail();
  const conditionValid = (c: Condition): boolean => {
    if (c.op === 'ALL' || c.op === 'ANY') return c.conditions.every(conditionValid);
    if (c.op === 'NOT') return conditionValid(c.condition);
    if (c.op === 'fact_present' || c.op === 'fact_unambiguous' || c.op === 'fact_matches' || c.op === 'fact_income_basis') {
      const f = b.factSchema.fields.find(x => x.id === c.fieldId);
      return fields.has(c.fieldId) && !!f && (!c.subjectScope || f.scopes.includes(c.subjectScope)) && (c.op !== 'fact_income_basis' || f.type === 'money');
    }
    return true;
  };
  if (b.workflow.factSchemaVersion !== b.factSchema.version || b.workflow.businessPolicyVersion !== b.businessPolicy.version || !b.agentProfile.compatibleWorkflows.includes(b.workflow.id)) return fail();
  if (b.workflow.milestones.some(m => !conditionValid(m.completion) || (m.applicability && !conditionValid(m.applicability)) || [...m.prerequisites, ...m.allowedSuccessors].some(id => !milestoneIds.has(id)) || [...m.onIncomplete, ...m.onBlocked].some(id => !actionIds.has(id)))) return fail();
  if (b.businessPolicy.rules.some(r => (r.condition && !conditionValid(r.condition)) || [...r.allowedActions, ...r.prohibitedActions].some(id => !actionIds.has(id)))) return fail();
  if (['R01', 'R02', 'R09'].some(id => !b.reviewPolicy.protectedRuleIds.includes(id)) || b.reviewPolicy.protectedRuleIds.some(id => !ruleIds.has(id)) || b.agentProfile.capabilities.some(id => !actionIds.has(id))) return fail();
  return { ok: true, value: b };
}
export const configBundleRef = { workflow: demoBundle.workflow.version, factSchema: demoBundle.factSchema.version, agentProfile: demoBundle.agentProfile.version, businessPolicy: demoBundle.businessPolicy.version, reviewPolicy: demoBundle.reviewPolicy.version, actionCatalog: demoBundle.actionCatalog.version };
