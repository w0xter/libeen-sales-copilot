import type { Candidate, Review } from '../../intake/review';
import { fieldLabels } from '../../intake/export';
import type { Field } from '../../intake/effective';

type Conflict = { candidate: Candidate; decision: Review; conflictKey: string };
export function Conflicts({ conflicts, resolutions, disabled, onResolve }: { conflicts: Conflict[]; resolutions: Record<string, 'keep' | 'adopt'>; disabled: boolean; onResolve: (key: string, value: 'keep' | 'adopt') => void }) {
  const fields = Array.from(new Set(conflicts.map(conflict => conflict.candidate.field)));
  return <>{fields.map(field => <section className="conflict-banner" key={field} aria-label={`Conflicto: ${fieldLabels[field as Field]}`}>
    <h3>Revisar {fieldLabels[field as Field]}</h3>
    <p>Compara las declaraciones y decide cada propuesta. Las decisiones pendientes impiden copiar la ficha CRM.</p>
    {conflicts.filter(item => item.candidate.field === field).map(({ decision, candidate, conflictKey }) => <div className="conflict-choice" key={conflictKey}>
      <p><strong>Corrección conservada:</strong> {decision.value} · fuente original «{decision.source.text}»</p>
      <p><strong>Propuesta:</strong> {candidate.value} · fuente {candidate.messageId}: «{candidate.quote}»</p>
      {resolutions[conflictKey] ? <p>Decisión del asesor: {resolutions[conflictKey] === 'keep' ? `mantener ${decision.value}` : `usar ${candidate.value}`}. Ambas evidencias permanecen visibles.</p> : <div className="review-actions"><button disabled={disabled} onClick={() => onResolve(conflictKey, 'keep')}>Mantener corrección</button><button disabled={disabled} onClick={() => onResolve(conflictKey, 'adopt')}>Usar nueva declaración</button></div>}
    </div>)}
  </section>)}</>;
}
