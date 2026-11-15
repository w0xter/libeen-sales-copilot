# P4 — Resultado de integración B → D → E

## Integración y ejecución

`runIntake(messages, transport)` compone `extract`, `identifyIssues` y `nextQuestion` sin modificar sus contratos. Devuelve conjuntamente `extraction`, `issues` e `intervention`: las evidencias de candidatos aceptados, el estado y número de descartes de B, las incidencias y la intervención o el error. Un fallo de B atraviesa D y E; no se presenta como ficha vacía. B solo conserva el **número** de candidatos descartados, no sus contenidos ni motivos individuales; P4 no puede mostrarlos sin cambiar ese contrato.

Ejecutar las pruebas deterministas del recorrido:

```sh
pnpm exec vitest run tests/integration/intake/p4.test.ts
```

Para el recorrido con el proveedor real, con `OPENAI_API_KEY` en el entorno y conexión habilitada (opcionalmente `OPENAI_MODEL`; por defecto `gpt-4.1-mini`):

```sh
RUN_P4_REAL=1 pnpm exec vitest run tests/integration/intake/p4-real.test.ts --reporter=verbose
```

La prueba real imprime las tres salidas. No se usan datos reales de clientes.

## Resultados observados

Las siguientes pruebas usan respuestas **simuladas de B**, con mensajes originales donde se indica; D y E se ejecutan realmente y de forma determinista. Las respuestas simuladas no prueban la capacidad de extracción del modelo.

| Escenario | Resultado observado |
| --- | --- |
| Alcalá | Se conservan los siete campos simulados, con evidencia; D identifica la cuota incierta y E pregunta si los ingresos son netos o brutos. El mensaje de prueba es una formulación reducida del ejemplo de P0. |
| Laura original y aclaración ficticia | Con ingresos, ahorro y cuota simulados, E pregunta por la cuota. Al añadir «Sí, los 3.800 € ya son después del coche» y simular su interpretación como incluida, E pasa a preguntar por interés en SmartHousing. Esto demuestra composición y reselección, no que B interprete siempre la aclaración. |
| Javier original | Se conserva el rango simulado 2.000–3.000 y D señala el audio inaccesible. D no detecta la objeción original «y esto es fiable? no sera una estafa no»; E pregunta por la base de ingresos en vez de solicitar revisión humana. |
| Rosa original | Se conserva el ahorro simulado 0. D no detecta ni la necesidad de salir en dos semanas ni la petición original de aprobación escrita; E pregunta por la base de ingresos si se proporciona un ingreso de base desconocida, o por un faltante en la prueba con solo ahorro. No se produce aprobación. |
| Conversación inédita determinista | León, 6.000 euros y un año se conservan; un candidato inválido se cuenta como descartado, D marca salida incompleta y E pregunta por interés. |
| Atribución incorrecta | B descarta el candidato de 5.000 euros cuya evidencia pertenece al asesor; no se atribuye ingreso al cliente. |
| Error de proveedor | B y D devuelven `provider_error` y E devuelve `kind: error` con el mismo error. |
| Alerta sensible reconocida | Con «Necesito aprobación por escrito», D produce una alerta y E propone revisión humana. Esta frase es una simulación separada, no el texto original de Rosa. |

**Inferencia real:** se ejecutó con `gpt-4.1-mini` una conversación ficticia inédita sobre León, dos compradores, un año, 2.600 euros netos conjuntos y 6.000 euros ahorrados. B devolvió esos cinco campos con referencias y citas, cero descartes y sin interés ni deuda; D señaló interés ausente y E preguntó «¿Os interesa explorar SmartHousing?». La prueba pasó en la ejecución registrada. Una ejecución previa con conexión autorizada también pasó. El primer intento en el entorno de red restringida devolvió `provider_error` en B, D y E y falló la prueba real; no hubo resultado semántico en ese intento. Estos resultados no garantizan repetibilidad ni exactitud general.

## Fallos, correcciones y límites

- **D:** las expresiones originales de Javier y Rosa no coinciden con sus reglas literales; por ello se pierde una señal sensible y E no puede priorizar revisión humana. Es una limitación importante para cualquier uso que dependa de detectar esas señales. No se ha corregido: el recorrido y la ruta de revisión sí se pueden demostrar sin generalizar el detector.
- **B:** solo conserva un recuento de descartes; no se pueden inspeccionar candidatos rechazados ni sus causas. La coincidencia de cita y autor tampoco garantiza atribución semántica correcta. Persisten las observaciones de `P1_RESULT.md`.
- **D y E:** E depende de las incidencias de D y de descripciones literales para distinguir ciertas ambigüedades. Un audio inaccesible permanece visible en D, pero por sí solo no fuerza revisión en E. Los resultados de B pueden ser parciales o incorrectos.
- **Prueba real:** solo acredita la conversación y ejecución observadas, no los demás escenarios, que se han probado con respuestas simuladas.

No se han aplicado correcciones a B, D ni E. No hay UI, persistencia, CRM ni envíos nuevos.

## Comprobaciones y recomendación

- `pnpm test`: 148 pruebas aprobadas, 2 omitidas (las dos pruebas de proveedor real opt-in).
- `pnpm typecheck`: correcto.
- `pnpm lint`: correcto.
- Prueba real P4 habilitada: aprobada con conexión autorizada; el intento restringido anterior falló como se describe arriba.

**Recomendación:** cerrar P4 como integración técnica demostrada y pasar a diseñar la siguiente capa con las salidas intermedias y los errores visibles. No considerar demostrado el tratamiento fiable de señales sensibles: antes de depender de él en esa capa hay que resolver o aceptar explícitamente los fallos observados en Javier y Rosa. No se ha validado una capacidad de aprobación financiera ni de envío automático.
