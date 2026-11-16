# Kapibala: evaluación externa de 20 conversaciones para Libeen Lead Intake

**Estado:** preparación reproducible implementada; no se han descargado los 20 diálogos ni ejecutado inferencias reales desde esta sesión. No se presenta tasa de éxito.

Fuente: [Thomasgudan/kapibala-sales-dialogues](https://huggingface.co/datasets/Thomasgudan/kapibala-sales-dialogues), 630 conversaciones **sintéticas** y 11.688 mensajes, 300 en inglés. **Licencia CC BY 4.0**. El corpus ofrece L1 (bought, next_step, undecided, declined), pero las etiquetas L1 provienen de un modelo y **no son ground truth de extracción ni anotación experta**. Revisar también [detalles del etiquetado](https://huggingface.co/datasets/Thomasgudan/kapibala-sales-dialogues/blob/main/docs/annotation.md).

## Alcance del piloto

Seleccionar de forma reproducible **12 conversaciones en inglés de real estate y 8 de financial**, con balance aproximado entre outcomes L1. Se usan el hash SHA-256 de un seed constante y los IDs originales para impedir escoger ejemplos a mano. El script consume exactamente los archivos publicados `data/conversations.jsonl`, `data/meta.jsonl` y `data/labels_L1_outcome.jsonl` en la revisión `1e253fe`. Los datos y resultados quedan locales.

**Aviso de alcance:** el producto actual NO es genérico; `src/intake/extraction.ts` usa los siete campos y el filtro explícito de interés en SmartHousing. Por ello, esta prueba es principalmente de **generalización y detección de límites**, y no sería correcto medir calidad comercial cross-domain con un porcentaje global sin adaptar el esquema, el gold y las reglas.

## Preparación

Requisitos: Python 3.10+ (stdlib), Libeen en funcionamiento si se desean ejecutar inferencias.

```sh
# En la raíz del repositorio:
python3 scripts/benchmark/kapibala_benchmark.py prepare
```

Genera `benchmarks/kapibala-pilot/inputs/kapibala_20.jsonl` (transcripciones con turnos `Cliente:` y `Asesor:`), catálogo CSV, plantilla de revisión humana y manifiesto con hashes, fuente, IDs y seed.

Si no se pueden descargar los archivos automáticamente, descárgalos manualmente desde [la carpeta data del dataset](https://huggingface.co/datasets/Thomasgudan/kapibala-sales-dialogues/tree/main/data) a `.cache/kapibala-sales-dialogues/` y ejecuta:

```sh
python3 scripts/benchmark/kapibala_benchmark.py prepare --offline
```

## Evaluación de inferencia real

En otra terminal, arranca la app con `OPENAI_API_KEY` en `.env.local` (nunca en el repositorio). Las llamadas solo se realizan al servidor local tras `--allow-model-calls`; ese servidor sí transmite la conversación sintética al proveedor configurado y pueden existir costes.

```sh
pnpm dev

# Smoke: tres casos antes del lote completo
python3 scripts/benchmark/kapibala_benchmark.py run --allow-model-calls --limit 3 \
  --output benchmarks/kapibala-pilot/results/smoke.jsonl

# Lote completo, 20 casos, sin retries ni selección oportunista
python3 scripts/benchmark/kapibala_benchmark.py run --allow-model-calls --limit 20 \
  --output benchmarks/kapibala-pilot/results/full_run.jsonl
```

El runner escribe un JSONL con HTTP status, duración, volumen de candidatos, fuentes literales válidas, tipo de intervención y salida completa. **Una cita literal válida no implica una interpretación correcta.** Errores HTTP y fallos se registran, no se descartan. Evitar reejecutar casos hasta obtener un PASS favorable.

## Protocolo del benchmark

1. Crear **gold humano** para cada caso leyendo las afirmaciones del cliente y preservando mensajes, sujetos, rangos, unidades, condición aproximada y contradicciones. Guardar expectativas en `review/kapibala_20_review_template.jsonl`. No usar etiquetas L1 como gold.
2. Fijar y anotar commit de Libeen, fecha, modelo `OPENAI_MODEL`, versión de reglas y configuración antes de ejecutar. No ajustar prompts usando los casos reservados sin invalidar la medición.
3. Evaluar por separado: (a) funcionamiento HTTP y validez literal de citas, (b) exactitud semántica de facts, (c) incidencias relevantes, (d) pertinencia de la siguiente pregunta o revisión humana y (e) prohibiciones y seguridad. Reportar denominadores y n de cada dimensión, no únicamente una cifra conjunta.
4. Clasificar fallos: extracción semántica del modelo, parser, validación, reglas, limitación deliberada del dominio SmartHousing, error de proveedor o necesidad de revisión humana.
5. Para estudiar evolución conversacional, preparar **un segundo experimento** con prefijo y continuación, anotando estados esperados antes/después, sin atribuir a este piloto cobertura que aún no se ha probado.

En la V0, `interest` solo acepta interés explícito en SmartHousing: un cliente que compra otro producto puede quedar con `interest` ausente **correctamente respecto a la implementación**, pero señalar un límite de generalización. Tampoco deben interpretarse `bought`/ `next_step` de Kapibala como `qualified` de Libeen.

## Resguardo de datos y reproducibilidad

Mantén `.cache/kapibala-sales-dialogues/`, `benchmarks/kapibala-pilot/inputs/`, `results/`, `review/` y `source_manifest.json` fuera de commits, salvo publicación explícita de material sintético debidamente atribuido. El script no modifica el producto ni crea acciones externas. La revisión del modelo y los resultados reales permanecen pendientes hasta disponer de las fuentes y clave.

## Limitaciones del trabajo realizado

Se verificó la sintaxis y lógica de selección/formato de un script de desarrollo local con datos simulados, pero **no se descargó el dataset Kapibala, no se ejecutó el script versionado contra las 20 conversaciones y no hubo llamadas OpenAI desde esta sesión**. No atribuir los tests mock al rendimiento del producto.
