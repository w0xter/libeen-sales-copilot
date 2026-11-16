# Hallazgos

## E2E-F001 — La pregunta no expresa la ambigüedad material identificada

- **Severidad:** MEDIUM. **Recorrido/AC:** E2E-01, AC-07 por analogía y AC-12. **Estado:** abierto.
- **Reproducción:** configurar proveedor real; ejecutar `RUN_E2E_REAL=1 pnpm exec playwright test -g 'OpenAI real'`; consultar pregunta e incidencia. Conversación y expectativas en [REAL_EXPECTATIONS.md](REAL_EXPECTATIONS.md).
- **Esperado:** preguntar si la cuota de 180 €/mes ya está descontada de los ingresos declarados, para resolver la duda concreta.
- **Observado:** la incidencia sí explica esa duda, pero la única pregunta es «¿Podéis aclarar la cuota que habéis indicado?», sin explicar qué aclarar. [Captura](real-result.png). Una observación de una llamada; frecuencia desconocida.
- **Causa probable, no confirmada:** formulación genérica de la intervención a partir del tipo de incidencia; no se ha diagnosticado el origen.
- **Recomendación:** revisar generación y probar que la pregunta conserva la relación concreta entre ingreso y cuota, sin inventar inclusión. No se ha modificado producto.

## Riesgos no reproducidos en esta evaluación

P4/P11 describen falsos negativos de señales sensibles en Javier y Rosa. No se ha repetido su análisis real en esta ejecución, por tanto no se clasifican aquí como defectos reproducidos ni como corregidos. Requieren una prueba real de las frases originales y revisión humana antes de demo.
