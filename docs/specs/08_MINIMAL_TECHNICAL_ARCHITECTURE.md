# Arquitectura técnica mínima V0

**Estado:** propuesta de planificación. El usuario aprobó avanzar al diseño técnico, no una implementación específica. Next.js y TypeScript ya están presentes en el scaffold; Zod, Vitest y OpenAI están previstos, todavía no instalados.

## Principio

**Monolito modular TypeScript con un único workspace React**. Mantener el dominio libre de dependencias a React, proveedor LLM y almacenamiento. No construir una plataforma distribuida ni abstraer cada función hasta convertirla en un microservicio.

### Stack propuesto

| Elemento | Elección | Razón |
| --- | --- | --- |
| Aplicación | Next.js App Router + TypeScript | Un proyecto con frontend y endpoints, menor fricción. |
| Interfaz | React | Una sola pantalla del asesor. |
| Contratos y validación | Zod | Validar entradas, resultados IA, reglas y eventos. |
| Reglas / dominio | TypeScript puro | Determinismo y tests aislados. |
| Test runner | Vitest | Tests de reglas, transiciones, fixtures. |
| Configuración | JSON o YAML versionado | Modificar hitos y políticas sin alterar el evaluador. |
| Almacenamiento V0 | Fixtures + `CaseRepository` en memoria | Evitar BD en demo; luego SQLite o DB. |
| IA | `Interpreter` y `DraftGenerator` intercambiables | Proveedor real o modo replay explícito. |
| Repositorio | Git, pnpm | Estructura sencilla, entrega reproducible. |

Alternativa aceptable: React/Vite + servidor Node independiente si se aprovecha una plantilla existente. **Lo importante son las fronteras**, no el framework.

## Dependencias por capas

```text
React Case Workspace
      |
      v
Application / CaseOrchestrator
      |
      +--> Domain (CaseKnowledge, Milestones, Policies, Actions)
      |       ^         ^           ^
      |       |         |           |
      |     FactSchema Workflow   Business/ReviewPolicy
      |                          AgentProfile for action strategy
      |
      +--> Port: Interpreter ---------- Adapter: LLM/replay
      +--> Port: DraftGenerator ------- Adapter: LLM/replay
      +--> Port: CaseRepository ------- Adapter: in-memory / later DB
```

La dirección conceptual es UI → Application → Domain; los adaptadores implementan puertos, sin invadir el dominio. Los modelos configurables no deben conocer datos de usuarios particulares.

## Interfaces/puertos a mantener (contratos conceptuales)

| Interfaz | Entrada | Salida |
| --- | --- | --- |
| `CaseRepository.get/save` | ID de expediente / revisión | Snapshot y eventos. |
| `Interpreter.interpret` | Mensajes, FactSchema y contexto | Afirmaciones candidatas, preguntas, objeciones y evidencias. |
| `FactReconciler.reconcile` | Afirmaciones anteriores y candidatas | CaseKnowledge y conflictos revisados. |
| `MilestoneEvaluator.evaluate` | WorkflowDefinition, hechos, eventos | Progreso, requisitos y rutas. |
| `PolicyEvaluator.evaluate` | Política, hechos y bloqueos | Acciones permitidas, motivo y revisión requerida. |
| `ActionPlanner.choose` | Acciones permitidas + AgentProfile + progreso | Una ActionProposal principal y razón. |
| `DraftGenerator.draft` | Acción, datos con fuente, estilo y conocimiento autorizado | Borrador editable. |
| `CaseOrchestrator.handleEvent` | Evento normalizado y revisión de Case | Estado/decisión, sin enviar ni reservar nada. |

No representan necesariamente ocho servicios separados. Algunas pueden ser funciones puras con tests; el orquestador no debe contener la lógica de cada hito.

## Ciclo técnico

1. Obtener Case, configuración y verificar evento no duplicado.
2. Interpretar mensajes nuevos con IA, salida estructurada y evidencias. Un evento de aprobación/corrección humana quizá no necesita interpretación LLM.
3. Validar datos con FactSchema y reconciliar sin perder fuentes.
4. Evaluar WorkflowDefinition, condiciones, rutas y BusinessPolicy/ReviewPolicy.
5. Elegir acción admisible según AgentProfile; no permitir que el LLM «apruebe» un hito.
6. Generar borrador separado de ActionProposal, con verificación de restricciones.
7. Persistir snapshot/revisión e informar a UI. La aprobación crea un evento posterior. **No hay efectos externos automáticos**.

## Contrato de eventos

Eventos con `eventId`, `caseId`, `type`, `actor/origin`, `timestamp` y `payload`; `expectedRevision` opcional para evitar sobrescrituras. En V0 todos los envíos/acuerdos de cliente se simulan explícitamente.

Estados que NO deben confundirse:

```text
DRAFT_GENERATED
   != DRAFT_APPROVED
   != MESSAGE_SIMULATED_AS_SENT
   != CUSTOMER_CONFIRMED_NEXT_STEP
   != MILESTONE_COMPLETED
```

Si se recibe un evento repetido, no generar dos transiciones o borradores. Si un modelo falla o devuelve salida inválida, no contaminar el Case con supuestos hechos; dejar al asesor gestionar manualmente.

## Estructura de carpetas acordada

La estructura corresponde al scaffold existente en el repositorio y a las reglas de `../../AGENTS.md`:

```text
src/
  app/                         # Next.js y API
  components/case-workspace/  # UI
  application/cases/          # orquestación
  domain/
    cases/                    # entidades, eventos y estado
    facts/                    # conciliación
    workflows/                # evaluación de hitos
    policies/                 # reglas protegidas/comerciales
    actions/                  # plan de acción
  config/
    workflows/                # WorkflowDefinition
    facts/                    # FactSchema
    agents/                   # AgentProfile
    policies/                 # BusinessPolicy / ReviewPolicy
  adapters/
    ai/                       # extracción, redacción y replay
    persistence/              # repositorio temporal
    channels/                 # reserva para canales posteriores
  fixtures/
    cases/                    # Laura, Javier, Rosa
    expected/                 # resultados esperados
tests/
  unit/
  acceptance/
docs/
```

Esta estructura es **preparación**, no prueba de que los módulos estén implementados. El script utiliza `create-next-app` y crea directorios con `.gitkeep` sin escribir código de dominio; según el registro, no se ejecutó con una instalación real en el entorno del asistente.

## Fronteras de extensibilidad

| Cambio futuro | Qué se modifica | Qué permanece |
| --- | --- | --- |
| Nuevo hito de verificación documental | WorkflowDefinition, campos si son necesarios | Case, mensajes, evaluador genérico. |
| Antigüedad laboral | FactSchema y requisitos que lo utilicen | Conversación, orquestador genérico. |
| Un tono más formal / una pregunta por turno | AgentProfile | Guardas, datos, política. |
| Otro proveedor LLM | Adaptador de IA | MilestoneEvaluator, FactSchema, acciones. |
| Añadir WhatsApp / CRM | Adaptador de canal y ejecución aprobada | Hitos, facts y estrategia. |
| Bandeja de 100 casos | UI/consulta/indexación | Evaluación independiente por Case. |
| Base de datos real | Implementación de CaseRepository | API de negocio del runtime. |

## Validación cruzada de configuraciones

En una futura implementación, al arrancar se deberían comprobar IDs de campos referenciados por WorkflowDefinition, acciones admitidas por ActionCatalog, sucesores existentes, versiones compatibles y operadores permitidos. No usar `eval`, JavaScript arbitrario en YAML ni instrucciones de cliente como reglas.

## Cortes deliberados V0

Sin microservicios, Docker obligatorio, MongoDB por costumbre, colas asíncronas, event sourcing completo, RAG, autenticación productiva, gestión multiempresa, editor visual, analítica de negocio o integración real de mensajería. El conjunto debe arrancar localmente con un README claro.

## Pendiente técnico real

Proveedor OpenAI confirmado y modelo de prueba `gpt-4.1-mini`, configurado en el futuro mediante `OPENAI_MODEL` en `.env`. El scaffold Next.js está confirmado en `main`; faltan dependencias, implementación y verificación. **No se ha hecho nada de eso en este paquete documental.**
