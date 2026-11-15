# F02-R04a — correspondencia de revisiones contextuales

## Contrato interno y decisión

Se mantiene `ContextReview` por candidato y el par exacto `(groupId, candidateId)`: una revisión por cada candidato de cada `ClaimGroup`. Una revisión por grupo no prueba que se hayan evaluado sus candidatos individuales. No se expande, replica, deduplica ni inventa una revisión. La correspondencia completa es necesaria, pero no suficiente: la evidencia, atribución, refutaciones, reconciliación y seguridad siguen sometidas a las comprobaciones existentes. No cambia `Interpreter` V1, el orquestador, el contrato público, prompts ni políticas.

`checkContextCoverage` verifica unicidad de identificadores de grupo y candidato, pares esperados y correspondencia exacta de las revisiones. Rechaza faltantes, pares ajenos, duplicados e IDs ambiguos en la estructura esperada. Un duplicado idéntico se rechaza igual que uno diferente. La comparación estructural distingue entradas idénticas y variantes distintas; **una variante distinta puede diferir solo en la justificación y no implica necesariamente contradicción semántica**. Ninguna variante se elimina y los desacuerdos entre candidatos se entregan intactos a la lógica posterior. Si falla la cobertura, el pipeline termina `incomplete_contextual_review` antes de reconciliar hechos o señales.

Los diagnósticos contienen exclusivamente conteos de cobertura, `identicalDuplicates`, `conflictingDuplicates` (variantes estructuralmente distintas), `ambiguousExpected`, `duplicateGroupIds` y `duplicateCandidateIds`, sin IDs, citas ni justificaciones. `groupsReviewedOnce` cuenta candidatos **distintos** cubiertos por grupo: un duplicado del mismo candidato no cuenta como un segundo candidato revisado. Las categorías de conteo pueden solaparse; un par ajeno repetido cuenta tanto como ajeno como duplicado. El análisis de cobertura no declara verdadera una revisión ni cambia el veredicto de seguridad.

## Antes y después

Antes se exigía ya cardinalidad exacta y se rechazaba cualquier duplicado, pero el diagnóstico no distinguía copias idénticas de variantes y podía contar duplicados como cobertura adicional de un grupo. La comprobación actual mantiene el rechazo, precisa los conteos y rechaza explícitamente IDs esperados repetidos incluso cuando los pares son distintos. No intenta mejorar la cardinalidad de las capturas ni corrige semántica del modelo.

El replay R01 de los 21 casos de una etapa sigue coincidiendo en su proyección pública original. Las regresiones de capturas verifican SHA-256 y consumen todas las operaciones:

- B08: 18 esperadas, 18 recibidas, una ausente y una ajena: `incomplete_contextual_review`, sin consolidación.
- B10: 11 esperadas, 6 recibidas, cinco ausentes: `incomplete_contextual_review`, pese a la señal OPT_OUT capturada. No se fabrican revisiones ni se publica la señal mediante un contrato parcial.

El evaluador R02 pasa frente al replay actual. La muestra y sus etiquetas provisionales no demuestran mejoras de extracción o seguridad semántica; la revisión S2 puede seguir equivocándose. C01 y las otras dos correcciones continúan fuera de la reproducción multietapa de R01.

## Casos adversariales y verificación

Las pruebas cubren correspondencia completa y fuera de orden, faltantes, duplicados idénticos y distintos, grupo/candidato ajeno, IDs esperados ambiguos y conteos invariantes al orden. Las pruebas existentes del pipeline comprueban refutaciones entre candidatos y señales protegidas inciertas; las nuevas comprueban que un S2 incompleto no alcance consolidación ni exponga contenido sensible en sus diagnósticos. Se conservan capturas, oráculos y fixtures canónicos.

Resultados observados en esta rama:

- `pnpm test`: **PASS**, 493 tests; 9 omitidos (incluyen evaluaciones opt-in).
- Replay R01 y regresiones B08/B10 con `F02_CAPTURED_ZIP`: **PASS**, 3 tests; no se invocó OpenAI.
- Evaluador R02 con el diagnóstico R01 recién generado: **PASS**, 4 tests.
- `pnpm typecheck` y `pnpm lint`: **PASS**.
- `pnpm build`: **PASS**; no forma parte de la semántica evaluada.

No se ha implementado SubjectBinding nuevo, correcciones históricas, publicación parcial ni CCR de blockers. Los resultados parciales siguen fuera del contrato V1.
