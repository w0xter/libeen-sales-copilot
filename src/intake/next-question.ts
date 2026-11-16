import type { extract } from './extraction';
import type { identifyIssues, Issue } from './issues';
import { intakeRules, type IntakeRules } from './rules';

type Extraction = Awaited<ReturnType<typeof extract>>;
type Issues = ReturnType<typeof identifyIssues>;
type Field = NonNullable<Issue['field']>;

const missingQuestions: Record<Exclude<Field, 'debts'>, string> = {
  interest: '¿Os interesa explorar SmartHousing?',
  location: '¿En qué zona buscáis vivienda?',
  horizon: '¿En qué plazo queréis comprar?',
  buyers: '¿Quiénes compraríais la vivienda?',
  income: '¿Cuáles son vuestros ingresos mensuales?',
  savings: '¿Cuánto tenéis ahorrado?',
};
const clarificationQuestions: Record<Field, string> = {
  interest: '¿Podéis aclarar vuestro interés en SmartHousing?',
  location: '¿Podéis aclarar la zona en la que buscáis vivienda?',
  horizon: '¿Podéis aclarar el plazo en el que queréis comprar?',
  buyers: '¿Podéis aclarar quiénes compraríais la vivienda?',
  income: '¿Podéis aclarar los ingresos que habéis indicado?',
  savings: '¿Podéis aclarar los ahorros que habéis indicado?',
  debts: '¿Podéis aclarar la cuota que habéis indicado?',
};

type Result =
  | { kind: 'error'; error: Extract<Extraction, { ok: false }>['error'] }
  | { kind: 'human_review'; label: 'Revisión del asesor'; reason: string; issueId: string; field?: Field }
  | { kind: 'question'; question: string; reason: string; field: Field; issueId: string }
  | { kind: 'none'; label: 'Sin preguntas pendientes prioritarias' };

/** Selecciona una intervención propuesta; no envía ni modifica datos. */
export function nextQuestion(extraction: Extraction, result: Issues, rules: IntakeRules = intakeRules): Result {
  if (!extraction.ok) return { kind: 'error', error: extraction.error };
  if (!result.ok) return { kind: 'error', error: result.error };

  const sensitive = result.issues.find(issue => issue.category === 'sensitive');
  if (sensitive) return { kind: 'human_review', label: 'Revisión del asesor', reason: sensitive.description, issueId: sensitive.id, ...(sensitive.field ? { field: sensitive.field } : {}) };

  const ambiguities = result.issues.filter(issue => issue.category === 'ambiguous');
  // D emite esta descripción concreta para la base; tiene prioridad sobre otras dudas económicas.
  const basis = rules.prioritizeIncomeBasis ? ambiguities.find(issue => issue.field === 'income' && issue.reason === 'income_basis') : undefined;
  const ambiguity = basis ?? rules.ambiguityOrder.map(field => ambiguities.find(issue => issue.field === field)).find(Boolean) ?? ambiguities[0];
  if (ambiguity) {
    if (ambiguity.reason === 'debt_inclusion' && ambiguity.review === 'human') return { kind: 'human_review', label: 'Revisión del asesor', reason: ambiguity.description, issueId: ambiguity.id, field: 'debts' };
    if (ambiguity.reason === 'debt_inclusion') return { kind: 'question', question: '¿La cuota que habéis indicado ya está descontada de vuestros ingresos?', reason: ambiguity.description, field: 'debts', issueId: ambiguity.id };
    if (!ambiguity.field) return { kind: 'human_review', label: 'Revisión del asesor', reason: ambiguity.description, issueId: ambiguity.id };
    let question = clarificationQuestions[ambiguity.field];
    if (ambiguity === basis) question = '¿Los ingresos mensuales que habéis indicado son netos o brutos?';
    return { kind: 'question', question, reason: ambiguity.description, field: ambiguity.field, issueId: ambiguity.id };
  }

  for (const field of rules.requiredFields) {
    const issue = result.issues.find(item => item.category === 'missing' && item.field === field);
    if (issue) return { kind: 'question', question: missingQuestions[field], reason: issue.description, field, issueId: issue.id };
  }
  return { kind: 'none', label: 'Sin preguntas pendientes prioritarias' };
}
