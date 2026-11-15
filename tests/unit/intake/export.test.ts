import { describe, expect, it } from 'vitest';
import { crmPreview } from '../../../src/intake/export';
import { deriveEffective } from '../../../src/intake/effective';
const sheet = deriveEffective({ candidates: [], messages: [], reviews: {}, baselines: {}, resolutions: {} });
describe('exportación CRM manual', () => {
  it('bloquea resultados desactualizados', () => expect(crmPreview({ alias: 'Ejemplo', stage: 'Nuevo', sheet, issues: [], current: false })).toBeNull());
  it('distingue valores ausentes, descartados y conflictos sin consolidarlos', () => {
    const text = crmPreview({ alias: 'Ejemplo', stage: 'En cualificación', sheet: { ...sheet, savings: { ...sheet.savings, status: 'discarded' }, income: { ...sheet.income, status: 'conflict' } }, issues: [{ category: 'sensitive', status: 'pending', description: 'Revisar' }], current: true });
    expect(text).toContain('Ingresos mensuales: Conflicto sin resolver');
    expect(text).toContain('Ahorros declarados: Descartado por asesor');
    expect(text).toContain('Zona de búsqueda: Sin informar');
    expect(text).toContain('Revisar');
  });
});
