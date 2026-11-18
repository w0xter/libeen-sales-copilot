# EXP-EXTRACT-01 — Gold v1 validado por el usuario

**Rama:** `experiment/structured-extraction-v1`. La V0 en `main` no se modifica. Fuente: [corpus Notion aprobado](https://app.notion.com/p/41ba4247646881db88eff6c0ff6e93ba) y [especificación del benchmark](https://app.notion.com/p/41ba424764688164ab42c161f163921e).

## Estado G0 (18-11-2026)

- **48/48 casos revisados por un agente contra el texto y las decisiones semánticas aprobadas**, 51 afirmaciones y sus citas; seis casos con cambios registrados en `audit/gold-v1-audit.jsonl`.
- `datasets/gold.v0.1.jsonl` se mantiene intacto como histórico. **El propietario del dataset revisó y aprobó las 48 entradas de `datasets/gold.v1.jsonl` el 18-11-2026**, incluidas 51 afirmaciones y sus ausencias. Estado `user_approved`; la revisión del agente y la aprobación humana están registradas por separado en cada anotación y auditoría. La validación humana **no equivale a certificación para producción**.
- Distribución manual estratificada: 12 `development`, 24 `evaluation` y 12 `reserved_nonblind`, siempre 2/4/2 por familia. Los conjuntos `development` y `evaluation` tienen al menos un ejemplo de cada uno de los siete campos; los casos `reserved_nonblind` son casos de contraste adicionales, **no** un holdout independiente. Todos los casos ya eran visibles: `reserved_nonblind` **no es holdout ciego**. Un holdout independiente requiere casos *nuevos*, no divulgados al desarrollador del extractor B.
- La versión v1 queda **aprobada y congelada como referencia experimental** desde el commit de aprobación. Modificar el gold requerirá una nueva versión y registro de cambios; el experimento A/B/C debe fijar un SHA concreto al ejecutarse. No se han ejecutado modelos, ni fijado métricas, ni entrenado el extractor.

## Archivos

- `datasets/gold.v0.1.jsonl`: dataset original propuesto.
- `datasets/gold.v1.jsonl`: **gold v1 validado por el usuario** con `role`, fuentes, valores específicos, abstenciones esperadas y controles contextuales.
- `datasets/gold.v1.schema.json`: JSON Schema de estructura, sin prometer exactitud semántica.
- `datasets/split-manifest.v1.json`: particiones y cobertura; reservados no ciegos.
- `audit/gold-v1-audit.jsonl`: 48 registros de revisión, seis con correcciones y notas de decisión.
- `validate-gold-v1.mjs`: validación sin dependencias de atribución, evidencia, casos, partición, riesgos semánticos conocidos.

Validación local:

```bash
node experiments/structured-extraction-v1/validate-gold-v1.mjs
```

## Correcciones sustantivas v0.1 → v1

1. **F1-02 y F2-11**: ampliar citas del campo ubicación, evitando fragmentos demasiado incompletos para verificar por sí solos la relación semántica.
2. **F4-28**: `quincena` no es sinónimo estricto de `fortnight` (14 días); se conserva la unidad declarada.
3. **F4-30 y F4-31**: ampliar evidencia de deuda hasta incluir la declaración sobre si la cuota está descontada de los ingresos.
4. **F6-46**: eliminar escapes de corchetes de Markdown de la representación fuente; la frase original se conserva como «[Imagen adjunta no accesible] Ahí aparecen mis ingresos.»

**Adjudicación validada en gold.v1:** el oráculo narrativo de F4-31 sugería una cuota mensual de 185 €, pero la frase solo identifica su importe y la relación con ingresos. v1 conserva `period:null`, de acuerdo con la regla aprobada de no inventar unidades.

**No añadir ni transformar:** ingresos de terceros en ingreso del comprador, comisiones parciales en renta total, ahorro inmovilizado en ahorro disponible, negaciones de deuda en importes ficticios, preferencias de contacto en plazo de compra, ciudades de residencia en destino, meses relativos en fechas absolutas.

## Puertas siguientes

1. **Gold v1 validado por el usuario el 18-11-2026**: sin revisión adicional obligatoria para arrancar la comparación sintética. Si se detecta un error futuro (incluido F4-31), publicar una versión posterior con changelog sin alterar retrospectivamente v1.
2. Registrar el SHA del commit de aprobación de v1, y congelar prompt/modelos/validador antes de la primera ejecución A/B/C.
3. Usar `development` para ajustar B y `evaluation` para compararlo con A/C. **No llamar holdout** al bloque `reserved_nonblind`; para una prueba ciega, obtener nuevos casos fuera del entorno de optimización.

**Nota de alcance:** aunque este gold es reproducible, los 48 casos sintéticos no representan una distribución real de clientes y el baseline V0 tiene un criterio más restrictivo para `interest`.

## G1 — Ejecución aislada

El código experimental vive en `adapters/`, `evaluators/`, `runner/` y `cli.mjs`. A invoca `extract()` de V0 mediante un transporte inyectado y conserva respuesta estructurada original, candidatos originales aceptados y diagnósticos de descarte. B y C comparten prompt, esquema Zod, validaciones y normalizador; solo cambia el modelo configurado. Ninguno altera la V0.

Con Node 22.15 o posterior, desde la raíz del repositorio, sin credenciales ni red:

```bash
node --experimental-strip-types experiments/structured-extraction-v1/cli.mjs --mode=offline --split=development
pnpm exec vitest run experiments/structured-extraction-v1
```

Sin `--mock`, el transporte offline devuelve listas vacías para probar infraestructura; el informe se marca **SIMULATED** y no constituye un resultado experimental. Se puede proporcionar `--mock=/ruta/respuestas.json`, con el formato `{ "A": { "F1-01": { "candidates": [], "semanticIssues": [] } }, "B": { "F1-01": { "assertions": [] } }, "C": {} }`. Las entradas omitidas usan listas vacías. `--arms=A,B,C`, `--repeat=1`, `--output=/ruta` y `--split=development|evaluation|reserved_nonblind` son opcionales. A y B usan el mismo `--model`; C usa `--model-c`. Cada invocación crea un directorio nuevo y no sobrescribe corridas anteriores. Si algún intento devuelve error, los resultados se conservan y el comando termina con código 1 e indica cuántos fallaron. El destino predeterminado `runs/` se ignora en Git.

El modo `--mode=real` utiliza OpenAI y requiere `OPENAI_API_KEY`; si se incluye C, exige `--model-c`. **No ejecutarlo sin autorización y sin congelar configuración y presupuesto.** A usa exactamente el transporte V0, que no expone uso ni texto JSON original; se conserva el objeto recibido. B/C usan JSON object y conservan el texto y el uso cuando el proveedor los ofrece. El transporte antepone al input la etiqueta `Mensajes de conversación en JSON:`; los mensajes originales no cambian. La etiqueta, necesaria para JSON mode, se registra mediante `inputPrefixSha256` en el manifiesto. La diferencia de formato y los parámetros por defecto están registrados, no se asume igualdad completa. No hay reintentos. El coste se deja como desconocido salvo que el transporte lo proporcione; no se estiman precios.

`run-manifest.json` registra SHA de gold, hash de entradas, versión de Node y dependencias, código y prompt/esquema, configuración, orden y modelos. Al iniciar se comprueba que gold, esquema, partición, auditoría y validador coinciden byte por byte con el commit congelado y pasa el validador existente. `results.jsonl` conserva cada intento y su latencia, salida, candidatos, descartes, errores y evaluación; `report.json` agrupa métricas, cobertura, errores, falsos positivos, evidencia, tokens y latencia. Los errores de proveedor y respuestas inválidas se excluyen del denominador de calidad y se enumeran, de modo que también hay que examinar cobertura. Los datos de prueba no representan clientes.

### Interpretación y límites

El evaluador empareja cada candidato como máximo una vez con el gold y exige campo, derivación y todos los atributos de valor iguales, además de mismo mensaje y una cita que contenga íntegramente la cita adjudicada. Se normalizan únicamente mayúsculas/minúsculas, Unicode NFC y espacios en valores de texto; se ignora `relationEvidence` como atributo porque se comprueba mediante la cita completa. La cita es sensible a caracteres y no se equiparan desconocido, ausente y cero, ni rangos o periodos distintos. Esta regla conservadora puede rechazar citas alternativas válidas; requiere revisión humana, especialmente en casos críticos. El informe incluye TP/FP/FN, precisión, recall y F1 por campo y global, macro-F1 y falsos positivos por 100 casos negativos; denominadores vacíos se indican como `null`.

**A y límites de interpretación.** A devuelve valores de texto libre y no codifica directamente todos los atributos del gold. La normalización conserva el texto original y una lista `normalization.unresolved` para los atributos que no puede establecer. Interpreta importes españoles inequívocos, decimales y rangos explícitos, divisa, periodos declarados, sujeto, negaciones y polaridad cuando existe señal suficiente; no convierte una negación de deuda en cero, no infiere periodicidad ni base neta y no atribuye ingresos conjuntos a una persona. Los atributos no representables, como `kind`, `subjectRef` o disponibilidad restringida cuando A no la expresa, quedan indeterminados. Una normalización no garantiza que la cita respalde semánticamente la afirmación.

El resultado por caso incluye coincidencias estrictas y coincidencias **posibles**: estas últimas usan emparejamiento uno a uno, exigen el mismo campo y la evidencia adjudicada y permiten atributos indeterminados, pero rechazan contradicciones en los atributos conocidos. `comparisonAB` compara únicamente casos y repeticiones donde ambos brazos terminaron, enumera pares incompletos y presenta A estricto y A optimista frente a B estricto, además del intervalo correspondiente a `B − A`. Publica `interest` y los otros seis campos por separado. El intervalo es una **cota operativa bajo estas reglas y esta evidencia**, no un intervalo estadístico ni una garantía de corrección semántica: citas alternativas, normalizaciones no reconocidas y significados erróneos con cita literal exigen revisión humana. Si el intervalo incluye cero o depende de casos indeterminados no adjudicados, la diferencia es inconcluyente. Los fallos de proveedor y descartes se revisan junto con la cobertura.

Así se puede interpretar una comparación **acotada y emparejada**, siempre que A y B usen el mismo modelo y se registren las diferencias de formato y parámetros. No se puede afirmar una diferencia exacta de F1 ni atribuirla solo a la arquitectura cuando hay atributos sin resolver. A además exige SmartHousing en su filtro de `interest` mientras el gold no; esa diferencia de definición se informa por separado. La muestra es sintética y `reserved_nonblind` no es ciego.

### Puertas G2/G3

G2: revisar las normalizaciones indeterminadas y el contrato y prompt B solo con `development`, fijar prompt, esquema, evaluador, parámetros, modelo C y presupuesto antes de evaluación. G3: ejecutar la comparación autorizada y posteriormente analizarla; no se ha realizado ninguna llamada real ni benchmark en G1. `reserved_nonblind` está expuesto y no es holdout ciego; un holdout ciego requiere casos nuevos.

### Verificación local

El validador de gold pasó (48 casos y 51 afirmaciones); `pnpm test` pasó con 265 pruebas y 4 omitidas; `pnpm lint` y `pnpm typecheck` pasaron. La integración offline comprueba dos corridas independientes y una comparación A/B simulada sobre desarrollo. No se probaron llamadas al proveedor ni se calculó un resultado experimental real.

## G2 — Evaluador semántico y refinamiento de B/C

La métrica histórica `score` y `comparisonAB` conservan exactamente su significado. La nueva vista `semanticScore` por intento y `semanticV1` agregada en el informe son independientes y versionadas. La comparación semántica usa emparejamiento máximo uno a uno; normaliza las variantes conocidas de sujeto, moneda, periodo y obligación, y admite nulo/ausencia solo en atributos opcionales de significado desconocido. Un importe cero no equivale a desconocido. Conserva diferencias de sujeto, alcance, negación, componente/total, base y su derivación, precisión, temporalidad y disponibilidad. Una propiedad adicional afirmada no se ignora; `amountText` exige presencia en la cita y coherencia numérica, y `relationEvidence` exige respaldo en la cita. Las discrepancias se agrupan por categoría; `contract` señala atributos que A no puede resolver. Los descartes de postprocesamiento siguen informándose por separado en `classes` y `discards`.

La evidencia debe corresponder al mismo mensaje y contener todos los términos sustantivos de la cita gold en el mismo orden, admitiendo diferencias de puntuación y algunos artículos/preposiciones. Esto reconoce algunas citas alternativas, pero no es un comprobador general de implicación: paráfrasis, correferencias no definidas, negaciones fuera de la cita, diferencias de certeza y hechos insuficientemente respaldados requieren adjudicación humana. Los resultados de `semantic-v1` son conservadores y no sustituyen esa revisión. La cota optimista histórica de A no es una métrica semántica verificada.

B y C continúan compartiendo una sola llamada, instrucciones, esquema y validador. El prompt distingue parentesco/convivencia de compradores, ingreso total de componentes, y residencia de destino. El validador descarta `subjectRef` igual a un ID de mensaje y componentes de ingreso marcados como tales. No puede identificar de forma determinista todos los sujetos inventados o componentes etiquetados como `unknown`; el rendimiento de estas instrucciones aún no se ha probado con modelos reales.

### Reevaluación offline de la corrida existente

Antes de modificar B se evaluaron las respuestas persistidas `runs/run-AVaDCG/results.jsonl` de 12 pares de desarrollo, sin llamadas al modelo. El SHA-256 del archivo es `a910a2d80b649b062ab382f95ec8854253a1d5149faaf963e61d4a738aa3aca7`; el SHA-256 del evaluador final es `0e545b44c959f20f6eb70da67ab59816b17d2316bf519d2dfd1d3560661ecc12`. Una repetición tras terminar las reglas obtuvo el mismo resultado:

| Vista | A TP/FP/FN | A F1 | B TP/FP/FN | B F1 |
| --- | --- | --- | --- | --- |
| Histórica estricta | 1/15/13 | 0,0667 | 6/11/8 | 0,3871 |
| `semantic-v1` conservadora | 1/15/13 | 0,0667 | 9/8/5 | 0,5806 |

Los tres emparejamientos nuevos de B son los dos sujetos de F2-12 y la etiqueta de obligación de F4-30. En F3-20 y F6-45 se conserva la discrepancia del sujeto: el modelo usó el ID del mensaje, no un sujeto. En F2-09 `subjectRef=buyers` no está respaldado; F5-37 conserva una diferencia de certeza que requiere adjudicación. Estos números no demuestran superioridad ni son una evaluación del prompt nuevo. La corrida original tiene `dirty=true` y HEAD `54e5c9c`; de los archivos con hash en su manifiesto, `runner/main.ts` y `cli.mjs` diferían de HEAD y `runner/minimal-request.ts` no existía allí. No es posible reconstruir el estado completo: no se registraron todos los archivos sucios. Los manifiestos nuevos registran además `dirtyPaths`; `runs/` está ignorado por Git.

Para reproducir la reevaluación si el archivo local sigue disponible:

```bash
node --experimental-strip-types experiments/structured-extraction-v1/rescore-development.mjs experiments/structured-extraction-v1/runs/run-AVaDCG/results.jsonl > /tmp/g2-semantic.json
```

El comando rechaza filas ajenas a desarrollo y registra hashes de respuestas y evaluador. No reconstruye respuestas perdidas. Una nueva ejecución real requiere autorización expresa, credenciales y árbol limpio:

```bash
node --experimental-strip-types experiments/structured-extraction-v1/cli.mjs --mode=real --split=development --arms=A,B --repeat=1 --model=gpt-4.1-mini
```

G3, elección de C y comparación congelada siguen pendientes de autorización.

## G2.1 — Sujetos y calibración `semantic-v2`

`semantic-v1`, la métrica estricta y sus salidas permanecen disponibles sin cambiar sus reglas. `semantic-v2` recibe también los mensajes originales, exige una cita literal del cliente y conserva el emparejamiento uno a uno. Para un hecho individual admite `customer`, `speaker`, `yo` o sujeto omitido únicamente con evidencia de primera persona y sin otro referente personal ambiguo; si ambos sujetos están explícitos, una cita en primera persona puede desambiguar aun con otros participantes. Una correferencia `ella`/`sister` o `hermana`/`sister` requiere una hermana inequívoca en el mensaje y evidencia pertinente. La regla no se aplica al alcance colectivo. La detección conservadora de referentes y negaciones no es un analizador lingüístico completo: citas ambiguas, nombres no reconocidos y contradicciones contextuales siguen requiriendo revisión humana. Una cita literal aislada no demuestra por sí sola una afirmación. `unknown` no se convierte en un dato afirmado.

El texto de horizonte «desde febrero» y «febrero» sigue sin equipararse automáticamente: falta adjudicar si ambos expresan inicio de disponibilidad, fecha límite o plazo de compra. No se infieren años. El evaluador v2 conserva los atributos y categorías de v1; el runner publica `semanticScoreV2`, `semanticV2` y `semanticV2ComparisonAB` por separado de los campos históricos.

B/C comparten el mismo prompt, esquema, validador y llamada. Se refuerza que el número de familiares, convivientes o contribuyentes no es número de compradores, y que el referente colectivo no se llame compradores sin respaldo. Como la validación local no puede verificar semánticamente ese referente de forma general, elimina las etiquetas genéricas `buyers`, `compradores` y `titulares` de `subjectRef`, conserva el resto de la afirmación y registra `unverifiable_buyer_subject_removed` junto con el candidato original. Esta medida deliberadamente conservadora también elimina esa etiqueta cuando pudiera ser correcta; la salida raw y el diagnóstico permiten identificarlo. El validador no puede garantizar que el LLM se abstenga de emitir `buyers` sin evidencia: eso exige comprobar respuestas y adjudicación.

La matriz y el análisis de ambas ejecuciones persistidas están en [reports/g2.1-offline.md](reports/g2.1-offline.md). Para reproducir cada comparación v1/v2 sin acceso a modelos, con el archivo local correspondiente:

```bash
node --experimental-strip-types experiments/structured-extraction-v1/compare-semantic-development.mjs experiments/structured-extraction-v1/runs/run-AVaDCG/results.jsonl > /tmp/g21-first.json
node --experimental-strip-types experiments/structured-extraction-v1/compare-semantic-development.mjs experiments/structured-extraction-v1/runs/run-iMu9qR/results.jsonl > /tmp/g21-second.json
```

El comando rechaza casos fuera de desarrollo y registra hashes del archivo y ambos evaluadores; no ejecuta el nuevo validador sobre respuestas históricas. La matriz incluye los candidatos aceptados históricos y no demuestra el comportamiento del nuevo prompt. La ejecución real posterior se puede repetir con el comando A/B de la sección G2, una vez configurada `OPENAI_API_KEY`. G3 sigue fuera de alcance.

Tras la primera calibración real de G2.1, B todavía infirió compradores a partir de parentesco. El validador requiere ahora una señal léxica de compra, firma o titularidad en la cita de `buyers`, y descarta citas con negación o modalidad condicional evidente. Esto no comprueba semánticamente que el número corresponda a los compradores y puede rechazar expresiones válidas sin esos términos. Además elimina `customer`, `speaker` o `yo` cuando se usan como sujeto de un importe colectivo, conservando el hecho y registrando `individual_subject_removed_from_collective`. Las modificaciones y descartes se informan con el candidato original.
