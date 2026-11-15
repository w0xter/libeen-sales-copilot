# Libeen AI Lead Intake V0 — documentación activa

**Versión del paquete:** 0.1 · **Fecha:** 2026-11-15 · **Estado:** base documental para iniciar P0; la V0 todavía no está implementada.

Este directorio es la única fuente documental activa para la **nueva** Libeen AI Lead Intake V0. Es autocontenido y no necesita acceso a Notion.

## Orden de lectura para Codex

1. [`01_FUNCTIONAL_SPEC_V0.md`](01_FUNCTIONAL_SPEC_V0.md) — qué debe lograr el producto y qué queda excluido.
2. [`02_MINIMAL_BDE_IMPLEMENTATION_PLAN.md`](02_MINIMAL_BDE_IMPLEMENTATION_PLAN.md) — qué recuperar del repositorio y cómo validar el núcleo B/D/E en P0–P4.
3. [`tasks/P0_BRIEF.md`](tasks/P0_BRIEF.md) — tarea **exclusivamente P0**. **Leerlo no constituye autorización de ejecución**: comienza P0 solo cuando el usuario lo encargue explícitamente.

Las instrucciones generales de desarrollo están en [`../../AGENTS.md`](../../AGENTS.md). La documentación anterior se encuentra en [`../legacy/`](../legacy/README.md) y **no impone requisitos** a esta V0. No leer ni aplicar automáticamente su DAG, contratos, policies, WorkflowDefinition, AgentProfile, M0–M5 o tareas LIB-001–LIB-013. Consultar código legado para reutilización está permitido **solo en la medida requerida por una tarea concreta**.

El enunciado original de la prueba técnica se conserva en [`../legacy/reference/Prueba_tecnica_AI_Product_Engineer.pdf`](../legacy/reference/Prueba_tecnica_AI_Product_Engineer.pdf). Es referencia primaria del ejercicio, **no** convierte en vigentes los diseños antiguos almacenados junto a él.

## Reglas de alcance y estado

- **Decisión confirmada:** aceptamos imperfección deliberada de B/D/E si hay información comercial útil e incertidumbres visibles.
- **Propuesta vigente para trabajar:** reconstrucción mínima de B/D/E con reutilización selectiva; no se ha aprobado una arquitectura técnica definitiva ni se ha implementado el núcleo.
- **Orden:** P0 → P1 (puerta de viabilidad con LLM real) → P2 → P3 → P4. P0 no habilita automáticamente P1–P4.
- **Prioridad actual:** B = extracción, D = incidencias, E = una pregunta. El resto del recorrido completo A/C/F/G viene después de demostrar que el núcleo funciona.
- **Seguridad funcional:** datos ficticios; no inventar hechos, audio o verificaciones; no aprobación financiera, envío a clientes ni sincronización con CRM.

### Cómo interpretar los documentos

La especificación funcional describe la **V0 completa** y recoge criterios de aceptación AC-01–AC-23. El plan B/D/E establece un **subconjunto de trabajo secuenciado**. No convertir automáticamente todos los criterios de la V0 en obligaciones de P0, P1 o P2.

**Actualización respecto al primer borrador:** la ficha usa **siete campos comerciales**: interés explícito en SmartHousing, zona, horizonte, compradores, ingresos, ahorros y cuotas/deudas mencionadas. La versión inicial hablaba de seis; el anexo funcional posterior añadió el interés como séptimo. Además existen identificador/alias y estado comercial (`Nuevo`, `En cualificación`, `Cualificado`), que **no son campos a extraer por B**.

## Instalación manual de este paquete

Extraer el ZIP **en la raíz** del repositorio, en la rama `codex/lead-intake-v0-bootstrap`, conservando rutas. Solo sustituye `docs/current/README.md` y añade tres ficheros Markdown en `docs/current/` y `docs/current/tasks/`. No sustituye `AGENTS.md`, `docs/README.md`, `src/`, scripts ni documentos históricos. Revisar el diff antes de confirmar el commit.

## Fuentes de la consolidación (no necesarias para Codex)

- Especificación funcional v0.1 (borrador, 2026-11-15): https://app.notion.com/p/419a424764688127ad37dd43f3e13552
- Plan de implementación B/D/E (borrador, 2026-11-15): https://app.notion.com/p/419a424764688117b43fcabfc373f9d5
- Auditoría de reutilización F02 (revisión estática): https://app.notion.com/p/419a4247646881eebadbcfba89f9628f
- Base Git del bootstrap: https://github.com/w0xter/libeen-sales-copilot/tree/codex/lead-intake-v0-bootstrap (verificado en commit `f1592ee9cf1624019e0022cfa703d7ba3570bdc0`)

Los enlaces son **trazabilidad humana**, no dependencias de lectura o integración.
