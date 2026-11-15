# Seguimiento del spike: diagnóstico y prioridad de opt-out

## Decisión: ADJUST

Los dos bloqueos se corrigen en esta muestra, pero no se cumple el criterio de salida de las siete extracciones sin regresiones. En LBE-18-S0 el modelo agrupa los importes de mayo y junio en un candidato marcado `range` y marca la ausencia de financiación como `debtIncluded: excluded`; el gold distingue dos candidatos mensuales y no justifica esa clasificación. No se ejecutaron los 32 casos. Una sola muestra por caso no demuestra calidad general ni permite atribuir la variación de extracción al cambio de código.

## Diagnóstico y cambio

En la ejecución diagnóstica anterior al arreglo, el modelo devolvió `horizon` con cita `... preferiría mudarme en abril de 2028.` y B la descartó como `quote_not_found`: no se omitió el candidato en esa ejecución. No se puede reconstruir con certeza el descarte de la ejecución histórica porque no se guardó su respuesta original. B ahora elimina únicamente puntos suspensivos al inicio si el texto restante completo es una subcadena literal del mensaje del cliente; conserva esa subcadena como cita. Un callback opcional informa el elemento descartado, tipo y causa, sin alterar el JSON público. No registra credenciales; los datos de diagnóstico pueden contener la conversación y deben limitarse a datos ficticios.

D da prioridad al opt-out total explícito posterior en el caso diagnosticado y conserva las demás alertas sensibles; incorpora una guarda para esa formulación cuando falte la señal del modelo. E permanece intacto. Es una guarda acotada, no un detector completo de todas las formulaciones o revocaciones de contacto.

## Ejecución con proveedor real

Código evaluado: `a26bb5dab9fd0b10cc066bbd52baa152655dbae1`; modelo `gpt-5.4-mini`; SHA-256 del contenido de `instructions`: `0d3b199ec6ee914d5ceb18389c55e36a513a7e22fbed0c3a7906c4888270cabb`. Una llamada al proveedor por caso, sin gold en el input, sin reintentos. La prueba llama directamente a B/D/E con el mismo transporte de producción; los tiempos son del pipeline local, no HTTP. Respuestas estructuradas originales, resultados B/D/E, mensajes ficticios, descartes y latencias están en [semantic-issues-evidence](semantic-issues-evidence/). El archivo `LBE-09-S1-diagnostic-before.json` corresponde al diagnóstico previo al arreglo con instrumentación local sobre `3c7bdf7`, no a la ejecución histórica del spike. No se observaron errores del proveedor ni descartes en la ronda final.

| Caso | Resultado e intervención | ms |
|---|---|---:|
| LBE-04-S0 | Deuda cero; sin duda ni pregunta | 3086 |
| LBE-09-S1 | Plazo recuperado pese a `...` inicial; cuota aclarada, sin pregunta | 3539 |
| LBE-15-S0 | No extrae ahorro hipotético; pregunta interés | 2639 |
| LBE-18-S0 | No plantea contradicción automática; metadatos económicos deficientes indicados arriba | 3410 |
| LBE-21-S1 | Revisión humana con motivo de opt-out total; se conserva alerta anterior | 2470 |
| LBE-22-S0 | Revisión humana por garantía; urgencia no detectada separadamente | 3674 |

### Revisión de los siete campos frente al gold

`—` significa que tanto el gold como la extracción no aportan candidato; las cifras entre paréntesis identifican diferencias materiales.

| Caso | interest | location | horizon | buyers | income | savings | debts |
|---|---|---|---|---|---|---|---|
| 04 | interés | Bilbao | marzo 2027 | 1 | 2.150 netos/mes | 9.000 | 0 |
| 09 | interés | Gijón | abril 2028 | 1 | 2.800–3.200 netos/mes | 22.000 | 240/mes, aclarado como incluido |
| 15 | — | Castellón | — | — | — | — | — |
| 18 | interés | Córdoba | septiembre 2027 | pareja y cliente | 1.850 y 1.600/2.000 (dos meses agrupados como rango) | 13.000 | ninguna (marcada incorrectamente como excluida) |
| 21 | interés | Pontevedra | — | 1 | — | — | — |
| 22 | interés condicional | Almería | diez días | pareja y cliente | 1.650/mes, base desconocida | 0 | — |

La ausencia de señal separada de urgencia en 22 también se observó en la ronda anterior; la intervención por garantía sí se mantiene. La revisión manual compara valores y atribución, no establece exactitud estadística. Los resultados con transporte simulado comprueban integración, no calidad del modelo.

Para reproducir la ejecución, extraer del ZIP únicamente `cases.jsonl`, seleccionar los seis snapshots y guardarlos como array JSON en `/tmp/libeen-spike-cases.json`; después ejecutar con `OPENAI_MODEL=gpt-5.4-mini INTAKE_LOCAL_DIAGNOSTIC=<directorio> node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/integration/intake/local-diagnostic.test.ts`. El directorio contiene datos de conversación y respuestas completas, no claves. No enviar `gold.jsonl` al proveedor.

## Verificación

`pnpm test`: 186 pasan, 3 omitidos (incluido el diagnóstico real optativo); `pnpm typecheck` y `pnpm build` pasan. ESLint sobre los archivos modificados pasa. `pnpm lint` falla con 15 errores y 330 avisos en archivos preexistentes no versionados bajo `.agents/skills/`. Los tests deterministas ejercitan recuperación de cita, descarte con causa, prioridad de opt-out y conservación de otra alerta sensible.
