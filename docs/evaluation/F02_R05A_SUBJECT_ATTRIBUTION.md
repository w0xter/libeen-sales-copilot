# F02-R05a — atribución determinista de sujetos

## Alcance y reglas

`bindSubjects` mantiene la resolución por grupo y la abstención de V1. Ahora exige que cada revisión usada para vincular un sujeto sea atómica, `supported`, referida a una ocurrencia válida y acompañada de evidencia anclada que coincida con la del candidato; esto también se aplica a sujetos ya conocidos sin `subjectAttribution`. Una refutación, ausencia o incertidumbre hace que el grupo requiera revisión, y el diagnóstico interno conserva esa categoría sin añadir texto del cliente. Las referencias y citas se siguen validando; no se interpreta una cita literal como prueba semántica universal.

Se rechaza la normalización de un grupo cuyos candidatos declaran sujetos distintos, aunque S2 les asigne la misma clase. Cuando existen varias ocurrencias de un mismo campo individual en un mensaje, una atribución `local_speaker` no puede convertirlas en la misma persona a partir solo del identificador local de mensaje: se solicita revisión. Los sujetos previamente conocidos y separados pueden seguir representando dos ocurrencias si cumplen las comprobaciones existentes. El ID local sigue acotado al caso y al mensaje; dos mensajes no se enlazan solo por pertenecer al mismo expediente. Se preservan las reglas previas para unidad compradora, expediente, correcciones y conflictos históricos. `other_person` y `ambiguous` siguen sin autorizar una identidad nueva. Ninguna de estas reglas crea un participante identificado ni valida semántica por mayoría de modelos.

**Límite de contrato interno:** `bindSubjects` no recibe `FactSchema` y no puede comprobarlo por sí mismo. El pipeline existente pasa los candidatos por `groupClaims`/`validateCandidate` con el `FactSchema` antes de `bindSubjects`, que no modifica su ámbito. Esto preserva la comprobación por la ruta actual; una invocación directa de `bindSubjects` no tiene esa garantía. Para satisfacer una comprobación autónoma del esquema en esa frontera, el integrador tendría que autorizar pasar `factSchema` desde `pipeline.ts` y adaptar consumidores y pruebas. Se solicita esa ampliación; no se ha importado un esquema demo fijo ni alterado el pipeline. Este punto queda pendiente, no se declara cumplida la comprobación autónoma.

## Casos y límites

- **B05:** `buyer_count` de `buying_unit` con revisión `local_speaker` sigue rechazándose; no se reinterpreta como persona ni se inventa una identidad. TRUST se mantiene identificado en la traza de revisión, pero V1 no publica parcialmente la señal cuando el análisis requiere revisión. No se inventa contenido del audio.
- **B01:** el ingreso conjunto aproximado se mantiene de ámbito `buying_unit`, sin división ni conversión a ingreso individual. La captura sigue solicitando revisión; el resultado de R02 sobre candidatos no demuestra que el grupo haya sido validado.
- **Dos declaraciones:** las pruebas existentes cubren importes iguales y distintos con dos sujetos conocidos y ocurrencias separadas. Si el revisor pretende asociar ambas al mismo hablante local sin vínculo suficiente, las nuevas pruebas exigen abstención. No se afirma resolver de forma general la identidad de una tercera persona; queda para R05b.
- **Rosa:** las pruebas existentes ejercitan el ahorro explícito cero como unidad compradora; no se convierte información ausente en cero.
- **Adversariales:** se prueban revisiones refutadas, inciertas o ausentes, evidencia de revisión ajena al candidato, identidades discordantes, mensajes distintos e historial ambiguo. Las pruebas existentes cubren atribuciones `other_person`, citas inventadas y referencias equivocadas. Las revisiones S2 completas siguen siendo obligatorias mediante R04a.

Pendiente para R05b: vinculación probada de participantes identificados y de varias ocurrencias dentro de un mensaje, continuidad entre mensajes, evidencia contextual semánticamente suficiente y estrategias para reducir abstenciones sin agrupar personas distintas. No interpretar una clasificación S2 como demostración independiente; la semántica del modelo, el grafo completo de dependencias y la reconciliación global no se han resuelto aquí.

## Comparación con R01/R02

El comparador nuevo conserva las capturas y el oráculo; admite exclusivamente llamadas `J` históricas no consumidas y las registra. Los 21 resultados públicos comparados mantienen estado/error o acción histórica: 14 revisiones, 5 errores de validación y 2 resultados completos. No se comparan íntegramente hechos, eventos ni borradores. C01 y las dos correcciones del dataset siguen sin reconstruirse.

La prueba original estricta R01 **falla** en `price_question-P2` porque queda sin consumir una respuesta histórica `J`: ahora se requiere revisión de sujeto antes de invocar adjudicación. El comparador R05a registra también un `J` no consumido en `price_question-P1`; ambos mantienen el resultado público de revisión. En B05 la categoría interna `unresolved_material` ya no se genera al retirarse antes el grupo con sujetos incompatibles; la atribución sigue sin resolverse y la salida pública permanece de revisión. Estos cambios de traza no prueban mejor precisión semántica. R02 pasa con la salida del comparador nuevo; sus etiquetas son provisionales.

Para reproducir desde la raíz con rutas de salida nuevas:

```sh
F02_CAPTURED_ZIP="$PWD/.eval-results/f02-24-20261115-multipass.zip" F02_R05A_OUTPUT=/private/tmp/f02-r05a-nuevo.json pnpm exec vitest run tests/evaluation/f02-r05a-captured.test.ts tests/evaluation/f02-r04a-captured.test.ts
F02_CAPTURED_ZIP="$PWD/.eval-results/f02-24-20261115-multipass.zip" F02_R01_DIAGNOSIS=/private/tmp/f02-r05a-nuevo.json pnpm exec vitest run tests/evaluation/f02-r02-semantic.test.ts
```

La comparación solo se ejecuta offline; no se modifica el ZIP ni se consulta OpenAI. El archivo de salida contiene datos sintéticos y debe permanecer local.

## Verificación observada

- Comparador R05a y capturas B08/B10: **PASS**, 3 tests. R02: **PASS**, 4 tests.
- `pnpm test`: **PASS**, 500 tests, 10 omitidos; las pruebas opt-in se ejecutaron aparte.
- `pnpm typecheck` y `pnpm lint`: **PASS**.
- R01 estricto: **FAIL** por la operación J no consumida indicada arriba; la prueba y sus expectativas históricas no se modificaron.
- `pnpm build`: **PASS**.

No se cambió el contrato público, pipeline, reconciliador, aplicación, dominio, configuración, fixtures ni prompts. No se implementó reconciliación parcial ni contrato V2. El posible cambio para validar el esquema dentro de la frontera queda bloqueado por el alcance de R05a.
