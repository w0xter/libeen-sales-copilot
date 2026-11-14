# Libeen Sales Copilot V0

Copiloto local para asesores que trabajan con **conversaciones ficticias**. Extrae hechos con evidencia, conserva incertidumbres, evalúa un workflow y propone una acción y, cuando procede, un borrador para revisión humana. La política `demo-v1` es sintética: orienta hacia una aclaración, una llamada propuesta o revisión humana; **no aprueba ni rechaza financiación**. No hay envío real, CRM, calendario ni reserva de citas.

## Arranque local

Requisitos: Node.js 22 y pnpm 12.16.1. La versión de pnpm está indicada en `package.json`.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). El ejemplo configura `AI_MODE=replay` sin clave. `.env.local` está ignorado por Git; mantén cualquier credencial fuera del repositorio. Los expedientes viven en memoria en un único proceso: se pierden al reiniciar el servidor y no se garantiza consistencia entre procesos. El botón **Restablecer caso** vuelve al fixture original.

## Recorrido de la demo

Selecciona Laura, Javier o Rosa. La aplicación analiza inicialmente el caso seleccionado y muestra conversación, hechos y fuentes, hitos, recomendación y borrador si corresponde. Laura declara ingresos conjuntos, ahorro y una cuota de coche cuya inclusión en los ingresos no está clara. El primer borrador pregunta por esa cuota; aprobarlo no registra envío ni acuerdo.

En replay las respuestas adicionales reconocidas deben coincidir con las variantes de [fixtures](src/fixtures/index.ts). Por ejemplo, para Laura se puede añadir exactamente:

```text
Sí, los 3.800 € ya son después del coche.
```

Después sigue sin constar interés informado en SmartHousing, por lo que se pregunta antes de proponer una llamada. Otra variante combina la aclaración y el interés:

```text
Sí, queremos explorar SmartHousing y los 3.800 € ya son después del coche.
```

Replay es una reproducción determinista de los mensajes y variantes definidos, **no inferencia de un modelo**. Un texto que no tiene replay se conserva como mensaje, pero el análisis falla de forma explícita; no inventa una interpretación. Las variantes están identificadas como añadidos sintéticos. Javier conserva un audio sin transcripción; Rosa conserva ahorro cero y su solicitud de aprobación escrita se deriva a revisión.

El asesor puede editar, aprobar o descartar un borrador y registrar un envío **simulado**. Para registrar un acuerdo simulado, selecciona y lee el mensaje del cliente y confirma expresamente que acepta el siguiente paso. El evento conserva la cita y la revisión del asesor; no reserva una cita. Los textos editados por una persona **no se analizan semánticamente para detectar promesas prohibidas**, por lo que requieren revisión humana cuidadosa. La V0 no autentica al asesor y no es adecuada para datos reales.

## Modos de IA

- `AI_MODE=replay`: funciona sin credenciales y está etiquetado en la interfaz. Solo admite las conversaciones y variantes sintéticas reconocidas.
- `AI_MODE=openai`: configura `OPENAI_API_KEY` en `.env.local` y opcionalmente `OPENAI_MODEL` (por defecto `gpt-4.1-mini`). La clave solo se lee en el servidor. Reinicia el servidor tras cambiar el entorno. La falta de clave o un error del proveedor se comunica sin cambiar a replay silenciosamente.

El adaptador OpenAI extrae candidatos estructurados que pasan validación y selecciona entre plantillas de borrador permitidas; no redacta libremente. **La inferencia real se ha evaluado, pero sigue siendo inconsistente y F-01 no está resuelto.** La evaluación original y la remediación parcial conservan los fallos y límites observados: [evaluación independiente](docs/evaluation/INDEPENDENT_EVALUATION.md) y [remediación F-01](docs/evaluation/F01_OPENAI_REMEDIATION.md). Las pruebas deterministas no hacen llamadas reales; una prueba aislada de instrucciones maliciosas no acredita resistencia general.

## Configuración R10

En [src/config/index.ts](src/config/index.ts), `businessPolicy.advisoryCall.requireSpecificMoveMonthBeforeCall` empieza en `false`. Para demostrar R10, cambia a `true`, incrementa `businessPolicy.version` y actualiza `workflow.businessPolicyVersion` al mismo valor; reinicia el servidor y vuelve a evaluar el caso. Con interés informado y deuda aclarada, la ruta solicita un mes concreto antes de proponer llamada, sin reabrir el hito financiero M3. Las restricciones protegidas siguen teniendo prioridad. La suite de aceptación comprueba ambas configuraciones.

## Comprobación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para una suite concreta:

```bash
pnpm test tests/acceptance/laura
pnpm test tests/acceptance/safety tests/acceptance/failures
```

La última validación integrada registrada ejecutó 105 tests con éxito, junto con lint, typecheck y build; consulta [el registro real de desarrollo](docs/AI_DEVELOPMENT_LOG.md) para los comandos, revisiones y limitaciones. El test de prompt injection cubre el rechazo de texto desconocido en replay, no una prueba contra un modelo real.

## Decisiones y límites

- Los hechos retienen fuente, sujeto y precisión; desconocido no equivale a cero ni la declaración del cliente a verificación documental. No se reparte el ingreso conjunto ni se resta dos veces la cuota.
- La decisión de una persona, el borrador aprobado, el envío simulado y el acuerdo del cliente son estados distintos. Los errores de interpretación conservan el mensaje recibido.
- No hay transcripción de audio, asesoramiento financiero, promesas de vivienda, persistencia de producción ni efectos externos. No hay fuentes comerciales verificadas para contestar la objeción de confianza de Javier, así que se deriva.
- Con más tiempo: evaluar el adaptador con un modelo real y casos adversariales, revisar la seguridad del texto editado por humanos, incorporar autenticación y persistencia adecuadas, y mejorar la cobertura visual y de concurrencia antes de cualquier uso real.

La [documentación local](docs/README.md) contiene las especificaciones y contratos; el [registro de desarrollo](docs/AI_DEVELOPMENT_LOG.md) documenta el trabajo y las correcciones de Codex. El [enunciado original](docs/reference/Prueba_tecnica_AI_Product_Engineer.pdf) proporciona las conversaciones ficticias.
