import type { ExportBlocker } from '../../intake/export';

export function CrmExport({ preview, blockers, copyStatus, onCopy, onConversation, onFacts }: { preview: string | null; blockers: ExportBlocker[]; copyStatus: string; onCopy: () => void; onConversation: () => void; onFacts: () => void }) {
  return <section className="result-content crm-export" aria-labelledby="crm-heading">
    <div className="section-title"><h3 id="crm-heading">Preparar ficha CRM</h3><small>Carga manual · sin conexión CRM</small></div>
    {preview ? <><details><summary>Ver vista previa completa</summary><textarea className="editor" aria-label="Vista previa de ficha CRM" readOnly value={preview} /></details>
      <button className="primary" disabled={blockers.length > 0} onClick={onCopy}>Copiar ficha CRM</button>
      {blockers.includes('empty') && <p role="alert">No hay datos utilizables. Revisa la conversación y vuelve a analizar si es necesario. <button className="micro" onClick={onConversation}>Revisar conversación</button></p>}
      {blockers.includes('conflict') && <p role="alert">Hay conflictos pendientes. Resuélvelos antes de copiar la ficha. <button className="micro" onClick={onFacts}>Revisar ficha</button></p>}
      {blockers.includes('stage') && <p role="alert">La etapa anterior ya no refleja el expediente. Confirma la etapa sugerida antes de copiar.</p>}
      <p role="status">{blockers.length ? '' : copyStatus}</p>
    </> : <p>Reanaliza antes de preparar una ficha actual.</p>}
  </section>;
}
