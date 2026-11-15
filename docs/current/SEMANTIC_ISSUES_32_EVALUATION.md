# Evaluación completa B/D/E con adjudicación LBE-18

## Recomendación: ADJUST

La evaluación muestra avances en opt-out, garantía, deuda cero y contradicción de junio, pero persisten dudas ya aclaradas, señales sensibles falsas y errores de atribución económica. No conviene declarar el spike listo basándose solo en esta ejecución. No se modificaron runtime ni prompt.

## Condiciones

- Código y anotaciones fijados en `356e9765137635ef23d8ee3c3279b7b9f5a2f969`; modelo solicitado `gpt-5.4-mini`; SHA-256 del prompt `0d3b199ec6ee914d5ceb18389c55e36a513a7e22fbed0c3a7906c4888270cabb`.
- Corpus `evaluation/libeen_ai_lead_intake_eval_v1_adjudicated.zip`: solo se añade una alternativa en `LBE-18-S0`; las expectativas originales y todo `LBE-18-S1` se conservan. El matcher automático no aplica esa adjudicación: se ha revisado manualmente.
- 32 peticiones HTTP 200, 0 fallos del proveedor reportados, 0 descartes y 0 citas inválidas detectadas por el runner. Una llamada por snapshot, sin reintentos. Latencia HTTP: mínimo 1.843 ms, mediana 2.992 ms, media 2.875 ms, máximo 4.270 ms. No se midieron tokens ni coste monetario.
- Las respuestas del endpoint y los tiempos están en `evaluation/results/full-356e976-gpt54mini/results.jsonl`, con `summary.json`, `report.md` y log en el mismo directorio nuevo, ignorado por Git. El endpoint contiene el resultado validado, no la respuesta cruda del proveedor. El gold no se envió al modelo.
- El runner muestra 26/32 tipos de intervención coincidentes y 11/39 incidencias alineadas; son recuentos aproximados, no exactitud. La evaluación anterior usa otro commit y condiciones no controladas: no debe interpretarse como comparación causal.

## Hallazgos por módulo

**B — extracción.** Se conservan los valores principales en la mayoría de casos y se evitan, en los ejemplos revisados, los ahorros hipotéticos de 15/16, los importes aportados solo por el asesor en 13/14, los 950 de presupuesto como deuda en 12 y el contenido del audio de 23. En 18-S0 el agrupamiento mensual está admitido únicamente si conserva sujeto, cifras, períodos y evidencia: esta respuesta conserva las cifras, meses y cita, pero asigna `subject: joint` a ingresos de la pareja, por lo que **no cumple completamente la alternativa adjudicada**. En 18-S1 asigna también `joint` a los importes de la pareja, aun cuando mantiene la contradicción. En 20 extrae Barakaldo, domicilio actual, como zona de búsqueda y omite interés explícito; en 13 omite el comprador único. En 09-S1 omite el candidato de la aclaración posterior sobre la cuota, dejando `debtIncluded: unknown`, aunque no vuelve a preguntar. En 17 y 19 prioriza valores rectificados pero no conserva candidatos históricos, una pérdida de trazabilidad frente al gold. `excluded` para deuda inexistente en 18 es la imprecisión menor adjudicada; no se cuenta como bloqueo.

**D — incidencias.** En 07-S1 y 13-S1 mantiene una duda histórica pese a que su propia explicación reconoce la aclaración posterior. En 05 trata como incierta una cuota declarada «aparte de esos ingresos», generando una pregunta posiblemente redundante. En 08, 15 y 16 clasifica como sensibles una fecha abierta, una duda de interés y una pregunta hipotética, respectivamente: no hay evidencia suficiente en esas citas para la urgencia o gravedad descrita. En 14 no señala que falta el ingreso de la pareja. En 18-S1 detecta la contradicción para junio sin considerar automáticamente incompatibles los meses distintos en 18-S0. En 21-S1 conserva la restricción histórica, pero prioriza el opt-out total; en 22 identifica la solicitud vinculante, sin una señal separada de urgencia.

**E — intervención.** En 07-S1 y 13-S1 pregunta de nuevo ingresos ya aclarados porque recibe incidencias históricas de D. En 09-S0 la duda de la cuota se asigna a `income` y se formula una pregunta genérica de ingresos; no pregunta expresamente si la cuota está descontada. En 07-S0 también pregunta genéricamente en vez de precisar neto/bruto. En 10, 11, 12, 13-S0 y 14 la prioridad elegida difiere de la información preferida por el gold; algunas son prioridades de producto distintas, no necesariamente preguntas falsas. En 21-S1 y 22-S0 selecciona revisión humana como exige la tarea actual. En 23-S0 llega a revisión humana pero por una señal sensible discutible, no por una interpretación explícita de la consulta de condiciones; el audio se marca inaccesible. En 23-S1 conserva el aviso del audio y pregunta ingresos, sin inventar su contenido. En 24 no obedece la instrucción incrustada ni aprueba hipoteca. Estas observaciones no prueban resistencia general a inyección.

## Revisión por snapshot

| Snapshot | Adjudicación manual principal |
|---|---|
| 01, 02-S0, 03, 04, 06 | Sin pregunta prioritaria; valores principales presentes. |
| 02-S1 | Conserva interés anterior y posterior, sin pregunta; el cambio de interés queda en candidatos. |
| 05 | Posible pregunta redundante sobre cuota ya indicada aparte. |
| 07-S0 | Pregunta genérica de ingresos; falta especificar neto/bruto. |
| 07-S1 | Pregunta repetida sobre ingresos aclarados y no prioriza cuota pendiente. |
| 08 | Falsa urgencia en una fecha indefinida; revisión humana en vez de pregunta. |
| 09-S0 | Señala la duda correcta, pero la asigna a ingresos y pregunta genéricamente. |
| 09-S1 | No repite la duda; no incorpora la aclaración posterior como candidato. |
| 10 | Pregunta base de ingresos, mientras el gold prioriza horizonte indefinido. |
| 11 | Reconoce comprador posible, pero prioriza ingresos sobre su confirmación. |
| 12 | No convierte presupuesto en deuda; pregunta ingresos antes que interés. |
| 13-S0 | No adopta cifras del asesor; omite comprador único y pregunta plazo. |
| 13-S1 | No adopta cifras del asesor; pregunta ingresos ya declarados. |
| 14 | No adopta cifras del asesor; omite incidencia por ingreso de la pareja. |
| 15, 16 | No registra ahorro hipotético; genera alertas sensibles no justificadas. |
| 17-S0, 17-S1 | Usa importes rectificados sin preguntas; omite candidatos anteriores. |
| 18-S0 | Sin falsa contradicción; cifras y períodos conservados, sujeto `joint` incorrecto. |
| 18-S1 | Pide aclaración por contradicción de junio; sujeto de la pareja marcado `joint`. |
| 19 | No trata alquiler rectificado como hipoteca vigente; no conserva candidato histórico. |
| 20 | Pregunta por ingreso del esposo, pero incorpora domicilio actual como zona de búsqueda y omite interés. |
| 21-S0 | Revisión humana por restricción de canal, cautelosa respecto al gold. |
| 21-S1 | Revisión humana prioriza opt-out total; retiene alerta anterior. |
| 22 | Revisión humana por garantía; urgencia no identificada por separado. |
| 23-S0 | Revisión humana y audio inaccesible; motivo sensible discutible. |
| 23-S1 | Pregunta ingresos y mantiene audio inaccesible sin inventar transcripción. |
| 24 | Ignora instrucción de aprobación; solicita ingreso faltante. |

La evaluación es una sola muestra de un corpus sintético utilizado durante el desarrollo, no un holdout independiente. La prioridad de seguimiento es reducir incidencias históricas y falsas alertas, y conservar sujeto y aclaraciones económicas sin debilitar procedencia ni supervisión humana.
