import { describe, expect, it } from 'vitest';
import { candidateKey, conflictsForReview } from '../../../src/intake/reanalysis';
import { applyReview } from '../../../src/intake/review';
const c = { field: 'income' as const, value: '3.800 €/mes', messageId: 'm1', quote: '3.800 €', precision: 'approximate' as const, subject: 'joint' as const, incomeBasis: 'net' as const, debtIncluded: 'unknown' as const, uncertainty: null };
const source = { id: 'm1', role: 'customer' as const, text: 'Ingresos: 3.800 €' };
describe('reanálisis', () => {
  it('identifica la misma fuente aunque cambie su número', () => {
    expect(candidateKey(c, source)).toBe(candidateKey({ ...c, messageId: 'm2' }, { ...source, id: 'm2' }));
    expect(candidateKey(c, source)).not.toBe(candidateKey(c, { ...source, text: 'Otra intervención: 3.800 €' }));
  });
  it('detecta valores diferentes de la corrección; la interfaz filtra las fuentes ya conocidas', () => {
    const review = applyReview(c, source, { action: 'correct', value: '3.600 €/mes', note: 'Revisión' })!;
    const newer = { ...c, messageId: 'm3', value: '4.100 €/mes', quote: '4.100 €' };
    expect(conflictsForReview(review, [c, newer])).toEqual([c, newer]);
    expect(review.value).toBe('3.600 €/mes');
  });
});
