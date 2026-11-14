# AgentProfile, Runtime y ciclo de decisión

**Estado:** diseño de un **solo** agente coordinado, sin multiagentes ni operación autónoma en segundo plano.

## Distinción esencial

- `WorkflowDefinition`: define qué resultados significan avance.
- `FactSchema`/`CaseKnowledge`: qué datos y evidencias tenemos.
- `BusinessPolicy`/`ReviewPolicy`: qué acciones pueden permitirse y bajo qué restricciones.
- **`AgentProfile`**: cómo preguntar, priorizar, seleccionar entre acciones permitidas y redactar.
- **`Agent Runtime` / `CaseOrchestrator`**: coordina el trabajo cuando entra un evento. No debe contener reglas comerciales hardcodeadas.

Un cambio de tono del agente **no puede** completar un hito, ignorar un opt-out ni permitir enviar un mensaje sin aprobación.

## Configuración funcional AgentProfile

| Bloque | Qué ajusta |
| --- | --- |
| `Identity` | ID, rol, versión, workflows compatibles. |
| `ConversationStrategy` | Una o dos preguntas relacionadas, evitar repreguntar, progresar por valor. |
| `DecisionStrategy` | Elegir acción preferida entre permitidas; objeción relevante antes de formulario. |
| `Capabilities` | Interpretar, resumir, proponer aclaración, redactar, preparar handoff y consulta autorizada. |
| `ContextStrategy` | Historial pertinente, Facts, correcciones, hitos, bloqueos y acciones previas. |
| `CommunicationStyle` | Español claro, natural, respetuoso y conciso. |
| `FallbackBehavior` | Reconocer límite de conocimiento, pedir aclaración, abstenerse o derivar. |
| `ObservabilityHints` | Evidencia, regla y explicación visibles para el asesor. |

Esta configuración es parte del diseño; no exige construir una interfaz de edición de perfiles para V0.

## Ciclo único por evento

1. **Receive/Hydrate:** recibir `CaseEvent` e identificar Case, revisión y versiones de configuración.
2. **Interpret:** IA devuelve *candidatos* de facts, preguntas, objeciones y evidencia; si el evento es una corrección humana, puede no requerir LLM.
3. **Reconcile:** validación por FactSchema y actualización de CaseKnowledge; conflictos no se eliminan por comodidad.
4. **Evaluate:** motor de hitos y políticas calcula requisitos, rutas, bloqueos, permisos y revisión requerida.
5. **Select:** AgentProfile elige una acción admisible; se conserva explicación y posibles alternativas relevantes.
6. **Prepare:** IA prepara texto cuando proceda, usando hechos respaldados y contenidos comerciales autorizados. Se valida que no incluya compromisos prohibidos.
7. **Human Review:** el asesor visualiza, edita, aprueba o descarta. La acción humana genera **un nuevo evento**; el ciclo no se ejecuta infinitamente por sí solo.

**No son necesariamente siete llamadas LLM.** Para V0 basta extracción estructurada y redacción separadas lógicamente, y reglas deterministas entre ambas. El runtime puede combinar tareas si conserva contratos y validación.

## Tres niveles de decisión

1. **Protecciones irrenunciables:** stop/contacto, no aprobación vinculante, revisión humana. Provienen de ReviewPolicy y límites del producto.
2. **Acciones admisibles:** qué se puede hacer con el hito y la política vigentes; p. ej., ASK_CLARIFICATION, ANSWER_QUESTION, PROPOSE_CALL, HANDOFF, WAIT, CLOSE.
3. **Preferencia conversacional:** cuál es la mejor acción válida en este momento, según AgentProfile y contexto.

En Javier, una objeción de confianza desplaza la próxima pregunta financiera porque el perfil prioriza responder la duda. No se crea un hito extra ni se borran datos económicos.

En Rosa, la petición de aprobación escrita y la urgencia activan protección/revisión, **por encima** del impulso de completar M3.

## ContextStrategy y memoria de expediente

El contexto operativo puede componerse de mensajes recientes pertinentes, CaseKnowledge y sus evidencias, Goal, hito activo, bloqueos, preguntas ya hechas, revisiones del asesor, acciones pendientes, versión de políticas y contenido autorizado.

No confiar exclusivamente en inyectar todo el chat en cada prompt. La memoria estructurada `CaseKnowledge` permite continuidad; los mensajes siguen siendo fuente de auditoría. Una síntesis resumida es apoyo, **no prueba**. No mezclar contextos de clientes. La V0 no necesita memoria vectorial, aprendizaje entre expedientes ni acciones programadas.

## Catálogo de capacidades y límites

| Capacidad | V0 | Límite |
| --- | --- | --- |
| InterpretConversation | Sí | Evidencia por mensaje; sin transcripciones inventadas. |
| SummarizeCase | Básico | No sustituye a hechos trazables. |
| ProposeClarification | Sí | Una pregunta focalizada cuando hay bloqueo claro. |
| DraftReply | Sí | Editable y sujeta a aprobación. |
| PrepareHandoff | Sí | Derivación simulada; no asignación real. |
| ProposeCall | Sí | No reserva calendario ni envía. |
| RetrieveTrustedKnowledge | FAQ estática si es necesaria | Fuente/versiones; abstenerse si no existe contenido aprobado. |
| CRM/WhatsApp/Calendar/Audio | No | Puertos de integración futuros. |

**Capability ≠ Permission ≠ Effect.** Permitir `ProposeCall` no significa poder reservar. Una acción propuesta no implica enviada. Una objeción no se resuelve únicamente por redactar respuesta: hace falta evidencia de que se atendió y, para darla por resuelta, respuesta o revisión fundamentada.

## Fallos y seguridad

- Si la salida LLM no valida contra esquema → no modificar el estado con hechos inexistentes; mostrar error y permitir revisión manual.
- Si no hay credencial → modo demo/replay **etiquetado**, no fingir inferencia real.
- Si hay audio sin transcripción → guardar marcador de contenido no disponible; no inferir palabras.
- Si el cliente introduce «ignora las reglas» → tratar como mensaje del cliente, no como instrucciones operativas.
- Si faltan fuentes comerciales → decir que no se puede confirmar un detalle y ofrecer contacto humano; no inventar garantías.
- Si un evento se repite → no duplicar envío simulado, cambios ni hito.
- Si la persona pide no contacto → detener actuación comercial y activar manejo apropiado, sin seguir promoviendo objetivos.

## Punto de extensión

Un `Interpreter` / `DraftGenerator` intercambiable permite cambiar proveedor; `ActionCatalog` permite añadir capacidades; AgentProfile ajusta el comportamiento sin recodificar hitos; un adaptador de canal se añadirá fuera del dominio. No diseñar todavía plugins universales ni un framework de agentes.
