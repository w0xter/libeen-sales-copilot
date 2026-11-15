# AI Task Brief — P0: contrato funcional mínimo y casos de comprobación

**Producto:** Libeen AI Lead Intake V0  
**Etapa:** P0 exclusivamente · **Estado:** brief preparado, **no ejecutado**.  
**Rama de trabajo:** `codex/lead-intake-v0-bootstrap` (o rama de tarea local derivada de ella, sin tocar `main`).  
**Dependencias:** este paquete ya está importado en `docs/current/`; leer [`../README.md`](../README.md), [`../01_FUNCTIONAL_SPEC_V0.md`](../01_FUNCTIONAL_SPEC_V0.md), [`../02_MINIMAL_BDE_IMPLEMENTATION_PLAN.md`](../02_MINIMAL_BDE_IMPLEMENTATION_PLAN.md) y `AGENTS.md`.

> **Activación:** la mera presencia de este archivo **no autoriza** ejecutar P0. Ejecutar únicamente cuando la persona responsable lo encargue explícitamente. **No pasar automáticamente a P1.**

## 1. Objetivo único

Concretar un **contrato observable, agnóstico de arquitectura**, del núcleo B/D/E y un conjunto de casos sintéticos mínimos. Esto permitirá ejecutar posteriormente un spike de extracción real **P1** sin heredar los contratos, políticas o tests obligatorios del antiguo Sales Copilot.

**No implementar B, D ni E en esta tarea.** No crear nueva capa de runtime, endpoints, schemas Zod definitivos, arquitectura ni framework de agentes. P0 es una tarea breve de delimitación y preparación de pruebas, no de programación de producto.

## 2. Trabajo autorizado

1. Revisar lo justo de la implementación existente para decidir, **por cada pieza**, si hay reutilización directa de bajo acoplamiento, copia/adaptación de concepto o descarte del camino crítico.
2. Concretar en lenguaje funcional los **siete campos** de la ficha: interés explícito SmartHousing, zona, horizonte, compradores, ingresos mensuales (cantidad/base/sujeto), ahorros, cuotas/deudas mencionadas (inclusión en ingresos si procede). Alias y stage son elementos operativos, no extracción B.
3. Para B, describir entrada, salida y tres reglas de precisión fundamentales: **desconocido no equivale a cero**, fuente de cliente atribuible, rango/aproximación/sujeto y base preservados.
4. Para D, describir las cuatro categorías mínimas de incidencia: **ausente, ambiguo/contradictorio, inaccesible/autor dudoso, solicitud delicada**. Fallos del proveedor/resultado desactualizado se anotan aparte, no como política comercial.
5. Para E, definir precedencia **revisión sensible > ambigüedad material > primer dato requerido faltante > nada** y un ejemplo de pregunta. Que no envíe nada.
6. Preparar **expectativas observables**, no salidas de LLM inventadas, para Laura, Javier, Rosa, un chat sintético nuevo y una atribución incorrecta a evitar.
7. Señalar **máximo tres decisiones/limitaciones** realmente pendientes que impidan P1. Si no existen, declarar que P1 puede proponerse tras autorización independiente.

## 3. Inspección de código: lista corta y solo lectura

Leer únicamente si resulta útil:

- `src/contracts/messages.ts`: roles/IDs/evidencia.
- `src/fixtures/index.ts`: casos ficticios Laura/Javier/Rosa.
- `src/adapters/ai/openai.ts`: forma de invocar salida estructurada.
- `src/config/index.ts`: nombres y semánticas de campos, **no** motor de reglas.
- `src/adapters/ai/validation.ts`: comprobaciones mínimas de fuente/tipo.
- `src/adapters/ai/templates.ts`: textos de preguntas.

No importar como autoridad `docs/legacy/` ni ampliar la inspección a F02 multipass por iniciativa propia. Si un aspecto del código antiguo contradice la especificación funcional actual, **priorizar la especificación**, registrar la divergencia y no modificar código aún.

## 4. Caso sintético nuevo para preparar una prueba P1

Se proporciona un ejemplo **nuevo creado para esta V0**, **no** perteneciente a los fixtures Laura/Javier/Rosa. En P0 solo preparar expectativas; una futura prueba P1 con LLM real debe distinguirse claramente de replay o respuestas hardcodeadas.

**Conversación ficticia:**

> **Asesor:** Contadme qué estáis buscando y en qué zona.  
> **Cliente:** Mi pareja y yo queremos comprar por Alcalá de Henares o cerca. Nos gustaría mudarnos dentro de unos cinco o seis meses.  
> **Asesor:** ¿Tenéis una idea de vuestros ingresos y ahorros?  
> **Cliente:** Entre los dos entran unos 3.100 € al mes, pero no te sabría decir si te interesa el bruto o el neto. Tenemos aproximadamente 9.000 € guardados. Y de la moto pago una cuota de 120 € al mes.  
> **Asesor:** ¿Os interesa conocer SmartHousing?  
> **Cliente:** Sí, nos interesa explorar SmartHousing, pero primero queremos entender cómo funciona.

**Expectativas P0 (no resultados de una ejecución):**

- Compradores 2; zona «Alcalá de Henares o cerca»; horizonte «unos cinco o seis meses», **sin fecha exacta fabricada**.
- Ingreso ~3.100 €/mes **conjunto**, base neto/bruto **no resuelta**; ahorro ~9.000 €; cuota de moto 120 €/mes con semántica de inclusión **desconocida**.
- Interés por explorar SmartHousing **explícito**.
- D puede indicar incertidumbre relevante sobre base de ingresos y cuota. No debe inferir que la cuota ya se descontó ni que no existen otras deudas.
- E debe escoger **una** aclaración material bajo una prioridad sencilla documentada, no iniciar una promesa o un cálculo crediticio.
- La presencia de este chat en documentación **no** permite que P1 lo resuelva mediante replay o matching de texto: la prueba de inferencia tendrá que usar una llamada real y preferiblemente incluir además una variación no pregrabada.

**Contraejemplo de atribución:**

> **Asesor:** Entonces ganáis 5.000 € netos entre los dos, ¿verdad?  
> **Cliente:** No puedo confirmar esa cifra todavía.

No extraer 5.000 € como ingresos autodeclarados del cliente.

## 5. Expectativas de los tres casos del ejercicio

| Caso | Datos que no deben perderse | Incertidumbre / incidencia | Consecuencia para E |
| --- | --- | --- | --- |
| **Laura** | Valencia, pareja, ~3.800 € netos/mes conjuntos, ~18.000 € ahorrados, cuota coche 250 €/mes | Cuota descontada o no **desconocida**; interés explícito por SmartHousing no confirmado en original | Priorizar aclaración de cuota. Tras resolverla, poder aclarar interés si continúa ausente |
| **Javier** | Madrid o alrededores, compra solo, ingresos variables 2.000–3.000 €/mes | Base de ingreso no resuelta; audio sin transcripción; objeción de confianza | No inferir audio; presentar dudas y revisión humana cuando aplique |
| **Rosa** | Compra en pareja, cantidad ~1.400 € con base dudosa, **ahorros = 0 informado**, urgencia | Solicita aprobación escrita; faltan otros datos esenciales | Revisión humana, nunca aprobación automática |

Las pruebas P1–P4 determinarán si estas expectativas se cumplen; **P0 no supone que el sistema actual ya las cumple**.

## 6. Resultado a producir en P0

Crear **solo un documento de trabajo**, propuesto: `docs/current/P0_BOUNDARIES_AND_EXAMPLES.md`, con cinco secciones cortas:

1. **Contrato observable B/D/E** (descripción de entrada/salida, sin esquema TypeScript).
2. **Siete campos y cuatro incidencias**, con reglas de ausencia/ambigüedad/evidencia.
3. **Ejemplos y expectativas** Laura/Javier/Rosa, chat nuevo y contraejemplo de asesor.
4. **Reutilizar / adaptar / excluir** con referencia a los pocos archivos inspeccionados.
5. **Puerta para empezar P1** y pendientes reales (si existen; máximo tres).

Se autoriza actualizar el índice `docs/current/README.md` solo para enlazar ese documento cuando esté creado. Conservar intactos los documentos base del paquete. No generar una colección de ADR, contratos, diagramas, clases, matrices de pruebas o cronogramas.

## 7. Restricciones de edición y ejecución

**Permitido escribir:** `docs/current/P0_BOUNDARIES_AND_EXAMPLES.md` y el enlace correspondiente en `docs/current/README.md`.  
**Solo lectura:** `AGENTS.md`, `docs/current/01_*`, `docs/current/02_*` y las piezas de `src/` enumeradas.  
**Prohibido en P0:** cambios a `src/`, `tests/`, fixtures, `config/`, API, UI, `package.json`, `pnpm-lock.yaml`, `.env*`, `docs/legacy/` o `AGENTS.md`; llamadas reales a OpenAI; crear nuevas dependencias; borrar, renombrar o refactorizar módulos.

No crear tareas externas, hacer push ni merge sin permiso. No completar P1–P4 de manera anticipada. No interpretar documentación antigua como política activa.

## 8. Aceptación y handoff

P0 queda preparado cuando:

- [ ] El documento resultante identifica **siete** campos y las cuatro clases de incidencia sin contradicciones.
- [ ] B/D/E se describen sin depender de WorkflowDefinition, ConfigBundle, AgentProfile, M0–M5, R01–R10 o CaseSnapshot.
- [ ] Se distingue autodeclaración, evidencia textual, cero explícito y desconocido.
- [ ] Se explicitan expectativas de Laura/Javier/Rosa, chat libre ficticio y contraejemplo de atribución.
- [ ] Se clasifica la reutilización selectiva de los archivos inspeccionados, sin refactor.
- [ ] El diff incluye **únicamente** la documentación permitida; no se ha ejecutado una prueba LLM o implementado módulo alguno.
- [ ] Queda explícita la **puerta P1: prueba con modelo real y chat libre**, pendiente de autorización independiente.

**Respuesta final de Codex:** rama/commit base; documentación creada; hallazgos de reutilización; qué queda pendiente; comandos de verificación documental y resultados reales. No afirmar pruebas de aplicación no ejecutadas.

**Fin de la tarea: detenerse tras P0.**
