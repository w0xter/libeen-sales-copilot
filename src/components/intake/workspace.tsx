'use client';

import { useState } from 'react';
import type { runIntake } from '../../intake/run-intake';
import type { Message } from '../../intake/extraction';
import { parseConversation } from '../../intake/parse-conversation';

type Result = Awaited<ReturnType<typeof runIntake>> & { messages: Message[]; discarded: number | null };
const examples: Record<string, string> = {
  Laura: 'Cliente: ¡Hola! Hemos visto vuestro anuncio en Instagram. Somos mi pareja y yo, buscamos piso en Valencia para mudarnos antes del verano.\n\nLibeen: ¡Hola! Encantados. Para ver si encajáis, ¿cuánto ganáis al mes entre los dos, después de deudas, y cuánto tenéis ahorrado para la entrada?\n\nCliente: Unos 3.800 € netos entre los dos. Ahorrado tenemos 18.000 más o menos.\n\nCliente: Ah, y pagamos un préstamo del coche de 250 € al mes, no sé si cuenta.',
  Javier: 'Cliente: buenas, cuanto cuesta esto? me interesa algo por madrid o alrededores\n\nLibeen: ¿Compras solo o con alguien? ¿Y cuánto ganas al mes, más o menos?\n\nCliente: solo. soy autonomo, depende del mes, entre 2000 y 3000\n\nCliente: [audio de 1:12]\n\nCliente: y esto es fiable? no sera una estafa no',
  Rosa: 'Cliente: Buenos días. Somos mi marido y yo. Él está jubilado, yo trabajo a media jornada. Entre los dos, 1.400 €. Ahorros no tenemos, pero necesitamos salir del piso en dos semanas.\n\nCliente: Si no podéis vendernos, ¿nos alquiláis algo solo de alquiler?\n\nCliente: Mi hijo dice que os pida por escrito que estamos aprobados antes de seguir.',
  Libre: '',
};
const labels = { interest: 'Interés en SmartHousing', location: 'Zona de búsqueda', horizon: 'Horizonte de mudanza', buyers: 'Compradores', income: 'Ingresos mensuales', savings: 'Ahorros declarados', debts: 'Cuotas / deudas' };

export function IntakeWorkspace() {
  const [selected, setSelected] = useState('Laura');
  const [alias, setAlias] = useState('Laura');
  const [source, setSource] = useState(examples.Laura);
  const [view, setView] = useState<'reading' | 'edit'>('reading');
  const [result, setResult] = useState<Result | null>(null);
  const [analyzedSource, setAnalyzedSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const stale = !!result && (source !== analyzedSource || !!error);
  const parsed = parseConversation(source);
  async function analyze() {
    setLoading(true); setError('');
    const snapshot = source;
    try {
      const response = await fetch('/api/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation: snapshot }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.extraction?.error || 'analysis_error');
      setResult(data); setAnalyzedSource(snapshot);
      setQuestion(data.intervention.kind === 'question' ? data.intervention.question : '');
    } catch (e) { setError(e instanceof Error ? e.message : 'analysis_error'); }
    finally { setLoading(false); }
  }
  function choose(name: string) {
    if ((result || source !== examples[selected]) && !window.confirm('¿Cambiar de expediente? Se perderán los cambios de esta sesión.')) return;
    setSelected(name); setAlias(name === 'Libre' ? '' : name); setSource(examples[name]); setResult(null); setError(''); setView(name === 'Libre' ? 'edit' : 'reading');
  }
  return <>
    <header className="app-top"><div className="inner"><div className="logo">libeen<span>.</span><em>Lead Intake</em></div><div className="top-badges"><span className="tiny-pill demo">● Demo · datos ficticios</span><span className="tiny-pill">Sin conexión CRM</span></div></div></header>
    <main><div className="headline"><div><p className="eyebrow">Espacio de trabajo del asesor</p><h1>Convierte una conversación en información útil.</h1><p className="subtitle">Del texto original a una ficha comercial trazable: identifica lo declarado, lo pendiente y la próxima aclaración que revisará el asesor.</p></div><button className="link-btn" onClick={() => choose('Libre')}>↺ Restablecer expediente</button></div>
      <div className="workspace"><section className="surface" aria-label="Entrada de conversación"><div className="surface-header"><div><h2>01 &nbsp; Conversación</h2><p>Fuente original del expediente temporal</p></div><span className="tiny-pill">Entrada manual</span></div><div className="source-head"><label className="field-label" htmlFor="alias">Alias del expediente</label><div className="case-row"><input id="alias" className="alias" value={alias} maxLength={45} onChange={e => setAlias(e.target.value)} /><span className="source-meta">Sesión temporal</span></div><div className="example-head"><span className="field-label">Ejemplos ficticios</span><span>O pega tu propio texto</span></div><div className="examples">{Object.keys(examples).map(name => <button key={name} className={`example-btn ${selected === name ? 'active' : ''}`} onClick={() => choose(name)}>{name === 'Libre' ? 'Texto libre' : name}</button>)}</div></div>
        <div className="tabs"><button className={`tab ${view === 'reading' ? 'active' : ''}`} onClick={() => setView('reading')}>Conversación</button><button className={`tab ${view === 'edit' ? 'active' : ''}`} onClick={() => setView('edit')}>Editar texto</button></div><div className="conversation-body">{view === 'edit' ? <div className="editor-wrap active"><textarea className="editor" aria-label="Texto original de la conversación" value={source} onChange={e => setSource(e.target.value)} /><p className="editor-help">Marca los turnos con «Cliente:» y «Libeen:» o «Asesor:». Las continuaciones deben ir indentadas.</p></div> : parsed.ok ? parsed.messages.map(m => <div key={m.id} id={`message-${m.id}`} className={`chat-row ${m.role === 'advisor' ? 'advisor' : ''}`}><span className="msg-avatar">{m.role === 'advisor' ? 'L' : 'C'}</span><div className="chat-inner"><div className="msg-meta">{m.role === 'advisor' ? 'Asesor' : 'Cliente'} · Fuente {m.id}</div><div className="bubble">{m.text ?? '[Audio sin transcripción]'}</div></div></div>) : <p>Abre «Editar texto» para introducir turnos con autor identificable.</p>}</div><div className="source-footer"><div className="source-action"><button className="primary" disabled={loading || !source.trim()} onClick={analyze}>{loading ? 'Analizando…' : result ? 'Reanalizar conversación ↗' : 'Analizar conversación ↗'}</button><button className="secondary" onClick={() => { setSource(source + (source.trim() ? '\n\n' : '') + 'Cliente: '); setView('edit'); }}>+ Añadir continuación</button></div><p className="tiny-note">Solo datos ficticios. La conversación se envía al proveedor de análisis; no se envía ningún mensaje al cliente.</p></div></section>
        <section className="surface" aria-label="Resultados"><div className="result-head"><div><h2>02 &nbsp; Lectura del expediente</h2><p>Lo importante primero, con acceso a cada fuente original.</p></div><span className="tiny-pill" role="status">{loading ? 'Analizando…' : error ? 'Error' : stale ? 'Desactualizado' : result ? 'Resultados' : 'Sin analizar'}</span></div><div className="result-content" aria-live="polite">{error && <div className="error-box" role="alert">No se ha podido completar el análisis: {error}. La conversación y el resultado anterior se conservan; vuelve a intentarlo.</div>}{stale && <div className="stale-banner">La conversación cambió o falló el análisis. El resultado anterior no está actualizado.</div>}{!result && !loading && <div className="empty-illustration"><div className="empty-icon">▤</div><h3>Todo empieza con la conversación</h3><p>Analiza el texto para ver los campos comerciales y sus fuentes.</p></div>}{loading && <p>Analizando la conversación…</p>}{result?.extraction.ok && <><div className="section-title"><h3>Ficha comercial</h3><small>Datos declarados, no verificados</small></div><div className="facts">{Object.entries(result.extraction.fields).map(([field, candidates]) => <div className="fact" key={field}><h4>{labels[field as keyof typeof labels]}</h4>{candidates.length ? candidates.map((c, i) => <div key={i}><strong>{c.value}</strong><p>{c.precision} · sujeto: {c.subject} · base: {c.incomeBasis} · cuota: {c.debtIncluded}</p><a href={`#message-${c.messageId}`} onClick={() => setView('reading')}>Fuente {c.messageId}: «{c.quote}»</a>{c.uncertainty && <p>{c.uncertainty}</p>}</div>) : <p>Sin informar</p>}</div>)}</div><div className="section-title"><h3>Incidencias</h3><small>Señales provisionales</small></div>{result.issues.ok && (result.issues.issues.length ? result.issues.issues.map(issue => <div className="key-issue" key={issue.id}><strong>{issue.category}</strong><p>{issue.description}</p>{issue.messageId && <p>Fuente {issue.messageId}{issue.quote && `: «${issue.quote}»`}</p>}</div>) : <p>Sin incidencias detectadas.</p>)}{result.discarded ? <p>El análisis descartó {result.discarded} candidatos sin fuente válida o formato admitido.</p> : null}<div className="section-title"><h3>Próxima intervención</h3></div>{result.intervention.kind === 'question' ? <div className="question"><p>{result.intervention.reason}</p><textarea aria-label="Pregunta sugerida editable" value={question} onChange={e => setQuestion(e.target.value)} disabled={stale} /><button className="micro" disabled={stale} onClick={() => navigator.clipboard.writeText(question)}>Copiar pregunta</button><p>Nunca se envía automáticamente.</p></div> : <p>{result.intervention.kind === 'error' ? result.intervention.error : result.intervention.label}</p>}</>}</div><div className="result-footer"><span>Sesión temporal · exportación pendiente</span></div></section></div></main><div className="disclaimer">Solo datos ficticios · Las declaraciones y revisiones no constituyen verificación documental ni aprobación financiera.</div>
  </>;
}
