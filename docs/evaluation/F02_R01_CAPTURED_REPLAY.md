# F02-R01 — Replay capturado y diagnóstico causal

Fuente: ZIP `f02-24-20261115-multipass.zip`, SHA-256 `d28d6f8bb31b4fc0d1cdb809256677e4e6a85a26cce1e6c84e8257ac9823380f`. Son 16 informes, 24 ejecuciones y una repetición. El test usa únicamente el transporte en memoria: entrega las respuestas capturadas por rol y orden de intento, exige consumirlas todas y rechaza operaciones inesperadas. Para reproducir desde la raíz, sin credenciales:

```sh
F02_CAPTURED_ZIP="$PWD/.eval-results/f02-24-20261115-multipass.zip" F02_DIAGNOSIS_OUTPUT=/private/tmp/f02-r01-nuevo.json pnpm exec vitest run tests/evaluation/f02-captured-replay.test.ts --reporter=verbose
```

El destino de diagnóstico debe no existir; omitir la variable evita escribirlo. Los JSON de salida pueden contener datos y texto sintéticos y no deben subirse automáticamente. Se reconstruye la entrada desde fixtures y dataset congelados, sin modificarlos. Los detalles internos son una reconstrucción sobre el código actual, no una traza histórica. Para las 21 ejecuciones de etapa única se comparan estado público y error, o estado y acción calculada por dominio: 21/21 coinciden; no se comparan íntegramente hechos, borradores ni eventos end-to-end. El test no llama al proveedor ni ejecuta generación de borradores.

## Inventario por ejecución

R = revisión humana; V = validación; C = consolidado; NR = no reconstruido. Los códigos de agrupación y revisión se solapan. Las etapas listadas incluyen Repair y J cuando fueron capturados; las respuestas específicas están asociadas por archivo e índice dentro del ZIP.

| ID | Resultado | Motivos reconstruidos | Operaciones capturadas por índice |
| --- | --- | --- | --- |
| B01 | R | protected_safety, subject_attribution | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| B05 | R | unresolved_material, subject_attribution | 1:E1, 2:E2, 3:E3, 4:S1, 5:Repair, 6:S2 |
| B06 | R | unresolved_material, subject_attribution | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| B08 | V | incomplete_contextual_review | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| B10 | V | incomplete_contextual_review | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| C01 | NR | historial de dos etapas no reconstruido | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2, 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-binding_request-P2-V2 | R | subject_attribution | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| F01D1-binding_request-P1-V2 | V | incomplete_contextual_review | 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-cost_real-P2-V2 | R | subject_attribution | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| F01D1-cost_real-P1-V2 | R | subject_attribution | 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-basis_correction-P2-V2 | NR | historial de dos etapas no reconstruido | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2, 6:J, 7:E1, 8:E2, 9:E3, 10:S1, 11:S2 |
| F01D1-amount_correction-P2-V2 | NR | historial de dos etapas no reconstruido | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2, 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-documentation_request-P2-V2 | R | subject_attribution | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| F01D1-documentation_request-P1-V2 | R | ambiguous_identity, subject_attribution | 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-price_question-P2-V2 | R | grouping | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2, 6:J |
| F01D1-price_question-P1-V2 | R | protected_safety | 7:E1, 8:E2, 9:E3, 10:S1, 11:S2, 12:J |
| F01D1-time_nonurgent-P2-V2 | C | consolidado | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| F01D1-time_nonurgent-P1-V2 | V | incomplete_contextual_review | 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-trust_false_friend-P2-V2 | R | grouping, subject_attribution | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| F01D1-trust_false_friend-P1-V2 | R | grouping | 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-trust_real-P2-V2 | C | consolidado | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| F01D1-trust_real-P1-V2 | R | protected_safety, grouping | 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |
| F01D1-urgent_real-P2-V2 | V | incomplete_contextual_review | 1:E1, 2:E2, 3:E3, 4:S1, 5:S2 |
| F01D1-urgent_real-P1-V2 | R | subject_attribution | 6:E1, 7:E2, 8:E3, 9:S1, 10:S2 |

## Causas y reglas

- **Validación contextual: 5/21.** S2 debe entregar exactamente un par grupo/candidato esperado, sin duplicados ni ajenos ([pipeline.ts](../../src/adapters/ai/multipass/pipeline.ts)). B08: 18 recibidos/18 esperados, pero uno ajeno y uno ausente; B10: 6/11, faltan 5 porque S2 revisó una vez cada grupo; binding_request-P1: 8/9; time_nonurgent-P1: 5/7; urgent_real-P2: 4/4 con un duplicado y una ausencia. El fallo ocurre antes de reconciliar señales. En B10 S1/S2 habían identificado opt-out genuino; no se entregó la acción. En B08 capturaron urgencia pero no la petición de aprobación escrita como BINDING_CLAIM: el fallo seguro no demuestra cobertura de esa señal.
- **Atribución de sujetos: 10/21 con revisión, no necesariamente 10 defectos semánticos.** [subjects.ts](../../src/adapters/ai/multipass/subjects.ts) exige compatibilidad entre ámbito y atribución, evidencia y soporte contextual. B05 propone buyer_count de ámbito buying_unit mientras S2 lo atribuye a local_speaker; el grupo se rechaza. B06 también contiene una base bruta refutada por S2: abstenerse ante ese conflicto es protector. La revisión por cualquier grupo impide entregar los demás hechos y señales.
- **Agrupación/evidencia: 4/21 como motivo de revisión, más rechazos en B08 y B10 antes de fallar S2.** price_question-P2 tiene una ocurrencia ambigua; trust_false_friend-P1/P2 rechazan respectivamente 6 y 3 candidatos por ámbito case incompatible con deuda o semántica de deuda; trust_real-P1 rechaza 3 cuyos fragmentos no aparecen literalmente. B08 rechaza buyer_count en case; B10 rechaza ingreso y empleo en case. [evidence.ts](../../src/adapters/ai/multipass/evidence.ts) localiza citas y ocurrencias y [grouping.ts](../../src/adapters/ai/multipass/grouping.ts) valida campo, ámbito y evidencia. El primer motivo diagnóstico no excluye otros problemas en el mismo candidato.
- **Seguridad incierta: 3/21 como motivo de revisión.** B01, price_question-P1 y trust_real-P1 conservan incertidumbre de señales protegidas en reconciliación. B01 contiene propuestas de señales sin revisión validada o no justificadas; la abstención preserva seguridad pero reduce disponibilidad. En B05 se identifica TRUST y en urgent_real-P1 URGENT, aunque la atribución de otro grupo impide entregar el resultado.
- **Hechos materiales: 2/21; identidad ambigua: 1/21.** B05 tiene ingresos sin resolver; B06 buyer_count sin resolver. documentation_request-P1 presenta identidad ambigua de requested_next_step y atribución rechazada. Estas razones se solapan con otras; no se puede concluir que toda abstención sea errónea. La reconciliación y sus límites están en [reconcile.ts](../../src/adapters/ai/multipass/reconcile.ts).
- **Errores semánticos observados:** time_nonurgent-P2 consolida OPT_OUT y STOP_CONTACT aunque esperar doce meses no solicita cese, y acepta Madrid como ubicación buscada cuando es una referencia. El oráculo provisional lo marca PASS porque no prohíbe esa señal ni exige acción. cost_real-P1, documentation_request-P2 y time_nonurgent-P1 también tienen señales OPT_OUT falsas confirmadas en resultados intermedios, pero terminan en revisión o fallo: no son acciones STOP_CONTACT ejecutadas. Se deben contrastar señales genuinas y falsas con revisión humana, sin retocar el oráculo histórico.
- **Cobertura estructural:** [safety.ts](../../src/adapters/ai/multipass/safety.ts) solo admite OPT_OUT, URGENT, BINDING_CLAIM, TRUST y PRIVACY; COST, PRODUCT, TIME y FIT no se producen como nuevas señales por esta ruta. La ausencia de COST no se explica únicamente por el evaluador.

La salida pública de [interpreter.ts](../../src/adapters/ai/multipass/interpreter.ts) transforma revisión humana en MODEL_OUTPUT_INVALID y no entrega a la aplicación hallazgos confirmados parciales. Cualquier alternativa que exponga simultáneamente hallazgos y revisión requiere evaluar un CCR del contrato y sus consumidores; no se propone relajar las guardas. J y Repair se entregan solo si el pipeline los solicita y hay respuestas capturadas. No se ha reconstruido C01 ni las dos correcciones: sus archivos contienen dos secuencias de pasadas, pero esta prueba no reconstruye las transiciones, revisiones e historial del orquestador; no se inventan estados ni se afirman resultados por etapa.

## Correcciones recomendadas, sin implementar

1. Diseñar una representación por candidato inequívoca para S2 y validar correspondencia, preservando el rechazo de revisiones incompletas.
2. Investigar atribución y agrupación con casos de sujetos, spans y ámbitos adversariales; mantener el rechazo de evidencia no verificable y desacuerdos genuinos.
3. Evaluar un CCR para preservar señales protegidas confirmadas durante revisión sin permitir avance inseguro; revisar compatibilidad con aplicación, políticas y persistencia.
4. Revisar semántica contextual de opt-out y cobertura de objeciones comerciales, con ejemplos positivos y negativos y adjudicación independiente. No alterar prompts, contratos o fixtures durante este diagnóstico.

## Límites

Una repetición, selección correlacionada y anotaciones provisionales no permiten generalizar frecuencias ni medir precisión. El acuerdo S2 no es verificación independiente: recibe candidatos y señales previos. El replay usa código y configuración presentes, no prueba que sean idénticos a la ejecución histórica; la coincidencia comprobada se limita a las proyecciones indicadas. No se reconstruyen borradores, tiempos, eventos ni efectos de proveedor. Las tres ejecuciones multietapa quedan expresamente pendientes.
