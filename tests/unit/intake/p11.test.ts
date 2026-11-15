import { describe, expect, it } from 'vitest';
import { deriveEffective } from '../../../src/intake/effective';
import { exportBlockers } from '../../../src/intake/export';
import { suggestedStage } from '../../../src/intake/commercial';
import { identifyIssues } from '../../../src/intake/issues';
import { nextQuestion } from '../../../src/intake/next-question';
import { intakeRules } from '../../../src/intake/rules';

const empty = deriveEffective({ candidates: [], messages: [], reviews: {}, baselines: {}, resolutions: {} });
const usable = { ...empty, location: { ...empty.location, status: 'available' as const, selected: { value: 'Madrid', provenance: 'candidate' as const, source: null, quote: '', note: '', metadata: null } } };
describe('P11', () => {
  it('impide copiar una etapa incoherente tras un cambio del expediente', () => {
    expect(exportBlockers({ sheet: usable, current: true, stage: 'Cualificado', suggested: 'En cualificación' })).toContain('stage');
    expect(exportBlockers({ sheet: usable, current: true, stage: 'Nuevo', suggested: 'En cualificación' })).toContain('stage');
    expect(exportBlockers({ sheet: usable, current: true, stage: 'En cualificación', suggested: 'En cualificación' })).not.toContain('stage');
  });
  it('bloquea copia sin datos y ante conflictos sin ocultar la vista previa', () => {
    expect(exportBlockers({ sheet: empty, current: true, stage: 'En cualificación', suggested: 'En cualificación' })).toContain('empty');
    expect(exportBlockers({ sheet: { ...usable, income: { ...empty.income, status: 'conflict' } }, current: true, stage: 'En cualificación', suggested: 'En cualificación' })).toContain('conflict');
  });
  it('permite cambiar campos esenciales y prioridad sin cambiar el motor', () => {
    const fields = Object.fromEntries(['interest','location','horizon','buyers','income','savings','debts'].map(f => [f, []])) as unknown as Extract<Awaited<ReturnType<typeof import('../../../src/intake/extraction').extract>>, { ok: true }>['fields'];
    const extraction = { ok: true as const, fields, discarded: 0 };
    const rules = { ...intakeRules, requiredFields: ['location' as const, 'buyers' as const] };
    const issues = identifyIssues(extraction, [], rules);
    if (!issues.ok) throw Error('unexpected');
    expect(issues.issues.map(i => i.field)).toEqual(['location', 'buyers']);
    expect(nextQuestion(extraction, issues, { ...rules, requiredFields: ['buyers', 'location'] }).kind).toBe('question');
    expect(nextQuestion(extraction, issues, { ...rules, requiredFields: ['buyers', 'location'] })).toMatchObject({ field: 'buyers' });
    expect(suggestedStage({ analyzed: true, alias: 'Ejemplo', sheet: empty, pendingIssues: [], rules })).toBe('En cualificación');
    const onlyLocation = { ...rules, requiredFields: ['location' as const] };
    expect(suggestedStage({ analyzed: true, alias: 'Ejemplo', sheet: usable, pendingIssues: [], rules: onlyLocation })).toBe('Cualificado');
    expect(suggestedStage({ analyzed: true, alias: 'Ejemplo', sheet: { ...usable, savings: { ...empty.savings, status: 'conflict' } }, pendingIssues: [], rules: onlyLocation })).toBe('En cualificación');
    const ambiguities = { ok: true as const, incomplete: false, issues: [
      { id: 'a', category: 'ambiguous' as const, field: 'income' as const, description: 'No se conoce si los ingresos son netos o brutos.', review: 'clarification' as const },
      { id: 'b', category: 'ambiguous' as const, field: 'debts' as const, description: 'No se conoce si la cuota está descontada de los ingresos.', review: 'clarification' as const },
    ] };
    expect(nextQuestion(extraction, ambiguities, { ...rules, prioritizeIncomeBasis: false, ambiguityOrder: ['debts', 'income'] })).toMatchObject({ field: 'debts' });
    expect(nextQuestion(extraction, ambiguities, { ...rules, prioritizeIncomeBasis: true, ambiguityOrder: ['debts', 'income'] })).toMatchObject({ field: 'income' });
  });
});
