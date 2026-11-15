# P12-A — Auditoría de usabilidad e información

Fecha: 15-11-2026. Alcance: interfaz actual de Lead Intake V0, datos ficticios. Esta es una evaluación experta, no una prueba con asesores ni una validación de conformidad WCAG. Las recomendaciones son hipótesis de diseño; no autorizan cambios de reglas ni implementación.

## Método y límites

Se inspeccionaron `src/components/intake/workspace.tsx`, `src/app/intake.css`, documentación activa y pruebas de interacción. Se utilizó Impeccable (contexto, criterios de auditoría y crítica); `detect --json src/components/intake` devolvió `[]`, lo que no demuestra ausencia de defectos. La crítica no se ejecutó como evaluación independiente de dos agentes; los hallazgos son de una sola persona y pueden compartir sesgos. No se ejecutó overlay de detector. Se revisaron las diez heurísticas de Nielsen y criterios relevantes WCAG 2.2 mediante inspección limitada, sin afirmar cumplimiento.

Navegador local: Laura ficticia, análisis real con proveedor configurado, corrección, incidencia, alerta sensible, continuación, error de autor, reanálisis, conflicto y copia. Escritorio de aproximadamente 1265×712, portátil 1024×768 y estrecha 390×844 emulados; no dispositivos físicos. Se comprobó una transición de Tab y la existencia de `:focus-visible` en CSS, no un recorrido completo de teclado ni lector de pantalla. No se midieron contraste, zoom, objetivos táctiles ni tiempos con usuarios. Las pruebas `interactions.test.tsx` y `p11.test.ts` pasaron: 10/10, respuestas simuladas; no prueban presentación visual ni accesibilidad.

Capturas reproducibles con contenido ficticio: [resultado de escritorio](ux-audit/desktop-resultado.png), [alerta y revisión](ux-audit/alerta-revision.png), [portátil](ux-audit/portatil.png), [pantalla estrecha](ux-audit/estrecha.png), [resultado desactualizado](ux-audit/desactualizado.png), [error](ux-audit/error.png), [conflicto](ux-audit/conflicto.png). Son capturas de página completa; las primeras pantallas de portátil y móvil muestran principalmente la conversación. La salida de un modelo puede variar entre ejecuciones.

## Hallazgos priorizados

Gravedad: P0 bloquea tarea sin alternativa; P1 dificulta una decisión importante o puede inducir error; P2 fricción con alternativa; P3 detalle. Las recomendaciones son de interfaz, no cambios a B/D/E.

| ID | Gravedad / tarea | Evidencia y efecto | Recomendación |
|---|---|---|---|
| H1 | P1 · 2, 3, 6, 7 | [Resultado](ux-audit/desktop-resultado.png): incidencias, formulario de alerta y etapa preceden a la próxima intervención; tres botones por incidencia, incluso acciones incompatibles con el estado actual. La decisión se pierde entre controles. | Resumen de prioridades y siguiente acción arriba; agrupar incidencias relacionadas visualmente sin fusionar ni borrar sus identidades; mostrar acciones pertinentes al estado. Mantener sensibilidad y motivos de bloqueo visibles. |
| H2 | P1 · 2, 3, 4 | A 1024 y 390 px la cuadrícula pasa a una columna y el resultado sigue a toda la conversación ([portátil](ux-audit/portatil.png), [estrecha](ux-audit/estrecha.png)); localizar la acción exige desplazarse. | Tras analizar, dar entrada directa al área de trabajo y acceso persistente a conversación y prioridades. Conservar una vía inmediata de vuelta al texto. |
| H3 | P1 · 4, 5, 9, 10 | Cada candidato muestra metadatos técnicos en inglés (`explicit`, `joint`, `unknown`) incluso cuando no aplican; la ficha CRM los repite. En la observación aparecieron dos incidencias casi equivalentes sobre la cuota. | Traducir etiquetas en presentación y mostrar por defecto valor, estado, incertidumbre y fuente; dejar metadatos completos accesibles bajo demanda y conservarlos en exportación según reglas vigentes. No deduplicar datos automáticamente. |
| H4 | P1 · 8, 9, 10 | Tras corrección y reanálisis surgieron dos decisiones de conflicto para ingresos, incluida una para la declaración anterior reformulada; cada una exigió una elección ([conflicto](ux-audit/conflicto.png)). El bloqueo de copia se explica al final de la página. | Presentar comparativa por campo con todas las fuentes y decisiones individuales claramente identificadas; enlace visible al motivo de bloqueo y a su resolución. No esconder evidencia anterior ni resolverla automáticamente. |
| H5 | P1 · 1, 2, 8 | Al añadir una continuación, la vista cambia a editor y desactualiza resultados inmediatamente. En la prueba, escribir con el cursor al inicio produjo `uncertain_author`; el error muestra código técnico y pide reintentar ([error](ux-audit/error.png)). | Dar foco y posición clara al nuevo turno, explicar formato y error en lenguaje operativo con localización y recuperación. Mantener entrada y decisiones existentes. La posición de cursor observada depende del método de interacción; verificar con usuarios y teclado. |
| H6 | P1 · 7, 10 | La alerta sensible bloqueó la pregunta y explicó el motivo junto a ella; la ficha siguió copiable cuando la etapa era coherente. El comportamiento es deliberadamente distinto: no presentar un bloqueo universal inexistente. | Mostrar el efecto concreto de cada alerta y cualquier bloqueo vigente junto a la acción afectada; mantener la advertencia de detección parcial. |
| H7 | P2 · 4, 5 | Fuente enlazada por identificador y cita; abrir revisión requiere `Revisar` y luego `Corregir`, con comparación y formulario. Información de fuente y decisión se repite en varios lugares. | Conservar acceso contextual a cita y original; detalle de revisión bajo demanda, con foco claro y retorno al campo. |
| H8 | P2 · 6 | En la muestra «Marcar resuelta», «Descartar alerta» y «Reabrir» aparecen simultáneamente en cada incidencia, incluidas pendientes y resueltas. | Mostrar acción principal según estado y alternativas secundarias, conservando reapertura y descartes. |
| H9 | P2 · 1, 8 | El aviso de sesión temporal existe, pero cambiar ejemplo o restablecer reemplaza el expediente y revisiones en memoria (código `choose`). No se observó confirmación de pérdida. | Advertir y permitir cancelar cuando haya trabajo sin guardar; no proponer persistencia como hecho existente. |
| H10 | P2 · 2, 10 | Estado de carga anuncia «Analizando…» y error conserva resultado anterior; el estado desactualizado desactiva controles y retira vista previa. El código del error no orienta a reparar. | Conservar estos límites, explicar pasos de recuperación y distinguir error de entrada/proveedor sin exponer solo códigos. |
| H11 | P2 · 1, 4, 5 | La estructura utiliza botones para pestañas visuales sin estado semántico de pestaña; numerosos botones se llaman simplemente «Revisar» o «Marcar resuelta». El árbol accesible no identifica el campo en esos nombres. | Evaluar patrón semántico correcto y nombres contextuales; verificar foco, anuncios y orden con teclado y lector de pantalla. Hallazgo de código/árbol, no declaración de fallo WCAG completa. |
| H12 | P2 · 10 | Vista previa larga en textarea mezcla datos, procedencia, estados internos e incidencias. La copia real notificó éxito y aclaró que no sincroniza CRM. | Conservar vista previa íntegra y copia manual; separar resumen legible y detalle completo accesible, sin alterar contenido exportado sin decisión explícita. |

Fortalezas observadas: fuentes citadas y enlazadas; incertidumbre explícita; revisiones humanas conservadas; bloqueo y explicación de conflicto; declaración de datos ficticios, ausencia de sincronización y ausencia de verificación; carga y error visibles. La detección de incidencias es parcial, por lo que «sin incidencias detectadas» no demuestra ausencia de riesgo.

## Mapa de tareas

Los conteos son acciones mínimas de interfaz observadas o inferidas del código desde el estado indicado; excluyen desplazamiento, escritura y decisiones. No son mediciones temporales ni recorridos de usuarios.

| Tarea / objetivo | Acciones mínimas | Necesita siempre / bajo demanda / retirar del primer plano | Competencia y riesgo |
|---|---:|---|---|
| 1 Introducir conversación | 2: Texto libre, Editar texto; escribir | Entrada, formato, alias, datos ficticios / ejemplos / introducción promocional extensa | Pestañas y ejemplos compiten. Ocultar sintaxis dificulta corregir errores. |
| 2 Analizar y comprender | 1 analizar | Estado, resultado parcial/error, límites y prioridades / detalle de candidatos / contadores sin acción | Carga y resultado comparten espacio; no ocultar fallos parciales. |
| 3 Siguiente acción | 0 para leer; 1 copiar si habilitada | Pregunta o revisión humana, motivo y bloqueos / edición y explicación / metadatos no pertinentes | Incidencias y etapa anteceden a la pregunta; no ocultar alerta sensible. |
| 4 Verificar fuente | 1 enlace | Valor, cita y estado / mensaje completo, metadatos / duplicación del valor | El salto puede desplazar contexto; preservar retorno y fuente original. |
| 5 Corregir dato | 3: Revisar, Corregir, Guardar | Valor, origen, incertidumbre / comparación y motivo / metadatos irrelevantes | No atribuir precisión original a la corrección; conservar procedencia. |
| 6 Resolver incidencia | 1 por incidencia | Descripción, estado, origen y acción / historial / acciones no aplicables al estado | Resolver no verifica datos; no agrupar borrando señales. |
| 7 Alerta sensible | 2 añadir tras escribir; 1 resolver | Naturaleza, estado y efecto sobre pregunta / detalle y acciones alternativas / formulario vacío permanente | Detección incompleta: ocultar alerta o confundir bloqueo sería peligroso. |
| 8 Reanalizar | 2: continuación y reanalizar, tras escribir | Desactualización, fuente y estado de carga/error / resultados anteriores identificados / duplicación | Evitar copia o uso de datos antiguos como actuales; preservar revisiones. |
| 9 Resolver contradicción | 1 por conflicto observado | Valores, citas, decisión y bloqueo / metadatos y decisiones previas / repetición decorativa | No colapsar conflictos distintos ni elegir automáticamente. |
| 10 Preparar y copiar CRM | 1 copiar si habilitada | Estado exportable y bloqueos, vista previa, copia manual / detalle completo / etiquetas técnicas en resumen | No ocultar origen, incertidumbre ni condiciones de bloqueo. |

## Inventario y tratamiento propuesto

Frecuencia estimada como hipótesis, no telemetría. Visibilidad: siempre en contexto de trabajo, condicional cuando aplica, o bajo demanda.

| Componente actual | Frecuencia | Visibilidad / decisión |
|---|---|---|
| Identidad, alias, estado y aviso de sesión | Alta | Siempre; conservar compacto y con estado real. |
| Ejemplos, editor y formato | Alta al inicio | Entrada; simplificar y mantener ejemplos accesibles. |
| Conversación y citas | Alta | Acceso siempre; conversación completa bajo demanda o panel; conservar fuente. |
| Carga, error, desactualización, fallos parciales | Condicional | Siempre mientras aplique; conservar y explicar recuperación. |
| Alertas sensibles, incidencias y conflictos | Condicional | Resumen y bloqueos siempre mientras apliquen; detalle y acciones contextualizadas. No eliminar. |
| Próxima intervención | Alta | Siempre en trabajo cuando exista; conservar motivo y revisión humana. |
| Etapa y confirmación | Media | Estado siempre; acción condicional y explicación bajo demanda. |
| Siete campos y revisión | Alta | Valores y excepciones visibles; edición, metadatos y procedencia ampliada bajo demanda. |
| Alta manual de alerta | Ocasional | Control visible; formulario bajo demanda. |
| Vista previa CRM y copia | Final | Estado y acción visibles; ficha completa bajo demanda antes de copiar. |
| Recuentos, texto introductorio, metadatos técnicos repetidos | Baja hipotética | Simplificar o retirar del primer plano, sin eliminar información significativa. |

## Dos arquitecturas alternativas

### A — Una ruta, dos estados: entrada y trabajo (recomendada)

```text
ENTRADA                          TRABAJO · mismo expediente y URL
┌──────────────────────┐        ┌─────────────────────────────────────┐
│ Alias · sesión       │        │ Alias · estado · [Editar conversación]│
│ Ejemplos / texto     │        ├─────────────────────────────────────┤
│ Conversación         │        │ ALERTAS / BLOQUEOS (si existen)     │
│ Formato y límites    │        │ Motivo + acción para resolver       │
│ [Analizar]           │        ├─────────────────────────────────────┤
└──────────────────────┘        │ Próxima intervención + motivo       │
                                │ [Revisar/copiar pregunta]            │
                                ├─────────────────────────────────────┤
                                │ Ficha: valores · incertidumbre      │
                                │ [Fuente] [Revisar] por campo        │
                                ├─────────────────────────────────────┤
                                │ Incidencias · etapa · [Vista CRM]   │
                                └─────────────────────────────────────┘
```

En pantalla estrecha, acceso a conversación y a bloqueos antes de la ficha; comparación y fuente se abren en contexto con retorno de foco. En reanálisis, mantener visible el estado antiguo rotulado y deshabilitar lo que hoy se bloquea. Ventajas: reduce recorrido desde resultado a acción, conserva continuidad y referencia; menor reorganización. Riesgos: transición de estado debe hacer evidente cómo volver a editar, no esconder errores ni cambiar el orden de prioridad de reglas. Coste orientativo **M: 4–7 días de ingeniería**, más diseño, pruebas y validación; estimación sin desglose técnico ni compromiso.

### B — Espacio con navegación por áreas

```text
┌ Alias · estado · bloqueos siempre visibles ───────────────────┐
│ [Resumen] [Conversación] [Ficha y evidencias] [Incidencias] [CRM] │
├───────────────────────────────────────────────────────────────┤
│ Resumen: siguiente acción · alertas · campos pendientes       │
│ [Ir a incidencia] [Ver fuente] [Preparar CRM]                 │
└───────────────────────────────────────────────────────────────┘
```

Ventajas: zonas estables para expedientes extensos y acceso directo al detalle. Inconvenientes: más navegación y riesgo de separar evidencia, bloqueos y acción; necesita señales persistentes y retorno contextual. Coste orientativo **L: 7–12 días de ingeniería**, más diseño, pruebas y validación, por navegación, estado, accesibilidad y enlaces cruzados.

A se recomienda como hipótesis: acerca resultado y acción tras el análisis, conserva una sola ruta y reduce navegación estructural. No se ha demostrado que sea más rápida. B merece contraste si los asesores trabajan con expedientes largos o alternan frecuentemente entre áreas. Ambas preservan alertas críticas, incertidumbres, procedencia, información parcial y motivos de bloqueo.

## Heurísticas y accesibilidad

| Nielsen | Juicio experto / evidencia |
|---|---|
| 1 Estado del sistema | Carga, error y desactualización visibles; bloqueo lejos de la decisión (H4, H10). |
| 2 Correspondencia mundo real | Códigos y metadatos internos en inglés (H3, H5). |
| 3 Control y libertad | Revisión y reapertura disponibles; pérdida por restablecer merece protección (H9). |
| 4 Consistencia | Acciones de incidencia repetidas para todos los estados (H8). |
| 5 Prevención de errores | Copia bloqueada para conflicto; edición puede desactualizar y formato es frágil (H5, H10). |
| 6 Reconocimiento | Etiquetas genéricas de revisión y necesidad de recordar contexto (H11). |
| 7 Flexibilidad | Acceso directo a fuente y copia; navegación larga en portátil (H2). |
| 8 Diseño minimalista | Metadatos y controles compiten con prioridades (H1, H3). |
| 9 Recuperación | Se conserva entrada y resultado previo; código técnico poco accionable (H10). |
| 10 Ayuda | Formato disponible en editor y límites explícitos; falta orientación contextual de errores (H5). |

WCAG 2.2: inspeccionar específicamente 1.3.1 relaciones, 2.4.3 orden de foco, 2.4.7/2.4.11 foco visible/no oculto, 2.4.6 títulos y etiquetas, 3.3.1/3.3.3 identificación y sugerencia de error, 4.1.2 nombre/estado, 4.1.3 mensajes de estado, 1.4.3 contraste, 1.4.10 reflujo y 2.5.8 tamaño de objetivo. Son áreas de comprobación, no una lista de incumplimientos certificados. Repetir con Tab y Shift+Tab en todos los estados, lector de pantalla, zoom 200/400 %, contraste medido y dispositivos reales.

## Plan de comprobación

1. Congelar versión base y prototipos A/B con mismas reglas, casos y contenido ficticio; incluir entrada vacía, carga, fallo parcial/proveedor, obsoleto, ausencia, alerta sensible, etapa incoherente y conflicto múltiple. Registrar navegador y dimensiones.
2. Prueba moderada con 5–8 asesores representativos por ronda, contrabalanceando orden y casos; incluir teclado y necesidades de accesibilidad. Esto descubre problemas, no estima prevalencias con precisión.
3. Medir por tarea: tiempo hasta identificar acción correcta; éxito sin ayuda; errores de interpretación de fuente/incertidumbre; bloqueos detectados y explicados; número de acciones y desplazamiento; éxito de recuperación; carga percibida (pregunta breve o NASA-TLX). Registrar intervalos y observaciones, no solo medias.
4. Criterios propuestos antes de probar: ninguna alerta crítica, incertidumbre relevante o bloqueo omitido; ninguna ficha presentada como verificada o sincronizada; al menos igual éxito y menos tiempo/acciones en tareas 3, 4 y 10, sin empeorar corrección y recuperación. Ajustar umbrales con línea base, no inventar resultados.
5. Revisar accesibilidad manual y automatizada, contraste y responsive; repetir casos de conflicto y exportación con pruebas existentes y validación humana antes de implementar. Priorizar hallazgos y aprobar arquitectura por separado.
