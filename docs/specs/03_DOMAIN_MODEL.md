# Modelo conceptual del dominio

**Estado:** propuesta de arquitectura conceptual, sin obligación de una tabla/clase por entidad.

## Decisión principal

La **unidad de trabajo es `Case` (expediente)**, no `Conversation` ni el LLM. Una oportunidad puede empezar en web, continuar en WhatsApp y terminar por teléfono. En la V0 se utilizará un expediente con una conversación, pero un Case debe poder agrupar varias en el futuro.

## Entidades y relaciones

| Entidad | Responsabilidad | Relación principal |
| --- | --- | --- |
| `Case` | Continuidad de una oportunidad comercial y su estado | 1 Case → N Conversations, Facts, Goals, Events y Actions |
| `Conversation` | Hilo de intercambio en un canal | N Conversations → 1 Case; 1 → N Messages |
| `Message` | Intervención concreta, fuente de evidencia | N Messages → 1 Conversation; referencia por ID |
| `Goal` | Resultado comercial perseguido | N Goals → 1 Case; **uno principal activo** en V0 |
| `MilestoneDefinition` | Checkpoint configurable y verificable | Pertenece a WorkflowDefinition |
| `MilestoneProgress` | Evaluación del hito en ese expediente | Referencia Goal, definición y evidencias |
| `FactAssertion` | Afirmación sobre un campo y sujeto, con fuente | Pertenece a Case; refiere FieldDefinition |
| `CaseKnowledge` | Interpretación consolidada, con incertidumbre | Vista derivada de FactAssertions y revisiones |
| `Blocker` | Duda, contradicción, objeción o riesgo transversal | Afecta Case, Goal, Milestone o Action |
| `ActionProposal` | Próxima intervención sugerida y justificación | La decisión del asesor no equivale al efecto |
| `CaseEvent` | Hecho ocurrido: mensaje, edición, aceptación, etc. | Provoca reevaluaciones y conserva auditoría |

Cardinalidades futuras son orientación conceptual: no imponerlas como un esquema físico complejo en la V0.

## Entidades definidas frente a instancias

| Definición reutilizable | Instancia o estado de un expediente |
| --- | --- |
| `WorkflowDefinition` | Progreso M0–M5 de Laura |
| `MilestoneDefinition` | Evaluación de M3 para Laura |
| `FactSchema` / `FieldDefinition` | Dato «3.800 €/mes» con evidencia |
| `AgentProfile` | Estrategia elegida para la próxima acción |
| `BusinessPolicy` / `ReviewPolicy` | Resultado de las reglas y permisos de este expediente |
| `ActionCatalog` | Propuesta concreta «ASK_CLARIFICATION» |

La configuración es **versionada**. El expediente registra qué versiones influyeron en su decisión; no se reescribe el pasado cuando cambia una política.

## Goal ≠ Milestone ≠ Blocker ≠ Action

- **Goal:** «orientar el siguiente paso adecuado para este interesado». No es un prompt ni un mensaje.
- **Milestone:** «entender suficientemente la situación económica para una conversación comercial». Se verifica por condiciones y evidencias.
- **Blocker:** «no sabemos si la cuota está descontada» o «objeción de confianza». Puede interrumpir sin cambiar el workflow.
- **Action:** «preguntar por la deuda», «responder una objeción» o «proponer llamada». Una acción es sugerida antes de ejecutarse.

Javier puede estar recopilando datos económicos y tener `trust_objection` abierto. No añadimos automáticamente un hito «resolver confianza» a todos los workflows: tratamos su objeción como un bloqueo transversal.

Rosa puede salir por revisión o cierre informado sin completar los hitos económicos. Ese desvío no convierte M3–M4 en «completed»: pueden quedar `not_applicable` según ruta.

## Invariantes del dominio

1. La IA **no completa hitos por declaración propia**. Solo guardas verificables lo hacen.
2. No hay campos financieros de Libeen incrustados en el tipo `Message` ni en la interfaz genérica.
3. Un `Fact` contiene sujeto, unidad y procedencia; `unknown` no se transforma en 0.
4. Una afirmación corregida conserva historial y origen; una nueva cifra no sobrescribe silenciosamente la anterior.
5. Una objeción abierta puede cambiar la acción prioritaria sin destruir progreso.
6. `ActionProposal` es diferente de `Draft`, `Approval`, `Delivery` y `CustomerAgreement`.
7. `DRAFT_APPROVED` no completa M5; se necesita confirmación del siguiente paso u otro evento terminal permitido.
8. Un dato de ingresos conjunto no se reparte automáticamente entre compradores individuales.
9. No hay acoplamiento del dominio a WhatsApp, CRM, proveedor de IA, React o base de datos.
10. La urgencia no se interpreta como conversión probable, y no se discrimina automáticamente por edad o situación laboral.

## Eventos previstos

`MESSAGE_RECEIVED`, `CASE_ANALYSIS_REQUESTED`, `FACT_CORRECTED`, `DRAFT_EDITED`, `DRAFT_APPROVED`, `DRAFT_DISCARDED`, `MESSAGE_SIMULATED_AS_SENT`, `CUSTOMER_CONFIRMED_NEXT_STEP`, `HUMAN_HANDOFF_CONFIRMED`, `CONVERSATION_CLOSED`, `DO_NOT_CONTACT_REQUESTED`.

También se pueden derivar registros internos de `MILESTONE_COMPLETED`, `MILESTONE_REOPENED`, `BLOCKER_OPENED/RESOLVED` y `ACTION_RECOMMENDED` sin convertirlos en efectos externos. Evitar event sourcing completo en V0: basta un estado simple con historial suficiente y `caseRevision`.

## Estado operativo frente a estado de hitos

Un expediente puede estar `WAITING_CUSTOMER` y, sin embargo, seguir en M3 incompleto. Estados operativos conceptuales: `NEEDS_ADVISOR`, `READY_TO_REPLY`, `WAITING_CUSTOMER`, `ON_HOLD_REVIEW`, `NEXT_STEP_AGREED`, `CLOSED`, `DO_NOT_CONTACT`. Los hitos usan estados como `pending`, `in_progress`, `blocked`, `completed`, `not_applicable` y, si se autoriza, `waived`.

Es importante no cruzar ambas clasificaciones: la comunicación y el progreso comercial son ejes diferentes.
