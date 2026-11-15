# Comparación exploratoria: LangExtract y extracción actual

## Diseño y alcance

Se reprodujeron las 72 salidas del ZIP `20261115T221856Z.zip`: 24 conversaciones ficticias, tres repeticiones cada una. Se ejecutó después el extractor actual tres veces sobre cada una de las mismas conversaciones. Las entradas son idénticas entre repeticiones y entre enfoques. Cada salida pasó por el validador de `extract`, `identifyIssues` y `nextQuestion`; no hubo envío de mensajes ni aprobación financiera.

El ZIP identifica `gemini-3.5-flash`, una pasada y el contrato `libeen-extract-80-20-v1`. La comparación usó el transporte y prompt actuales de la aplicación con `gpt-5.4-mini`. Se comparan sistemas completos, con modelo, prompt y procesamiento diferentes: el experimento no aísla el efecto de LangExtract. El ZIP incluye hashes del prompt y de los ejemplos, pero no su contenido. Las conversaciones no coinciden exactamente con los snapshots del benchmark adjudicado del repositorio y aquí no se dispone de gold adjudicado. Los recuentos siguientes no miden precisión ni exhaustividad.

El replay usa `model_output`, conserva sin modificar sus valores y vuelve a validar los candidatos y sus fuentes. Añade el número de descartes del procesamiento original al contador de descartes del replay, de modo que `issues.incomplete` los refleje. Las razones de los descartes originales y del validador actual se guardan por separado. La cadena `"null"` no se transforma en `null`. `nextQuestion` puede seguir proponiendo una pregunta aunque `incomplete` sea verdadero.

## Resultados

| Medida descriptiva | LangExtract | Extractor actual |
| --- | ---: | ---: |
| Ejecuciones procesadas | 72/72 | 72/72 |
| Candidatos aceptados | 111 | 152 |
| Elementos descartados | 21 originales; 0 adicionales en replay | 1 en validación |
| Ejecuciones sin candidatos | 24 | 15 |
| Intervenciones de pregunta | 63 | 54 |
| Intervenciones de revisión humana | 9 | 18 |

Las intervenciones coinciden en tipo en 57 de 72 pares y en tipo más campo asociado en 43 de 72. Esta última medida no comprueba equivalencia de motivos, redacción ni corrección. Los recuentos incluyen repeticiones y no deben confundirse con 72 casos independientes.

La mediana de tiempo registrada en el ZIP fue de 7,46 s y la del extractor actual de 1,98 s. No se ha establecido que los cronómetros cubran las mismas etapas ni que las condiciones de ejecución sean equivalentes, por lo que no son una comparación fiable de rendimiento.

## Hallazgos para revisión

- En `07_opt_out`, `10_binding` y `21_conditional_approval`, las tres repeticiones de LangExtract pierden la señal semántica original por un descarte de esquema o atributos. El flujo propone preguntar por SmartHousing, pese a que el primer caso pide no contactar y los otros dos plantean una aprobación por escrito. Las tres repeticiones del extractor actual proponen revisión humana en cada caso.
- En `03_javier`, LangExtract no conserva la señal de desconfianza y propone aclarar ingresos en las tres repeticiones; el extractor actual propone revisión humana por la pregunta sobre una posible estafa. Ambas salidas también tienen un mensaje del cliente sin transcripción accesible.
- En `14_rent_exclusive`, LangExtract clasifica el rechazo de SmartHousing como señal sensible y propone revisión humana; el extractor actual propone preguntar por la zona. Hace falta adjudicar la conducta esperada antes de considerar una de las dos mejor.
- En `23_global_optout_supersedes`, ambos proponen revisión humana, pero el replay de LangExtract muestra como motivo la restricción anterior sobre llamadas, mientras que el extractor actual refleja la prohibición posterior de cualquier contacto. Coincidir en tipo no garantiza conservar el motivo correcto.
- Las repeticiones de `01_laura` producen 6, 1 y 6 candidatos con LangExtract; en `05_laura_excluded` producen 6, 1 y 6. Se debe revisar qué información se pierde y por qué, sin atribuir automáticamente la diferencia a la librería o al modelo.

## Archivos y reproducción

Las respuestas detalladas de esta ejecución están en `evaluation/results/langextract-spike/langextract.jsonl` y `evaluation/results/langextract-spike/openai.jsonl`. Incluyen mensajes ficticios, respuesta bruta, resultados de extracción, diagnósticos, incidencias e intervención. El directorio de resultados está ignorado por Git y es local a este checkout. La prueba exploratoria está en `tests/tooling/langextract-spike.test.ts`; queda desactivada en la suite normal y no modifica el código del producto.

Para repetir, descomprimir el ZIP en `/private/tmp/libeen-langextract-spike`, crear `evaluation/results/langextract-spike` y ejecutar:

```bash
SPIKE_RUN=1 pnpm exec vitest run tests/tooling/langextract-spike.test.ts
```

Para repetir la comparación en vivo, cargar `OPENAI_API_KEY` y opcionalmente `OPENAI_MODEL` en el entorno y añadir `SPIKE_LIVE=1`. Esto realiza hasta 72 llamadas facturables, sobrescribe `openai.jsonl` y se detiene en el primer error. Usar `SPIKE_INPUT` y `SPIKE_OUTPUT` para otras rutas; el directorio de salida debe existir. El replay offline sobrescribe `langextract.jsonl`. Guardar una copia de los resultados antes de repetir si se desea compararlos.

## Siguiente paso recomendado

Adjudicar los 24 casos o ejecutar ambos enfoques sobre el benchmark adjudicado, revisar falsos positivos y negativos y conservar trazas y fallos de cada etapa. Antes de usar esta integración en un flujo operativo habría que decidir explícitamente cómo tratar una extracción incompleta y las señales semánticas descartadas. Esta prueba no modifica ese comportamiento.
