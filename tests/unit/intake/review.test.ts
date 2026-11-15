import { describe, expect, it } from 'vitest';
import { applyReview, type Review } from '../../../src/intake/review';

const candidate = { field: 'income' as const, value: '3.800 €/mes', messageId: 'm1', quote: '3.800 €', precision: 'approximate' as const, subject: 'joint' as const, incomeBasis: 'net' as const, debtIncluded: 'unknown' as const, uncertainty: null };
const source = { id: 'm1', role: 'customer' as const, text: 'Ingresos: 3.800 €' };
describe('revisión humana', () => {
  it('conserva fuente y metadatos al confirmar y corregir', () => {
    const confirmed = applyReview(candidate, source, { action: 'confirm' });
    expect(confirmed?.candidate).toEqual(candidate);
    expect(confirmed?.source).toEqual(source);
    expect(confirmed?.status).toBe('confirmed');
    const corrected = applyReview(candidate, source, { action: 'correct', value: '3.600 €/mes', note: 'Aclarado' });
    expect(corrected?.value).toBe('3.600 €/mes');
    expect(corrected?.candidate.subject).toBe('joint');
    expect(corrected?.candidate.precision).toBe('approximate');
    expect(corrected?.note).toBe('Aclarado');
  });
  it('descarta y restaura la propuesta', () => {
    const discarded: Review | null = applyReview(candidate, source, { action: 'discard' });
    expect(discarded?.status).toBe('discarded');
    expect(applyReview(candidate, source, { action: 'restore' })).toBeNull();
  });
});
