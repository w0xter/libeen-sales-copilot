# F-02 — Análisis de los resultados de 24 escenarios

Se reconstruyeron los inputs iniciales y se reprodujeron offline las salidas capturadas de multipass contra el pipeline actual. En los **21 casos de una sola etapa**, los resultados públicos coincidieron con los originales: 14 revisiones humanas, 5 fallos de validación y 2 resultados completos. Se excluyeron C01 y las dos correcciones del dataset porque requieren reconstruir transiciones e historial. La reproducción usa respuestas reales capturadas, no vuelve a consultar el modelo; los resultados internos reconstruidos no son una traza registrada en la ejecución original. Detalles sintéticos en `.eval-results/f02-24-offline-diagnosis.json`, ignorado por Git.

## Fuentes de abstención

Entre los 21 casos reproducidos, 10 incluyeron atribución de sujeto entre sus motivos de revisión; 4, rechazo o ambigüedad de agrupación; 3, seguridad protegida incierta; 2, hechos materiales no resueltos; y 1, identidad ambigua. Las categorías se solapan y no equivalen a fallos independientes. Los 5 errores de validación fueron `incomplete_contextual_review`: omisiones, duplicados o pares ajenos en S2.

En B05, S1/S2 identificaron y confirmaron la objeción TRUST real, pero S2 clasificó como `local_speaker` el sujeto de `buyer_count`, cuyos candidatos tenían ámbito `buying_unit`; SubjectBinding rechazó el grupo y la interpretación no se entregó. En B06 hubo además un candidato de ingresos que afirmaba base bruta, que S2 refutó: en ese punto la revisión era protectora. En el caso de urgencia `F01D1-urgent_real-P1-V2`, la señal URGENT fue confirmada, pero S2 encontró injustificadas propuestas de siguiente paso; la atribución de ese grupo llevó a revisión y no se entregó la interpretación.

En B10, el escáner y S2 identificaron y confirmaron el opt-out real, pero S2 devolvió una revisión por cada uno de seis grupos en lugar de las once revisiones de candidatos esperadas. El pipeline falló antes de devolver el bloqueo o la acción de no contacto. En B08, S1/S2 detectaron urgencia pero sus salidas capturadas no incluyeron la solicitud escrita de aprobación como BINDING_CLAIM; S2 además devolvió un par ajeno y omitió otro esperado. No se puede tratar el fallo seguro como prueba de cobertura del aviso omitido.

El diseño agrega salvaguardas, pero el intérprete traduce `human_review_required` a `MODEL_OUTPUT_INVALID`; el contrato público no permite devolver simultáneamente hechos aceptados, hallazgos protegidos y una solicitud de revisión. Así, una discrepancia sobre un grupo puede impedir que lleguen al orquestador hechos o señales ya identificados. Cambiar ese contrato requiere CCR; no se modifica automáticamente ni se eliminan guardas.

## Incidencias semánticas y de cobertura

El caso `time_nonurgent-P2-V2` es PASS del oráculo provisional pese a un OPT_OUT falso y `STOP_CONTACT`; además se aceptó una ciudad de referencia como ubicación buscada. En salidas intermedias de `cost_real-P1-V2`, `documentation_request-P2-V2` y `time_nonurgent-P1-V2`, el escáner y S2 confirmaron señales OPT_OUT para textos que, examinados en contexto, no solicitan el cese de contacto; esas tres ejecuciones terminaron absteniéndose, por lo que no son tres STOP_CONTACT ejecutados. Debe preservarse el opt-out genuino sin aceptar estas clasificaciones por mera coincidencia literal.

Hay también una brecha estructural en las objeciones comerciales: los esquemas de señal multipass aceptan `OPT_OUT`, `URGENT`, `BINDING_CLAIM`, `TRUST` y `PRIVACY`, pero no `COST`, `PRODUCT`, `TIME` o `FIT`. La interpretación consolidada incorpora bloqueos nuevos de esa reconciliación de señales. Por ello, un blocker COST nuevo no puede producirse por esta ruta aunque el evaluador lo espera en `cost_real`; no se debe interpretar esto como un simple defecto de evaluación ni ampliar el contrato sin estudiar sus efectos.

## Interpretación y límites

Tres extractores y un revisor añaden oportunidades de detección, pero también dependen de más salidas válidas y usan el mismo modelo. S2 recibe candidatos y señales previos, por lo que su acuerdo no constituye verificación independiente. La muestra contiene categorías correlacionadas y anotaciones provisionales; los PASS reflejan únicamente checks explícitos. No demuestra que la arquitectura sea intrínsecamente más robusta ni que single-pass sea seguro en general.

Prioridades: revisar una interfaz de abstención/guardas que preserve señales verificadas sin permitir avance inseguro; estudiar el CCR necesario; evaluar explícitamente las objeciones comerciales; mejorar la correspondencia de revisiones y el control semántico de opt-out con pruebas variadas; conservar los casos genuinos de no-contacto, urgencia y aprobación vinculante. No modificar el oráculo histórico para cambiar retrospectivamente el resultado ni ajustar prompts solo a C01.
