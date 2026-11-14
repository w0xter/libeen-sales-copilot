# Ubiquitous Language — Libeen Sales Copilot

**Ruta canónica:** `docs/ai/ubiquitous-language.md`  
**Versión documental:** `0.1` · **Estado:** lenguaje de dominio de referencia para la implementación V0; los contratos TypeScript/Zod todavía deben materializarse en `LIB-002`.  
**Ámbito:** copiloto comercial interno con expedientes y conversaciones **sintéticos**. Ni los hitos ni las reglas demo constituyen políticas reales de concesión de Libeen.

## Purpose and naming conventions

Este documento establece el **lenguaje ubicuo** que deben compartir producto, dominio, interfaz, pruebas y agentes Codex. Los identificadores en inglés que aparecen entre backticks son **nombres conceptuales canónicos**; las etiquetas de UI pueden estar en español. No inventar sinónimos técnicos ni crear nuevas entidades solo porque un término aparezca en una conversación.

Usar este archivo para **entender y nombrar** conceptos; para definir estructura exacta de datos, tipos y validaciones prevalecen `docs/contracts/INTEGRATION_V0.md` y, una vez creados, los contratos de `src/contracts/`. Para reglas y comportamiento consultar las especificaciones de `docs/specs/`. Un AI Task Brief aprobado delimita qué implementar; este glosario no amplía su alcance.

### Mapa conceptual

```text
WorkflowDefinition ────────> MilestoneDefinition ──> MilestoneEvaluation / WorkflowProgress
FactSchema ────────────────> FieldDefinition
AgentProfile ──────────────> preferencias dentro de acciones permitidas
BusinessPolicy + ReviewPolicy ─────────────────────> PolicyDecision
ActionCatalog ─────────────────────────────────────> ActionProposal ─> Draft

Case ─> Conversation ─> Message ─> EvidenceRef ─> FactAssertion
  │                                           └─> CaseKnowledge / FactView
  ├─> Goal
  ├─> Blocker / Issue
  ├─> CaseEvent ─> DecisionRecord
  └─> CaseSnapshot ─> CaseView (proyección para UI)
```

**Regla de lectura:** las *definitions* son configuraciones reutilizables y versionadas; los *events, assertions, evaluations y proposals* son hechos o resultados vinculados a un expediente. Ningún modelo LLM es fuente autónoma de verdad comercial.

## Core entities and value objects

### `Case` — Expediente

- **Definition:** agregado y frontera de consistencia que mantiene la continuidad de una oportunidad comercial a través de conversaciones, hechos, objetivos, hitos, bloqueos, propuestas y eventos.
- **Used by:** `CaseOrchestrator`, `CaseRepository`, `CaseWorkspace`, pruebas de aceptación.
- **Important rules:** la V0 opera con una conversación interactiva por expediente, sin impedir más conversaciones en el diseño; cada escritura válida usa revisión e idempotencia; los eventos y decisiones se atribuyen a un `caseId`.
- **Not to be confused with:** `Conversation` (hilo), `Lead` (término informal de origen comercial) o `CaseView` (proyección de lectura).

### `Conversation` — Conversación

- **Definition:** conjunto ordenado de mensajes de un canal vinculado a un `Case`.
- **Used by:** vista de chat, intérprete, evidencias.
- **Important rules:** en V0 normalmente existe una conversación por Case; un Case no es un chat ni depende de WhatsApp.
- **Not to be confused with:** `Case`, `Message` o memoria del agente.

### `Message` — Mensaje

- **Definition:** intervención individual con `messageId`, `conversationId`, rol/autor, timestamp y texto o marcador de adjunto.
- **Used by:** `Interpreter`, `EvidenceRef`, Case Workspace y recepción de eventos.
- **Important rules:** una entrada válida se conserva incluso si falla el análisis de IA; el audio de Javier de 1:12 no tiene transcripción disponible y no permite extraer contenido; el texto del cliente es dato no confiable, no instrucción del sistema.
- **Not to be confused with:** `Draft` (texto aún no enviado), `CaseEvent` (registro de una operación) ni `FactAssertion` (afirmación estructurada).

### `EvidenceRef` — Referencia de evidencia

- **Definition:** vínculo localizable a una fuente de una afirmación o decisión, normalmente `messageId` y fragmento/rango.
- **Used by:** `FactAssertion`, `MilestoneEvaluation`, `ActionProposal`, `DecisionRecord` y UI.
- **Important rules:** debe apuntar a una fuente existente; no se inventan referencias; un adjunto sin contenido interpretable demuestra que *existe el adjunto*, no qué dice.
- **Not to be confused with:** verificación documental, certeza financiera ni conocimiento comercial autorizado.

### `Goal` — Objetivo comercial

- **Definition:** resultado comercial que se pretende conseguir para el expediente; la V0 tiene un Goal principal activo.
- **Used by:** `WorkflowDefinition`, `Case`, planificación de próximas acciones.
- **Important rules:** orientar al siguiente paso apropiado, que puede ser aclaración, llamada, derivación o cierre; no equivale necesariamente a conversión.
- **Not to be confused with:** `Milestone`, `Blocker`, `ActionProposal` o estado operativo.

### `WorkflowDefinition` — Definición de flujo

- **Definition:** configuración declarativa y versionada de hitos, dependencias, requisitos, aplicabilidad y rutas para un Goal.
- **Used by:** `MilestoneEvaluator`, `ConfigLoader`, pruebas de reglas.
- **Important rules:** el flujo inicial es `smart-housing-qualification`; M0–M5 pertenecen a este workflow, no son estados universales del motor. No ejecutar JavaScript arbitrario desde configuración.
- **Not to be confused with:** `WorkflowProgress` (evaluación de un Case) o `AgentProfile` (estrategia conversacional).

### `MilestoneDefinition` — Definición de hito

- **Definition:** checkpoint configurable con `milestoneId`, prerequisitos, condiciones de cumplimiento, evidencias admisibles y rutas alternativas.
- **Used by:** `WorkflowDefinition`, `MilestoneEvaluator`.
- **Important rules:** las condiciones pueden combinar operadores tipados (`fact_present`, `fact_unambiguous`, `fact_matches`, `event_confirmed`, `policy_result`, `ALL`, `ANY`); varios hitos pueden resolverse a partir de un mismo mensaje; un hito puede reabrirse tras una corrección.
- **Not to be confused with:** `MilestoneEvaluation` o una pregunta concreta del chat.

### `MilestoneEvaluation` / `MilestoneProgress` — Evaluación y progreso de hito

- **Definition:** resultado, para un Case, de aplicar las condiciones de una `MilestoneDefinition`; incluye estado, guardas, evidencia, bloqueos y versión evaluada. `WorkflowProgress` agrupa el progreso del flujo.
- **Used by:** `MilestoneEvaluator`, `ActionPlanner`, `CaseView`, `DecisionRecord`.
- **Important rules:** estados de hito como `pending`, `in_progress`, `blocked`, `completed` y `not_applicable` son distintos del estado operativo. El LLM no marca hitos como completados. Las guardas pueden resultar `satisfied`, `unsatisfied`, `unknown` o `conflict`: **son resultados de condiciones**, no estados epistémicos de Facts.
- **Not to be confused with:** `MilestoneDefinition`, `OperationalStatus` o `PolicyDecision`.

### `Blocker` / `Issue` — Bloqueo o cuestión abierta

- **Definition:** discrepancia, duda, objeción, urgencia o riesgo que puede impedir una actuación o alterar su prioridad sin convertirse en un hito permanente.
- **Used by:** conciliación, evaluación de políticas, planificador de acciones y UI.
- **Important rules:** `TRUST` de Javier se atiende antes de continuar preguntando por finanzas; la urgencia y solicitud vinculante de Rosa obligan a una ruta prudente. Una objeción no se resuelve solo por haber redactado una respuesta.
- **Not to be confused with:** `Milestone` (resultado verificable), `Goal` o un dato desconocido genérico que no sea relevante.

### `FactSchema` / `FieldDefinition` — Esquema y definición de campo

- **Definition:** configuración versionada que declara `fieldId`, significado, tipo, ámbito/sujeto, unidades, granularidad y validaciones estructurales.
- **Used by:** `Interpreter`, `FactReconciler`, `ConfigLoader` y validadores de referencias cruzadas.
- **Important rules:** los campos candidatos incluyen `product_intent`, `desired_locations`, `moving_horizon`, `buyer_count`, `declared_monthly_income`, `employment_context`, `available_savings`, `monthly_debt`, `debt_deduction_semantics` y `requested_next_step`. La obligatoriedad depende del workflow/ruta, no de una propiedad universal del campo. El LLM no crea campos nuevos.
- **Not to be confused with:** `FactAssertion` (valor declarado) o `BusinessPolicy` (criterio comercial).

### `SubjectRef` / `scope` — Sujeto y ámbito de un dato

- **Definition:** referencia que determina a quién o a qué unidad corresponde un valor. Ámbitos definidos: `case`, `participant` y `buying_unit`.
- **Used by:** `FactAssertion`, `FactSchema`, conciliación.
- **Important rules:** los 3.800 €/mes autodeclarados de Laura y su pareja pertenecen a `buying_unit`; no repartirlos automáticamente entre participantes. Sujeto y período diferentes pueden justificar valores distintos sin conflicto.
- **Not to be confused with:** autor del mensaje (`role`) o `caseId` como identificador de oportunidad.

### `FactAssertion` — Afirmación de un hecho

- **Definition:** registro de lo declarado o extraído sobre un `fieldId` y un sujeto, con valor, unidad, período, texto original, fuente, fecha y precisión.
- **Used by:** `Interpreter` (candidatos), asesor (correcciones), `FactReconciler`.
- **Important rules:** autodeclarado no equivale a verificado; una corrección genera nueva evidencia/revisión y no elimina la afirmación anterior; una extracción de IA es candidata hasta ser validada. Un `reviewStatus` operativo no certifica solvencia.
- **Not to be confused with:** `FactView` o `CaseKnowledge` (resultado consolidado), ni documentación bancaria verificada.

### `FactView` — Vista consolidada de un campo

- **Definition:** estado operativo actual de un campo/sujeto con valor utilizable, si existe, y referencias a la evidencia que lo sustenta.
- **Used by:** `MilestoneEvaluator`, `PolicyEvaluator`, UI.
- **Important rules:** estados del dato: `known`, `approximate`, `unknown`, `ambiguous`, `conflicting`, `not_applicable`. `unknown` no es `0`; `ambiguous` es significado insuficientemente claro; `conflicting` son declaraciones incompatibles. Preservar rangos y matices de ingresos brutos/netos.
- **Not to be confused with:** `FactAssertion` individual ni estado de guarda `satisfied/unknown/conflict`.

### `CaseKnowledge` — Conocimiento consolidado del expediente

- **Definition:** colección/vista actual de `FactView` y sus evidencias, obtenida conciliando afirmaciones y correcciones.
- **Used by:** motor de hitos, políticas, contexto de interpretación/redacción y `CaseView`.
- **Important rules:** no sustituye el historial original; puede contener incertidumbres o conflictos; los resúmenes de IA ayudan pero no son evidencia.
- **Not to be confused with:** `FactSchema`, `TrustedKnowledge` o memoria vectorial de todos los clientes.

### `BusinessPolicy` — Política comercial de orientación

- **Definition:** reglas declarativas/versionadas que determinan qué información comercial es suficiente para considerar una próxima actuación.
- **Used by:** `PolicyEvaluator`, `ConfigLoader`, `DecisionRecord`.
- **Important rules:** en V0 `libeen-demo-routing / demo-v1` es **sintética** y no contiene umbrales financieros reales. Puede concluir `READY_FOR_ADVISORY_CALL`, nunca concesión o elegibilidad financiera. R10 es un requisito configurable para la llamada.
- **Not to be confused with:** política real de Libeen, `ReviewPolicy` o estrategia de redacción.

### `ReviewPolicy` — Restricciones y revisión humana

- **Definition:** límites protegidos que gobiernan lo que el copiloto puede sugerir, prometer o dar por ejecutado, y cuándo requiere un asesor.
- **Used by:** `PolicyEvaluator`, validación de propuestas/borradores y frontera de efectos.
- **Important rules:** R01 (no contacto) y R02 (prohibición de compromisos vinculantes) tienen precedencia; la configuración conversacional no los desactiva. En V0, todos los textos destinados al cliente requieren aprobación humana y no se envían realmente.
- **Not to be confused with:** `BusinessPolicy` ni aprobación financiera.

### `PolicyDecision` — Resultado de evaluar políticas

- **Definition:** resultado con clasificación de orientación, acciones permitidas/prohibidas, prioridad, revisión necesaria, motivos y `ruleIds`.
- **Used by:** `PolicyEvaluator` (productor), `ActionPlanner`, `DecisionRecord`, UI.
- **Important rules:** los resultados de orientación canónicos son `NEED_CLARIFICATION`, `READY_FOR_ADVISORY_CALL`, `HUMAN_REVIEW_REQUIRED`, `WAIT` y `STOP_CONTACT`. Varias reglas pueden aplicar y solo una acción principal se prioriza; no confundir la clasificación con el tipo de acción.
- **Not to be confused with:** `ActionProposal`, `MilestoneEvaluation`, aprobación o rechazo crediticio.

### `ActionCatalog` / `actionType` — Catálogo y tipo de acción

- **Definition:** inventario controlado de intervenciones reconocidas por el motor, p. ej. `ASK_CLARIFICATION`, `ANSWER_QUESTION`, `PROPOSE_CALL`, `HANDOFF`, `WAIT` o `CLOSE`.
- **Used by:** `ActionPlanner`, configuración y validación de referencias.
- **Important rules:** el tipo describe una intervención permitida, no que se haya ejecutado. Añadir tipos nuevos requiere modificar el contrato/catálogo correspondiente, no improvisar nombres en prompts.
- **Not to be confused with:** `PolicyDecision` (permiso/clasificación), `ActionProposal` (instancia), `Draft` (texto).

### `ActionProposal` — Actuación propuesta

- **Definition:** recomendación concreta y explicable con `proposalId`, `actionType`, revisión del Case de origen, versiones de configuración, razón y evidencia.
- **Used by:** `ActionPlanner`, `DraftGenerator`, revisión humana, UI.
- **Important rules:** debe ser una acción admitida por las políticas; puede volverse `superseded`/obsoleta al cambiar hechos relevantes, hitos o configuración; una propuesta no envía, agenda ni acuerda nada.
- **Not to be confused with:** `Draft`, `PolicyDecision` o efecto ejecutado.

### `Draft` — Borrador de respuesta

- **Definition:** texto editable asociado a una `ActionProposal`, preparado por IA o introducido por el asesor.
- **Used by:** `DraftGenerator`, `CaseWorkspace`, eventos de revisión.
- **Important rules:** aprobar, editar o descartar son operaciones distintas; `DRAFT_APPROVED` no significa enviado ni implica que el cliente haya aceptado. Si la generación falla, la acción válida puede permanecer sin borrador.
- **Not to be confused with:** `Message` del cliente, un envío real ni `MilestoneProgress`.

### `CaseEvent` — Evento del expediente

- **Definition:** entrada tipada e identificada (`eventId`, `caseId`, tipo, actor/origen, fecha, payload, revisión esperada) que representa algo ocurrido o solicitado.
- **Used by:** `CaseOrchestrator`, `CaseRepository`, auditoría y tests de integración.
- **Important rules:** mismo ID/contenido es idempotente; mismo ID/contenido distinto es `IDEMPOTENCY_CONFLICT`; revisión obsoleta produce `REVISION_CONFLICT`. Eventos relevantes: `MESSAGE_RECEIVED`, `CASE_ANALYSIS_REQUESTED`, `FACT_CORRECTED`, `DRAFT_EDITED`, `DRAFT_APPROVED`, `DRAFT_DISCARDED`, `MESSAGE_SIMULATED_AS_SENT`, `CUSTOMER_CONFIRMED_NEXT_STEP`, `HUMAN_HANDOFF_CONFIRMED`, `DO_NOT_CONTACT_REQUESTED`, `CASE_REEVALUATION_REQUESTED`. Los eventos internos derivados de hitos no son autorizaciones del LLM.
- **Not to be confused with:** `Message`, `DecisionRecord` o una instrucción para ejecutar efectos externos.

### `DecisionRecord` — Registro de decisión

- **Definition:** traza de la evaluación realizada sobre eventos y estado, incluyendo evidencias, reglas, revisiones, versiones, resultado y modo IA.
- **Used by:** `CaseOrchestrator`, auditoría, UI de explicaciones y pruebas.
- **Important rules:** explica por qué se recomendó una actuación; la versión de política antigua no se reescribe cuando cambia R10; no equivale a un resultado de scoring.
- **Not to be confused with:** `CaseEvent` (entrada) o `CaseSnapshot` (estado actual).

### `CaseSnapshot` / `CaseView` — Estado persistido y proyección UI

- **Definition:** `CaseSnapshot` reúne el estado/revisión consistente del expediente; `CaseView` es la representación que la capa de aplicación entrega a la interfaz.
- **Used by:** `CaseRepository`, `CaseOrchestrator`, API y `CaseWorkspace`.
- **Important rules:** la UI consume una proyección estable sin ejecutar políticas; el repositorio V0 es efímero/en memoria y debe exponer reset reproducible; el snapshot incluye referencias de configuración.
- **Not to be confused with:** `Case` como concepto agregado, `DecisionRecord` o respuesta sin validar del LLM.

### `AgentProfile` / `CaseOrchestrator` — Estrategia frente a ejecución

- **Definition:** `AgentProfile` es configuración versionada de tono, preguntas, prioridades y capacidades; `CaseOrchestrator` coordina recepción, interpretación, conciliación, evaluación, selección, redacción y revisión por evento.
- **Used by:** `ActionPlanner`, `DraftGenerator`, `Application`, adaptadores.
- **Important rules:** la preferencia de tono no puede cambiar reglas protegidas, completar hitos ni ejecutar acciones; la V0 emplea **un agente del producto**, no una red de agentes autónomos.
- **Not to be confused with:** los agentes de programación **Codex/Superpowers** que desarrollan el repositorio; estos no son agentes comerciales dentro de la aplicación.

### `Interpreter` / `DraftGenerator` / `CaseRepository` — Puertos y adaptadores

- **Definition:** interfaces de aplicación para extraer candidatos, redactar una acción permitida y recuperar/guardar estado del Case, respectivamente.
- **Used by:** `CaseOrchestrator`; implementaciones en `src/adapters/` (OpenAI, replay, memoria).
- **Important rules:** el intérprete no modifica `CaseKnowledge` directamente; `DraftGenerator` no altera `actionType`; el repositorio impone consistencia e idempotencia. `AI_MODE=openai` y `AI_MODE=replay` son modos distintos, sin fallback silencioso; `OPENAI_MODEL` inicia en `gpt-4.1-mini` y solo se lee en servidor.
- **Not to be confused with:** modelos de dominio o proveedores concretos acoplados a los contratos.

### `TrustedKnowledge` — Conocimiento comercial autorizado (opcional)

- **Definition:** material comercial o FAQ con fuente/versión aprobado para respaldar una respuesta.
- **Used by:** `DraftGenerator`/respuesta a objeciones cuando exista.
- **Important rules:** no se ha definido todavía una FAQ autorizada completa; ante la objeción de Javier, no afirmar condiciones o garantías sin respaldo y preferir derivación humana.
- **Not to be confused with:** `CaseKnowledge` de un cliente o información web no verificada.

## State vocabularies: never collapse these axes

| Eje | Ejemplos canónicos | Pregunta que responde |
| --- | --- | --- |
| **Conocimiento / FactView** | `known`, `approximate`, `unknown`, `ambiguous`, `conflicting`, `not_applicable` | ¿Qué sabemos y con qué precisión? |
| **Resultado de guarda** | `satisfied`, `unsatisfied`, `unknown`, `conflict` | ¿Se cumple una condición del workflow? |
| **Progreso de hito** | `pending`, `in_progress`, `blocked`, `completed`, `not_applicable` | ¿En qué situación está este hito? |
| **Estado operativo del Case** | `NEEDS_ADVISOR`, `READY_TO_REPLY`, `WAITING_CUSTOMER`, `ON_HOLD_REVIEW`, `NEXT_STEP_AGREED`, `CLOSED`, `DO_NOT_CONTACT` | ¿Quién debe actuar ahora? |
| **Orientación de política** | `NEED_CLARIFICATION`, `READY_FOR_ADVISORY_CALL`, `HUMAN_REVIEW_REQUIRED`, `WAIT`, `STOP_CONTACT` | ¿Qué resultado permite la política? |
| **Tipo de acción** | `ASK_CLARIFICATION`, `ANSWER_QUESTION`, `PROPOSE_CALL`, `HANDOFF`, `WAIT`, `CLOSE` | ¿Qué intervención se propone? |
| **Ciclo de revisión/efectos** | borrador → editado → aprobado → envío **simulado** → confirmación del cliente | ¿Qué ocurrió realmente o se simuló? |

Las enumeraciones anteriores son **vocabulario de diseño**: `LIB-002` fijará las discriminated unions y schemas exactos. No declarar valores adicionales como implementados antes de hacerlo.

## SmartHousing milestones: meaning, not just labels

| Hito | Significado verificable | No significa |
| --- | --- | --- |
| **M0 — Contacto recibido/interpretado** | Intención inicial del mensaje identificada con evidencia | Que se redactó una pregunta |
| **M1 — Interés SmartHousing** | Interés suficientemente claro en explorar el modelo | Que hizo clic en un anuncio o que pide cualquier alquiler |
| **M2 — Necesidad de vivienda** | Ubicación, horizonte y compradores comprendidos con la evidencia necesaria | Que el cliente ha encontrado vivienda o se le ha reservado una |
| **M3 — Situación económica comprendida** | Contexto financiero **autodeclarado** claro para decidir el siguiente paso, sin ambigüedad crítica | Solvencia verificada, admisión, aprobación de hipoteca o ausencia de deudas desconocidas |
| **M4 — Orientación preliminar** | Política evaluada y siguiente ruta justificada | Decisión vinculante de financiación |
| **M5 — Siguiente paso acordado** | Aceptación/seguimiento del cliente o derivación/cierre confirmado por humano, según ruta y evento | Borrador aprobado, propuesta enviada, cita reservada sin calendario ni consentimiento supuesto |

## Business rules — synthetic `demo-v1`

Estas reglas son **sintéticas y orientativas**, no políticas internas de Libeen ni un sistema de underwriting. Para implementación y precedencia detallada ver `docs/specs/07_SYNTHETIC_BUSINESS_POLICY.md`.

### R01 — No-contacto

- **Description:** una petición explícita de no continuar impide promover nuevas acciones comerciales.
- **Examples:** «No me escribáis más» → `STOP_CONTACT`.
- **Edge cases:** el agente no debe seguir solicitando facts para completar hitos pendientes; R01 es una protección prioritaria.

### R02 — Prohibición de compromiso vinculante

- **Description:** peticiones de aprobación escrita, vivienda garantizada o compromisos obligan a `HUMAN_REVIEW_REQUIRED` sin emitir garantías.
- **Examples:** Rosa solicita que conste por escrito que está aprobada.
- **Edge cases:** el asesor puede recibir un borrador prudente para revisión, pero no se fabrica una aprobación o documento vinculante.

### R03 — Incertidumbre crítica

- **Description:** un dato necesario `unknown`, `ambiguous` o `conflicting` exige aclaración focalizada o revisión.
- **Examples:** no está clara la naturaleza bruta/neta de los ingresos.
- **Edge cases:** que falte un dato **no necesario para la ruta actual** no debe bloquear todo el Case.

### R04 — Contexto comercial mínimo

- **Description:** recoger interés en producto, ubicación, compradores, horizonte de mudanza, contexto de ingresos y ahorros declarados.
- **Examples:** tener cifras de Laura no equivale por sí solo a tener interés informado confirmado.
- **Edge cases:** un ahorro explícito de cero es información **conocida**, no un dato ausente; la ruta puede cambiar por restricciones superiores.

### R05 — Semántica de deuda de Laura

- **Description:** si existe cuota conocida pero se desconoce si ya se descontó de ingresos declarados, M3 permanece bloqueado para aclararla.
- **Examples:** 3.800 € netos conjuntos, cuota coche 250 € y duda sobre deducción.
- **Edge cases:** `included` evita restar de nuevo; `excluded` conserva ambas magnitudes sin inferir capacidad económica; si contesta «no sé», M3 continúa ambiguo.

### R06 — Proponer llamada de orientación

- **Description:** con R04 satisfecho, semántica crítica resuelta, interés justificado, ruta pertinente y sin bloqueos prioritarios, puede emitirse `READY_FOR_ADVISORY_CALL`.
- **Examples:** Laura aclara la deuda **y** muestra interés suficiente; el agente propone una llamada revisable.
- **Edge cases:** no implica aptitud financiera, aprobación ni cita reservada; R10 puede añadir una pregunta de fecha.

### R07 — Objeción explícita

- **Description:** responder una duda que bloquea el avance (o derivar si no existe información autorizada) antes de volver a pedir datos.
- **Examples:** Javier pregunta «¿esto es fiable?» y también por el coste.
- **Edge cases:** no inventar contenido del audio; no resolver `TRUST` solo por generar un texto sin evidencia de atención/resolución.

### R08 — Confirmación de siguiente paso

- **Description:** M5 depende de aceptación del cliente o confirmación humana de derivación/cierre según la ruta.
- **Examples:** un mensaje ficticio de Laura confirma que acepta una llamada; se registra como simulado.
- **Edge cases:** no atribuir automáticamente una hora o reserva en calendario.

### R09 — Aprobación sin efecto

- **Description:** un borrador aprobado no demuestra envío, lectura, aceptación ni cierre de M5.
- **Examples:** `DRAFT_APPROVED` con ausencia de respuesta → M5 pendiente.
- **Edge cases:** `MESSAGE_SIMULATED_AS_SENT` indica solo el efecto ficticio y tampoco demuestra aceptación.

### R10 — Mes de mudanza obligatorio para llamada

- **Description:** interruptor de configuración `require_specific_move_month_before_call` (valor inicial `false`) que, al activarse, exige concretar el mes antes de proponer llamada.
- **Examples:** «antes del verano» con R10 `true` → `ASK_CLARIFICATION` sobre mes.
- **Edge cases:** **no reabre M3 financiero**, porque cambia un requisito de la ruta de llamada, no la claridad del contexto económico; conservar versión anterior de políticas en decisiones ya tomadas.

**Precedencia:** protección de no-contacto y prohibiciones vinculantes → urgencias/revisión → objeciones o solicitudes expresas → aclaraciones críticas → avance comercial → espera. `AgentProfile` solo prioriza entre acciones admisibles.

## Worked examples — canonical interpretation

### Laura: hechos conocidos, deuda ambigua

- **Correcto:** `buyer_count=2` en unidad de compra; `declared_monthly_income≈3800 EUR/month` conjunto y neto autodeclarado; `available_savings≈18000 EUR`; `monthly_debt=250 EUR/month`; `debt_deduction_semantics=unknown`.
- **Resultado:** M3 bloqueado en la duda concreta; recomendar preguntar si 3.800 € ya incluyen el descuento de 250 €.
- **Incorrecto:** deducir 3.550 € automáticamente, repartir 3.800 € entre dos, concluir que esa es su única deuda o certificar elegibilidad.
- **Continuación:** `included`/`excluded` permiten reevaluar M3; la llamada aún necesita los demás requisitos, incluido M1/interés suficiente. R10 `true` solicita mes sin invalidar M3.

### Javier: objeción transversal y fuente inaccesible

- **Correcto:** comprador individual, Madrid o alrededores, autónomo con ingresos declarados **en rango** de 2.000–3.000 €/mes y naturaleza bruto/neto desconocida; marcador de audio no transcrito; `TRUST` abierto.
- **Resultado:** atender dudas de confianza/coste con información autorizada o derivar, antes de recabar más finanzas.
- **Incorrecto:** inventar el audio, convertir el rango en salario fijo de 2.500 €, suponer neto o presentar garantías inexistentes.

### Rosa: cero conocido, urgencia y solicitud vinculante

- **Correcto:** pareja, 1.400 € conjuntos declarados sin neto/bruto confirmado, ahorros = **0 explícito**, salida de vivienda en dos semanas, consulta *condicional* por alquiler clásico y petición de aprobación escrita.
- **Resultado:** priorizar revisión humana prudente y no prometer vivienda, aprobación o fecha.
- **Incorrecto:** considerar el cero como `unknown`, rechazar por edad/jubilación, asumir que solo busca alquiler o emitir certificado de aprobación.

## Forbidden or discouraged terms

| Evitar decir o nombrar | Usar en su lugar | Motivo |
| --- | --- | --- |
| `Lead` como entidad raíz única | `Case` | La continuidad comercial supera una conversación o canal. `Lead` puede quedar como término de negocio informal. |
| `Conversation` para el agregado completo | `Case` | Una conversación es solo un hilo. |
| `Fact` sin contexto cuando se diseñan tipos | `FactAssertion` o `FactView` | Distinguir afirmación de vista consolidada. |
| `verified_income`, `verified_savings` para autodeclaraciones | `declared_monthly_income`, `available_savings` con procedencia | No existe verificación documental en V0. |
| `income_per_person` inferido desde ingresos conjuntos | `declared_monthly_income` con `scope=buying_unit` | Evitar reparto injustificado. |
| `debt_free` deducido de una cuota comunicada | `monthly_debt` conocido con obligaciones restantes desconocidas | No se sabe si existen más deudas. |
| `unknown = 0`, `missing = false` | Estado explícito y valor explícito separados | La ausencia de información no es una declaración negativa. |
| `audio_transcript` para un audio sin transcripción | marcador de `Message` con adjunto no disponible | No inventar contenido. |
| `Milestone` como sinónimo de `Blocker` | `MilestoneDefinition`/`MilestoneEvaluation` y `Blocker` | Progreso verificable y bloqueo transversal son conceptos distintos. |
| `eligible`, `approved`, `preapproved`, `rejected`, `credit_score` como resultados del motor | `READY_FOR_ADVISORY_CALL`, `NEED_CLARIFICATION`, `HUMAN_REVIEW_REQUIRED`, etc. | El MVP no evalúa elegibilidad financiera. |
| `accepted` por `DRAFT_APPROVED` | `DRAFT_APPROVED` / `CUSTOMER_CONFIRMED_NEXT_STEP` según evento | Aprobar texto no implica aceptación de cliente. |
| `sent` sin calificador en la demo | `MESSAGE_SIMULATED_AS_SENT` | No existe envío real. |
| `appointment_booked`, `meeting_scheduled` | `PROPOSE_CALL` o acuerdo simulado de llamada | No hay integración de calendario. |
| `ActionProposal` como sinónimo de `Draft` | `ActionProposal` (qué hacer) y `Draft` (cómo decirlo) | Evita que el LLM tome decisiones de negocio. |
| `policy` genérico en código sin distinguir tipo | `BusinessPolicy`, `ReviewPolicy` y `PolicyDecision` | Configuración, protección y resultado no son intercambiables. |
| `AGENT_APPROVED` o «la IA aprobó» | `PolicyDecision` determinista y revisión del asesor | La IA no autoriza compromisos ni cumple hitos por sí sola. |
| `SmartHousing accepted` por preguntar por alquiler | `product_intent` con evidencia de interés real | Una consulta condicional no prueba intención exclusiva ni aceptación. |
| `completed M5` por borrador o envío simulado | `MilestoneProgress` respaldado por evento de confirmación válido | Impide cierres ficticios. |
| `model output` como estado de verdad | candidato validado → `FactAssertion` → `CaseKnowledge` | La salida del LLM es no confiable hasta su validación. |

## Naming and collaboration rules for Codex

1. **Reutilizar exactamente** nombres de campos, eventos, resultados y códigos de error definidos en los contratos; no crear sinónimos (`CustomerCase`, `FinancialFact`, `DecisionAction`) sin un cambio aprobado de contrato.
2. **No mezclar ejes de estado**. El estado de una condición, el valor epistémico de un fact, el progreso de un hito y la situación operativa del Case tienen semánticas distintas.
3. **No hardcodear reglas demo ni M0–M5 en el runtime universal**: la configuración pertenece a `src/config/` y el resultado se evalúa en `src/domain/`.
4. **No elevar terminología de pruebas a políticas reales**. Los resultados de las fixtures demuestran comportamiento técnico, no underwriting.
5. **No cambiar este vocabulario unilateralmente** si afecta a `src/contracts/`, fixtures compartidos o briefs; proponer el cambio al integrador con compatibilidad y tests afectados.
6. **Desarrollo paralelo ≠ multiagencia del producto**: Codex/Superpowers implementan el repositorio; `AgentProfile`/`CaseOrchestrator` describen el único agente comercial de la V0.

## Sources and authority

Documentación local consultada para crear este glosario, sin necesidad de Notion:

- [Modelo conceptual del dominio](../specs/03_DOMAIN_MODEL.md).
- [WorkflowDefinition y M0–M5](../specs/04_WORKFLOW_DEFINITION.md).
- [FactSchema, FactAssertions y CaseKnowledge](../specs/05_FACT_SCHEMA_AND_CASE_KNOWLEDGE.md).
- [AgentProfile y Runtime](../specs/06_AGENT_PROFILE_AND_RUNTIME.md).
- [Política comercial sintética](../specs/07_SYNTHETIC_BUSINESS_POLICY.md).
- [Contrato de integración V0.1](../contracts/INTEGRATION_V0.md).
- [Casos sintéticos y aceptación](../specs/10_SYNTHETIC_CASES_AND_ACCEPTANCE.md).

**Precedencia:** el enunciado original define los límites del ejercicio; la especificación y las decisiones del proyecto definen el alcance V0; el contrato de integración y, cuando exista, `src/contracts/` definen interfaces exactas. Este glosario es la referencia lingüística compartida, no una especificación que derogue contratos o fixtures.
