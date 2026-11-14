import type { FactView, CaseSnapshot } from '../../contracts';
import styles from './workspace.module.css';

const statusLabels: Record<FactView['status'], string> = { known: 'declarado', approximate: 'aproximado', unknown: 'desconocido', ambiguous: 'requiere aclaración', conflicting: 'contradictorio', not_applicable: 'no aplica' };
function valueText(fact: FactView): string {
  if (!('value' in fact) || fact.value === undefined) return statusLabels[fact.status];
  const value = fact.value;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return `${value.min.toLocaleString('es-ES')}–${value.max.toLocaleString('es-ES')}${fact.unit === 'EUR' ? ' €' : ''}`;
  return typeof value === 'number' ? `${value.toLocaleString('es-ES')}${fact.unit === 'EUR' ? ' €' : ''}` : String(value);
}
const milestoneStatus: Record<string, string> = { pending: 'pendiente', in_progress: 'en curso', blocked: 'bloqueado', completed: 'completado', not_applicable: 'no aplica', waived: 'dispensado' };
const caseStatus: Record<CaseSnapshot['status'], string> = { NEEDS_ADVISOR: 'Requiere asesor', READY_TO_REPLY: 'Respuesta preparada', WAITING_CUSTOMER: 'Esperando respuesta', ON_HOLD_REVIEW: 'Revisión humana', NEXT_STEP_AGREED: 'Siguiente paso acordado', CLOSED: 'Cerrado', DO_NOT_CONTACT: 'No contactar' };
const scopeLabels = { case: 'caso', participant: 'persona', buying_unit: 'unidad de compra' };
export function CaseDetails({ snapshot, fieldLabels = {} }: { snapshot: CaseSnapshot; fieldLabels?: Record<string, string> }) {
  return <section aria-labelledby="details-title" className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.eyebrow}>EXPEDIENTE</span><h2 id="details-title">Contexto del caso</h2></div><span className={styles.badge}>Revisión {snapshot.revision}</span></div>
    <p className={styles.muted}>{snapshot.goal.description} · {caseStatus[snapshot.status]}</p>
    <h3>Progreso comercial</h3><div className={styles.milestones}>{snapshot.workflowProgress.milestones.map(m => <div key={m.milestoneId} className={styles.milestone}><b>{m.milestoneId}</b><span>{milestoneStatus[m.status] ?? m.status}</span></div>)}</div>
    <h3>Datos declarados</h3><dl className={styles.facts}>{snapshot.knowledge.facts.map((fact, index) => <div key={`${fact.fieldId}-${fact.subjectRef.id}-${index}`}><dt>{fieldLabels[fact.fieldId] ?? fact.fieldId.replaceAll('_', ' ')}</dt><dd><strong>{valueText(fact)}</strong><small>{statusLabels[fact.status]} · {scopeLabels[fact.subjectRef.scope]}{fact.incomeBasis ? ` · ${fact.incomeBasis === 'net' ? 'neto' : fact.incomeBasis === 'gross' ? 'bruto' : 'neto/bruto desconocido'}` : ''}{fact.period ? ` · ${fact.period === 'month' ? 'mensual' : fact.period}` : ''}{fact.evidenceRefs.length > 0 ? ` · ${fact.evidenceRefs.map(e => e.messageId).join(', ')}` : ''}</small></dd></div>)}</dl>
    <h3>Dudas y alertas</h3>{snapshot.blockers.length ? snapshot.blockers.map(blocker => <div className={styles.alert} key={blocker.id}><strong>{blocker.description}</strong><small>{blocker.evidenceRefs.map(ref => ref.messageId).join(', ')}</small></div>) : <p className={styles.muted}>No hay alertas registradas.</p>}
  </section>;
}
