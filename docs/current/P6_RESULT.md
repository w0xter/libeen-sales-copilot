# P6 — Interfaz de análisis

La pantalla React utiliza el HTML UX2 v0.3 incluido en `ux-reference/` como referencia visual y conserva sus dos superficies, ejemplos, lectura/edición, estados de análisis, ficha, evidencias, incidencias y pregunta. La API es `/api/intake`; no se ha incorporado la lógica simulada ni el runtime del producto anterior. El HTML incluido es la maqueta aprobada original, no un build ejecutable de Next.js. La revisión humana y los conflictos corresponden a P7 y P8.

## Verificación y límites

- `pnpm test`: 157 aprobadas, 2 omitidas (proveedor real optativo); `pnpm typecheck` y `pnpm lint` correctos en la ejecución previa.
- Se ha comprobado el render inicial con React. El recorrido en navegador y las capturas no se han podido ejecutar: la herramienta devuelve «Local browser use is disabled in Work settings». El usuario autorizó continuar con esta verificación pendiente.
- La fidelidad visual y los estados interactivos requieren validación en navegador; no se presenta como verificada. No se ha probado inferencia real en esta puerta. P4 y P5 documentan las limitaciones conocidas de B/D/E.
- El prototipo incluye controles de previsualización artificiales que no forman parte de la aplicación; las decisiones y fuentes deben proceder de resultados reales.
