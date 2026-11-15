import type { IssueStatus } from '../../intake/commercial';

type Issue = { key: string; category: string; description: string; status: IssueStatus; messageId?: string; quote?: string };
const categoryLabels: Record<string, string> = { sensitive: 'Alerta sensible', missing: 'Información pendiente', ambiguous: 'Necesita aclaración', manual: 'Alerta manual' };

export function IssueList({ issues, disabled, onChange }: { issues: Issue[]; disabled: boolean; onChange: (key: string, status: IssueStatus) => void }) {
  const ordered = [...issues].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || Number(b.category === 'sensitive') - Number(a.category === 'sensitive'));
  return <section aria-labelledby="issues-heading">
    <div className="section-title"><h3 id="issues-heading">Incidencias</h3><small>Señales provisionales</small></div>
    <p className="coverage-note">La detección automática es parcial y puede omitir situaciones importantes. Revisa la conversación original.</p>
    {ordered.length ? ordered.map(issue => <div className="key-issue" key={issue.key}>
      <strong>{categoryLabels[issue.category] ?? issue.category} · {issue.status === 'pending' ? 'Pendiente' : issue.status === 'resolved' ? 'Resuelta' : 'Descartada'}</strong>
      <p>{issue.description}</p>
      {issue.messageId && <p>Fuente {issue.messageId}{issue.quote && `: «${issue.quote}»`}</p>}
      <div className="review-actions">{issue.status === 'pending' ? <><button aria-label={`Marcar resuelta: ${issue.description}`} disabled={disabled} onClick={() => onChange(issue.key, 'resolved')}>Marcar resuelta</button><button aria-label={`Descartar alerta: ${issue.description}`} disabled={disabled} onClick={() => onChange(issue.key, 'dismissed')}>Descartar alerta</button></> : <button aria-label={`Reabrir: ${issue.description}`} disabled={disabled} onClick={() => onChange(issue.key, 'pending')}>Reabrir</button>}</div>
    </div>) : <p>Sin incidencias detectadas.</p>}
  </section>;
}
