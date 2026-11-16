# Matriz de aceptación AC-01–AC-23

Estados conservadores: una prueba parcial no acredita el criterio completo. Evidencias en [informe](E2E_ACCEPTANCE_REPORT.md) y [tests](../../../tests/e2e/intake.pw.ts).

| ID | Requisito original | Cobertura | Evidencia | Estado | Observaciones |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Analizar conversación ficticia inédita con inferencia real | intake.pw.ts | real | PARTIAL | Una llamada; fuentes y metadatos no revisados. |
| AC-02 | Distinguir asesor/cliente sin atribución incorrecta de datos | intake.pw.ts | real | PARTIAL | Valores visibles coinciden; atribución de todas las fuentes no revisada. |
| AC-03 | Extraer los **siete** campos comerciales cuando están presentes, con origen y precisión (actualización del borrador de seis campos) | intake.pw.ts | real | PARTIAL | Siete valores visibles; precisión y fuentes no desplegadas. |
| AC-04 | Diferenciar desconocido, cero explícito, rango y aproximación | intake.pw.ts | real | PARTIAL | Horizonte aproximado visible; cero/rango no evaluados. |
| AC-05 | Evidencia reconocible por campo extraído | Pendiente | navegador | NOT_TESTED | No se abrió cada evidencia. |
| AC-06 | Confirmar, corregir o descartar candidato y reflejarlo al exportar | intake.pw.ts | determinista | PARTIAL | Corrección copiada; confirmar y descartar pendientes. |
| AC-07 | Laura conserva duda de cuota y recibe aclaración específica | Pendiente | — | NOT_TESTED | Laura real pendiente; F001 afecta otra conversación. |
| AC-08 | Una respuesta posterior cambia resultado sin doble descuento | intake.pw.ts | determinista | PARTIAL | Reanálisis y conflicto controlados, sin comprobar descuento. |
| AC-09 | Javier no produce hechos desde audio sin transcripción | Pendiente | — | NOT_TESTED | Audio Javier pendiente. |
| AC-10 | Rosa ahorros 0, solicitud sensible y nunca aprobación financiera | Pendiente | — | NOT_TESTED | Rosa pendiente. |
| AC-11 | Incidencias con motivo y posibilidad de revisar/descartar | intake.pw.ts | determinista | PARTIAL | Alerta manual sensible; resolución no probada. |
| AC-12 | Única pregunta editable y no enviada | intake.pw.ts | real y determinista | PARTIAL | Pregunta visible y bloqueo manual; F001. |
| AC-13 | Orden de campos/prioridades modificable sin reescribir motor | Pendiente | estática | NOT_TESTED | Configuración identificada; cambio y ejecución no probados. |
| AC-14 | Exportación real, excluyendo contradicciones no resueltas como valores consolidados | intake.pw.ts | determinista | PARTIAL | Portapapeles real y conflicto bloqueado; cobertura incompleta. |
| AC-15 | Nunca simular sincronización CRM ni envío a cliente | intake.pw.ts | navegador | PARTIAL | UI indica sin conexión; no se auditó toda la red. |
| AC-16 | Fallo conserva entrada y deja claro resultado desactualizado | intake.pw.ts | determinista | PARTIAL | Error HTTP y desactualización; entrada no verificada tras fallo exhaustivamente. |
| AC-17 | Reanálisis no sobreescribe corrección manual silenciosamente | intake.pw.ts | determinista | PARTIAL | Corrección conservada y adopción; mantener pendiente. |
| AC-18 | Pruebas reproducibles, diferenciando replay de inferencia real | intake.pw.ts | real y determinista | PARTIAL | Modos separados, reproducibles; recorridos incompletos. |
| AC-19 | Ficha CRM muestra identificador, siete campos y stage | intake.pw.ts | determinista | PARTIAL | Vista previa copiada; no auditados todos los metadatos. |
| AC-20 | Laura original no pasa a «Cualificado» hasta resolver interés explícito y cuota | Pendiente | — | NOT_TESTED | Laura real pendiente. |
| AC-21 | Cualificado ≠ aprobado y ahorros 0 cuentan como informados | intake.pw.ts | navegador | PARTIAL | Texto no aprobación visible; cero Rosa no probado. |
| AC-22 | Contradicción material/corrección manual actualiza recomendación stage visiblemente | Pendiente | — | NOT_TESTED | Cambio de etapa no probado en navegador. |
| AC-23 | Exportación conserva stage y datos autodeclarados, sin afirmar sincronización | intake.pw.ts | determinista | PARTIAL | Copia comparada con vista previa; metadatos no auditados exhaustivamente. |
