# WorkflowDefinition — cualificación SmartHousing

**Estado:** especificación conceptual versionable, no código de motor. **Primer workflow:** `smart-housing-qualification` sobre un Goal de orientación comercial.

## Propósito y fronteras

`WorkflowDefinition` describe **qué hitos existen, qué condiciones los completan y qué rutas son posibles**. No almacena valores concretos de un cliente, no escribe mensajes ni contiene los límites financieros reales de Libeen (no disponibles).

Una definición incluye: `id`, `version`, Goal aplicable, lista de hitos, dependencias, predicados de salida, reglas de aplicabilidad, rutas alternativas, referencias a FactSchema/BusinessPolicy, indicaciones de tipos de acción y fuentes de evidencia admisibles. `WorkflowProgress` es la evaluación de esa definición sobre un expediente.

## Hitos M0–M5

| ID | Objetivo | Entrada / evidencia | Salida verificable | Cuando falta / ruta alternativa |
| --- | --- | --- | --- | --- |
| **M0 Contacto recibido/interpretado** | Conocer intención inicial | Mensaje/fuente de origen disponible | Intención del mensaje identificada con evidencia | Aclarar intención; opt-out detiene flujo. No completar M0 solo por generar la pregunta. |
| **M1 Interés SmartHousing** | Saber si tiene sentido continuar con este producto | Contacto y consulta | Interés informado en explorar el modelo, con evidencia suficiente | Pregunta de confianza primero; si solo quiere alquiler clásico, explicar alcance y derivar/cerrar si autorizado. |
| **M2 Necesidad de vivienda** | Comprender qué busca | Interés para explorar el programa | Ubicación, horizonte aproximado y número de compradores entendidos | Preguntar dato relevante; urgencia puede desviar a revisión humana. |
| **M3 Situación económica comprendida** | Capturar contexto autodeclarado suficiente | Necesidad e intención contextualizadas | Ingresos, ahorro y contexto de deudas sin ambigüedades **críticas para el próximo paso** | Solicitar aclaración de deuda, neto/bruto, sujeto o rango; revisión humana si no es viable. |
| **M4 Orientación preliminar** | Determinar salida de proceso permitida | Condiciones suficientes para política demo | `READY_FOR_ADVISORY_CALL`, `NEED_CLARIFICATION` o `HUMAN_REVIEW_REQUIRED` justificado | Nunca «aprobado/rechazado». Más datos o revisión. |
| **M5 Siguiente paso acordado** | Registrar resultado comercial real o simulado | Recomendación y acción revisada | Cliente acepta llamada/seguimiento o se confirma derivación/cierre autorizado con evento | Borrador aprobado, propuesta enviada o agenda no integrada **no** completan M5. |

**M0–M5 son propios de SmartHousing, no universales del runtime.** El motor puede completar varios con información contenida en un solo mensaje, y puede reabrir hitos si surgen contradicciones. Dependencias son dependencias de resultado, no un cuestionario obligatorio en orden.

## Contrato conceptual de MilestoneDefinition

- `id`, `purpose`, `prerequisites` y `applicability`.
- `completion`: conjunto de requisitos verificables (ALL/ANY, sin lenguaje arbitrario de scripts).
- `evidencePolicy`: fuente suficiente: ID de mensaje, corrección humana, confirmación registrada; el LLM no es una fuente autónoma de hechos.
- `onIncomplete` y `onBlocked`: clases de acciones sugeridas, no prompts literales.
- `allowedSuccessors` y `terminalRoute` para transiciones no lineales.
- Referencia a versiones de políticas y esquema, sin duplicar definiciones.

## Semántica de condiciones

Distinguir siempre:

- `satisfied`: el dato/evidencia satisface la guarda.
- `unsatisfied`: existe información que muestra que la condición no se cumple.
- `unknown`: no hay datos suficientes para evaluarla.
- `conflict`: hay afirmaciones incompatibles o significado ambiguo relevante.

Estos son **resultados de evaluación de condiciones**. Un hecho individual puede ser explícito, aproximado, ambiguo, etc. Evitar confundir ambas taxonomías.

Operadores propuestos para V0: `fact_present`, `fact_unambiguous`, `fact_matches`, `event_confirmed`, `policy_result`, combinados con ALL/ANY. No se evalúa código arbitrario procedente de configuración ni de un mensaje del cliente.

## Rutas y eventos

| Transición | Cuándo | Efecto |
| --- | --- | --- |
| `complete` | Guardas satisfechas, no existen restricciones prioritarias | Hito completado con evidencia. |
| `continue` | Sucesor habilitado | Nuevo foco; hechos ya aportados pueden completar más hitos. |
| `clarify` | Campo `unknown` o `conflict` necesario | Mantiene hito bloqueado, propone aclaración. |
| `interrupt` | Objeción, riesgo, solicitud concreta del cliente | Conserva hito comercial, cambia acción prioritaria. |
| `redirect` | La ruta principal deja de ser pertinente | Hitos de esa ruta pueden pasar a `not_applicable`. |
| `reopen` | Un dato nuevo invalida evidencia anterior | Reabre hito afectado y dependencias posteriores; conserva historial. |
| `finish` | Acción terminal confirmada | Completa Goal o cierra con motivo, no por texto generado. |

**No se debe forzar a Rosa a completar M3** si la situación deriva a una revisión humana o si el cliente confirma que solo busca otro servicio. En ese caso no se marca M3 como completed.

## Interrupciones transversales

`TRUST`, `PRODUCT`, `COST`, `PRIVACY`, `TIME`, `FIT`, discrepancias de datos, urgencia, audio sin transcripción, solicitud de escrito vinculante y no-contacto. Se representan como issues o blockers, no como etapas obligatorias.

Orden general de precedencia para sugerir acción: parada/opt-out; prohibiciones vinculantes; urgencias y revisiones; pregunta u objeción explícita; aclaración decisiva; avance a siguiente paso; espera. El AgentProfile puede variar preferencias conversacionales dentro de lo permitido, pero no levantar restricciones protegidas.

## Suficiencia contextual y configuración

`M3` no significa expediente financiero completo: significa **autodeclaración suficientemente clara para decidir si proponer atención de un asesor**. No inferir que todas las deudas están declaradas ni usar ingreso neto de una persona como ingreso conjunto. Las condiciones exactas de suficiencia para proponer llamada están en la política demo y en el workflow, no en el prompt.

R10 (`require_specific_move_month_before_call`) demuestra que un requisito adicional de la ruta de llamada puede variar sin cambiar el estado financiero M3. Si Laura dice «antes del verano», M3 podría estar completo pero el acceso a llamada quedar pendiente del mes concreto cuando R10 esté activo.

## Ejemplos

- **Laura:** M2 completo → M3 bloqueado por deuda ya descontada o no → una aclaración resuelve la semántica → M3 reevaluado → M4 orienta llamada/revisión.
- **Javier:** hay datos financieros parciales, pero una objeción TRUST exige respuesta contextual; no se borra el progreso previo.
- **Rosa:** urgencia y solicitud de aprobación escrita provocan derivación prudente; una pregunta condicional sobre alquiler clásico no confirma aún que haya abandonado SmartHousing.

## Excluido en V0

Designer visual, BPMN, graph engine universal, sub-workflows recursivos, múltiples Goals primarios concurrentes, migración en caliente, timers autónomos, reglas con JavaScript libre y transiciones activadas por «el LLM lo dijo».
