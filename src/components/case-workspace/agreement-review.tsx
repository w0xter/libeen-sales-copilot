'use client';

import { useState } from 'react';
import type { CaseEvent, CaseView } from '../../contracts';
import { createAgreementIntent } from './intents';
import styles from './workspace.module.css';

/** Human judgment is explicit; the system does not infer acceptance from text. */
export function AgreementReview({ view, onIntent, loading }: { view: CaseView; onIntent: (event: CaseEvent) => void; loading: boolean }) {
  const [messageId, setMessageId] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const messages = view.snapshot.messages.filter(message => message.role === 'customer' && message.content.type === 'text');
  const selected = messages.find(message => message.messageId === messageId);
  return <section className={styles.panel}>
    <h2>Registrar acuerdo simulado</h2>
    <p>Selecciona y lee el mensaje del cliente que confirma el siguiente paso. Esto no reserva ninguna cita.</p>
    <label htmlFor="agreement-message">Mensaje del cliente</label>
    <select id="agreement-message" value={messageId} onChange={event => { setMessageId(event.target.value); setReviewed(false); }}>
      <option value="">Selecciona un mensaje</option>
      {messages.map(message => <option key={message.messageId} value={message.messageId}>{message.messageId}</option>)}
    </select>
    {selected?.content.type === 'text' && <blockquote>{selected.content.text}</blockquote>}
    <label><input type="checkbox" checked={reviewed} disabled={!selected} onChange={event => setReviewed(event.target.checked)} /> He leído el mensaje y confirmo que el cliente acepta el siguiente paso.</label>
    <button type="button" disabled={loading || !selected || !reviewed} onClick={() => { const intent = createAgreementIntent(view, messageId, reviewed); if (intent) { onIntent(intent); setReviewed(false); } }}>Registrar acuerdo simulado</button>
  </section>;
}
