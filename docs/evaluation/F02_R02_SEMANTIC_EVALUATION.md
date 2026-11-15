# F02-R02 — Oráculo semántico provisional

La evaluación usa exclusivamente las capturas cuyo SHA-256 es `d28d6f8bb31b4fc0d1cdb809256677e4e6a85a26cce1e6c84e8257ac9823380f`, entradas sintéticas de desarrollo y el diagnóstico generado por el replay R01. No sustituye el oráculo F01 ni modifica las capturas. La anotación adicional procede de inspección manual de los mensajes y del informe R01; **no tiene adjudicación independiente**. Las etiquetas no incluidas quedan pendientes, no se interpretan como negativas.

Para reproducir (rutas de salida nuevas):

```sh
F02_CAPTURED_ZIP="$PWD/.eval-results/f02-24-20261115-multipass.zip" F02_DIAGNOSIS_OUTPUT=/private/tmp/f02-r01-r02.json pnpm exec vitest run tests/evaluation/f02-captured-replay.test.ts
F02_CAPTURED_ZIP="$PWD/.eval-results/f02-24-20261115-multipass.zip" F02_R01_DIAGNOSIS=/private/tmp/f02-r01-r02.json F02_R02_OUTPUT=/private/tmp/f02-r02.json pnpm exec vitest run tests/evaluation/f02-r02-semantic.test.ts
```

La primera prueba reproduce el pipeline offline; la segunda verifica el hash antes de leer el ZIP y genera resultados trazables con índices de llamada, candidatos, citas, etiquetas, estado por atributo, señales y métricas. El archivo R01 es una entrada generada localmente, no una traza histórica autenticada; no se valida criptográficamente su relación con el ZIP, por lo que debe generarse en el paso anterior. No se realiza ninguna llamada de proveedor.

## Métricas de extracción inicial

Solo están anotados los tres hechos financieros de B01 por extractor y la falta de soporte de desired_locations en time_nonurgent-P2. La unidad de análisis es candidato por extractor; no son escenarios independientes. Una cita válida se comprueba contra el texto del cliente y el fragmento semántico anotado; offsets originales no se puntúan (R01 los normaliza). Las ausencias esperadas se miden separadamente como cobertura. No se infieren etiquetas de unidad, periodo o base cuando no están definidas.

Cobertura de hechos anotados B01: **9/9**.

| Atributo | Correctos / evaluables | Sin resolver | No evaluables | Sin etiqueta |
| --- | ---: | ---: | ---: | ---: |
| fieldId | 12/12 | 0 | 33 | 158 |
| value | 9/9 | 0 | 33 | 161 |
| subject | 9/9 | 0 | 33 | 161 |
| unit | 9/9 | 0 | 33 | 161 |
| period | 6/6 | 0 | 33 | 164 |
| precision | 9/9 | 0 | 33 | 161 |
| incomeBasis | 3/3 | 0 | 33 | 167 |
| evidence | 9/12 | 0 | 33 | 158 |

Los 3 errores de evidencia corresponden a las tres propuestas de Madrid como ciudad deseada en time_nonurgent-P2. Cada cita es literal pero «ciudad de referencia» no acredita preferencia de búsqueda. Las 9 afirmaciones financieras de B01 están correctas en los atributos anotados aunque el resultado público requiera revisión.

## Señales protegidas

Una unidad es escenario × categoría × etapa. S1 puntúa presencia del candidato; S2 puntúa confirmación o descarte capturado y marca sin resolver IDs compartidos entre categorías o veredictos inciertos. El resultado público solo se puntúa cuando la interpretación terminó; un fallo anterior es no evaluable, no un falso negativo de la salida pública. Un positivo genuino anotado requiere también la cita literal y el anclaje semántico correspondiente. Los controles negativos de OPT_OUT cubren ambas variantes de price_question, documentation_request, cost_real y time_nonurgent.

| Señal | Etapa | Correctos / evaluables | VP | VN | FP | FN | Sin resolver | No evaluables | Sin etiqueta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| OPT_OUT | S1 | 2/9 | 1 | 1 | 7 | 0 | 0 | 3 | 12 |
| OPT_OUT | S2 | 4/8 | 1 | 3 | 4 | 0 | 1 | 3 | 12 |
| OPT_OUT | public | 0/1 | 0 | 0 | 1 | 0 | 0 | 22 | 1 |
| TRUST | S1 | 2/2 | 2 | 0 | 0 | 0 | 0 | 3 | 19 |
| TRUST | S2 | 2/2 | 2 | 0 | 0 | 0 | 0 | 3 | 19 |
| TRUST | public | 0/0 | 0 | 0 | 0 | 0 | 0 | 22 | 2 |
| URGENT | S1 | 1/1 | 1 | 0 | 0 | 0 | 0 | 3 | 20 |
| URGENT | S2 | 1/1 | 1 | 0 | 0 | 0 | 0 | 3 | 20 |
| URGENT | public | 0/0 | 0 | 0 | 0 | 0 | 0 | 22 | 2 |
| BINDING_CLAIM | S1 | 0/1 | 0 | 0 | 0 | 1 | 0 | 3 | 20 |
| BINDING_CLAIM | S2 | 0/1 | 0 | 0 | 0 | 1 | 0 | 3 | 20 |
| BINDING_CLAIM | public | 0/0 | 0 | 0 | 0 | 0 | 0 | 22 | 2 |

Disponibilidad: **2/21**, con 3 ejecuciones multietapa no evaluables. No es una métrica de exactitud semántica. Acción comercial: **0/1** correcta entre las etiquetadas y evaluables; 22 no evaluables y una sin etiqueta. En particular, STOP_CONTACT en time_nonurgent-P2 es incorrecta. Las cinco validaciones S2 incompletas y las 14 revisiones se conservan por separado en los diagnósticos R01.

## Resultado por escenario

En la columna de señales se indican solo las categorías etiquetadas: S1/S2/público. TP, TN, FP, FN, U y NE significan verdadero positivo, verdadero negativo, falso positivo, falso negativo, sin resolver y no evaluable. El resto de categorías está sin etiqueta. Las tres correcciones quedan NE en todo aspecto dependiente de historial.

| Escenario | Disponibilidad / reconciliación | Señales etiquetadas S1 / S2 / público | Hechos y acción |
| --- | --- | --- | --- |
| B01 | unavailable / human_review_required | sin etiqueta | 9/9 candidatos financieros correctos |
| B05 | unavailable / human_review_required | TRUST: TP / TP / NE | pendiente de adjudicación |
| B06 | unavailable / human_review_required | sin etiqueta | pendiente de adjudicación |
| B08 | unavailable / failed | URGENT: TP / TP / NE; BINDING_CLAIM: FN / FN / NE | pendiente de adjudicación |
| B10 | unavailable / failed | OPT_OUT: TP / TP / NE; TRUST: TP / TP / NE | pendiente de adjudicación |
| C01 | not_evaluable / not_evaluable | sin etiqueta | historial NE |
| F01D1-binding_request-P2-V2 | unavailable / human_review_required | sin etiqueta | pendiente de adjudicación |
| F01D1-binding_request-P1-V2 | unavailable / failed | sin etiqueta | pendiente de adjudicación |
| F01D1-cost_real-P2-V2 | unavailable / human_review_required | OPT_OUT: TN / TN / NE | pendiente de adjudicación |
| F01D1-cost_real-P1-V2 | unavailable / human_review_required | OPT_OUT: FP / FP / NE | pendiente de adjudicación |
| F01D1-basis_correction-P2-V2 | not_evaluable / not_evaluable | sin etiqueta | historial NE |
| F01D1-amount_correction-P2-V2 | not_evaluable / not_evaluable | sin etiqueta | historial NE |
| F01D1-documentation_request-P2-V2 | unavailable / human_review_required | OPT_OUT: FP / FP / NE | pendiente de adjudicación |
| F01D1-documentation_request-P1-V2 | unavailable / human_review_required | OPT_OUT: FP / TN / NE | pendiente de adjudicación |
| F01D1-price_question-P2-V2 | unavailable / human_review_required | OPT_OUT: FP / TN / NE | pendiente de adjudicación |
| F01D1-price_question-P1-V2 | unavailable / human_review_required | OPT_OUT: FP / U / NE | pendiente de adjudicación |
| F01D1-time_nonurgent-P2-V2 | complete / consolidated | OPT_OUT: FP / FP / FP | 3/3 candidatos de ubicación sin respaldo; STOP_CONTACT incorrecta |
| F01D1-time_nonurgent-P1-V2 | unavailable / failed | OPT_OUT: FP / FP / NE | pendiente de adjudicación |
| F01D1-trust_false_friend-P2-V2 | unavailable / human_review_required | sin etiqueta | pendiente de adjudicación |
| F01D1-trust_false_friend-P1-V2 | unavailable / human_review_required | sin etiqueta | pendiente de adjudicación |
| F01D1-trust_real-P2-V2 | complete / consolidated | sin etiqueta | pendiente de adjudicación |
| F01D1-trust_real-P1-V2 | unavailable / human_review_required | sin etiqueta | pendiente de adjudicación |
| F01D1-urgent_real-P2-V2 | unavailable / failed | sin etiqueta | pendiente de adjudicación |
| F01D1-urgent_real-P1-V2 | unavailable / human_review_required | sin etiqueta | pendiente de adjudicación |

## Evidencia y límites

- B01: «3.800 € netos entre los dos», «18.000 más o menos» y «préstamo del coche de 250 € al mes» respaldan ingreso conjunto aproximado neto, ahorro aproximado y deuda mensual. El replay solicita revisión por seguridad y sujetos, sin borrar lo que propusieron E1–E3.
- B05: «y esto es fiable? no sera una estafa no» respalda TRUST en S1/S2; ello no valida la atribución de buyer_count rechazada por el replay. B10 añade «No quiero que me contactéis más»: OPT_OUT es genuino en S1/S2 pero no hay resultado público por validación incompleta.
- B08: «necesitamos salir del piso en dos semanas» respalda URGENT; la petición de estar «aprobados» por escrito no aparece como BINDING_CLAIM en S1 ni S2. La cobertura pública es NE porque el pipeline falló antes de entregarla.
- En time_nonurgent-P2, esperar doce meses o más no solicita cese de contacto. En price_question-P1, dos categorías comparten signalId y S2 emite veredictos distintos: la correspondencia es ambigua y se marca sin resolver, no se inventa una confirmación.

El evaluador no pretende adjudicar automáticamente todas las afirmaciones del dataset: su etiquetado intencionalmente escaso deja amplias categorías sin evaluar. No evalúa la semántica de los veredictos S2 más allá de las etiquetas explícitas ni acredita robustez estadística; las tres correcciones requieren reconstrucción de historial. No evalúa borradores, entrega real ni costes. Las anotaciones no son ground truth independiente, y el replay y su configuración actual no prueban identidad con el código de la ejecución original.

## Recomendaciones para R03–R07

- Ampliar y adjudicar independientemente el oráculo por ocurrencia y sujeto, con pares positivos/negativos y control de versiones, sin utilizar holdout para ajustar reglas.
- Añadir pruebas adversariales para las correspondencias de revisión por candidato, colisiones de signalId y referencias literales semánticamente insuficientes.
- Investigar atribución y reconciliación conservando la abstención ante evidencia o identidad incierta; evaluar un CCR separado si se deben exponer señales verificadas junto con revisión.
- Investigar específicamente opt-out y cobertura de las señales protegidas con controles negativos, manteniendo las protecciones genuinas.
- Reconstruir historial multietapa antes de puntuar correcciones y repetir evaluaciones con capturas verificadas; no modificar retrospectivamente el oráculo histórico.
