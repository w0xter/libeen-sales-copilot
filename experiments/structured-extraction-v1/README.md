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
