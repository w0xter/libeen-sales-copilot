'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { demoBundle } from '../../config';
import type { ApplicationError, CaseEvent, CaseView } from '../../contracts';
import { CaseWorkspace } from './case-workspace';
import { fetchCase, sendOperation, type Operation } from './api-client';
import styles from './workspace.module.css';

type CaseId = 'laura' | 'javier' | 'rosa';
const labels = Object.fromEntries(demoBundle.factSchema.fields.map(field => [field.id, field.label]));
const errorText = (error: ApplicationError) => `${error.message}${error.code === 'REVISION_CONFLICT' || error.code === 'STALE_PROPOSAL' ? ' Actualiza el expediente y vuelve a intentarlo.' : ''}`;

export function LiveWorkspace() {
  const [selected, setSelected] = useState<CaseId>('laura');
  const [view, setView] = useState<CaseView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<Operation | null>(null);
  const current = useRef(selected);
  const apply = useCallback(async (operation: Operation, caseId: CaseId) => {
    setLoading(true); setError('');
    try {
      const result = await sendOperation(operation);
      if (current.current !== caseId) return false;
      if (result.ok) { setView(result.value); setRetry(null); return true; }
      setError(errorText(result.error)); setRetry(null); return false;
    } catch { if (current.current === caseId) { setError(operation.operation === 'reset' ? 'No se pudo confirmar el restablecimiento. Actualiza el expediente para comprobar su estado.' : 'No se pudo conectar. Puedes reintentar la misma operación.'); setRetry(operation.operation === 'event' ? operation : null); } return false; }
    finally { if (current.current === caseId) setLoading(false); }
  }, []);
  const load = useCallback(async (caseId: CaseId) => {
    setLoading(true); setError(''); setRetry(null);
    try {
      const result = await fetchCase(caseId);
      if (current.current !== caseId) return;
      if (!result.ok) { setError(errorText(result.error)); return; }
      setView(result.value);
      // A stable event ID makes Strict Mode and network retries idempotent.
      if (result.value.snapshot.analysisStatus === 'pending' && !result.value.snapshot.events.length) {
        const event: CaseEvent = { eventId: `${caseId}-initial-analysis`, caseId, type: 'CASE_ANALYSIS_REQUESTED', actor: 'advisor', occurredAt: '2026-05-01T11:00:00Z', expectedRevision: result.value.snapshot.revision, payload: {} };
        await apply({ operation: 'event', event }, caseId);
      }
    } catch { if (current.current === caseId) setError('No se pudo cargar el expediente.'); }
    finally { if (current.current === caseId) setLoading(false); }
  }, [apply]);
  useEffect(() => { queueMicrotask(() => void load(selected)); }, [selected, load]);
  const dispatch = (event: CaseEvent) => { void apply({ operation: 'event', event }, selected); };
  const base = () => ({ eventId: crypto.randomUUID(), caseId: selected, actor: 'advisor' as const, occurredAt: new Date().toISOString(), expectedRevision: view!.snapshot.revision });
  const analyze = () => { if (view) dispatch({ ...base(), type: 'CASE_ANALYSIS_REQUESTED', payload: {} }); };
  const reset = async () => { if (await apply({ operation: 'reset', caseId: selected }, selected)) await load(selected); };
  const simulateSent = () => { if (view?.draft && view.activeProposal) dispatch({ ...base(), type: 'MESSAGE_SIMULATED_AS_SENT', simulated: true, payload: { draftId: view.draft.draftId, proposalId: view.activeProposal.proposalId } }); };
  return <main className={styles.shell}>
    <header className={styles.header}><div><div className={styles.brand}>LIBEEN <span> / SALES COPILOT</span></div><h1>Tu espacio de asesoría</h1><p>Entiende cada conversación y prepara el siguiente paso con contexto.</p></div><div className={styles.mode}><span className={styles.dot} /> Datos sintéticos · Sin envío real</div></header>
    <div className={styles.toolbar}><div><span className={styles.eyebrow}>EXPEDIENTES SINTÉTICOS</span><h2>Selecciona un caso</h2></div><nav aria-label="Seleccionar caso" className={styles.tabs}>{(['laura', 'javier', 'rosa'] as const).map(id => <button key={id} type="button" aria-pressed={selected === id} disabled={loading} onClick={() => { if (id !== selected) { current.current = id; setView(null); setSelected(id); } }}>{id[0].toUpperCase() + id.slice(1)}</button>)}</nav></div>
    <p className={styles.demoNotice}>Expedientes ficticios en memoria. Las acciones no envían mensajes ni reservan citas.</p>
    <div className={styles.buttons}><button type="button" onClick={analyze} disabled={!view || loading}>Analizar conversación</button><button type="button" onClick={() => void load(selected)} disabled={loading}>Actualizar</button><button type="button" onClick={() => void reset()} disabled={loading}>Restablecer caso</button></div>
    {error && <div role="alert" className={styles.error}><p>{error}</p>{retry && <button type="button" disabled={loading} onClick={() => void apply(retry, selected)}>Reintentar operación</button>}</div>}
    <CaseWorkspace view={view} onIntent={dispatch} loading={loading} fieldLabels={labels} />
    {view?.draft?.status === 'approved' && <section className={styles.panel}><h2>Acciones simuladas</h2><p>La aprobación no indica que se haya enviado un mensaje ni que el cliente haya aceptado.</p><button disabled={loading} onClick={simulateSent}>Registrar envío simulado</button></section>}
  </main>;
}
