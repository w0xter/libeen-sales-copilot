# Benchmark sintético B/D/E para Libeen AI Lead Intake V0

Destinado a la rama `codex/lead-intake-v0-bootstrap` de `w0xter/libeen-sales-copilot`. Es un **paquete para incorporar al checkout de la rama**, no modifica automáticamente GitHub.

## Arranque (una orden para lanzar el benchmark)

Desde la raíz del repositorio, con Node.js 22, pnpm 12.16.1 y Python 3.10+:

```bash
git switch codex/lead-intake-v0-bootstrap
pnpm install --frozen-lockfile
cp .env.example .env.local   # si todavía no existe
# editar .env.local: OPENAI_API_KEY=<tu clave>; opcional OPENAI_MODEL
bash scripts/run-intake-eval.sh --limit 3
```

Después, para ejecutar las 32 conversaciones, incluidas las 8 continuaciones:

```bash
bash scripts/run-intake-eval.sh
```

El lanzador arranca Next.js automáticamente si `localhost:3000` no responde y lo cierra al terminar. Si ya está corriendo, reutiliza el servidor. No inyecta la clave en el cliente ni la guarda en informes. El endpoint `POST /api/intake` necesita una clave OpenAI válida **en el servidor**; la evaluación completa realiza 32 llamadas potencialmente facturables y no utiliza replay. Una respuesta HTTP 503 o un fallo de conexión detiene la ejecución para evitar peticiones inútiles. Otras respuestas fallidas quedan registradas.

También puedes iniciar la aplicación por separado con `pnpm dev` y ejecutar únicamente Python:

```bash
python3 scripts/evaluate_intake.py \
  --dataset evaluation/libeen_ai_lead_intake_eval_v1.zip \
  --url http://127.0.0.1:3000/api/intake \
  --output evaluation/results/primera-ejecucion
```

El dataset ZIP se conserva intacto. El runner admite usar un directorio descomprimido con `cases.jsonl`, `gold.jsonl` y `manifest.json`.

## Opciones útiles

```bash
# Enumerar y validar los 32 snapshots sin consumir tokens ni iniciar Next.js.
bash scripts/run-intake-eval.sh --dry-run

# Ejecutar solo un expediente y su continuación.
bash scripts/run-intake-eval.sh --case-id LBE-09

# Ejecutar un snapshot concreto.
bash scripts/run-intake-eval.sh --snapshot-id LBE-21-S1

# Reanudar un lote sin repetir las peticiones exitosas.
bash scripts/run-intake-eval.sh --resume

# En una integración externa donde la API ya está desplegada.
INTAKE_EVAL_NO_SERVER=1 bash scripts/run-intake-eval.sh --url http://127.0.0.1:3100/api/intake

# Hacer que un mismatch de alineación falle el comando (por ejemplo, en CI).
bash scripts/run-intake-eval.sh --fail-on-mismatch
```

Variables opcionales: `INTAKE_EVAL_DATASET`, `INTAKE_EVAL_URL`, `INTAKE_EVAL_OUTPUT`, `INTAKE_EVAL_PORT`, `INTAKE_EVAL_NO_SERVER=1`. Argumentos Python adicionales: `--limit`, `--case-id`, `--snapshot-id`, `--timeout`, `--delay`, `--retries`, `--resume`, `--dry-run`, `--fail-on-mismatch`.

**Importante:** `--retries` por defecto es 0 porque cada reintento puede consumir tokens y dinero; `--delay` por defecto 0.5 s. `--resume` reutiliza las respuestas exitosas del mismo snapshot y endpoint si el texto de la conversación no ha cambiado, aunque no distingue un cambio de modelo o código entre ejecuciones. Usa un directorio `--output` distinto por modelo o commit si buscas resultados comparables.

## Archivos de salida

- `evaluation/results/latest/results.jsonl`: respuestas B/D/E completas, tiempos, errores, alineaciones por snapshot, anotaciones que revisar.
- `evaluation/results/latest/summary.json`: recuentos agregados sin puntuación global única.
- `evaluation/results/latest/report.md`: tabla por snapshot y comparativa de los pares antes/después.
- `evaluation/results/latest/server.log`: logs locales solo si el lanzador arrancó Next.js.

El CLI usa códigos de salida: `0` = transporte y evidencia estructural válidos (no implica exactitud semántica); `1` = error HTTP, conexión, contrato o evidencia; `2` = diferencias de alineación con `--fail-on-mismatch`.

### Qué se valida automáticamente y qué no

**Automático:** contrato JSON; existencia y procedencia de `messageId` y `quote`; cobertura y alineación de candidatos por campo/mensaje; discrepancias de precisión/sujeto/base; incidencias por familia/campo/mensaje; tipo y objetivo de la intervención; pares antes/después. El gold nunca se envía al modelo.

**Revisión humana:** equivalencia semántica de importes, períodos, correcciones, alternativas admisibles, detección y gravedad de alertas, grupos redundantes, `mustNotExtract` y calidad de la redacción. En particular, una coincidencia de `messageId` no acredita que un valor semántico sea correcto. El matcher de incidencias tampoco demuestra ausencia de falsos positivos o negativos. No se deben convertir estos contadores en una puntuación de accuracy.

## Autopruebas del runner

```bash
python3 scripts/test_evaluate_intake.py -v
```

Estas pruebas usan un servidor HTTP simulado con el contrato actual y comprueban transporte, `resume`, corte ante 503 y procedencia de citas. **No evalúan un LLM real**.

El corpus es totalmente ficticio; no utilices conversaciones reales en esta herramienta sin revisar antes seguridad, privacidad y almacenamiento de resultados.
