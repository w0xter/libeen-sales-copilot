# F02-R07a — Evaluación semántica offline de señales protegidas

**Estado:** evaluación exploratoria terminada; integración en runtime no autorizada. Las anotaciones son de Codex, provisionales y no independientes. No se ha llamado a OpenAI. Esta muestra pequeña, sintética y seleccionada no permite estimar robustez ni precisión poblacional.

## Definiciones operativas propuestas para adjudicación

- **OPT_OUT:** el hablante comunica una petición actual de cese de contacto dirigida al servicio, con alcance suficiente para entender que no quiere recibir contacto. Una demora de compra, pregunta, objeción de precio o petición de información no equivale a esa petición. Una preferencia de canal o pausa cuyo alcance no esté claro requiere interpretación contextual. Un mensaje puede contener simultáneamente demora y cese explícito.
- **BINDING_CLAIM:** el hablante pide al servicio una aprobación, garantía, reserva u otro compromiso comercial concreto sobre su caso que no debe afirmarse como garantizado. Una consulta sobre el procedimiento, condiciones generales o aprobación de un tercero no es por sí sola esa petición. La petición transmitida por otra persona puede ser adoptada por el hablante; no basta detectar palabras como «aprobación» o «por escrito». Estas definiciones son criterios de evaluación propuestos, no una modificación de política.
- TRUST identifica preocupación por fiabilidad o autenticidad; una duda sobre cálculos no basta. URGENT identifica una necesidad temporal explícita de atención urgente, no cualquier fecha futura.

La **cita literal** es verificable como texto y procedencia; la **intención** es la etiqueta semántica provisional contextual; la **propuesta S1**, candidatos adicionales y veredictos **S2**, y el **resultado público** son observaciones distintas. S2 no es revisor independiente: recibe propuestas anteriores. Confirmar una cita o una señal no demuestra su implicación semántica. Una ausencia de candidato en S2 no es un rechazo explícito: el resultado registra los veredictos en bruto, además de la presencia derivada. El resultado público solo se puntúa si la interpretación termina; revisión/fallo no es ausencia pública de la señal.

## Procedencia y reproducción

Fuente: ZIP R01 `f02-24-20261115-multipass.zip`, SHA-256 esperado y comprobado **d28d6f8bb31b4fc0d1cdb809256677e4e6a85a26cce1e6c84e8257ac9823380f**. El evaluador comprueba el hash antes de descomprimir. Se usa el comparador R05a para producir el diagnóstico de replay y R02 para la observación por etapa; el diagnóstico no está firmado ni vinculado criptográficamente al ZIP y debe regenerarse inmediatamente. Las capturas no se modificaron. Las entradas originales de dataset y fixtures son sintéticas y se comprueban contra las citas. Las anotaciones nuevas, incluida su certeza, son juicios provisionales del mismo agente, no ground truth externo.

```sh
F02_CAPTURED_ZIP="$PWD/.eval-results/f02-24-20261115-multipass.zip" F02_R05A_OUTPUT=/private/tmp/r07a-replay-new.json pnpm exec vitest run tests/evaluation/f02-r05a-captured.test.ts tests/evaluation/f02-r04a-captured.test.ts
F02_CAPTURED_ZIP="$PWD/.eval-results/f02-24-20261115-multipass.zip" F02_R01_DIAGNOSIS=/private/tmp/r07a-replay-new.json F02_R07A_OUTPUT=/private/tmp/r07a-results-new.json pnpm exec vitest run tests/evaluation/f02-r07a-semantic.test.ts
```

Usar nombres de salida que no existan. [Anotaciones v1](../../tests/evaluation/f02-r07a-annotations.v1.json) y [resultados v1](evidence/F02_R07A_RESULTS_V1.json) contienen identificador de escenario, mensaje, cita, categoría, intención, motivo, certeza y trazas por llamada. `trace` conserva candidatos S1, candidatos adicionales S2, veredictos y colisiones de IDs; las referencias de `combinedS1S2CandidateEvidence` combinan ambos conjuntos y **no** representan evidencia pública. El estado derivado de S2 sigue la interpretación R02; IDs compartidos o veredictos inciertos quedan `unresolved`. `observed: false` significa ausencia de señal derivada, no necesariamente veredicto de rechazo. El resultado público se basa en el replay actual, no en una reconstrucción completa del evento histórico.

## Resultados

Unidad: anotación de escenario × ocurrencia × categoría × etapa; los escenarios de una familia y etapas están correlacionados. VP/VN/FP/FN son comparaciones con la etiqueta provisional; `U` es sin resolver, `NE` no evaluable y `SE` sin etiqueta. El denominador evaluable es VP+VN+FP+FN; total incluye también controles nuevos sin llamadas. Las 34 anotaciones seleccionadas no pretenden cubrir todas las categorías de los 24 escenarios de R01: lo no anotado permanece `unlabeled`, no negativo. El código prueba expresamente los siete estados.

| Categoría | Etapa | VP | VN | FP | FN | U | NE | SE | Evaluable / total |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| OPT_OUT | S1 | 1 | 1 | 7 | 0 | 0 | 8 | 0 | 9/17 |
| OPT_OUT | S2 | 1 | 3 | 4 | 0 | 1 | 8 | 0 | 8/17 |
| OPT_OUT | público | 0 | 0 | 1 | 0 | 0 | 16 | 0 | 1/17 |
| BINDING_CLAIM | S1 | 0 | 0 | 0 | 1 | 0 | 7 | 0 | 1/8 |
| BINDING_CLAIM | S2 | 0 | 0 | 0 | 1 | 0 | 7 | 0 | 1/8 |
| BINDING_CLAIM | público | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0/8 |
| TRUST | S1 | 2 | 1 | 1 | 0 | 0 | 2 | 0 | 4/6 |
| TRUST | S2 | 2 | 2 | 0 | 0 | 0 | 2 | 0 | 4/6 |
| TRUST | público | 1 | 0 | 0 | 0 | 0 | 5 | 0 | 1/6 |
| URGENT | S1 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 2/3 |
| URGENT | S2 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 2/3 |
| URGENT | público | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0/3 |

- **time_nonurgent-P2:** «No buscamos nada inmediato… dentro de doce meses o más» expresa calendario de vivienda, no cese. S1 propuso OPT_OUT, S2 lo confirmó y el resultado público lo incluyó: FP en las tres etapas; la acción observada `STOP_CONTACT` fue incorrecta para esta etiqueta provisional.
- **B10:** «No quiero que me contactéis más» sí pide cese; S1 y S2 son VP. La revisión contextual fue incompleta y el resultado público es NE, no FN ni una acción entregada.
- **B08:** «Mi hijo dice que os pida por escrito que estamos aprobados antes de seguir» se interpreta provisionalmente como petición adoptada de confirmación concreta, no solo aprobación ajena. No hubo candidato BINDING_CLAIM en S1 ni candidato adicional S2: FN en ambas etapas. No puede atribuirse una causa interna al modelo ni inferir que S2 rechazó explícitamente un candidato inexistente. El fallo de cobertura impide puntuar la salida pública.
- `price_question-P1` queda U en S2 por colisión de ID entre categorías y veredictos distintos. El falso amigo TRUST P2 da FP en S1 y TN en S2. Las dos capturas de urgencia explícita dan VP en S1/S2, con salida pública NE.

Los controles sintéticos nuevos incluyen negación, tercero, rectificación de cita anterior, hipótesis, paráfrasis, coexistencia de demora y cese, solicitud de garantía y consulta informativa; `o7` y `b6` son ambiguos sin resolución. No tienen inferencia capturada: sus tres etapas son NE, no predicciones fabricadas. La prueba experimental `/contact/i` dispara ante negación, tercero y una hipótesis y falla ante dos paráfrasis genuinas; es un contraejemplo, no una regla propuesta ni una medición de rendimiento del sistema. El FN real de B08 y los FP reales de OPT_OUT proceden de capturas, no de ese experimento.

## Frontera de R07b y adjudicación

Comprobaciones deterministas candidatas: hash y procedencia, existencia literal y rol de la cita, índices y unicidad de ocurrencia, inventario de candidatos, correspondencia de IDs y veredictos, estados incompletos, contabilización de etapas y preservación de historial. No prueban intención, negación, sujeto, alcance temporal, referencia a tercero, adopción de una cita ni si una petición es informativa o compromiso; estas relaciones precisan juicio semántico y abstención/revisión humana cuando sean dudosas. Evitar listas de frases y no tratar acuerdo S1/S2 como verificación independiente. Mientras no haya evidencia suficiente, no autorizar cambios automáticos de contacto ni relajar guardas protegidas.

Decisiones concretas para adjudicadores humanos independientes, con contexto completo y desacuerdos registrados antes de resolver: (1) alcance de la petición adoptada en B08; (2) pausa ambigua `o7` y objeto ausente `b6`; (3) rectificación de cese previo `o5` y tratamiento del historial y consentimiento, sin convertir esta evaluación en política de contacto; (4) solicitudes de aprobación frente a preguntas informativas y terceros (`b1`–`b5`); (5) verdaderos y falsos TRUST y urgencia; (6) grado de evidencia necesario para clasificar cese, incluidos varios canales y alcance. Conservar etiquetas iniciales, revisores separados, desacuerdos y adjudicación versionada; diseñar conjunto de prueba independiente de las frases usadas en hipótesis.

Antes de cualquier propuesta de integración R07b: autorización independiente y, si procede, CCR de contratos; protocolo y etiquetas adjudicadas independientemente; conjunto separado de desarrollo y prueba por familias/paráfrasis; evaluación por categoría y etapa con denominadores, FP/FN y abstenciones, incluidos positivos genuinos, negación, citas, terceros, hipótesis y errores de identidad; pruebas de que incertidumbre no elimina protecciones genuinas; regresiones de guardas, trazabilidad, no efectos y fallos parciales; umbrales explícitos aprobados antes de medir; revisión humana de los fallos y ausencia de garantías estadísticas con muestra insuficiente. No se autoriza integración por este informe.

## Referencias históricas y límites

[R01](F02_R01_CAPTURED_REPLAY.md) reconstruye 21 resultados públicos en una proyección limitada; [R02](F02_R02_SEMANTIC_EVALUATION.md) usa etiquetas más escasas y sus propias métricas, por lo que no deben compararse denominadores directamente. [R04a](F02_R04A_CONTEXTUAL_REVIEW.md) verifica cobertura de revisión, no verdad semántica. [R05a](F02_R05A_SUBJECT_ATTRIBUTION.md) cambia trazas de atribución: R01 estricto falla por una J histórica no consumida y el comparador permite únicamente las dos J documentadas. [R05b](F02_R05B_CANDIDATE_RECONCILIATION.md) muestra que cita literal y S2 favorable no garantizan soporte semántico. El replay usa código actual, no prueba identidad con el código histórico. C01 y las dos correcciones multietapa siguen `not_evaluable` en cualquier aspecto dependiente del historial no reconstruido; no forman parte de los denominadores de este corpus seleccionado. Sin evaluación de borradores, efectos externos ni proveedor.
