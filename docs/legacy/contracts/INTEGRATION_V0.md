# Contrato de integración V0.1 — Libeen Sales Copilot

**Estado:** semántica de diseño congelable para construir contratos TypeScript/Zod en **LIB-002**, no código ya implementado. **Ámbito:** monolito modular con `Case` como frontera de consistencia. Versión de referencia: `integration-contract-v0.1`.

## Principios y dirección de dependencias

```text
UI/Next.js → Application/CaseOrchestrator → Domain (Facts, Workflow, Policies, Actions)
                                              ↑
                       Versioned FactSchema, WorkflowDefinition, AgentProfile,
                       BusinessPolicy, ReviewPolicy, ActionCatalog
Application → ports (Interpreter, DraftGenerator, CaseRepository) ← adapters (OpenAI/replay/memory)
```

- Dominio independiente de Next.js, React, OpenAI y almacenamiento.
- La IA propone afirmaciones con evidencia y redacta; **no** completa hitos ni concede elegibilidad.
- Las configuraciones son declarativas y referenciadas por versión; no se ejecuta JS arbitrario desde un mensaje ni un YAML.
- Los contratos públicos estarán en `src/contracts/`; son propiedad del integrador y se modifican mediante Contract Change Request.

## Catálogo de contratos públicos

| Contrato | Campos semánticos mínimos | Productor | Consumidores |
| --- | --- | --- | --- |
| `ConfigBundleRef` | versiones `workflow`, `factSchema`, `agentProfile`, `businessPolicy`, `reviewPolicy`, `actionCatalog` | ConfigLoader | Domain y DecisionRecord |
| `CaseEvent` | `eventId`, `caseId`, `type`, `actor/source`, `occurredAt`, `expectedRevision`, `payload`, `simulated` si corresponde | UI/API normalizada | Application, Repository |
| `Message`/`EvidenceRef` | `messageId`, `conversationId`, `role`, fecha y contenido/adjunto sin transcripción; `messageId` y rango/fragmento como evidencia | Case / Interpreter | Facts, UI |
| `CaseSnapshot` | `caseId`, `revision`, mensajes, afirmaciones, conocimiento, Goal, hitos, blockers, propuestas y refs de versión | Repository/Application | Domain, UI |
| `FactAssertion` | `fieldId`, `subjectRef`, `value`, `unit`, `period`, `rawValue`, `source`, `precision`, `reviewStatus` | Interpreter validado o asesor | FactReconciler |
| `CaseKnowledge`/`FactView` | valores por campo y sujeto, estados `known/approximate/unknown/ambiguous/conflicting/not_applicable`, evidence refs | FactReconciler | Workflow/Policy/UI |
| `MilestoneEvaluation` | hito, estado, guardas evaluadas, evidencias, blockers, versión de workflow | MilestoneEvaluator | ActionPlanner/UI |
| `PolicyDecision` | resultado, `allowedActions`, `prohibitedActions`, `ruleIds`, prioridad, `reviewRequired`, motivos | PolicyEvaluator | ActionPlanner, UI |
| `ActionProposal` | `proposalId`, `originCaseRevision`, `configBundleRef`, `actionType`, razón, evidenceRefs y estado `active/superseded` | ActionPlanner | Draft/UI |
| `Draft`/`Outcome` | `draftId`, `proposalId`, texto editable, estado de revisión; resultado posterior con evento independiente | DraftGenerator/asesor | Application/UI |
| `DecisionRecord` | input event IDs, before/after revision, fact/evidence/rule refs, modo IA `openai/replay`, resultado y advertencias | Orchestrator | QA/UI |
| `CaseView`/`ApplicationResult` | snapshot proyectado, acción/borrador vigentes, errores/avisos, modo de ejecución | Application | UI |
| `ApplicationError` | código estable, mensaje seguro, `retryable`, `currentRevision` opcional, detalles sin secretos | Adaptadores/Application | UI/QA |

### Validación cruzada

Las referencias `fieldId`, `milestoneId`, `actionType` y operadores deben existir en los catálogos correspondientes. Invalidar en carga cualquier configuración incompatible (`INVALID_CONFIGURATION`), no esperar a que el LLM provoque el fallo. Preservar `source/version` en cada decisión para comparar resultados de R10. Los identificadores de evidencia deben apuntar a mensajes existentes; una referencia a un audio sin transcripción **no autoriza inventar su contenido**.

### Diferencias que no pueden colapsarse

- `FactAssertion` ≠ `FactView`: declaración con fuente vs interpretación consolidada.
- `unknown` ≠ cero explícito; no mezclar incomes de sujetos/periodos distintos; no dividir el ingreso conjunto de Laura ni descontar otra vez su cuota.
- `Goal` ≠ `Milestone` ≠ `Blocker` ≠ `ActionProposal`.
- `DRAFT_GENERATED` ≠ `DRAFT_APPROVED` ≠ `MESSAGE_SIMULATED_AS_SENT` ≠ `CUSTOMER_CONFIRMED_NEXT_STEP` ≠ `MILESTONE_COMPLETED`.
- `READY_FOR_ADVISORY_CALL` ≠ elegibilidad financiera, aprobación, oferta, cita reservada ni acuerdo del cliente.

## Eventos de entrada previstos

`MESSAGE_RECEIVED`, `CASE_ANALYSIS_REQUESTED`, `FACT_CORRECTED`, `DRAFT_EDITED`, `DRAFT_APPROVED`, `DRAFT_DISCARDED`, `MESSAGE_SIMULATED_AS_SENT`, `CUSTOMER_CONFIRMED_NEXT_STEP`, `HUMAN_HANDOFF_CONFIRMED`, `DO_NOT_CONTACT_REQUESTED`, `CASE_REEVALUATION_REQUESTED`.

Todos son tipados y llevan IDs. Los eventos de demo llevan origen `simulated` cuando corresponda. Eventos de progreso como `MILESTONE_COMPLETED` pueden ser derivados internos; el LLM no los puede generar como efectos autoritativos.

## Puntos de commit y estados

1. **Validación inicial:** `eventId`, `caseId`, tipo, actor, payload, revisión y permisos. Entrada inválida no modifica el caso.
2. **Recepción:** `MESSAGE_RECEIVED` válido se guarda con el mensaje y aumenta la revisión, de manera idempotente, **antes** de llamar a IA.
3. **Interpretación:** el adaptador devuelve candidatos; se validan por FactSchema y evidence. Si falla, el mensaje queda pero no se incorpora conocimiento inventado. Puede quedar `analysis_failed` pendiente de reintento o atención manual.
4. **Revisión de concurrencia:** si la revisión cambió durante el LLM, no se escribe una evaluación calculada sobre estado antiguo sin nueva revisión. Se devuelve `REVISION_CONFLICT` o se reevalúa explícitamente.
5. **Evaluación y decisión:** reconcile→milestones→policies→action. Guardar proyección y `DecisionRecord` en una actualización condicional coherente.
6. **Redacción:** `DraftGenerator` redacta una acción admisible; error aquí no revierte hechos/progreso ya válidos, pero no presenta un texto inventado como generado por IA.
7. **Acciones posteriores:** aprobación/edición/descartado se registran en nuevos eventos humanos. No hay envío real.

### Idempotencia, revisión y propuestas obsoletas

- Mismo `eventId` y **mismo payload** → no ejecutar efectos de nuevo; recuperar resultado/recibo estable.
- Mismo `eventId` con payload distinto → `IDEMPOTENCY_CONFLICT` sin mutación.
- Una escritura con `expectedRevision` antigua → `REVISION_CONFLICT`; no sobrescribir silenciosamente.
- Una propuesta se genera con `originCaseRevision` y `configBundleRef`. Si cambian hechos relevantes o políticas, marcarla `superseded`; su aprobación provoca `STALE_PROPOSAL`.
- `DRAFT_APPROVED` no completa M5. Una aceptación ficticia posterior con evidencia sí puede justificar el hito según ruta, pero no implica reserva en calendario.

## Semántica de configuración

- **WorkflowDefinition:** hitos M0–M5 y predicados tipados (`fact_present`, `fact_unambiguous`, `fact_matches`, `event_confirmed`, `policy_result`, `ALL`, `ANY`). `satisfied/unsatisfied/unknown/conflict` son **resultados de condiciones**, no estados de hecho.
- **FactSchema:** campos/subjects/units y validación; no contiene umbrales comerciales ni requiredness universal.
- **AgentProfile:** comportamiento, foco, estilo y capacidades dentro de acciones permitidas; nunca overrides de seguridad.
- **BusinessPolicy demo-v1:** resultados `NEED_CLARIFICATION`, `READY_FOR_ADVISORY_CALL`, `HUMAN_REVIEW_REQUIRED`, `WAIT`, `STOP_CONTACT`; R10 `require_specific_move_month_before_call` cambia la ruta a llamada sin reabrir M3 financiero.
- **ReviewPolicy:** R01 opt-out y R02 no compromisos vinculantes tienen precedencia protegida, independiente del perfil.
- **Cambio de política:** preservar version refs en decisiones antiguas; invalidar propuestas vigentes cuando cambia su supuesto; reevaluación explícita para demostrar R10.

## Errores acordados

| Código | Estado tras el error | Recuperación |
| --- | --- | --- |
| `INVALID_INPUT`, `NOT_FOUND` | No aceptar mutación inválida | Corregir request |
| `INVALID_CONFIGURATION` | No evaluar con bundle roto | Arreglar refs/config |
| `MODEL_UNAVAILABLE`, `MODEL_OUTPUT_INVALID` | Mensaje válido conservado, sin facts inferidos inválidos | Reintentar o revisión manual |
| `EVIDENCE_INVALID` | Rechazar assertion candidata | Solicitar evidencia o corrección |
| `REVISION_CONFLICT` | Estado anterior a mutación conservado | Refrescar/reanalizar |
| `IDEMPOTENCY_CONFLICT` | Sin efecto nuevo | Nuevo eventId |
| `POLICY_DENIED` | Acción no permitida | Proponer alternativa o revisión |
| `STALE_PROPOSAL` | Propuesta desactualizada no aprobada | Reevaluar caso |
| `DRAFT_GENERATION_FAILED` | Mantener hechos y decisión válidos sin borrador | Redacción humana o reintento |

## Fixtures de conformidad transversales

Laura inicial → deuda `unknown` y M3 bloqueado; variantes `included/excluded` → M3 evaluable sin doble cómputo; corrección neto→bruto → reabrir dependencias; R10 true/false → cambia pregunta de mes sin reabrir M3. Javier → audio no transcrito sin hechos, objeción TRUST primero. Rosa → ahorro cero explícito, urgencia y aprobación escrita fuerzan atención humana. Duplicados/revisión obsoleta, prompt injection, falta de OpenAI y propuesta obsoleta deben ser pruebas compartidas. Ver [casos](../specs/10_SYNTHETIC_CASES_AND_ACCEPTANCE.md) y [matriz](../implementation/ACCEPTANCE_MATRIX.md).

**Alcance:** comportamiento exigido para LIB-002, 004–010; todavía no se ha implementado en código. Evitar convertir esto en motor universal de workflows o event sourcing completo.
