# P11 — Hardening funcional y evaluación

## Contraste y cambios

La revisión humana H1–H5 se consultó en el [plan P5–P10 de Notion](https://app.notion.com/p/419a4247646881ea83d1d7b38b78d231). Se contrastó con la especificación activa y el código del commit `3584319`.

- **H1:** al completar el primer análisis la etapa pasa a «En cualificación». Si una etapa «Cualificado» deja de coincidir con la sugerencia por una alerta, pérdida de información o conflicto, se muestra como etapa anterior pendiente de revisión y se bloquea la copia hasta confirmar la sugerencia. La etapa conservadora «En cualificación» puede mantenerse aunque se sugiera una más avanzada. La confirmación no es una aprobación financiera.
- **H2/H5:** la vista previa permanece visible y etiquetada como no exportable cuando no hay campos utilizables, hay un conflicto o la etapa necesita revisión. No se habilita copiar. Se ofrecen acciones para revisar conversación o ficha. Los resultados desactualizados o fallidos siguen sin presentarse como actuales.
- **H3 / AC-13:** `src/intake/rules.ts` reúne `requiredFields` (orden de faltantes), `ambiguityOrder` y `prioritizeIncomeBasis`. D usa los campos obligatorios, E su orden y prioridades, y la etapa los mismos campos obligatorios. Se cambia el archivo declarativo y se reinicia/reconstruye la aplicación; no es un editor en UI ni un motor genérico. Los campos obligatorios configurables son los seis esenciales; deudas conserva su tratamiento específico cuando se menciona. No hay reglas financieras.
- **H4:** se advierte junto a las incidencias que la detección automática es parcial y que hay que revisar la conversación original. Los falsos negativos conocidos de Javier y Rosa siguen abiertos; no se ha reconstruido D.

## Pruebas observadas

- `pnpm test`: 179 pruebas aprobadas, 2 omitidas en ejecución ordinaria; 29 archivos aprobados, 2 omitidos.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`: correctos.
- `tests/unit/intake/p11.test.ts` comprueba bloqueos por etapa incoherente, ausencia de datos, conflicto, campos obligatorios y prioridades configurables. `interactions.test.tsx` prueba primer análisis, confirmación de Cualificado, alerta sensible, cambio de etapa, reanálisis contradictorio, vista previa bloqueada y recuperación. Usa React Test Renderer y respuestas simuladas; no acredita presentación, accesibilidad ni portapapeles real.
- **OpenAI real opt-in:** con clave configurada en entorno local y red disponible se ejecutó `RUN_P4_REAL=1 pnpm exec vitest run tests/integration/intake/p4-real.test.ts --reporter=verbose`: 1 prueba aprobada. En el caso sintético de León ya definido en el test, B extrajo zona, horizonte, compradores, ingresos netos conjuntos aproximados y ahorros aproximados con citas; no extrajo interés ni deuda, con 0 descartes. D señaló interés ausente y E preguntó por SmartHousing. La aserción automatizada comprueba éxito y al menos tres campos; los detalles D/E son observación del resultado. Una llamada no demuestra robustez, y no es una conversación inédita respecto a este repositorio.

## Validación visual pendiente y reproducción

En esta ejecución `cua.getState()` informó que el navegador local está deshabilitado en Work y que el Mac está bloqueado. No se hizo validación visual, prueba de accesibilidad en navegador ni captura. Para completarla, habilitar navegador y desbloquear el equipo; ejecutar `pnpm install --frozen-lockfile`, configurar una clave de prueba en `.env.local`, iniciar `pnpm dev` y abrir `http://localhost:3000`.

1. Comparar escritorio y pantalla estrecha con `ux-reference/libeen-ux2-prototipo-v0.3.html`; capturar estado inicial, resultado, revisión, conflicto y vista previa. Verificar navegación con teclado, foco visible, etiquetas y anuncios de errores.
2. Con Laura, analizar, corregir un candidato, añadir una continuación ficticia contradictoria y reanalizar: comprobar ambas fuentes, vista previa no exportable, resolución y nueva revisión de etapa cuando corresponda.
3. Añadir una alerta sensible tras confirmar Cualificado: comprobar bloqueo de pregunta y de copia hasta confirmar etapa coherente. Resolver/reabrir alerta y comprobar que no se confunde con verificación documental.
4. Analizar un texto ficticio sin datos útiles y comprobar recuperación; forzar error de proveedor con configuración de prueba sin clave, conservar entrada/revisiones y comprobar que no se puede copiar resultado viejo.
5. Revisar Javier y Rosa manualmente; su ausencia de alerta automática no acredita ausencia de riesgo. Comprobar copia real al portapapeles en un caso utilizable y sin conflictos, sin afirmar sincronización CRM.

El HTML de build versionado representa únicamente el render inicial y necesita recursos de Next. Las revisiones viven en memoria de la sesión. La comparación de conflictos sigue siendo conservadora y textual; las fuentes duplicadas y varias propuestas previas pueden requerir resolución manual. Esta puerta no declara la V0 lista para producción ni visualmente validada.
