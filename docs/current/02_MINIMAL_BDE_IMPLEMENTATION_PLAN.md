# Libeen AI Lead Intake V0 — Plan mínimo de implementación B/D/E

**Versión:** 0.1 · **Fecha:** 2026-11-15 · **Estado:** plan de trabajo para P0–P4; sin código nuevo implementado ni arquitectura final.  
**Rama preparada:** `codex/lead-intake-v0-bootstrap`, creada desde `main`; bootstrap documental verificado remotamente en `f1592ee9cf1624019e0022cfa703d7ba3570bdc0`.  
**Referencia funcional:** [`01_FUNCTIONAL_SPEC_V0.md`](01_FUNCTIONAL_SPEC_V0.md).  
**Primer encargo posible:** [`tasks/P0_BRIEF.md`](tasks/P0_BRIEF.md), **exclusivamente P0** y solo bajo autorización expresa del usuario.

## 1. Principio y resultado mínimo

Construir el **núcleo** que pueda analizar una conversación comercial ficticia nueva y proporcionar:

- **B — Extract:** datos útiles con evidencia, ausencias explícitas e incertidumbres visibles, incluso si el resultado es parcial.
- **D — Issues:** faltantes, ambigüedades, contenido inaccesible y solicitudes delicadas sin bloquear datos correctos.
- **E — Next Question:** una sola pregunta priorizada o recomendación de revisión humana, editable y nunca enviada.

> La fiabilidad semántica universal **no** es un objetivo de esta V0. Sí lo son la utilidad comercial, la transparencia de las dudas, la conservación de evidencia, la corrección humana posterior y la distinción real-modelo / replay.

**Antes de interfaz/CRM/stage**, demostrar el flujo B/D/E mediante pruebas de backend. La corrección persistida, ficha visual, reanálisis UX y exportación real son parte de la V0 **posterior**, no puertas P0–P3.

## 2. Qué reutilizar y qué no

La rama avanzada `codex/f02-first-live-c01` fue estudiada **estáticamente** en commit `5c4f6d737f315c040a429150682999758b67ad2d`. Su complejidad adicional no es un requisito para la nueva V0. La nueva rama parte del código de `main`.

| Pieza actual del repositorio | Tratamiento para la nueva V0 |
| --- | --- |
| Infraestructura existente (Next.js/TS, herramientas y scripts) | **Conservar** como punto de partida; no rehacer proyecto desde cero |
| `src/contracts/messages.ts` | **Candidato a reutilización selectiva**: autor, mensaje y evidencia; no arrastrar contrato de caso completo |
| `src/fixtures/index.ts` | **Reutilizar conversaciones** Laura/Javier/Rosa y ciertas expectativas; no sus salidas replay como prueba de LLM real |
| `src/adapters/ai/openai.ts` de `main` | **Reutilizar el patrón** de una llamada estructurada al proveedor; evaluar acoplamiento antes de reutilizar la clase |
| `src/config/index.ts` | **Recuperar semántica/nombres** de siete campos; no importar `ConfigBundle`, hitos o políticas |
| `src/adapters/ai/validation.ts` | **Recuperar verificaciones sencillas**: campo válido, autor, referencia existente, valor plausible; no heredar rechazo global de la ficha |
| `src/adapters/ai/templates.ts` | **Recuperar textos de preguntas**; separar selección de R05/R10 y PolicyDecision |
| `src/application/cases/orchestrator.ts`, `src/domain/facts/reconcile.ts`, `src/domain/actions/plan-action.ts` | **No reutilizar como dependencias** del núcleo; mezcla de eventos, fact reconciliation y acciones antiguas |
| `src/adapters/ai/multipass/`, `WorkflowDefinition`, `AgentProfile`, evaluador M0–M5, R01–R10 | **Fuera del camino crítico**; no copiar por inercia ni borrar en el spike |
| UI actual y endpoints de caso | Pueden servir de **referencia posterior**, no condicionan el contrato de B/D/E |

**Cuidado con los resultados F02:** los números de PASS/FAIL automáticos de su evaluación no equivalen a porcentajes de exactitud semántica. No se ha demostrado que el extractor single-pass de `main` sea fiable en chat libre. P1 lo pondrá a prueba con inferencia real.

## 3. Salidas observables mínimas (sin comprometer formatos de código)

**B:** recibe conversación ficticia con roles distinguibles y propone valores para los **siete** campos comerciales del documento funcional, más referencia al mensaje fuente y atributos de precisión/sujeto/base cuando procedan. Puede incluir una cantidad pequeña de señales delicadas candidatas en la **misma** interpretación. Ausencia de un campo no es valor 0. Un candidato dudoso no destruye los restantes.

**D:** obtiene de esos candidatos y el texto cuatro clases de incidencia: **dato requerido faltante**, **ambigüedad/contradicción**, **contenido inaccesible/atribución dudosa**, **solicitud delicada**. Una alerta no es por sí misma decisión automática de contacto ni juicio legal. Errores del proveedor/desactualización se manejan de forma separada, sin inventar análisis nuevo.

**E:** recibe ficha e incidencias, aplica prioridad simple **revisión sensible → ambigüedad material → campo requerido faltante → sin pregunta**, y ofrece una sola aclaración breve y su motivo. No requiere un paso LLM adicional. El orden de campos exigidos/plantillas puede modificarse con una definición sencilla sin un motor de predicados.

No definir aún esquemas Zod definitivos, endpoints, clases, persistencia, workflows u orquestación de agentes. La implementación puede elegir la solución concreta más simple después de P0.

## 4. Orden de trabajo y puertas de decisión

### P0 — Delimitar contrato observable y conjunto mínimo de comprobación

**Propósito:** convertir los documentos actuales en un límite ejecutable de trabajo, no construir el sistema.

**Trabajo:** revisar únicamente piezas reutilizables seleccionadas; fijar la semántica observable de los siete campos, estados/ausencias, evidencia, cuatro familias de incidencias y prioridad E; preparar resultados esperados de Laura/Javier/Rosa y un chat libre ficticio **nuevo**, no pregrabado en fixtures. Registrar qué reaprovechar versus rehacer, sin diseñar arquitectura.

**Entregable:** una ficha breve de límites y ejemplos P0, no código de runtime, salvo que una tarea posterior autorice expresamente otra cosa. Ver [`tasks/P0_BRIEF.md`](tasks/P0_BRIEF.md).

**Puerta:** entradas/salidas de B/D/E y expectativas de los casos comprensibles sin necesidad de `CaseSnapshot`, `WorkflowDefinition`, Rxx, M0–M5 o simulación de envíos.

**Parada:** si un requisito de P0 exige adoptar esas capas antiguas, retirar la obligación y simplificar la descripción, no portar el motor heredado.

### P1 — B: extracción real sobre conversación desconocida (puerta crítica)

**Trabajo:** un solo intento de interpretación estructurada por análisis sobre la conversación completa con un modelo real. Extraer siete campos y evidencia; validar únicamente datos básicos (fuente de cliente realmente presente, campo permitido, formatos razonables) y mantener resultados parciales al descartar un candidato inválido.

**Comprobaciones:** chat nuevo ficticio con algunos datos, cantidades aproximadas y campos ausentes; Laura: 3.800 € conjuntos, 18.000 €, cuota 250 € con inclusión desconocida; Javier: ingresos en rango y audio no inventado; Rosa: ahorro 0.

**Puerta go/no-go:** hay varios valores presentes en chat nuevo, correctos en lo esencial y con referencias reconocibles; los no declarados siguen desconocidos. El uso de replay solo no cumple la puerta.

**Si falla:** separar error de clave/red/formato de interpretación semántica. Realizar **como máximo un ajuste focalizado** antes de volver a probar un chat nuevo. Si no produce información aprovechable, **no** construir D/E encima ni sumar pasos multipass; replantear el catálogo o viabilidad.

### P2 — D: incidencias derivadas, no otro agente

**Trabajo:** detectar faltantes desde campos y datos dudosos sin nueva llamada; representar audio no transcrito y señales delicadas candidatas producidas por B. Mantener los hechos útiles aunque otro campo o señal fallen. Falsos positivos/negativos son visibles, corregibles y registrables.

**Puerta:** Laura conserva datos económicos y duda de cuota; Javier conserva rango y registra audio no disponible; Rosa mantiene ahorro cero y requiere revisión por aprobación escrita/urgencia. No convertir detección en `STOP_CONTACT` ni borrar el resto de ficha.

### P3 — E: una pregunta, sin planificación comercial

**Trabajo:** seleccionar revisión humana cuando hay incidencia delicada, en caso contrario la principal ambigüedad, después un faltante, después nada. Textos editables inspirados en las plantillas existentes; ninguna llamada LLM para generar un borrador.

**Puerta:** Laura recibe pregunta sobre cuota; tras respuesta inequívoca desaparece y puede preguntarse por interés explícito SmartHousing; Rosa obtiene atención humana, no una aprobación. No inventar pregunta cuando nada prioritario falta.

### P4 — Validación conjunta y cierre del núcleo

**Pruebas mínimas:** 1) chat nuevo real, 2) Laura original, 3) Laura con aclaración posterior, 4) Javier y audio no transcrito, 5) Rosa y ahorro cero/solicitud escrita, 6) cifra sugerida solo por asesor no confirmada por cliente, 7) error del proveedor/salida imposible de parsear.

**Puerta:** B aporta datos útiles, D conserva parciales y marca dudas, E cambia razonablemente de prioridad al aclararse una cuestión, y un fallo real no aparece como éxito/replay. Registrar por separado pruebas unitarias deterministas y prueba real del proveedor, resultados observados y límites.

**Entrega P4:** núcleo comprobable, **todavía sin** CRM integrado, exportación, UI final, automatización de etapa, persistencia productiva ni auditoría exhaustiva. La V0 completa necesita posteriormente los módulos A/C/F/G y los AC funcionales asociados.

## 5. Control de alcance y prohibiciones

- Trabajo **estrictamente secuencial**; no desarrollar P2/P3 si P1 no superó la prueba de conversación libre.
- Cada tarea: un comportamiento observable, pocos casos, edición mínima de ficheros necesarios.
- No copiar: `WorkflowDefinition`, `FactSchema` extenso, `AgentProfile`, R01–R10, M0–M5, ActionPlanner, eventos de envío/confirmación, pipelines multipass o verificación por consenso.
- No crear una arquitectura general de reconciliación, sistema de plugins, framework de políticas o cientos de tests sin un fallo concreto que lo justifique y autorización nueva.
- No borrar código legado como parte de P0; la limpieza de compatibilidad es una decisión posterior e independiente.
- No desarrollar envío WhatsApp, CRM real, agenda, underwriting, scoring, scheduler semanal ni procesamiento de datos personales reales.
- Un fallo del proveedor nunca se oculta con replay, datos anteriores no se presentan como actuales y las decisiones del asesor no se convierten en «verificación bancaria».

## 6. Estado actual

- [x] Spike documental de aislamiento subido a `codex/lead-intake-v0-bootstrap` (GitHub, commit `f1592ee9`).
- [x] Paquete documental para importar en `docs/current/` preparado (este documento, funcional y brief).
- [ ] Paquete incorporado y confirmado en el repositorio local/remoto por el usuario.
- [ ] **P0 autorizado y ejecutado**.
- [ ] P1 autorizado después del resultado de P0.
- [ ] P2, P3 y P4 realizados tras superar sus puertas.

**Advertencia:** la inspección remota del bootstrap y la revisión F02 no ejecutaron build, pruebas nuevas ni inferencias reales; no presentarlas como verificaciones del núcleo B/D/E.

**Proveniencia humana opcional:** auditoría https://app.notion.com/p/419a4247646881eebadbcfba89f9628f; plan https://app.notion.com/p/419a424764688117b43fcabfc373f9d5. Ninguno requiere lectura por Codex.
