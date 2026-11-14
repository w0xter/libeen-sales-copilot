# Índice de documentación — Libeen Sales Copilot V0

**Uso:** documentación operacional **dentro del repositorio**, sin requerir acceso a Notion para ejecutar Codex. La especificación y los briefs son diseño, no código implementado. No copiar indiscriminadamente todo al contexto de cada agente: leer solo lo que corresponda a su tarea.

## Orden de lectura

1. [`../AGENTS.md`](../AGENTS.md): instrucciones globales y límites no negociables.
2. [`DECISIONS_AND_STATUS.md`](DECISIONS_AND_STATUS.md): decisiones confirmadas, hipótesis y estado real del repo.
3. [`contracts/INTEGRATION_V0.md`](contracts/INTEGRATION_V0.md): semántica de los contratos que unen módulos.
4. [`implementation/DAG.md`](implementation/DAG.md): dependencias y gates G0–G4.
5. [`implementation/tasks/`](implementation/tasks/): **un** AI Task Brief por trabajo.

## Especificaciones funcionales (leer selectivamente)

| Documento | A quién le sirve |
| --- | --- |
| [01 — Enunciado y fuentes](specs/01_CHALLENGE_AND_SOURCES.md) | Todos: límites oficiales |
| [02 — Producto y recorrido](specs/02_PRODUCT_SCOPE_AND_USER_JOURNEY.md) | UI, runtime, QA |
| [03 — Modelo de dominio](specs/03_DOMAIN_MODEL.md) | Contratos, casos, todos los dominios |
| [04 — WorkflowDefinition](specs/04_WORKFLOW_DEFINITION.md) | Hitos, políticas, integración |
| [05 — FactSchema/Knowledge](specs/05_FACT_SCHEMA_AND_CASE_KNOWLEDGE.md) | Facts, intérprete, test |
| [06 — AgentProfile/Runtime](specs/06_AGENT_PROFILE_AND_RUNTIME.md) | IA, acciones, orquestador |
| [07 — Política demo](specs/07_SYNTHETIC_BUSINESS_POLICY.md) | Políticas, QA, UI |
| [08 — Arquitectura](specs/08_MINIMAL_TECHNICAL_ARCHITECTURE.md) | Todos, selectivamente |
| [09 — Workspace y demo](specs/09_CASE_WORKSPACE_AND_DEMO.md) | UI, integración, aceptación |
| [10 — Casos y aceptación](specs/10_SYNTHETIC_CASES_AND_ACCEPTANCE.md) | Fixtures, QA, IA |
| [11 — Calidad y entrega](specs/11_QUALITY_TESTING_AND_DELIVERY.md) | QA, integrador, entrega |

## Ejecución y trazabilidad

- [`implementation/CODEX_PROTOCOL.md`](implementation/CODEX_PROTOCOL.md): worktrees, ownership, cambios de contrato, fallos, merge.
- [`implementation/AI_TASK_BRIEF_TEMPLATE.md`](implementation/AI_TASK_BRIEF_TEMPLATE.md): plantilla del formato Nomu Labs adaptada.
- [`implementation/ACCEPTANCE_MATRIX.md`](implementation/ACCEPTANCE_MATRIX.md): AC-01 a AC-15 → tareas y pruebas.
- [`implementation/tasks/`](implementation/tasks/): 13 briefs LIB-001–LIB-013.
- [`AI_DEVELOPMENT_LOG.md`](AI_DEVELOPMENT_LOG.md): registro **vacío hasta que se ejecute trabajo real**, no inventar entradas.
- [`reference/Prueba_tecnica_AI_Product_Engineer.pdf`](reference/Prueba_tecnica_AI_Product_Engineer.pdf): enunciado y conversaciones originales, PDF de cuatro páginas.

## Precedencia

En caso de tensión: el PDF original define las reglas obligatorias del ejercicio; las decisiones explícitas registradas en `DECISIONS_AND_STATUS.md` delimitan la solución; `contracts/INTEGRATION_V0.md` define las interfaces; el AI Task Brief aprobado delimita el trabajo individual; `AGENTS.md` establece invariantes y seguridad transversal. Nunca reinterpretar una política ficticia como política real de Libeen.

**Fecha del paquete:** 2026-11-13. Las versiones documentales no migran automáticamente a versiones de código.
