import { fieldNames, type EffectiveSheet, type Field } from './effective';
import type { ReviewedIssue, Stage } from './commercial';
export const fieldLabels: Record<Field, string> = { interest: 'Interés en SmartHousing', location: 'Zona de búsqueda', horizon: 'Horizonte de mudanza', buyers: 'Compradores', income: 'Ingresos mensuales', savings: 'Ahorros declarados', debts: 'Cuotas / deudas' };
export type ExportBlocker = 'stale' | 'empty' | 'conflict' | 'stage';
export function exportBlockers({ sheet, current, stage, suggested }: { sheet: EffectiveSheet; current: boolean; stage: Stage; suggested: Stage }): ExportBlocker[] {
  const blockers: ExportBlocker[] = [];
  if (!current) blockers.push('stale');
  if (!fieldNames.some(field => sheet[field].status === 'available' && !!sheet[field].selected)) blockers.push('empty');
  if (fieldNames.some(field => sheet[field].status === 'conflict')) blockers.push('conflict');
  if (stage === 'Nuevo' && suggested !== 'Nuevo' || stage === 'Cualificado' && suggested !== 'Cualificado') blockers.push('stage');
  return blockers;
}
export function crmPreview({ alias, stage, sheet, issues, current, stageNeedsReview = false, previewOnly = false }: { alias: string; stage: Stage; stageNeedsReview?: boolean; previewOnly?: boolean; sheet: EffectiveSheet; issues: ReviewedIssue[]; current: boolean }): string | null {
  if (!current) return null;
  const lines = [`${previewOnly ? 'Vista previa no exportable' : 'Ficha CRM manual'} · ${alias || 'Sin alias'}`, stageNeedsReview ? `Etapa pendiente de revisión (etapa anterior: ${stage})` : `Etapa actual: ${stage} (completitud comercial, no aprobación)`, 'Datos autodeclarados; revisión operativa no equivale a verificación documental.', ''];
  for (const field of fieldNames) {
    const item = sheet[field];
    if (item.status !== 'available' || !item.selected) {
      lines.push(`${fieldLabels[field]}: ${item.status === 'missing' ? 'Sin informar' : item.status === 'discarded' ? 'Descartado por asesor' : 'Conflicto sin resolver'}`);
    } else {
      const v = item.selected;
      lines.push(`${fieldLabels[field]}: ${v.value} [${v.provenance}]`);
      lines.push(`  Fuente: ${v.source ? `${v.source.id}: «${v.quote}»` : 'no disponible'}${v.note ? ` · Procedencia humana: ${v.note}` : ''}`);
      lines.push(v.metadata ? `  Precisión: ${v.metadata.precision}; sujeto: ${v.metadata.subject}; base: ${v.metadata.incomeBasis}; cuota: ${v.metadata.debtIncluded}${v.metadata.uncertainty ? `; incertidumbre: ${v.metadata.uncertainty}` : ''}${v.metadata.debtInclusionSource ? `; fuente de inclusión: ${v.metadata.debtInclusionSource.messageId}: «${v.metadata.debtInclusionSource.quote}»` : ''}` : '  Precisión, sujeto y base: no establecidos para la corrección humana');
    }
    for (const r of item.humanReviews) lines.push(`  Revisión humana conservada: ${r.status} · ${r.value} · fuente original ${r.source.id}: «${r.candidate.quote}»${r.note ? ` · ${r.note}` : ''}`);
    if (item.evidence.length > 1 || item.status === 'conflict' || item.status === 'discarded') for (const e of item.evidence) lines.push(`  Evidencia conservada (no necesariamente seleccionada): ${e.candidate.value} · ${e.source?.id ?? 'fuente no disponible'}: «${e.candidate.quote}»`);
  }
  lines.push('', 'Incidencias:');
  if (!issues.length) lines.push('  Ninguna detectada.');
  else issues.forEach(i => lines.push(`  [${i.status}] ${i.category}: ${i.description ?? ''}`));
  lines.push('', previewOnly ? 'Revisión pendiente; esta vista no es una ficha actual exportable.' : 'Copia manual para CRM; no se ha realizado ninguna sincronización.');
  return lines.join('\n');
}
