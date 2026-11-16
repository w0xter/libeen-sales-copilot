# Libeen AI Lead Intake V0 — documentación activa

**Estado vigente:** PoC supervisada aceptada con limitaciones; los NO-GO anteriores corresponden al contrato más estricto y se conservan como historia. Solo datos ficticios, con revisión humana.

- [Especificación funcional V0](01_FUNCTIONAL_SPEC_V0.md): problema, alcance y comportamiento.
- [Arquitectura mínima y módulos B/D/E](02_MINIMAL_BDE_IMPLEMENTATION_PLAN.md): extracción, incidencias y pregunta.
- [Criterios PoC aprobados](evaluation/POC_EVALUATION_CRITERIA.md) y [último informe de hardening](evaluation/HARDENING_RELEASE_REPORT.md).
- [Matriz de aceptación](evaluation/ACCEPTANCE_MATRIX.md): resultados históricos y criterio PoC diferenciado.
- [Preparación y guion de demo](evaluation/DEMO_READINESS.md).
- [Registro de colaboración humano–Codex](AI_COLLABORATION_LOG.md).
- [README de arranque](../../README.md): instalación, uso, pruebas y limitaciones.

## Pruebas y evidencias

- [Pruebas unitarias de intake](../../tests/unit/intake/) y [pruebas de integración](../../tests/integration/intake/), con entradas y expectativas en los archivos de test.
- [Pruebas Playwright](../../tests/e2e/), incluidas `hardening-review.pw.ts`, `hardening-a11y.pw.ts` y el caso real optativo `hardening-poc-real.pw.ts`.
- [Respuesta real ficticia de Alicante](evaluation/hardening/poc-real.json), [hallazgos](evaluation/FINDINGS.md) e [informe de continuación](evaluation/CONTINUATION_REPORT.md). Una respuesta real no mide fiabilidad; controlado y replay no prueban semántica del modelo.
- Resultados de puertas: [P8](P8_RESULT.md), [P8.1](P8_1_RESULT.md), [P9](P9_RESULT.md), [P10](P10_RESULT.md), [P11](P11_RESULT.md). Sus estados son históricos.

## Historia, separada

La [documentación histórica](../legacy/README.md) no establece requisitos vigentes para la V0. Conserva el [enunciado original](../legacy/reference/Prueba_tecnica_AI_Product_Engineer.pdf). El [prototipo visual](ux-reference/libeen-ux2-prototipo-v0.3.html) es una referencia de diseño, no el runtime.
