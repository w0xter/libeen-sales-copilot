# Copia preservada de la evaluación E2E

Instantánea de los informes y capturas de `docs/current/evaluation/` correspondientes al HEAD evaluado `71831fc08b12dd98c562a414e3c30f0ff9f3b1dc`. Esta ubicación es independiente de la documentación de trabajo y sus archivos quedan disponibles para versionarse.

- [Informe principal](E2E_ACCEPTANCE_REPORT.md), [matriz de aceptación](ACCEPTANCE_MATRIX.md), [hallazgos](FINDINGS.md), [recomendación de demo](DEMO_READINESS.md) y [expectativas previas](REAL_EXPECTATIONS.md).
- [Reporte HTML de Playwright](playwright/index.html) y [resultados JSON](playwright/results.json): corresponden a la **última ejecución determinista**, con cuatro aprobadas y una omitida. El reporte generado de la ejecución real anterior fue sobrescrito por Playwright antes de realizar esta copia; su observación y captura se conservan en el informe y `real-result.png`. No hay una traza de esa ejecución disponible.
- Las capturas contienen exclusivamente datos ficticios. La copia no incluye credenciales ni archivos de entorno.

Los reportes automáticos originales siguen en `playwright-report/` y `test-results/`, carpetas ignoradas y regenerables. El HTML archivado es una instantánea, no se actualiza al repetir las pruebas.
