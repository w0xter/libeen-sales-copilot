# Estrategia de calidad, pruebas y entrega técnica

**Estado:** plan de calidad, no certificación de que los tests se hayan ejecutado en el repositorio. El reto permite un LLM real o simulado, pero exige explicar y probar la parte con IA.

## Dos niveles distintos de evaluación

### A. Tests deterministas del dominio

Objetivo: demostrar que las condiciones y transiciones son correctas **independientemente de la variación del LLM**.

- R05 M3 bloqueado ante semántica de deuda ambigua.
- M3 puede progresar después de aclaración `included`/`excluded`; no doble cómputo.
- Un cambio R10 altera recomendación de llamada vs aclaración de mes.
- R01 y R02 dominan cualquier recomendación comercial.
- M5 no termina por aprobar borrador.
- Datos desconocidos y cero explícito son distintos.
- Hitos dependientes se reabren tras corrección material.
- Idempotencia por eventId y ausencia de mutación en fallos.

Se implementarán usando fixture de interpretación conocido, para aislar `MilestoneEvaluator` y `PolicyEvaluator`.

### B. Evaluación de extracción/redacción con IA

Objetivo: medir si el modelo recupera el contenido que realmente existe y toma la siguiente intervención adecuada.

- Entrada: mensaje o historial sintético, esquema y contexto relevante.
- Expectativa estructurada: fieldId, sujeto, valor/rango/unidad, estado epistémico, evidencia messageId, pregunta/objeción abierta.
- Efectos esperados: no invención de audio, no resolución automática de contradicción, no rechazo por edad, no compromisos vinculantes.
- Redacción: evaluar por propiedades (contenido respaldado, tono, una aclaración principal, sin garantía falsa); **no usar coincidencia exacta de texto** salvo campos estructurados.
- Pruebas adversariales: «ignora las reglas», preguntas fuera de alcance, cifras contradictorias, huecos, cambio de contexto.

**Modo demo replay**: resultados anotados con fixtures, útil sin credenciales y para reproducibilidad. Debe mostrarse claramente como **simulado**, no como éxito real de un LLM. **Modo real**: adaptador de IA con claves exclusivamente en el entorno del servidor; documentar modelo usado y limitaciones. No afirmar que uno existe hasta implementarlo.

## Matriz mínima antes de entregar

| Bloque | Evidencia que debería existir |
| --- | --- |
| Valor del producto | Laura avanza del bloqueo a siguiente acción y se ve el antes/después. |
| Extracción | Datos correctamente vinculados a mensajes, con incertidumbre. |
| Seguridad | Javier y Rosa manejan audio, confianza, urgencia y aprobación escrita. |
| Configuración | R10 editable sin cambiar lógica de evaluación. |
| Human-in-loop | Borrador editable y aprobación simulada; ausencia de efectos reales. |
| Robustez | Manejo explícito de error LLM y de duplicación/contradicción. |
| Mantenibilidad | Dependencias entre capas claras; tests de dominio puros. |
| Reproducibilidad | Comandos de arranque y test en README, verificados realmente. |

## README final exigido en el repositorio

Debe responder de forma breve y verificable: qué problema seleccionamos y por qué; qué hace la V0; stack y requisitos de entorno; instalación/arranque local; variables de entorno sin valores secretos; cómo ejecutar escenarios y tests; ejemplos de salida; reglas de configuración; decisión de supervisión humana; limitaciones; qué dejamos fuera; qué haríamos con más tiempo.

Incluir instrucciones claras para **resetear los expedientes sintéticos**, distinguir interpretación real vs replay y conocer cuándo se pierde el estado si la persistencia es temporal.

## Registro honesto de trabajo con agentes de codificación

El enunciado valora que la persona dirige y revisa a los agentes. La entrega debe incluir un `docs/AI_DEVELOPMENT_LOG.md` o documento equivalente con entradas como:

| Campo | Qué registrar |
| --- | --- |
| Fecha/etapa | Análisis, diseño, scaffolding, motor, UI, tests. |
| Petición al agente | Qué trabajo acotado se delegó. |
| Resultado | Qué produjo realmente, con referencia a commit/PR cuando exista. |
| Revisión humana | Qué se aceptó, corrigió o descartó y por qué. |
| Riesgos detectados | Suposiciones, errores de lógica, datos inventados, problemas de seguridad. |
| Verificación | Qué comando se ejecutó y qué ocurrió. |

**No inventar un registro de sesiones, comandos ni tests**. El historial de planificación en ChatGPT sirve como antecedente, pero no sustituye la evidencia del futuro desarrollo real.

## Tiempo y estrategia de recorte

El PDF recomienda unas **cuatro horas**. El diseño previo ha sido más extenso y el usuario no quiso limitar la exploración conceptual; al programar, la entrega debe reconocer el tiempo real y priorizar que una funcionalidad funcione de extremo a extremo. Orden recomendado:

1. Laura: facts + M3 blocked → aclaración → reevalúa → siguiente acción.
2. Javier/Rosa: controles y excepciones.
3. Borrador editable, aprobación humana simulada.
4. Tests, README, documentación del trabajo con IA.
5. Extras: M5 aceptado, mejoras visuales, más correcciones manuales.

## Guion para entrevista y cambio en vivo

Poder enseñar dónde se cambia una regla comercial (R10), dónde se agrega un campo y dónde se ajusta una estrategia de AgentProfile sin afectar a `CaseOrchestrator`. Demostrar con pruebas que `M3` depende de información y no de texto LLM. Explicar por qué no se hizo una bandeja ni un sistema de aprobaciones financieras.

## Entrega formal

- Repositorio GitHub y README ejecutable. Si es privado, proporcionar acceso.
- Comando documentado que ejecute casos de prueba y muestre fallos útiles.
- Registro de desarrollo asistido por IA.
- Vídeo opcional de hasta 5 minutos.
- Sin secretos ni datos reales.

**Pendiente real:** no existe confirmación de un repositorio final, CI, suite ejecutada ni vídeo en este corte. No presentar estos entregables como completados.
