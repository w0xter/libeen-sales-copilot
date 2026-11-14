'use client';

import { useState } from 'react';
import type { CaseEvent, CaseView } from '../../contracts';
import { Conversation } from './conversation';
import { CaseDetails } from './case-details';
import { createDraftIntent, createMessageIntent } from './intents';
import styles from './workspace.module.css';

export interface CaseWorkspaceProps {
  view: CaseView | null;
  onIntent: (intent: CaseEvent) => void;
  loading?: boolean;
  fieldLabels?: Record<string, string>;
}

export function CaseWorkspace({ view, onIntent, loading = false, fieldLabels }: CaseWorkspaceProps) {
  if (loading) return <p role="status">Cargando expediente…</p>;
  if (!view) return <p role="status">No hay ningún expediente disponible.</p>;
  return <WorkspaceContent key={`${view.snapshot.caseId}:${view.draft?.draftId ?? ''}:${view.draft?.text ?? ''}`} view={view} onIntent={onIntent} fieldLabels={fieldLabels} />;
}

function WorkspaceContent({ view, onIntent, fieldLabels }: { view: CaseView; onIntent: (intent: CaseEvent) => void; fieldLabels?: Record<string, string> }) {
  const [draftText, setDraftText] = useState(view.draft?.text ?? '');
  const [message, setMessage] = useState('');
  const actionLabels: Record<string, string> = { CLARIFY: 'Aclarar información', ANSWER_QUESTION: 'Responder pregunta', PROPOSE_CALL: 'Proponer llamada', HANDOFF: 'Derivar a una persona', WAIT: 'Esperar', STOP_CONTACT: 'No contactar' };
  const stale = view.activeProposal?.status === 'superseded';
  const canReview = !!view.draft && !!view.activeProposal && !stale && view.draft.proposalId === view.activeProposal.proposalId && !['approved', 'discarded'].includes(view.draft.status);
  const submitDraft = (type: 'DRAFT_EDITED' | 'DRAFT_APPROVED' | 'DRAFT_DISCARDED') => {
    const intent = createDraftIntent(view, type, draftText);
    if (intent) onIntent(intent);
  };
  return <div className={styles.workspace}>
    <p className={styles.muted}>Modo de generación: {view.aiMode === 'replay' ? 'replay simulado' : 'OpenAI'}</p>
    {(view.errors.length > 0 || view.warnings.length > 0) && <section className={styles.error} role="alert">{view.errors.map((error, i) => <p key={`${error.code}-${i}`}>{error.message}{error.retryable ? ' · Puede volver a intentarlo.' : ''}</p>)}{view.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</section>}
    <div className={styles.columns}><div><Conversation messages={view.snapshot.messages} />
      <section className={`${styles.panel} ${styles.entry}`}><h3>Añadir mensaje ficticio</h3><p className={styles.muted}>Prepara una entrada simulada para esta demo.</p><form onSubmit={event => { event.preventDefault(); const intent = createMessageIntent(view, message); if (intent) { onIntent(intent); setMessage(''); } }}><label htmlFor="customer-message">Mensaje del cliente</label><textarea id="customer-message" value={message} onChange={event => setMessage(event.target.value)} placeholder="Escribe una respuesta ficticia…" /><button type="submit" disabled={!message.trim()}>Añadir mensaje simulado</button></form></section>
    </div><div><CaseDetails snapshot={view.snapshot} fieldLabels={fieldLabels} />
      <section className={`${styles.panel} ${styles.recommendation}`} aria-labelledby="recommendation-title"><span className={styles.eyebrow}>SIGUIENTE PASO</span><h2 id="recommendation-title">Recomendación del copiloto</h2>
        {view.activeProposal ? <><div className={styles.action}>{actionLabels[view.activeProposal.actionType] ?? view.activeProposal.actionType}</div><p>{view.activeProposal.reason}</p><p className={styles.muted}>Evidencia: {view.activeProposal.evidenceRefs.map(ref => ref.messageId).join(', ') || 'sin referencias'}</p>{stale && <p className={styles.error}>Propuesta desactualizada. Reevalúa el caso antes de aprobar.</p>}</> : <p className={styles.muted}>No hay propuesta disponible.</p>}
        {view.draft && <><label htmlFor="draft">Borrador para revisión</label><textarea id="draft" value={draftText} onChange={event => setDraftText(event.target.value)} disabled={!canReview} /><p className={styles.muted}>{view.draft.status === 'approved' ? 'Pendiente de comunicación. La aprobación no implica envío ni acuerdo.' : view.draft.status === 'discarded' ? 'Borrador descartado.' : 'Editable por el asesor. No se enviará automáticamente.'}</p><div className={styles.buttons}><button type="button" disabled={!canReview || !draftText.trim()} onClick={() => submitDraft('DRAFT_EDITED')}>Guardar edición</button><button type="button" disabled={!canReview || draftText !== view.draft.text} onClick={() => submitDraft('DRAFT_APPROVED')}>Aprobar borrador</button><button type="button" disabled={!canReview} onClick={() => submitDraft('DRAFT_DISCARDED')}>Descartar</button></div>{canReview && draftText !== view.draft.text && <p className={styles.muted}>Guarda la edición antes de aprobar.</p>}</>}
      </section></div></div>
  </div>;
}
