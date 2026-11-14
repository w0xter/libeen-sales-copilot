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


## Dataset sintético F-01 v1.0.1 (congelación provisional)

El comando `pnpm eval:openai` conserva la interfaz anterior de seis escenarios y ahora permite seleccionar casos del corpus versionado de 352 registros sin modificar `src/fixtures/`.

```bash
# Validar anotaciones y huellas fijadas en FREEZE_MANIFEST.json
pnpm dataset:validate

# Ver exactamente qué evaluaría, sin tocar OpenAI
pnpm eval:openai --dataset f01 --split development --category trust_real --sample 4 --seed 42 --dry-run

# Ejecutar 4 escenarios de confianza, máximo 8 llamadas
pnpm eval:openai --dataset f01 --split development --category trust_real --sample 4 --seed 42

# Muestra transversal por categoría: hasta 20 llamadas si incluye correcciones
pnpm eval:openai --dataset f01 --split validation --sample 8 --seed 42 --mode end-to-end

# Probar correcciones financieras conservando el estado del expediente
pnpm eval:openai --dataset f01 --split development --category basis_correction --sample 3 --mode end-to-end

# Usar holdout únicamente después de congelar el diseño; requiere opt-in explícito
pnpm eval:openai --dataset f01 --split holdout --sample 5 --unlock-holdout
```

Opciones: `--split development|validation|holdout`, `--category <nombre>|all`, `--sample N`, `--seed N`, `--repeat N`, `--mode interpreter|end-to-end`, `--max-requests N` (máximo 20), `--output PATH`, `--allow-failures`, `--dry-run`, `--unlock-holdout`. Para conversaciones que incluyen rectificaciones, utilizar `end-to-end`; el runner evita compararlas como mensajes independientes sin contexto. Una llamada de extracción y otra de verificación se contabilizan por cada análisis; una secuencia de corrección puede necesitar cuatro llamadas. El comando se niega a superar el presupuesto máximo estimado.

La muestra es determinista por semilla y prioriza plantillas distintas. Los archivos JSON locales contienen las respuestas del extractor y verificador, las decisiones, los hechos y evidencia, los checks positivos/negativos y los denominadores por categoría. No se guarda automáticamente nada en Git ni se usa un modelo juez.

**Advertencia metodológica:** `FREEZE_MANIFEST.json` fija el contenido de las anotaciones de la versión 1.0.1, pero `independentHumanSignOff=false`. Las etiquetas están auditadas internamente por el mismo contexto que las generó; falta su revisión/adjudicación por otra persona. El PASS solo significa coincidencia con los *checks explícitos provisionales*; no es una certificación semántica ni una estimación de fiabilidad en producción. Un holdout desbloqueado deja de ser apto para ajustes posteriores, y el conjunto fue inspeccionado por su autor durante la auditoría; no constituye una muestra independiente a ciegas.

[Protocolo de anotaciones](../../datasets/f01/v1/ANNOTATION_GUIDE.md) · [Informe de auditoría y congelación](../../datasets/f01/v1/ANNOTATION_AUDIT_2026-11-14.md) · [Manifiesto de contenido congelado](../../datasets/f01/v1/FREEZE_MANIFEST.json)
