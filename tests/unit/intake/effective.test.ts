import { describe, expect, it } from 'vitest';
import { deriveEffective } from '../../../src/intake/effective';
import { applyReview } from '../../../src/intake/review';
import { candidateKey } from '../../../src/intake/reanalysis';

const source = { id: 'm1', role: 'customer' as const, text: 'Ingresos 3.800 €' };
const newerSource = { id: 'm2', role: 'customer' as const, text: 'Ingresos 4.100 €' };
const candidate = { field: 'income' as const, value: '3.800 €/mes', messageId: 'm1', quote: '3.800 €', precision: 'approximate' as const, subject: 'joint' as const, incomeBasis: 'net' as const, debtIncluded: 'unknown' as const, uncertainty: null };
const newer = { ...candidate, messageId: 'm2', quote: '4.100 €', value: '4.100 €/mes' };
const key = candidateKey(candidate, source);
const newKey = candidateKey(newer, newerSource);
const review = applyReview(candidate, source, { action: 'correct', value: '3.600 €/mes', note: 'asesor' })!;
const baseline = { [key]: [JSON.stringify([key, candidate.value])] };
const conflictKey = JSON.stringify([key, newKey, newer.value]);
const input = { candidates: [candidate, newer], messages: [source, newerSource], reviews: { [key]: review }, baselines: baseline };
describe('ficha efectiva', () => {
  it('no consolida un conflicto sin resolver y conserva la revisión humana', () => { const field = deriveEffective({ ...input, resolutions: {} }).income; expect(field.status).toBe('conflict'); expect(field.humanReviews[0].value).toBe('3.600 €/mes'); });
  it('selecciona la corrección o la nueva declaración según la decisión', () => {
    const kept = deriveEffective({ ...input, resolutions: { [conflictKey]: 'keep' } }).income;
    const adopted = deriveEffective({ ...input, resolutions: { [conflictKey]: 'adopt' } }).income;
    expect(kept.selected?.value).toBe('3.600 €/mes');
    expect(kept.selected?.metadata).toBeNull();
    expect(adopted.selected?.value).toBe('4.100 €/mes');
    expect(adopted.selected?.source?.text).toBe(newerSource.text);
  });
  it('no consolida varias propuestas al confirmar una sola', () => {
    const confirmed = applyReview(candidate, source, { action: 'confirm' })!;
    expect(deriveEffective({ ...input, reviews: { [key]: confirmed }, resolutions: {} }).income.status).toBe('conflict');
  });
  it('conserva la selección al renumerar el historial', () => {
    const renumbered = { ...newer, messageId: 'm3' };
    expect(deriveEffective({ ...input, candidates: [{ ...candidate, messageId: 'm2' }, renumbered], messages: [{ ...source, id: 'm2' }, { ...newerSource, id: 'm3' }], resolutions: { [conflictKey]: 'adopt' } }).income.selected?.value).toBe('4.100 €/mes');
  });
});
