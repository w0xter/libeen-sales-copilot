# Kapibala — smoke externo de tres conversaciones (16-11-2026)

**Procedencia:** archivo JSONL de resultados compartido manualmente por el responsable el 16-11-2026. No se realizaron llamadas nuevas al proveedor en esta revisión. Los diálogos y las salidas de IA son sintéticos; no incluir los textos íntegros en este documento.

## Resultado observado

| Indicador | Valor | Interpretación |
| --- | ---: | --- |
| Casos | 3 | Los tres son variantes del mismo escenario `S26_pushy` |
| HTTP 200 | 3/3 | Ruta técnica accesible |
| Citas de candidatos que son substrings literales | 21/21 | No demuestra clasificación semántica correcta |
| Candidatos | 12 + 5 + 4 = 21 | Sin ground truth humano exhaustivo |
| Candidatos descartados | 5 + 1 + 1 = 7 | Causas individuales no adjuntadas |
| Incidencias finales | 10 + 5 + 5 = 20 | Incluyen faltantes, ambigüedades y falsas alarmas |
| `human_review` | 3/3 | Necesita revisión de pertinencia |
| Duraciones | 13,02 s; 4,89 s; 4,71 s | Media 7,54 s |

No interpretar 21/21 como 100 % de exactitud. No medir estadísticamente robustez, seguridad o precisión con tres variantes del mismo guion.

## Hallazgos cualitativos sustentados

1. **Falsa deuda / cuota.** `kapibala-01` clasificó pagos de reserva del 10 % como tres `debts`, y D construyó después una incidencia `debt_inclusion` sobre una supuesta cuota sin ingresos declarados. Es un falso positivo semántico encadenado del extractor y las reglas.
2. **Falsos positivos sensibles.** Los tres casos acaban en `human_review`. Algunos `semanticIssues` describen como sensibles la urgencia comercial, la petición de documentos y las condiciones de una reserva. En el contexto presentado no justifican automáticamente una alerta de protección similar a una aprobación financiera vinculante.
3. **Campos incorrectos.** `kapibala-03` extrajo `fits well within my budget` como `income` y `I have my funds ready to go` como `savings`, pese a que no se declararon ingresos ni ahorros concretos. `kapibala-02` convirtió `cash ready to invest` / `surplus cash` en ahorros.
4. **Sobrerrecogida temporal.** `kapibala-01` produjo ocho candidatos `horizon`, con acciones de reserva y envío del contrato. El campo de Libeen representa plazo de mudanza o compra: son semánticas diferentes.
5. **Interés no compatible.** `interest=[]` en las tres conversaciones, a pesar del interés claro por la inversión inmobiliaria. Es consistente con el filtro deliberadamente restringido a SmartHousing, no necesariamente un fallo del LLM.
6. **Diversidad insuficiente.** Los `source_id` son `kapibala-sim:talksub_loop:S26_pushy`, `kapibala-sim:mstate:S26_pushy`, `kapibala-sim:mboth:S26_pushy`; los tres comparten apertura idéntica y la misma oferta. No representan tres situaciones independientes.

## Interpretación y acciones

- **Fallo técnico de API:** no observado (3/3 HTTP 200).
- **Evidencia textual:** existe en todos los 21 candidatos aceptados.
- **Exactitud semántica:** errores cualitativos claros; ratio global desconocido hasta anotación humana exhaustiva.
- **Transferencia de dominio:** el producto V0 está configurado para SmartHousing. Un benchmark de venta de inversión inmobiliaria no es una medición válida de cualificación de Libeen sin distinguir cambios de esquema de errores del modelo.
- **Acción correctiva del harness:** la selección se modificó para evitar varias generaciones del mismo identificador de escenario (sufijo de source_id) en el próximo `prepare`. Revisar el catálogo y confirmar diversidad de los 20 casos en el dataset real; el cambio todavía no se ha ejecutado contra el corpus auténtico.
- **Antes de modificar el modelo:** etiquetar 3–5 conversaciones de ámbitos diferentes; contrastar falsos positivos de `debts`, `income`, `savings`, `horizon` y `sensitive` con gold humano. No cambiar las reglas comerciales de la V0 a partir de un corpus ajeno sin consentimiento del responsable.

**Limitación:** El usuario aportó un JSONL de salida, no los ficheros brutos del corpus ni un informe de calibración. Cifras y hallazgos se derivan únicamente de esas tres respuestas.
