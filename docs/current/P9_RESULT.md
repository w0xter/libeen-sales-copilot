# P9 — Incidencias, pregunta y etapa

Las señales automáticas y alertas manuales admiten resolver, descartar o reabrir. Una alerta sensible pendiente bloquea copiar la pregunta; cambiar una incidencia invalida la pregunta hasta revisión explícita. Si E propone revisión humana, el asesor puede redactar una pregunta manual tras revisar las alertas. No hay envío.

La etapa actual se cambia únicamente al confirmar la sugerida. `Nuevo`, `En cualificación` y `Cualificado` expresan completitud, no elegibilidad financiera. La sugerencia requiere alias, campos esenciales efectivos sin conflicto, interés explícito reconocible, base y sujeto de ingresos conocidos y ausencia de incidencias pendientes; usa reglas conservadoras, sin umbrales ni puntuaciones. E y D no se han reconstruido. La detección de confianza/audio de Javier y petición de Rosa mantiene las limitaciones de P4/P5; no se afirma resuelta.

Las pruebas unitarias verifican reglas de etapa y bloqueo; una prueba de interacción con React Test Renderer añade y resuelve una alerta sensible y verifica el bloqueo de copia. También pasaron typecheck y lint. La prueba de interacción no valida presentación visual, navegador ni portapapeles del sistema. Los estados de revisión son temporales y no hay autenticación.
