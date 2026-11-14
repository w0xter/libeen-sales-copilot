# Índice de documentación — Libeen Sales Copilot V0

**Uso:** documentación operacional **dentro del repositorio**, sin requerir acceso a Notion para ejecutar Codex. La especificación y los briefs son diseño, no código implementado. No copiar indiscriminadamente todo al contexto de cada agente: leer solo lo que corresponda a su tarea.

## Orden de lectura

1. [`../AGENTS.md`](../AGENTS.md): instrucciones globales y límites no negociables.
2. [`DECISIONS_AND_STATUS.md`](DECISIONS_AND_STATUS.md): decisiones confirmadas, hipótesis y estado real del repo.
3. [`contracts/INTEGRATION_V0.md`](contracts/INTEGRATION_V0.md): semántica de los contratos que unen módulos.
4. [`implementation/DAG.md`](implementation/DAG.md): dependencias y gates G0–G4.
5. [`implementation/tasks/`](implementation/tasks/): **un** AI Task Brief por trabajo.

## Guía de consulta para agentes Codex

No es necesario leer toda la documentación al iniciar cada sesión. `AGENTS.md` establece las reglas globales; el AI Task Brief asignado determina el trabajo concreto. Esta tabla explica **para qué sirve cada documento y cuándo consultarlo**.

| Documento | Uso y momento de consulta |
| --- | --- |
| [`ai/ubiquitous-language.md`](ai/ubiquitous-language.md) | **Antes de nombrar o interpretar entidades, hechos, hitos y reglas**; evita mezclar conceptos de dominio. |
| [`contracts/INTEGRATION_V0.md`](contracts/INTEGRATION_V0.md) | **Al consumir o implementar contratos compartidos**; semántica de eventos, revisiones, errores, puertos y datos. |
| [`specs/`](specs/) | **Durante la implementación**; solo especificaciones relevantes para el brief actual (ver tabla inferior). |
| [`implementation/DAG.md`](implementation/DAG.md) | **Antes de iniciar un nodo y al integrar**; predecesores, paralelismo y gates. |
| [`implementation/tasks/`](implementation/tasks/) | **Al iniciar la tarea**; scope autorizado, ownership, entradas/salidas y aceptación. |
| [`implementation/CODEX_PROTOCOL.md`](implementation/CODEX_PROTOCOL.md) | **Para desarrollo en paralelo**; autonomía, Superpowers, worktrees, Contract Change Requests, integración y handoff. |
| [`implementation/ACCEPTANCE_MATRIX.md`](implementation/ACCEPTANCE_MATRIX.md) | **Al diseñar/verificar pruebas**; cobertura AC-01–AC-15 y casos adversariales. |
| [`ai/definition-of-done.md`](ai/definition-of-done.md) | **Antes de declarar una tarea lista**; checklist de resultados comprobados y riesgos pendientes. |
| [`AI_DEVELOPMENT_LOG.md`](AI_DEVELOPMENT_LOG.md) | **Después de trabajo real con Codex**; registrar qué se delegó, revisó y comprobó, sin entradas ficticias. |
| [`DECISIONS_AND_STATUS.md`](DECISIONS_AND_STATUS.md) | **Cuando surge una duda de estado o decisión**; distinguir lo confirmado, lo diseñado y lo implementado. |

**Ciclo esperado para una tarea asignada y desbloqueada:** leer brief → inspeccionar código y consultar contexto pertinente → plan técnico interno → implementar, probar y revisar autónomamente → completar Definition of Done → entregar handoff. **No se requiere aprobación humana intermedia del plan técnico.** El integrador sigue controlando cambios compartidos y operaciones externas no autorizadas. Ni el DAG ni el índice obligan a leer todos los documentos.

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
