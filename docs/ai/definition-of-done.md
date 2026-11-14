# Definition of Done — Libeen V0 (Codex + Superpowers)

**Estado:** criterio operativo para la PoC; no acredita que exista ninguna funcionalidad implementada.  
**Ámbito:** tareas `LIB-001`–`LIB-013` del [DAG](../implementation/DAG.md).  
**Autoridad:** [AGENTS.md](../../AGENTS.md), [contrato de integración](../contracts/INTEGRATION_V0.md), [protocolo Codex](../implementation/CODEX_PROTOCOL.md) y el AI Task Brief asignado.  
**Propósito:** permitir ejecución **autónoma dentro de un brief autorizado** y verificar resultados sin aprobaciones intermedias del plan.

## Regla de autonomía de esta PoC

- **Asignar una tarea desbloqueada es autorizar su ejecución completa dentro del alcance y las rutas del brief.** Codex debe inspeccionar el contexto relevante, preparar su plan técnico interno y **comenzar a implementar sin esperar a que un humano apruebe el plan**.
- Puede dividir la tarea en pasos, crear y corregir tests, hacer self-review y repetir validaciones de forma autónoma. Utilizar Superpowers cuando ayude, sin volver a abrir la planificación funcional ni convertir sus pasos en gates de aprobación humana.
- Ante incertidumbre menor, elegir una solución conservadora compatible con contratos y documentar la suposición. Si una ambigüedad **material** impide satisfacer el contrato, detener **solo la parte afectada**, informar del bloqueo y continuar trabajo independiente cuando sea seguro.
- **Escalar únicamente** por cambios fuera del brief, modificación no autorizada de contratos/configuración/fixtures compartidos, secretos/permisos, operaciones irreversibles o efectos externos. No hacer `push`/`merge` ni modificar permisos del repositorio sin autorización expresa.
- Esta autonomía **no elimina** el control del asesor comercial dentro del producto: ningún mensaje real ni decisión sobre dinero se ejecuta automáticamente. Tampoco sustituye los gates de integración entre tareas.

## Checklist para que Codex declare una tarea lista para integrar

### 1. Objetivo y alcance

- [ ] El ID de tarea, dependencias y gate están identificados; las dependencias se comprobaron antes de empezar.
- [ ] El comportamiento del brief y sus criterios de aceptación están implementados, o las desviaciones quedan expresamente marcadas como pendientes.
- [ ] Solo se han modificado las **rutas autorizadas**; no hay refactors ni funcionalidades fuera de alcance.
- [ ] Las decisiones nuevas no contradicen las especificaciones del repositorio ni el lenguaje ubicuo: [Ubiquitous Language](ubiquitous-language.md).

### 2. Contratos y dominio

- [ ] Se respetan los contratos consumidos y producidos, las validaciones y la semántica de error del contrato V0.
- [ ] Ningún dato financiero desconocido se interpreta como `0`; las cifras aproximadas, conflictos, sujetos y evidencias siguen siendo trazables.
- [ ] Se distingue `ActionProposal` → `Draft` → aprobación → envío **simulado** → acuerdo del cliente; no se completa M5 por redactar o aprobar.
- [ ] No se infieren contenidos de audio sin transcripción, ni se descuentan dos veces deudas, ni se emiten aprobaciones financieras o garantías.
- [ ] Se respetan idempotencia, revisiones de expediente, propuestas obsoletas y precedencia de no-contacto/revisión cuando sean pertinentes a la tarea.
- [ ] Si hace falta cambiar un contrato compartido, se registra un **Contract Change Request**; no se edita el archivo de otro agente para hacer compilar el módulo.

### 3. Calidad y regresión

- [ ] Se añadieron o actualizaron pruebas **de comportamiento** para la parte desarrollada (o se explicó por qué no aplican a un cambio solo documental).
- [ ] Los casos relevantes de error, datos ausentes, contradicciones y fallos de proveedor están cubiertos, no solo el happy path.
- [ ] No se borraron tests ni se debilitaron aserciones para ocultar fallos.
- [ ] El diff es revisable; no hay código muerto, dependencias innecesarias, secretos, artefactos temporales ni cambios de formato ajenos.

### 4. Verificación reproducible

- [ ] Se ejecutaron los tests afectados y los comandos que **realmente existen** en `package.json`.
- [ ] Se ejecutaron los checks del gate correspondiente antes de proponer integración: lint, typecheck, tests de contrato/aceptación y build, según disponibilidad y aplicabilidad.
- [ ] Se anotó el resultado real de cada comando: `PASS`, `FAIL` o `NOT RUN` con motivo. No usar un runner vacío ni afirmar un pase no observado.
- [ ] Los fallos se corrigieron o se entregaron como bloqueos explícitos; no se degradaron fixtures esperados para conseguir un resultado positivo.
- [ ] Si se probó OpenAI, se utilizó la configuración local de servidor; `AI_MODE=replay` está etiquetado como simulado y nunca representa inferencia real.

### 5. Seguridad y trazabilidad

- [ ] Todo dato de prueba es sintético; no se han añadido claves ni información personal real al repositorio o a los logs.
- [ ] Los mensajes salientes y las decisiones económicas del producto siguen bajo revisión humana; no hay efectos reales de WhatsApp, CRM, calendario o pagos.
- [ ] Los cambios de comportamiento, configuración o arquitectura se documentaron **solo cuando corresponde**, sin duplicar manuales.
- [ ] El handoff aporta evidencia verificable y señala riesgos, limitaciones y contratos bloqueados.

## Handoff obligatorio (breve)

```text
Task: LIB-XXX
Branch / worktree:
Files changed:
Behavior and contracts delivered:
Acceptance criteria: met / partially met / blocked
Tests added or updated:
Commands actually run: PASS / FAIL / NOT RUN + reason
Relevant adverse scenarios checked:
Assumptions, known risks and contract-change requests:
Integration gate: ready / blocked + evidence
```

**Interpretación de estados:** `ready for integration` significa que **Codex ha entregado la evidencia y ha pasado sus verificaciones**, no que haya hecho merge, completado dependencias futuras o recibido una aprobación comercial. La integración/merge sigue el [protocolo](../implementation/CODEX_PROTOCOL.md).

## Cambios que sí requieren escalado

- Cambiar el alcance del brief, los criterios de aceptación o el DAG.
- Modificar sin ownership `src/contracts/`, `src/config/`, fixtures canónicos, package scripts o archivos de otra rama.
- Añadir efectos externos, publicar secretos, cambiar permisos o ejecutar operaciones destructivas.
- Decidir políticas reales de Libeen o introducir promesas vinculantes no autorizadas.

**No son motivos para solicitar aprobación humana:** escribir un plan técnico de tarea, crear tests dentro del scope, refactorizar mínimamente una función propia, corregir errores encontrados en las verificaciones o usar skills de Superpowers. Esta PoC evalúa precisamente la capacidad de Codex de ejecutar con autonomía a partir de contexto enriquecido.

**Fuera de alcance de esta PoC:** no exigimos plantilla de PR ni nuevos rituales de aprobación. Se conserva la evidencia de colaboración con IA en [AI Development Log](../AI_DEVELOPMENT_LOG.md) y en el handoff de cada tarea.
