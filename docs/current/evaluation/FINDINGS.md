# Hallazgos

## E2E-F001 — La pregunta no expresa la ambigüedad material identificada

- **Severidad:** MEDIUM. **Recorrido/AC:** E2E-01, AC-07 por analogía y AC-12. **Estado:** abierto.
- **Reproducción:** configurar proveedor real; ejecutar `RUN_E2E_REAL=1 pnpm exec playwright test -g 'OpenAI real'`; consultar pregunta e incidencia. Conversación y expectativas en [REAL_EXPECTATIONS.md](REAL_EXPECTATIONS.md).
- **Esperado:** preguntar si la cuota de 180 €/mes ya está descontada de los ingresos declarados, para resolver la duda concreta.
- **Observado:** la incidencia sí explica esa duda, pero la única pregunta es «¿Podéis aclarar la cuota que habéis indicado?», sin explicar qué aclarar. [Captura](real-result.png). Una observación de una llamada; frecuencia desconocida.
- **Causa probable, no confirmada:** formulación genérica de la intervención a partir del tipo de incidencia; no se ha diagnosticado el origen.
- **Recomendación:** revisar generación y probar que la pregunta conserva la relación concreta entre ingreso y cuota, sin inventar inclusión. No se ha modificado producto.

## Riesgos históricos de señales sensibles

P4/P11 describen falsos negativos en Javier y Rosa. En la continuación se analizaron las frases originales y se detectaron las señales en una llamada por caso; esto no demuestra que los falsos negativos estén corregidos ni que la detección sea estable. Véase el [informe actualizado](CONTINUATION_REPORT.md).

## E2E-F002 — Interés genérico o alquiler se registra bajo SmartHousing

- **Severidad:** HIGH. **Recorrido/AC:** E2E-02, E2E-03, AC-03, AC-10, AC-19. **Estado:** abierto.
- **Reproducción:** analizar Laura original y Rosa original con proveedor real; abrir ficha y vista CRM. Puede reproducirse la presentación con `pnpm exec playwright test tests/e2e/continuation.pw.ts -g 'interés genérico'`, que reproduce respuestas reales guardadas, sin inferencia.
- **Esperado:** ausencia de interés explícito en SmartHousing visible como pendiente; una consulta condicional de alquiler no se clasifica como ese interés.
- **Observado:** Laura muestra «Hemos visto vuestro anuncio en Instagram» y Rosa «solo de alquiler» como candidatos del campo. La incertidumbre sí dice que no hay interés explícito, pero la vista CRM los coloca bajo «Interés en SmartHousing» y no genera falta de interés. [Laura](continuation/replay-laura-initial-crm.txt), [Rosa](continuation/replay-rosa-crm.txt). Una llamada real por caso, frecuencia desconocida; presentación reproducida con replay.
- **Causa probable, no confirmada:** se admite el candidato por campo y cita literal, sin validar semánticamente el interés; la determinación de ausencias usa presencia. Recomendación: tratar de forma explícita la falta de interés por producto y conservar la incertidumbre, sin inferirla del interés en vivienda.

## E2E-F003 — Laura recibe aclaración de ingresos en vez de la duda material de cuota

- **Severidad:** MEDIUM. **Recorrido/AC:** E2E-02, AC-07, AC-08. **Estado:** abierto.
- **Reproducción:** analizar Laura original y después añadir «Sí, los 3.800 € netos conjuntos ya tienen descontada la cuota del coche» y reanalizar. Evidencia: [inicial](continuation/real-laura-initial.json), [continuación](continuation/real-laura-continuation.json), [pantalla](continuation/real-laura-continuation.png).
- **Esperado:** inicialmente aclarar si la cuota está descontada; tras la aclaración no volver a tratar la misma cuestión como pendiente sin motivo, y preguntar por interés explícito si corresponde.
- **Observado:** inicialmente se priorizó una duda sobre la exactitud de «unos 3.800» y se preguntó genéricamente por ingresos. Tras la continuación se creó otra incidencia de ingresos y se repitió esa pregunta; el candidato de deuda retuvo inclusión desconocida. Una ejecución real de cada estado, frecuencia desconocida. Hay conflictos de revisión visibles, no sobreescritura silenciosa.
- **Causa probable, no confirmada:** la clasificación semántica genera ambigüedad de ingresos y el orden de prioridades la selecciona; el candidato de deuda y el nuevo candidato de ingresos no comparten necesariamente metadatos. Recomendación: revisar tratamiento de aproximaciones y aclaraciones en B/D/E con pruebas de estas frases.

## E2E-F004 — Aviso fuera de regiones accesibles

- **Severidad:** LOW. **Recorrido/AC:** revisión de accesibilidad transversal. **Estado:** abierto.
- **Reproducción:** `pnpm exec playwright test tests/e2e/continuation.pw.ts -g 'accesibilidad automatizada'`; consultar [resultado Axe](continuation/accessibility.json).
- **Esperado:** contenido principal y aviso final dentro de landmarks identificables.
- **Observado:** Axe `region` moderado para `.disclaimer` en entrada y resultado. Frecuencia: ambos estados comprobados en una ejecución.
- **Causa probable, no confirmada:** aviso situado fuera de `main` y sin landmark propio. Recomendación: incorporar el aviso a una región apropiada y repetir revisión con tecnologías de asistencia.

## Actualización de hardening (16-11-2026)

La evidencia histórica anterior se conserva. [Informe y resultados](HARDENING_RELEASE_REPORT.md): F001 no se reprodujo en Marta real ni en replay; F002 no se reprodujo en Laura/Rosa reales ni las variantes controladas, con cobertura conservadora y limitada; F003 **sigue abierto**, porque Laura real tras aclaración volvió a preguntar ingresos debido a una incidencia «Importe aproximado de ingresos conjuntos». F004 no se reprodujo con Axe `region` en entrada y resultado a 1440 y 390 px. La inversión de rechazo propuesta como F005 se bloqueó en pruebas controladas al conservar la cita como valor, pero la semántica general y citas parciales siguen siendo riesgos, no una garantía universal.

### Reevaluación final

F001 y F003 siguen **abiertos**: el segundo reservado recibió «¿Podéis aclarar la cuota que habéis indicado?» ante la explicación «La inclusión de la cuota en los ingresos no está aclarada»; Laura inicial recibió una pregunta genérica de ingresos ante una señal de inclusión etiquetada `income`. Laura continuación pasó a la pregunta de interés en esa ejecución. Dos replays con expectativas correctas fallan, sin reintentar ni alterar el prompt después del reservado final.

### Evaluación del contrato revisado

El motivo estructurado permite que la pregunta de cuota no dependa del campo asignado y corrige ambos replays finales anteriores. En inferencia real posterior Laura inicial preguntó correctamente, pero su continuación repitió la cuota resuelta y el reservado omitió la incidencia de cuota incierta y no conservó interés explícito. F001/F003 y F002 permanecen abiertos; las causas ahora incluyen señales omitidas o no actualizadas por el modelo, no solo su redacción. La evidencia se conserva en `hardening/contract-*.json`; no se cambió el prompt después del reservado.

### Tratamiento PoC supervisado

F003 no se declara resuelto automáticamente: la incidencia puede requerir revisión humana. Se añade una incidencia conservadora basada en cuota desconocida y una revisión manual visible que sobrevive al reanálisis dentro de la sesión; los metadatos desconocidos no se convierten en hechos. La única inferencia real nueva produjo la pregunta de cuota esperada. F002 sigue sujeto a los límites del filtro conservador. La evidencia y el alcance están en [el informe](HARDENING_RELEASE_REPORT.md).
