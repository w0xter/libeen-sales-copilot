import type { Message } from '../../contracts';
import styles from './workspace.module.css';

export function Conversation({ messages }: { messages: Message[] }) {
  return <section aria-labelledby="conversation-title" className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.eyebrow}>HISTORIAL</span><h2 id="conversation-title">Conversación</h2></div><span className={styles.badge}>Datos sintéticos</span></div>
    <div className={styles.messages}>{messages.map(message => <article key={message.messageId} className={`${styles.message} ${message.role === 'advisor' ? styles.advisor : ''}`}>
      <div className={styles.messageMeta}><strong>{message.role === 'advisor' ? 'Asesor' : message.role === 'customer' ? 'Cliente' : 'Sistema'}</strong><span>{message.messageId} · <time dateTime={message.occurredAt}>{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(message.occurredAt))} UTC</time></span></div>
      <p>{message.content.type === 'text' ? message.content.text : `Audio no disponible${message.content.durationSeconds ? ` · ${message.content.durationSeconds} s` : ''}`}</p>
    </article>)}</div>
  </section>;
}
