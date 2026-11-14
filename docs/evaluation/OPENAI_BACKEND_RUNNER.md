# Evaluación OpenAI del backend (CLI)

**Rama:** `codex/f01-trust-boundaries`. **Estado:** runner incorporado, no equivale a evaluación real ejecutada desde este entorno. Requiere ejecutar el comando localmente con acceso al proveedor.

El runner utiliza los fixtures sintéticos, el adaptador real `OpenAIInterpreter`, la verificación semántica existente y, opcionalmente, `CaseOrchestrator` con repositorio nuevo por repetición. **No depende de la UI** ni del servidor Next.js. No utiliza replay ni sustituye el modelo seleccionado.

## Preparación

Requisitos: Node.js compatible, dependencias instaladas (`pnpm install --frozen-lockfile`) y `OPENAI_API_KEY` / `OPENAI_MODEL` definidos en el entorno o en un archivo local `.env.local` / `.env` no versionado. El comando carga esas variables mediante Node y fuerza `AI_MODE=openai` en su proceso hijo.

Antes de llamar al proveedor:

```bash
pnpm eval:openai --suite canonical --dry-run
pnpm eval:openai --case laura --repeat 3 --dry-run
```

Primera evaluación con un caso (dos llamadas esperadas: extracción y verificación; una puede omitirse si falla la extracción):

```bash
pnpm eval:openai --case laura --repeat 1 --mode interpreter
```

Suite de los tres casos canónicos en modo de evaluación del dominio:

```bash
pnpm eval:openai --suite canonical --repeat 2 --max-requests 20
```

Evaluación a través de persistencia, orquestador y borradores:

```bash
pnpm eval:openai --suite canonical --mode end-to-end
```

Corrección financiera de Laura como secuencia real de dos eventos del mismo caso:

```bash
pnpm eval:openai --case laura --scenario gross-correction --mode end-to-end
```

Paráfrasis de Javier y solicitud de no contacto:

```bash
pnpm eval:openai --case javier --scenario trust-paraphrase
pnpm eval:openai --case javier --scenario opt-out
```

Para ejecutar los tres escenarios de seguimiento, incluidas las correcciones, se exige modo end-to-end:

```bash
pnpm eval:openai --suite followups --mode end-to-end
```

Opcionalmente `--output .eval-results/laura.json` escribe en un archivo explícito; `--allow-failures` devuelve estado 0 si las pruebas no cumplen el oráculo, pero **no** convierte un resultado parcial en correcto. El modo estricto por defecto devuelve estado distinto de cero ante cualquier caso FAIL, PARTIAL o BLOCKED.

## Modos

- **`interpreter`**: una instancia aislada por repetición; interpreta los mensajes originales mediante OpenAI y evalúa la respuesta en `evaluate()`. No genera borrador ni persiste eventos.
- **`end-to-end`**: utiliza `MemoryCaseRepository` + `CaseOrchestrator`, registra `CASE_ANALYSIS_REQUESTED` y ejecuta las decisiones y borradores sujetos a revisión humana. Para C01 incorpora posteriormente `MESSAGE_RECEIVED` con «Me equivoqué: eran brutos», sin reiniciar ese expediente intermedio. Cada repetición empieza desde un estado nuevo.

Las dos rutas deben conservar `gpt-4.1-mini` u otro valor **explícito** de `OPENAI_MODEL`. El runner **no** cambia el modelo ni emplea Agents SDK.

## Presupuesto

Se contabiliza cada invocación del transporte, incluida verificación y selección de borrador cuando exista. El límite es `--max-requests` (20 por defecto, máximo 20); los reintentos automáticos del SDK están desactivados por el adaptador actual. El CLI valida un techo de dos solicitudes por análisis, y cuatro para la corrección C01 que realiza dos análisis. La contabilización es por **intento** local, no garantiza que cada solicitud haya llegado al proveedor o sido facturada; la salida marca errores con categorías sanitizadas.

No lanzar simultáneamente varios procesos si se desea un presupuesto combinado; el límite corresponde a **una ejecución del comando**.

## Resultado y interpretación

Genera `.eval-results/f01-<fecha>.json` con permisos restrictivos en sistemas compatibles. El directorio se añade a `.gitignore`. Guarda por repetición:

- Modelo configurado, escenario, modo, fecha y número de solicitudes.
- Resultado de cada llamada a interpretación/verificación, latencia y categoría de error.
- Hechos consolidados, evidencias, bloqueos y estado de análisis.
- Hitos y acción de política, junto al estado del borrador cuando procede.
- Comprobaciones deterministas `expected` / `actual` y veredicto por caso.

**PASS** significa que los checks explícitos de ese escenario pasan; no que todos los posibles errores semánticos estén descartados. **PARTIAL** significa que la acción esperada coincide pero otras propiedades fallan. **FAIL** significa que la decisión esperada no coincide o no se ha podido completar correctamente la evaluación. **BLOCKED** indica un fallo de disponibilidad/transporte o agotamiento de presupuesto; no es evidencia de calidad semántica.

Los resultados se pueden inspeccionar con `jq`:

```bash
jq '.runs[] | {scenario, iteration, verdict, checks: [.checks[] | select(.pass == false)]}' .eval-results/f01-*.json
```

Las salidas contienen **mensajes y resultados sintéticos del modelo**, y no claves. Mantener los informes locales y revisarlos antes de compartirlos. No se guardan automáticamente en Git, Notion ni servicios externos.

## Consideraciones y límites conocidos

1. El oráculo comprueba los casos B01 Laura, B05 Javier, B08 Rosa, B06 confianza indirecta, B10 opt-out y C01 corrección bruto/neto. No sustituye la matriz completa `F01_SEMANTIC_EVALUATION_PLAN.md`.
2. La capa de interpretación se instrumenta a nivel de transporte y guarda las **salidas de las dos llamadas**. Cuando el modelo produce datos incorrectos, el informe permite comparar las respuestas de extracción y verificación con la decisión final. No captura tokens porque `ModelTransport.complete` no los devuelve.
3. El test anterior `f01-live.test.ts` sigue disponible como registro histórico opt-in y no debe mezclarse con los veredictos del nuevo CLI.
4. No se han añadido llamadas de evaluación automática con otro LLM como juez; las comprobaciones son deterministas y deliberadamente acotadas.
5. `CaseOrchestrator` conserva su comportamiento actual de bloqueos persistentes; el contrato de resolución sigue abierto. Este CLI permite investigarlo, pero los escenarios disponibles no cubren aún todas las secuencias de resolución histórica.
6. El runner usa Vitest internamente para cargar TypeScript sin añadir otra dependencia. El test `f01-cli.test.ts` está omitido durante `pnpm test` salvo `F01_EVAL_RUN=1`.

**Si el entorno no tiene acceso a OpenAI**, ejecutar desde uno con DNS y salida HTTPS disponibles. El `GET /models` no sustituye una prueba real del endpoint `POST /responses`. No presentar fallos de red como fallos semánticos, ni como éxito de inferencia.
