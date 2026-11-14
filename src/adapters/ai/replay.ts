import type { Interpreter, DraftGenerator, FactAssertion, Message, Blocker } from '../../contracts';
import { cases, scenarios, expectedFacts } from '../../fixtures';
import { failure, validateInterpretation } from './validation';
import { buildDraft, chooseReplayTemplate } from './templates';

type ExpectedFact = { fieldId: string; subject: string; status: string; value?: FactAssertion['value']; unit?: string; period?: string; incomeBasis?: 'net' | 'gross' | 'unknown'; evidenceRefs: readonly { messageId: string }[] };
const equalContent = (a: Message, b: Message) => a.role === b.role && JSON.stringify(a.content) === JSON.stringify(b.content);
const fieldSubject = (scope: string) => ({ scope: scope as 'case' | 'buying_unit' | 'participant', id: scope === 'participant' ? 'participant-1' : scope });

export class ReplayInterpreter implements Interpreter {
  async interpret(input: Parameters<Interpreter['interpret']>[0]) {
    const base = cases.find(c => c.caseId === input.caseSnapshot.caseId);
    if (!base) return failure('MODEL_UNAVAILABLE', 'No hay replay para este caso');
    const known = [...base.messages, ...scenarios.filter(s => s.caseId === base.caseId).flatMap(s => s.additions)];
    if (input.messages.some(m => !known.some(k => equalContent(m, k)))) return failure('MODEL_UNAVAILABLE', 'Mensaje sin replay disponible');
    const assertions: FactAssertion[] = [];
    const add = (fieldId: string, subject: string, value: FactAssertion['value'], message: Message, precision: FactAssertion['precision'] = 'explicit', extra: Partial<FactAssertion> = {}) => {
      const field = input.factSchema.fields.find(f => f.id === fieldId);
      if (!field || message.content.type !== 'text') return;
      assertions.push({ assertionId: `replay-${message.messageId}-${fieldId}`, fieldId, subjectRef: fieldSubject(subject), value, rawValue: message.content.text, source: 'customer_message', evidenceRefs: [{ messageId: message.messageId }], observedAt: message.occurredAt, precision, reviewStatus: 'unreviewed', schemaVersion: field.schemaVersion, ...extra });
    };
    const facts = expectedFacts[base.caseId as keyof typeof expectedFacts] as readonly ExpectedFact[];
    for (const fact of facts) {
      if (fact.value === undefined || !fact.evidenceRefs.length) continue;
      const source = base.messages.find(m => m.messageId === fact.evidenceRefs[0].messageId);
      const actual = source && input.messages.find(m => equalContent(m, source));
      if (actual) add(fact.fieldId, fact.subject, fact.value, actual, fact.status === 'approximate' ? 'approximate' : 'explicit', { unit: fact.unit, period: fact.period, incomeBasis: fact.incomeBasis });
    }
    const initial = base.messages.find(m => m.role === 'customer');
    const actualInitial = initial && input.messages.find(m => equalContent(m, initial));
    if (actualInitial) add('initial_intent', 'case', 'consulta de vivienda', actualInitial);
    for (const message of input.messages) {
      if (message.content.type !== 'text') continue;
      const variation = scenarios.find(s => s.caseId === base.caseId && s.additions.some(m => equalContent(m, message)));
      if (!variation) continue;
      if (variation.id === 'laura-included' || variation.id === 'laura-excluded' || variation.id === 'laura-r10-off' || variation.id === 'laura-r10-on') add('debt_deduction_semantics', 'buying_unit', variation.id === 'laura-excluded' ? 'excluded' : 'included', message);
      if (variation.id === 'laura-r10-off' || variation.id === 'laura-r10-on') add('product_intent', 'case', 'explore_smart_housing', message);
      if (variation.id === 'laura-gross-correction') add('declared_monthly_income', 'buying_unit', undefined, message, 'ambiguous', { unit: 'EUR', period: 'month', incomeBasis: 'gross' });
      if (variation.id === 'laura-conflict') add('declared_monthly_income', 'buying_unit', 2000, message, 'explicit', { unit: 'EUR', period: 'month', incomeBasis: 'net' });
      if (variation.id === 'rosa-rental-only') add('product_intent', 'case', 'classical_rental', message);
      if (variation.id === 'javier-opt-out') add('requested_next_step', 'case', 'no_contact', message);
    }
    const blockers: Blocker[] = [];
    const block = (sourceId: string, type: string, description: string) => { const original = base.messages.find(m => m.messageId === sourceId); const m = original && input.messages.find(x => equalContent(x, original)); if (m) blockers.push({ id: `replay-${m.messageId}-${type}`, type, description, status: 'open', evidenceRefs: [{ messageId: m.messageId }] }); };
    if (base.caseId === 'javier') { block('javier-m1', 'COST', 'Pregunta sobre coste'); block('javier-m5', 'TRUST', 'Pregunta sobre confianza'); }
    if (base.caseId === 'rosa') { block('rosa-m1', 'URGENT', 'Necesita mudarse pronto'); block('rosa-m3', 'BINDING_CLAIM', 'Solicita aprobación por escrito'); }
    for (const message of input.messages) { if (scenarios.find(s => s.id === 'javier-opt-out')?.additions.some(m => equalContent(m, message))) blockers.push({ id: `replay-${message.messageId}-OPT_OUT`, type: 'OPT_OUT', description: 'Solicita no recibir contacto', status: 'open', evidenceRefs: [{ messageId: message.messageId }] }); }
    return validateInterpretation({ assertions, blockers, warnings: ['Modo replay: resultados deterministas, no inferencia real.'] }, input);
  }
}
export class ReplayDraftGenerator implements DraftGenerator {
  async generate(input: Parameters<DraftGenerator['generate']>[0]) { return buildDraft(input, 'replay', chooseReplayTemplate(input)); }
}
