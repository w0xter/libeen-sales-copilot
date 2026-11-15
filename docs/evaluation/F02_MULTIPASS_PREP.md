# F-02 — comparación offline (MP-G6 PREP parcial)

El comparador ejecuta `OpenAIInterpreter` y `MultipassInterpreter` de producción mediante transportes guionizados en memoria. Los guiones están en `tests/evaluation/f02-scripts.ts`; las entradas en `f02-fixtures.ts`; la proyección de las expectativas F-01 en `f02-oracle.ts`; el emparejamiento y presupuesto en `f02-simulation.ts`; y la puntuación en `f02-metrics.ts`. Los guiones no leen el oráculo. Los resultados son simulados y no miden la precisión de ningún modelo.

```sh
pnpm eval:multipass --dry-run --case B01 --model gpt-4.1-mini
pnpm eval:multipass --simulate --case B01 --model gpt-4.1-mini
pnpm eval:multipass --simulate --case C01 --mode staged-interpreter
```

Opciones: `--case B01,B05,B06,B08,B10,C01`, `--strategy single|multipass|both`, `--mode interpreter|staged-interpreter|end-to-end`, `--repeat 1..10`, `--model ID`, `--max-requests 1..20`, `--max-seconds N`, `--max-cost N`, `--output PATH`. `--simulate` requiere un recorrido offline explícito: `end-to-end` se rechaza porque no se ejecutan CaseOrchestrator ni DraftGenerator. `end-to-end` solo se conserva como plan de dry-run, con su propio techo de borradores. C01 exige `staged-interpreter` para simular. Sin `--dry-run` o `--simulate` no se ejecuta nada. No se carga `.env` ni se transmite la clave al proceso simulado. `--output` crea un archivo nuevo sin sobrescribir.

| ID | Origen y variación | Análisis | Single habitual/máximo | Multipass habitual/máximo |
|---|---|---:|---:|---:|
| B01 | Laura: ingreso, ahorro, deuda y ubicación | 1 | 2/2 | 5/7 |
| B05 | Javier: ingreso individual y TRUST; audio inaccesible | 1 | 2/2 | 5/7 |
| B06 | Javier: paráfrasis de confianza diferente | 1 | 2/2 | 5/7 |
| B08 | Rosa: ahorro cero, URGENT y BINDING_CLAIM | 1 | 2/2 | 5/7 |
| B10 | Javier: mensaje añadido de opt-out | 1 | 2/2 | 5/7 |
| C01 | Laura: corrección en dos etapas con historial | 2 | 4/4 | 10/14 |

Las cifras son por repetición, para modo intérprete o por etapas, sin borradores. La pareja C01 tiene techo 18; su dry-run `end-to-end` incluye hasta cuatro borradores adicionales y alcanza 22, por lo que se rechaza bajo el límite de 20. El preflight bloquea antes de comenzar cualquier plan cuyo techo exceda el presupuesto. La ejecución usa un contador global compartido: reserva cada intento antes de invocar el transporte, incluso ante error o cancelación. El deadline y la cancelación propagan una señal al trabajo inyectado y no permiten nuevas reservas. Los transportes simulados son inmediatos; **esto no autoriza conectarlos a un proveedor real**. `--max-cost` solo se registra: no hay corte monetario efectivo ni estimación verificable. Tokens y coste son `null`.

En C01 se transfiere una copia de las afirmaciones y bloqueos de cada estrategia, se añade el mensaje de corrección y se vuelve a interpretar. El informe registra hashes y cantidad de afirmaciones históricas por etapa. El guion de corrección no asigna importe nuevo al mensaje; el informe comprueba esa propiedad para los resultados completados. En el guion actual single completa las dos etapas y multipass solicita revisión humana. No se infiere un hecho consolidado, una acción ni una aprobación de ese resultado.

El informe JSON contiene `evaluationMode: simulated`, `independentOracleReview: false`, commit, indicador de árbol sucio, hash de configuración, versión multipass y hash del código de prompt single, modelo declarado, IDs, hashes de entrada, etapas, estado, motivo, métricas, diferencias emparejadas, intentos y latencia. No contiene las transcripciones ni claves. Ejemplo abreviado de B01: `single: {calls: 2, status: "complete"}`, `multipass: {calls: 5, status: "complete"}`, `tokens: null`, `cost: null`. Los valores reales del informe son metadatos de una simulación, no evidencia de desempeño empírico.

Las métricas comprueban propiedades anotadas (valor, ámbito, unidad, periodo, precisión y base), presencia esperada, evidencias literales y localización cuando están disponibles, señales protegidas y falsos positivos especificados, y cobertura. Las afirmaciones sin correspondencia se cuentan como **no anotadas**, no necesariamente inventadas. Cada contador incluye numerador, denominador y no evaluables. Un error o una revisión humana no se cuenta como extracción correcta ni automáticamente como fallo de seguridad. Las mutaciones de respuestas comprueban valor, ámbito, atribución individual, cita, afirmación adicional, señal omitida, falso opt-out y atribución S2 errónea; algunas son rechazadas por el adaptador y otras detectadas por las métricas.

**Limitaciones pendientes para PREP PASS:** el comparador no puntúa directamente identidad contextual ni atribución S2 (una discrepancia S2 puede detectarse como revisión segura); el oráculo de C01 no está implementado como métrica de hechos; la comparación entre hechos del mismo campo y mensaje carece de un identificador de ocurrencia anotado; la validez literal de una cita no prueba que justifique semánticamente el hecho. No se ejecuta política comercial y las acciones son no evaluables. No todas las mutaciones se evalúan en ambas estrategias. El informe muestra deltas agregados por atributo cuando ambos denominadores son comparables; no identifica todavía qué ocurrencia concreta ha regresado. No hay corte monetario ni recogida de tokens. Estas carencias impiden declarar el comparador fiable para un piloto.

Las expectativas F-01 son provisionales y carecen de revisión humana independiente. Los seis escenarios proceden de los fixtures y la matriz semántica F-01, no del dataset F-01 de 352 registros; no se accede a su holdout. Antes de cualquier piloto real hacen falta revisión independiente y adjudicación del oráculo, completar las métricas pendientes, diseñar instrumentación y límites reales de coste/tokens, y autorización separada. No se declara MP-G6 PASS sin comparación real autorizada.
