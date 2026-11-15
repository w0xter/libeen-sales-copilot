# Spike B/D/E: incidencias semánticas

## Recomendación: ADJUST

Las alertas críticas aparecen en las pruebas reales, pero hay una regresión de extracción y una alerta histórica duplicada que afecta al motivo mostrado. No hay evidencia suficiente para adoptar el cambio como mejora global. No se ejecutaron los 32 snapshots: el piloto no superó todos los criterios y se agotó la única iteración de ajuste autorizada.

## Línea base y diseño

Punto de partida: `80e2fb3b52df5a6620d8f394d8ca66a1b9251441`, con cambios previos sin confirmar en `src/intake/extraction.ts` y otros archivos del workspace. La evaluación previa conservada en `evaluation/results/latest/` registra `fbf7ee93b2a1bf60477542ab4e75c1f2e96d132c`; no es una comparación controlada del mismo código, prompt ni condiciones. El gold de LBE-21-S1 indica `none`, pero la tarea actual exige revisión humana ante opt-out total y prevalece para esta valoración.

D generaba incidencias por cada candidato histórico, por base/sujeto/cuota desconocidos incluso con aclaración posterior o deuda cero, y comparaba números sin identificar períodos o personas. Sus patrones sensibles omitían la garantía condicional y el opt-out total. Se incorpora `semanticIssues` a la misma respuesta estructurada de B, con categoría, campo opcional, cita, mensaje y explicación; B valida procedencia literal del cliente y cuenta descartes. D usa estas señales para dudas vigentes y conserva faltantes, audio, validación de evidencia y guardas sensibles existentes. En transportes antiguos sin la propiedad conserva el comportamiento anterior; el proveedor real debe devolverla. E no cambia. El endpoint añade `extraction.semanticIssues` sin quitar campos existentes. Una cita válida prueba procedencia, no que la interpretación sea correcta. No se toma ninguna decisión financiera.

## Observaciones reales

Modelo configurado: `gpt-5.4-mini`; 12 peticiones, seis iniciales y seis tras un ajuste focalizado del prompt. Las seis respuestas de cada ronda fueron HTTP 200; no hubo errores del proveedor observados. La aclaración del formato del prompt se corrigió mientras se ejecutaba la primera ronda, por lo que esta no tiene un prompt uniforme. Las respuestas completas del endpoint, alineaciones y tiempos se conservan localmente en `evaluation/results/spike-LBE-*` y `evaluation/results/spike-adjust-LBE-*` (directorio ignorado por Git); el runner no conserva la respuesta cruda del proveedor anterior a la validación de B. El gold no se envió al endpoint. Comparación manual con el resultado previo y el gold, sin atribuir causalidad a una sola ejecución:

| Caso | Resultado previo | Después del ajuste |
|---|---|---|
| LBE-04-S0 | Pregunta si la cuota cero está descontada | Sin incidencias ni pregunta |
| LBE-09-S1 | Repite la duda de la cuota aclarada | No repite la cuota, pero pregunta el plazo, que sí estaba declarado; un elemento fue descartado por validación |
| LBE-15-S0 | Conserva 30.000 hipotéticos como candidato incierto | No extrae el ahorro hipotético; pregunta interés y conserva ubicación |
| LBE-18-S0 | Señala dudas por cantidades de distintos períodos | Sin incidencias ni pregunta |
| LBE-21-S1 | Pregunta comercial | Revisión humana, pero conserva también la restricción anterior y la usa como motivo antes del opt-out total |
| LBE-22-S0 | Pregunta base de ingresos | Revisión humana por garantía; no detectó por separado la urgencia |

En la primera ronda LBE-15 produjo una falsa alerta sensible por hablar de alquiler; desapareció tras el ajuste. LBE-09 omitió interés inicialmente y plazo después: hay variabilidad y posible deterioro de extracción. La verificación de procedencia descartó un elemento en LBE-09 ajustado; el runner no permite inspeccionar su respuesta cruda. No se ha demostrado la ausencia de regresiones en los siete campos ni la detección de contradicciones reales en el corpus completo.

Las latencias HTTP de la ronda ajustada fueron 1,60–3,25 s (seis muestras); una llamada al proveedor por análisis, sin medir tokens ni coste monetario. No son comparables rigurosamente con la ejecución histórica. Los resultados simulados prueban integración y trazabilidad, no calidad semántica. Las guardas por expresiones regulares todavía pueden conservar señales sensibles históricas y las señales del modelo pueden omitir o duplicar incidencias; una cita auténtica no impide esas equivocaciones. El ajuste pendiente debe evaluar estas limitaciones y la extracción con una línea base de mismo modelo, versión y condiciones, antes de un despliegue o una evaluación completa.

## Verificación

`pnpm test`: 184 pasan, 2 omitidos. `pnpm typecheck` y `pnpm build`: correctos. `pnpm lint`: falla con 15 errores y 330 avisos en archivos preexistentes no versionados de `.agents/skills/`; ESLint sobre los tres archivos del spike pasa. El autotest Python del runner no pudo abrir un socket por restricciones del sandbox; las llamadas reales se hicieron mediante servidor local autorizado. Las pruebas de integración incluyen señales con citas falsas o del asesor, duplicados, contradicción, deuda cero, periodos, respuesta malformada y revisión humana; los tests existentes cubren audio, errores de proveedor y otros casos. No se ha validado con proveedor real la resistencia a prompt injection ni las contradicciones pendientes.
