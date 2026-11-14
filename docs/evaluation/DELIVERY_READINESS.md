# Preparación de entrega — 14 de noviembre de 2026

**Recomendación: presentar como demostración local de replay sintético, no como extracción OpenAI fiable ni producto de producción.** F-01 permanece **PARTIALLY FIXED**; ver [remediación](F01_OPENAI_REMEDIATION.md) y [evaluación independiente](INDEPENDENT_EVALUATION.md). El replay solo reconoce entradas preparadas y no demuestra comprensión de lenguaje arbitrario.

## Funcionalidad comprobada y correcciones

- F-02: el estado de fallo sobrevive a Actualizar, se señala que los hechos pueden no incluir el mensaje y se ofrece reanálisis/restablecimiento. El mensaje se conserva y no se muestra propuesta activa. El detalle exacto del error solo está disponible en la respuesta inicial: el contrato actual guarda el estado, no la causa; tras refrescar se muestra orientación genérica. El almacenamiento es en memoria y no sobrevive al reinicio.
- F-03: el envío simulado registrado aparece como tal y deja de ofrecerse el botón; no supone entrega ni acuerdo.
- F-04: la UI permite registrar derivación simulada. Con alertas protegidas permanece el estado de revisión y las alertas siguen abiertas; M5 registra la ruta terminal alternativa, no una cita.
- F-05: la selección de la UI se limita a mensajes posteriores al envío simulado de una propuesta de llamada. El asesor lee el texto y declara expresamente la aceptación; el sistema no verifica su significado. La API sigue confiando en la atestación y una frase posterior irrelevante aún podría seleccionarse por error.
- F-07: `config/business-policy.json` permite cambiar R10 y su versión sin editar código. Se valida al cargar; las demás reglas permanecen en TypeScript. Cambiar configuración requiere reinicio y pierde los casos en memoria.

Se observaron en navegador aislado: Laura con cuota ambigua, aprobación y envío simulado, después aclaración preparada con M3 completo y propuesta de llamada; mensaje desconocido conservado y aviso tras Actualizar; Javier con rango, audio no disponible y derivación por confianza; Rosa con cero ahorros, alertas y derivación simulada registrada. Con R10 activada mediante JSON y reinicio, la misma aclaración de Laura pidió mes de mudanza y M3 siguió completo. No se completó un acuerdo positivo en navegador: replay no incluye una respuesta preparada de aceptación de llamada. Las pruebas de integración cubren la atestación manual; no equivalen a validación semántica.

## OpenAI y transporte

En esta sesión, con clave configurada, una resolución DNS y una solicitud mínima autenticada `GET /v1/models` en sandbox fallaron con `ENOTFOUND` antes de establecer conexión; no hubo respuesta HTTP. Fuera del sandbox, DNS resolvió IPv6 y la misma comprobación HTTPS devolvió **200**. Esto prueba conectividad TLS y autenticación para ese endpoint en ese momento, no una inferencia, cuota de generación ni fiabilidad semántica. No se obtuvo 401/403, 429, error de cuota, respuesta de error del proveedor, fallo TLS ni timeout en la comprobación exitosa. El intento fallido no permite evaluarlos; el SDK de inferencia no se ejercitó en esta comprobación. No se puede atribuir con certeza los 12 fallos previos a esta misma restricción sin sus causas originales. No se hicieron nuevas llamadas al modelo ni cambios de prompts/extracción.

## Verificación

- `pnpm install --frozen-lockfile`: PASS (restauración de dependencias bloqueadas).
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 16 archivos / 120 tests.
- `pnpm build`: PASS.
- Replay en navegador y R10 off/on: PASS para los recorridos descritos arriba, con servidor aislado y cambio solo del JSON.

## Evaluación requisito por requisito

| Requisito | Estado y evidencia |
| --- | --- |
| Asistente de asesor y control humano | Parcialmente demostrado con hechos, evidencia, borradores editables y acciones simuladas; no hay entrega real ni aprobación financiera. |
| Tres conversaciones ficticias | Demostradas en replay; audio de Javier no interpretado y cero de Rosa conservado. |
| Modelo simulado o real | Replay permitido por el enunciado y etiquetado; integración OpenAI existe, pero F-01 sigue parcialmente corregido y sin evidencia de fiabilidad. |
| Reglas cambiables sin código | Parcial: R10 externalizada y validada; el resto de reglas sigue en TypeScript. |
| Fallos y datos dudosos | Mensajes y hechos anteriores conservados con aviso de análisis incompleto; error específico no persiste tras refrescar. |
| Casos y pruebas | Suite determinista y regresiones de errores, eventos, seguridad y configuración; no acreditan generalización del modelo. |
| README y registro de trabajo con IA | Disponibles en raíz y `docs/AI_DEVELOPMENT_LOG.md`; el tiempo total del ejercicio no se ha medido aquí, por lo que no se afirma cumplimiento del límite original de cuatro horas. |
| Privacidad y efectos | Solo datos sintéticos en demo; clave en servidor, sin envío, CRM ni calendario. No se ha realizado auditoría de seguridad completa. |

## Pasos de presentación

1. Instalar con `pnpm install --frozen-lockfile`, copiar `.env.example` a `.env.local`, configurar `AI_MODE=replay` y ejecutar `pnpm dev`.
2. Abrir Laura: explicar incertidumbre de la cuota, aprobar el borrador y registrar envío simulado. Añadir exactamente `Sí, queremos explorar SmartHousing y los 3.800 € ya son después del coche.`; observar M3 y propuesta de llamada, sin acuerdo automático.
3. Abrir Javier: rango 2.000–3.000, base desconocida, audio no disponible y derivación por confianza. Abrir Rosa: cero, urgencia y solicitud escrita; registrar derivación simulada y mostrar que las alertas permanecen.
4. Para R10, parar el servidor, cambiar `requireSpecificMoveMonthBeforeCall` y `version` en `config/business-policy.json`, reiniciar y repetir Laura. Volver a `false` para la demo normal.
5. Opcional: introducir texto no reconocido para enseñar el fallo persistente; restablecer el caso para recuperar el replay.

## Pendientes y riesgos

F-01 sigue abierto: variabilidad semántica, bloqueos falsos/omitidos y correcciones incompletas se describen en la remediación. F-06 (resolución auditable de bloqueos) sigue sin implementar. La confirmación de acuerdo sigue dependiendo de juicio humano y la API no impone la restricción temporal de la UI. No existe autenticación, persistencia duradera ni ejecución real. No se hizo evaluación de carga, concurrencia real, seguridad integral ni prueba de producción. No se cambió ningún contrato compartido; persistir la causa exacta de análisis requeriría ampliar el snapshot o el puerto de persistencia y revisar compatibilidad de consumidores.
