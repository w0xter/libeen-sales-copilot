import { describe, expect, it } from 'vitest';
import { suggestedStage, canUseQuestion } from '../../../src/intake/commercial';
import type { EffectiveSheet } from '../../../src/intake/effective';
const sheet = Object.fromEntries(['interest','location','horizon','buyers','income','savings','debts'].map(field => [field, { status: 'available', selected: { value: field === 'interest' ? 'Interesado en SmartHousing' : '0', metadata: { incomeBasis: 'net', subject: 'joint', precision: 'explicit', debtIncluded: 'included', uncertainty: null } }, evidence: [] }])) as unknown as EffectiveSheet;
describe('estado comercial', () => {
  it('exige información completa e interés explícito sin imponer mínimos financieros', () => {
    expect(suggestedStage({ analyzed: true, alias: 'Rosa', sheet, pendingIssues: [] })).toBe('Cualificado');
    expect(suggestedStage({ analyzed: true, alias: 'Rosa', sheet: { ...sheet, income: { ...sheet.income, status: 'conflict' } }, pendingIssues: [] })).toBe('En cualificación');
    expect(suggestedStage({ analyzed: false, alias: '', sheet, pendingIssues: [] })).toBe('Nuevo');
  });
  it('bloquea la pregunta ante alerta sensible pendiente', () => {
    expect(canUseQuestion([{ category: 'sensitive', status: 'pending' }])).toBe(false);
    expect(canUseQuestion([{ category: 'sensitive', status: 'resolved' }])).toBe(true);
  });
});
