# F02-R05b — reconciliación de candidatos y disputas

## Reglas y límites

La comparación conserva campo, sujeto (ámbito e ID), valor, unidad, periodo, base bruto/neto, precisión y corrección. La identidad de ocurrencia, las referencias de evidencia y el historial siguen pasando por las validaciones anteriores. Una revisión contextual solo clasifica a su candidato si es única, atómica, válida y su evidencia está anclada y coincide con la del candidato. Una refutación así validada se registra como `excluded` si no hay un candidato semánticamente equivalente con revisión `supported`; si lo hay, ambos quedan `pending` porque los veredictos se contradicen. Una revisión duplicada, no atómica o con evidencia inválida queda pendiente, no es una refutación válida. La incertidumbre, la ausencia y las revisiones presentes inválidas provocan revisión. Las variantes para comparar excluyen las refutaciones válidas, pero conservar una variante no la convierte en verdadera: cualquier refutación o incertidumbre mantiene la revisión global, incluso con una selección de J. La disputa conserva todos los IDs. No se publican assertions ni hallazgos parciales en V1 cuando se exige revisión.

La regla previa de dos extractores para campos materiales sigue siendo una condición mínima operativa, no una prueba independiente. Una cita literal, una revisión `supported` o una mayoría tampoco acreditan por sí solas una relación semántica. **Limitación no resuelta:** el reconciliador no dispone de un verificador independiente de implicación semántica. Si todos los extractores y S2 apoyan erróneamente un valor o atributo que la cita literal no sustenta, las comprobaciones existentes pueden aceptarlo. No se afirma que el caso adversarial general quede resuelto; se necesita una frontera de evidencia semántica verificable y un contrato de revisión explícito antes de garantizarlo. La entrega de resultados parciales y señales protegidas sigue bloqueada por CCR R03; no se ha modificado V1.

El pipeline exige la cobertura completa S2 de R04a antes de invocar reconciliación. La función interna conserva compatibilidad con llamadas directas históricas que omiten revisiones; no se debe interpretar esa compatibilidad como excepción a R04a. Un resultado de revisión global no incluye los hechos temporalmente calculados dentro de otros grupos.

## Comparación offline antes/después

Se comparó `f2e85e3` con el árbol R05b usando el mismo ZIP de capturas y el comparador R05a. Los 21 escenarios de una etapa mantienen la proyección pública comparada (estado/error o acción); C01 y las dos correcciones con historial no se reconstruyen. El comparador no demuestra igualdad completa de hechos, eventos ni borradores. En esas capturas no cambian los detalles de revisión expuestos por el diagnóstico; los cambios internos de clasificación se observan en las nuevas pruebas directas, no son una mejora de métricas demostrada en las capturas.

- **B01:** sigue en revisión por seguridad y atribución. Los grupos financieros capturados son rechazados por atribución antes de llegar a reconciliación; por ello esta modificación no puede acreditar su conservación interna en esa captura. Las pruebas sintéticas existentes verifican ingreso conjunto neto aproximado, ahorro y cuota de coche sin dividir ingresos ni aplicar deducciones. La conservación de todos sus atributos mientras el resultado global requiere revisión sigue limitada por la frontera anterior a este módulo.
- **B05:** sigue en revisión; el desacuerdo de `buyer_count` se conserva en diagnósticos de atribución, no como disputa del reconciliador, y TRUST permanece confirmado internamente. No se inventa identidad ni se publica la señal parcialmente.
- **B06:** el candidato de base de ingresos refutada y su grupo son retirados por atribución antes de reconciliar; no aparece un hecho público seleccionado. Las pruebas directas adicionales comprueban que una refutación tampoco permite seleccionar por exclusión en este módulo.
- **Identidad individual:** se conservan las pruebas R05a de dos sujetos y ocurrencias, incluidos importes iguales; no se modifica la atribución de sujetos.
- **Adversarial:** se prueban refutación contradictoria, revisión incierta, revisión con evidencia ajena y selección de J ante refutación. Las pruebas existentes cubren ocurrencias ambiguas. No se ha demostrado la semántica adversarial general descrita arriba.

**R01 estricto:** falla como antes en `F01D1-price_question-P2-V2`, por la respuesta J histórica no consumida; no se ha cambiado la prueba. R05a permite y registra únicamente las dos J históricas documentadas de `price_question`. **R02:** 4 pruebas pasan con el diagnóstico posterior; mide las etiquetas y capturas originales, no prueba una mejora de calidad semántica ni una nueva inferencia.

## Verificación

- `pnpm test`: PASS, 514 pruebas; 10 omitidas por configuración.
- Comparador R05a y capturas R04a con `F02_CAPTURED_ZIP`: PASS, 4 pruebas; 21 escenarios de una etapa comparados.
- R02 con `F02_R01_DIAGNOSIS` generado por el comparador posterior: PASS, 4 pruebas.
- R01 estricto con el ZIP: FAIL por J histórica no consumida, igual que antes.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: PASS.
- No se llamó a OpenAI ni se modificaron capturas, oráculos, contrato público, pipeline o atribución. La comprobación de semántica independiente y la preservación interna completa de B01 permanecen sin verificar y limitan el cumplimiento de los criterios del brief.
