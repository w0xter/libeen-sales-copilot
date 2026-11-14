'use client';

import { useState } from 'react';
import type { CaseEvent } from '../../contracts';
import { demoBundle } from '../../config';
import { CaseWorkspace } from './case-workspace';
import { mockViews } from './mock-views';
import styles from './workspace.module.css';

type CaseId = keyof typeof mockViews;
export function MockWorkspace() {
  const [selected, setSelected] = useState<CaseId>('laura');
  const [notice, setNotice] = useState('');
  const onIntent = (intent: CaseEvent) => {
    void intent;
    setNotice('Acción preparada. Esta vista de prueba no modifica el expediente.');
  };
  return <main className={styles.shell}><header className={styles.header}><div><div className={styles.brand}>LIBEEN <span> / SALES COPILOT</span></div><h1>Tu espacio de asesoría</h1><p>Entiende cada conversación y prepara el siguiente paso con contexto.</p></div><div className={styles.mode}><span className={styles.dot} /> Vista de prueba · Datos simulados</div></header>
    <div className={styles.toolbar}><div><span className={styles.eyebrow}>EXPEDIENTES SINTÉTICOS</span><h2>Selecciona un caso</h2></div><nav aria-label="Seleccionar caso" className={styles.tabs}>{(['laura', 'javier', 'rosa'] as const).map(id => <button key={id} type="button" aria-pressed={selected === id} onClick={() => { setSelected(id); setNotice(''); }}>{id[0].toUpperCase() + id.slice(1)}</button>)}</nav></div>
    <p className={styles.demoNotice}>Vista con datos de ejemplo. Las acciones se muestran como intenciones y no se guardan ni envían.</p>{notice && <p className={styles.notice} role="status">{notice}</p>}
    <CaseWorkspace view={mockViews[selected]} onIntent={onIntent} fieldLabels={Object.fromEntries(demoBundle.factSchema.fields.map(field => [field.id, field.label]))} />
  </main>;
}
