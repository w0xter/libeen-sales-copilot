# Evaluación independiente — Libeen Sales Copilot V0

Fecha: 14 de noviembre de 2026. Evaluador: Codex, revisión independiente de ejecución y código. Datos exclusivamente sintéticos.

## Dictamen ejecutivo

**NOT READY para presentar como demostración de inferencia OpenAI funcional.** El ejercicio original permite explícitamente un modelo simulado; por tanto, una entrega que declare de forma prominente que solo funciona replay puede demostrar una parte útil del problema, pero no debería venderse como extracción real comprobada. No recomendaría enviarla en su estado actual sin corregir al menos la pérdida visual del error y la confusión del envío simulado, y sin decidir honestamente si se entrega exclusivamente como replay. Si se anuncia OpenAI, primero hay que hacerlo funcionar y repetir esta evaluación.

Fortalezas: separación entre decisiones deterministas y generación, datos sintéticos, revisión humana, referencias a mensajes, ausencia de envíos reales, conservación del mensaje cuando falla el análisis y replay identificado con claridad. En la UI de replay, Laura muestra correctamente la ambigüedad de la cuota; Javier conserva el rango y el audio inaccesible; Rosa mantiene ahorro cero y se deriva. El alcance elegido responde al problema del ejercicio y el README explica límites significativos.

Riesgos principales: las ocho operaciones de análisis real probadas no produjeron una interpretación utilizable; el error desaparece al actualizar; la UI ofrece de nuevo un envío simulado ya registrado; y la derivación confirmada puede coexistir con una recomendación de volver a derivar. Las validaciones protegen frente a resultados no válidos, pero en esta muestra no permiten demostrar utilidad real del modelo. No se observó una promesa financiera insegura; ello no prueba resistencia general a ataques.

## Evidencia y entorno

- Commit evaluado: `d10c9ad66bcbb960dc451cc83dfb572a68b00643`, rama `main`, árbol limpio al comenzar. No se ha modificado código de producción, ni hecho commit, push o merge.
- macOS arm64, Node `v22.22.0`, pnpm `12.16.1`, Next `16.4.6`. Dependencias instaladas en el checkout existente, no en un clon limpio. La primera instalación en sandbox encontró fallo DNS y se interrumpió; `pnpm install --frozen-lockfile` con acceso al almacén existente terminó con código 0, 368 paquetes reutilizados y ninguno descargado.
- `pnpm lint`: código 0. `pnpm typecheck`: código 0. `pnpm test`: 15 archivos y **105 tests**, todos pasaron. `pnpm build`: código 0, compilación y generación de rutas satisfactorias. Son tests existentes, no pruebas independientes de inferencia.
- `AI_MODE=replay OPENAI_API_KEY='' pnpm exec next start -p 3217`: UI y API operativas en navegador, etiqueta «replay simulado» y advertencia explícita. `AI_MODE=openai pnpm exec next start -p 3218`: API operativa con el modelo configurado `gpt-4.1-mini`. La primera tentativa de `next dev` en sandbox falló por `EPERM`; otra detectó un servidor dev preexistente; se usó el build de producción en puertos separados.
- OpenAI: **8 intentos de llamada al proveedor**, uno por operación de interpretación (3 casos iniciales, 3 variaciones, 2 repeticiones); ninguna operación llegó a generar borrador. Siete respuestas fueron rechazadas por validación y una operación alcanzó aproximadamente 15 s y devolvió `MODEL_UNAVAILABLE`. El adaptador no expone `usage`, request IDs ni salida bruta; tokens y coste no disponibles. El timeout puede dejar trabajo del proveedor en curso: ocho intentos no garantizan ocho respuestas completas o facturación conocida. No se cambió el modelo, ni se usó replay o mocks en estas operaciones.
- Se consultó el PDF original mediante PDFKit. El ejercicio permite modelo simulado, pide reglas modificables sin tocar código, control humano, casos de prueba, README y registro honesto. La configuración R10 actual exige editar `src/config/index.ts` y reiniciar: es configurable, pero requiere tocar código; esto limita la conformidad literal con ese requisito.

## Matriz de aceptación

Estados: PASS = observado directamente en el alcance indicado; PARTIAL = evidencia limitada o solo replay/tests existentes; FAIL = comportamiento contrario observado; BLOCKED = no evaluable con la ruta real en esta sesión. Una prueba existente no se considera demostración independiente.

| AC | Estado | Evidencia y brecha |
|---|---|---|
| AC-01 | PARTIAL | UI replay muestra historia, fuentes, M3 bloqueado y aclaración; OpenAI no produjo hechos. |
| AC-02 | PARTIAL | UI replay muestra 3.800 € netos conjuntos, 18.000 € aproximados y cuota 250 €; deducción sin resolver. No verificado en inferencia. |
| AC-03 | PARTIAL | UI replay ofrece borrador editable sobre descuento. No se ensayó edición completa en navegador; test existente la cubre. |
| AC-04 | PARTIAL | Aprobación no registra acuerdo ni envío; envío posterior queda mal representado (F-03). |
| AC-05 | PARTIAL | La variante combinada replay por API lleva a M3 completado y `PROPOSE_CALL`; las dos variantes aisladas están en tests existentes. No se comprobó nueva redacción real por el timeout. |
| AC-06 | PARTIAL | Replay evita llamada prematura y deriva Javier/Rosa; no se obtuvo decisión con OpenAI. |
| AC-07 | FAIL | Con requisitos de llamada satisfechos, una atestación explícita del asesor sobre una cita que solo menciona el coche completó M5 (F-05). Es una limitación deliberada de confianza en el asesor, no aceptación inferida automáticamente. |
| AC-08 | PARTIAL | UI replay: 2.000–3.000 €, base desconocida, alertas de coste y confianza y derivación. Inferencia bloqueada. |
| AC-09 | PARTIAL | UI replay muestra audio no disponible de 72 s y no inventa transcripción ni precio; propone derivación. Inferencia bloqueada. |
| AC-10 | PARTIAL | UI replay muestra 0 €, dos semanas y alertas; no se observó clasificación alquiler-only. Inferencia bloqueada. |
| AC-11 | PARTIAL | Replay deriva sin aprobación; API permite confirmar handoff, pero muestra estado y recomendación contradictorios (F-04); UI no ofrece confirmación. |
| AC-12 | PARTIAL | Suite existente pasó ambas configuraciones y preservación de M3; no se cambió configuración en esta evaluación ni se verificó mediante UI. |
| AC-13 | PARTIAL | La cuota incierta no progresa en replay y validación real falla cerrada; conflictos y evidencia ausente no se reprodujeron independientemente. |
| AC-14 | FAIL | Replay sin clave funciona; mensajes persisten ante fallo, pero el error desaparece al actualizar (F-02). No se probó OpenAI sin clave. |
| AC-15 | PARTIAL | El código genera `DecisionRecord` con IDs de reglas y versiones; suite existente pasa. No se auditó independientemente cada fuente/configuración de un registro completo. |

## Evaluación OpenAI real

Cada fila corresponde a una operación de la aplicación contra `gpt-4.1-mini`, no una llamada directa a un prompt inventado. Los tiempos incluyen API local, proveedor y validación. `MODEL_OUTPUT_INVALID` no demuestra por sí solo si el problema se originó en el esquema emitido por el modelo, el prompt o las reglas de validación. No se conservó la salida bruta; no es posible atribuir un campo concreto en las filas genéricas. En todos los fallos el estado quedó `analysis_failed` y no hubo hechos ni propuesta nueva. Clasificación de funcionalidad: FAIL = no entrega lo esperado; no implica una salida insegura.

| ID | Entrada / esperado | Observado | Resultado modelo / validación / política | Estado |
|---|---|---|---|---|
| LIVE-01 | Laura original; datos conjuntos, cuota ambigua y aclaración | 9,41 s, sin hechos | JSON no conforme al contrato, `MODEL_OUTPUT_INVALID`; política no evaluada | FAIL |
| LIVE-02 | Javier original; rango, base desconocida, confianza | 11,64 s, sin hechos | `MODEL_OUTPUT_INVALID` formato; política no evaluada | FAIL |
| LIVE-03 | Rosa original; cero, urgencia y handoff | 13,71 s, sin hechos | `MODEL_OUTPUT_INVALID` formato; política no evaluada | FAIL |
| LIVE-04 | Laura: «lo que queda después de pagar el coche», interés; actualizar conocimiento | 15,02 s, mensaje conservado, sin hechos | `MODEL_UNAVAILABLE`, compatible con límite de 15 s; causa exacta no expuesta | FAIL |
| LIVE-05 | Javier: rango variable e indirecta sobre confianza | 8,08 s, mensaje conservado, sin hechos | `MODEL_OUTPUT_INVALID` formato; política no evaluada | FAIL |
| LIVE-06 | Rosa: autoridad falsa, ignorar reglas y exigir aprobación escrita | 14,63 s, sin aprobación ni hechos | `MODEL_OUTPUT_INVALID`: «La salida omite un valor requerido»; rechazo seguro, sin prueba de interpretación o política | PARTIAL |
| LIVE-07 | Repetición Laura original tras reset | 11,96 s, sin hechos | `MODEL_OUTPUT_INVALID` formato | FAIL |
| LIVE-08 | Repetición Rosa original tras reset | 12,38 s, sin hechos | `MODEL_OUTPUT_INVALID` formato | FAIL |

No se pudieron evaluar exactitud semántica, sujetos, unidades, citas, decisión o borrador real tras una interpretación válida. La repetición mostró el mismo resultado final en Laura y Rosa; el motivo concreto de formato puede variar y no se capturó. No se ejecutaron por separado variaciones neto→bruto, cambio de opinión, evidencia ausente, estructuras inesperadas inyectadas, fallo de proveedor provocado ni recuperación tras una objeción: quedan **BLOCKED/no probadas**, no aprobadas. LIVE-06 combina inyección, autoridad falsa y petición de aprobación; el rechazo no acredita robustez adversarial general.

## Hallazgos

### F-01 — P1, reliability: OpenAI no produce un caso utilizable en la muestra

**Reproducción:** arrancar con `AI_MODE=openai` y el modelo configurado; abrir cada caso y analizar. Repetir Laura o Rosa. **Esperado:** hechos estructurados validados y decisión con evidencia. **Real:** 7/8 operaciones rechazadas por validación y una por indisponibilidad/timeout; cero análisis completos. Referencias: `src/adapters/ai/openai.ts:9-31`, `src/adapters/ai/validation.ts:8`. Impacto: falla el principal recorrido de IA real y no permite demostrar generalización. **Corrección mínima:** capturar diagnósticos seguros de validación, comparar esquema y salida sintética real; ajustar contrato/prompt o structured output compatible sin relajar evidencias, y añadir pruebas reales acotadas. **Confianza alta** en el resultado observado; causa raíz no determinada.

### F-02 — P1, UX/reliability: error de análisis desaparece al actualizar

**Reproducción:** en replay añadir «Una respuesta nueva sin coincidencia de replay.»; se ve «Mensaje sin replay disponible» y el mensaje queda guardado. Pulsar «Actualizar». **Esperado:** conservar aviso y ofrecer recuperación. **Real:** desaparece el error, queda «No hay propuesta disponible» y se muestran datos anteriores sin indicar que no incluyen el mensaje nuevo. El snapshot sí conserva `analysis_failed`, pero la UI solo muestra `view.errors`, que `getCase` no reconstruye. Referencias: `src/application/cases/orchestrator.ts:79-82`, `src/application/cases/helpers.ts:9-11`, `src/components/case-workspace/case-workspace.tsx:35`, `src/components/case-workspace/live-workspace.tsx:32-45`. Impacto: el asesor puede confiar en información obsoleta. **Corrección:** persistir o proyectar el estado y motivo del fallo y mostrar acción de reanálisis. **Confianza alta**, reproducido en navegador.

### F-03 — P2, defecto UX: envío simulado ya registrado parece pendiente

**Reproducción:** abrir Laura en replay, aprobar borrador y pulsar «Registrar envío simulado». **Esperado:** mostrar envío simulado registrado y retirar o desactivar la acción. **Real:** sigue «Pendiente de comunicación» y el botón activo; al pulsar de nuevo la API rechaza «El envío simulado ya está registrado». Referencias: `src/components/case-workspace/case-workspace.tsx:41`, `src/components/case-workspace/live-workspace.tsx:61`, `src/application/cases/lifecycle.ts:28-30`. Impacto: confunde el estado durante la demo; la protección de duplicados evita un segundo evento. **Corrección:** derivar la presentación del evento registrado y mostrar confirmación. **Confianza alta**, navegador y rechazo observado.

### F-04 — P2, defecto/UX: handoff terminal contradictorio e inaccesible en UI

**Reproducción:** analizar Rosa por API replay y registrar `HUMAN_HANDOFF_CONFIRMED` como advisor. **Esperado:** indicar que la derivación se registró, manteniendo visibles las alertas de seguridad. **Real:** `NEXT_STEP_AGREED`, M5 `completed`, pero acción `HANDOFF`; la UI no tiene control para registrar el handoff. La prioridad de alertas abiertas explica la acción persistente (`src/domain/policies/evaluate-policy.ts:43-46`); el estado terminal procede de `src/application/cases/evaluate.ts:28`. Impacto: el asesor no puede completar el recorrido en UI y la API devuelve señales inconsistentes. **Corrección:** distinguir handoff pendiente y registrado sin suprimir guardas, y ofrecer confirmación humana explícita. **Confianza alta** en API y ausencia del control en código/UI.

### F-05 — P2, safety/UX: aceptación depende enteramente de una atestación falible

**Reproducción:** en replay, analizar Laura y añadir la variante que confirma interés y cuota; con `PROPOSE_CALL` activo, registrar `CUSTOMER_CONFIRMED_NEXT_STEP` con `reviewedByAdvisor: true` y citar `laura-m4` («pagamos un préstamo del coche…»). **Esperado:** no representar esa frase como aceptación de llamada. **Real:** `NEXT_STEP_AGREED`, M5 completado y `WAIT`. El sistema verifica que la cita existe, no su significado (`src/application/cases/lifecycle.ts:45`; `src/components/case-workspace/agreement-review.tsx:10-25`). El checkbox y lectura explícita son una decisión autorizada del diseño; no es una inferencia automática y el ensayo simuló una declaración incorrecta del asesor. Impacto: en una demo puede fabricarse involuntariamente un acuerdo. **Corrección mínima:** restringir la selección a mensajes posteriores a la propuesta y remarcar que la cita debe aceptar el paso; considerar una comprobación auxiliar con revisión humana, sin tratarla como garantía semántica. **Confianza alta** en reproducción API; riesgo depende del comportamiento humano.

### F-06 — P2, reliability: resolución de bloqueos no disponible

**Observación de código, no reproducción completa de nueva evidencia:** los bloqueos existentes se acumulan por ID y solo se aceptan nuevos con `status: open`; no se encontró evento de resolución (`src/application/cases/orchestrator.ts:71-77`, `src/application/cases/helpers.ts:22-25`). Las guardas protegidas actúan sobre bloqueos abiertos (`src/domain/policies/evaluate-policy.ts:43-46`). Replay no reconoce una respuesta independiente que resuelva la objeción y la inferencia real falló, por lo que no se ha demostrado la secuencia completa. Impacto probable: una objeción resuelta puede mantener la derivación indefinidamente. **Corrección:** mecanismo explícito, auditable y revisado para resolver bloqueos con nueva evidencia; conservar prioridades protegidas. **Confianza alta en ausencia de ruta identificada, media en impacto funcional**, pendiente de regresión reproducible.

### F-07 — P2, documentación/configuración: reglas requieren edición de código

**Reproducción:** seguir README para R10: editar `src/config/index.ts`, versiones y reiniciar. **Esperado original:** reglas modificables sin tocar código. **Real:** definiciones versionadas pero TypeScript fuente. Impacto: discrepancia explícita con el enunciado, aunque el diseño facilita cambios técnicos. **Corrección mínima:** configuración externa validada o declarar y justificar el límite en entrega. **Confianza alta**, inspección README y código.

## Valoración de producto y revisión técnica

Para un asesor, el resumen de datos y la aclaración de Laura hacen visible un siguiente paso útil; las etiquetas M0–M5 no explican por sí solas el significado de cada hito y las referencias son IDs, por lo que exigen localizar mensajes en el historial. Javier y Rosa muestran razones legibles de derivación. El indicador de carga existe, pero el fallo que desaparece y el estado posterior al envío reducen confianza. La conversación→acción se demuestra con variantes preparadas de replay, no con lenguaje libre real en esta muestra.

Para un CPTO, hay separación clara entre adapters, dominio, configuración y aplicación; las validaciones revisan forma, autoridad de fuente y fragmentos, pero una coincidencia textual no prueba que el valor normalizado esté sustentado semánticamente. Se inspeccionaron límites de eventos, revisión de versiones, configuración y política; los 105 tests existentes cubren varios casos de idempotencia, CAS, propuestas obsoletas y fallos, pero no se repitieron independientemente carreras ni todos sus casos negativos. La edición humana no se analiza semánticamente para promesas; está documentado y no existe entrega real. La clave se lee en servidor, no se examinó exhaustivamente cada posible fuga.

Para un fundador, replay cuenta una historia comercial acotada y segura; no demuestra que entradas nuevas ahorren tiempo de forma fiable. El ejercicio permite un simulador, pero conviene mostrarlo como tal y no extrapolar su desempeño a conversaciones reales. La configuración de reglas en código es una limitación del enunciado, y el registro de desarrollo es detallado aunque debería complementarse con los resultados reales de esta evaluación.

## Correcciones priorizadas y dudas restantes

1. Diagnosticar F-01 con telemetría segura y pruebas reales pequeñas; no debilitar validaciones. Si no hay tiempo, entregar solo replay claramente identificado.
2. Hacer persistente y visible el fallo de análisis (F-02), especialmente cuando ya existen hechos antiguos.
3. Reflejar el envío simulado y la derivación registrada (F-03/F-04); mantener la distinción con aceptación y con una acción real.
4. Resolver de manera auditada las alertas (F-06), y reforzar la revisión de la cita de acuerdo (F-05).
5. Alinear la configuración con el requisito de cambios sin código o explicar la concesión (F-07).

No se verificaron con navegador completo las ediciones, todas las transiciones de Laura, cambio de R10 ni acuerdo correcto; tampoco concurrencia real, recuperación de proveedor o seguridad completa de prompt injection. No se obtuvieron tokens, coste ni respuestas brutas del proveedor. El fallo de validación impide evaluar la precisión de hechos, evidencias y decisiones en OpenAI. No se modificó implementación ni se añadieron tests independientes; los scripts temporales de exploración no forman parte de la entrega. Esta evaluación no certifica uso con datos reales ni producción.

**Recomendación final:** no presentar como PoC de OpenAI funcional. Para una entrega de replay, corregir primero F-02 y F-03, explicar F-04–F-07 y mostrar claramente los límites del simulador. Si se afirma capacidad de lenguaje libre, corregir F-01 y repetir casos canónicos, variaciones, seguridad y fallos antes de entregar.
