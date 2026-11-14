# Pantalla única y guion de demostración

**Estado:** diseño de experiencia V0; no mockup funcional ni frontend implementado.

## Un Case Workspace, no una bandeja comercial

La pantalla principal concentra el valor para un asesor y evita construir secciones de administración prematuras.

### Distribución funcional

```text
┌──────────────────────────────────────────────────────────────────┐
│ Libeen Sales Copilot                         [Laura | Javier | Rosa] │
├──────────────────────────────┬───────────────────────────────────┤
│ CONVERSACIÓN                 │ ESTADO DEL EXPEDIENTE             │
│ Mensajes por autor/fecha     │ Goal e hito activo                │
│ IDs de mensaje               │ Progreso M0–M5                    │
│ Marcadores audio sin texto   │ Datos normalizados + evidencia    │
│ Entrada de mensaje ficticio  │ Dudas / blockers                  │
│                              │                                   │
│                              │ RECOMENDACIÓN DEL COPILOTO        │
│                              │ Acción, motivo, texto editable    │
│                              │ Aprobar / Editar / Descartar      │
│                              │ (sin envío real)                  │
└──────────────────────────────┴───────────────────────────────────┘
```

En móviles podría adaptarse a pestañas dentro del mismo workspace; no priorizar diseño responsive elaborado para la prueba.

## Lo que el asesor debe poder observar

- Qué fragmentos del chat han producido un dato, mediante referencia o resaltado.
- Qué datos están confirmados por mensaje, aproximados, ausentes o ambiguos.
- Qué hito está activo y qué condición lo bloquea.
- Por qué se ha escogido una pregunta en vez de otra.
- Qué parte de la propuesta puede editar o descartar.
- Qué eventos son **simulados**, qué está pendiente de enviar y qué no se ha acordado.
- Cómo cambian hechos e hitos después de un nuevo mensaje.

Un panel completo de métricas, CRM y priorización **no** es necesario.

## Guion de demo orientativo (≤5 minutos, vídeo opcional)

**0:00–0:30 — Problema y decisión.** El asesor recibe muchas conversaciones. Hemos decidido resolver la siguiente acción de una sola conversación, no todo el CRM.

**0:30–1:45 — Laura inicial.** Mostrar sus mensajes; Facts de pareja/ubicación/ingresos/ahorros/deuda, y M3 bloqueado. La pregunta anterior «después de deudas» explica la ambigüedad. Acción propuesta: aclarar cuota.

**1:45–2:45 — Revisión y continuación.** Editar o aprobar borrador sin enviarlo realmente; simular envío y añadir una respuesta ficticia clara. Reanalizar. Mostrar M3 desbloqueado y propuesta de llamada, **sin aprobación financiera**.

**2:45–3:30 — Javier.** Mostrar que la objeción «¿estafa?» va antes que insistir en ingresos y que el audio no disponible no tiene transcripción inventada.

**3:30–4:15 — Rosa.** Mostrar cero de ahorros declarado, urgencia, solicitud de escrito vinculante y revisión humana; no generar aprobación.

**4:15–5:00 — Configuración y límites.** Cambiar R10 (mes de mudanza) y reevaluar —si está realmente implementado—; señalar qué no se construyó, qué se probará y cómo crecería el sistema.

Si hay poco tiempo real de implementación, priorizar el **recorrido Laura hasta M3 desbloqueado y siguiente paso propuesto** y los resultados de seguridad de Javier/Rosa; el registro simulado de aceptación de M5 es extra.

## Estados visuales que importan

| Estado | UI debería mostrar | No debería insinuar |
| --- | --- | --- |
| M3 blocked | «Falta aclarar si la cuota ya está descontada» | «Cliente no apto» |
| Draft generado | Texto editable + justificación | «Enviado» |
| Draft aprobado | Aprobado para simulación / pendiente de comunicación | «Cliente informado» |
| Mensaje simulado enviado | Etiqueta de demo y evento artificial | Envío real WhatsApp |
| M3 completed | «Contexto autodeclarado suficiente para orientar» | «Finanzas verificadas» |
| Llamada propuesta | «Pendiente de aceptación del cliente» | «Cita reservada» |
| Handoff requerido | Prioridad humana, motivo y propuesta prudente | Una decisión automática de aprobación/denegación |

## Experiencia de edición

La V0 debería ofrecer al menos edición del borrador. La corrección manual de un Fact es deseable, pero puede aplazarse si compite con la calidad del recorrido principal. En cualquier caso, la arquitectura debe permitir el evento `FACT_CORRECTED`.

## Lenguaje adecuado en la UI

Usar expresiones como «declarado», «aproximado», «requiere aclaración», «propuesta pendiente», «revisión humana», «simulado». Evitar «riesgo financiero aprobado», «vivienda garantizada», «elegible» o «aprobado» como resultado del motor.
