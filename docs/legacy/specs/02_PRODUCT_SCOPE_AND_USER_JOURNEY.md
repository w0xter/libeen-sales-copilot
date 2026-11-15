# Dirección de producto, alcance y recorrido V0

**Estado:** dirección principal confirmada; alcance funcional de V0 cerrado **provisionalmente** (13/11/2026).

## Oportunidad escogida

Los asesores de Libeen dedican tiempo a leer conversaciones, comprender circunstancias del potencial comprador, detectar dudas, decidir qué hacer y redactar una respuesta. Hemos elegido un **copiloto interno, no un chatbot autónomo** que se haga pasar por el asesor ni una bandeja multiconversación como primera funcionalidad.

**Objetivo de producto:** conducir cada conversación hasta su **siguiente hito comercial apropiado**, conservando evidencia y control humano. A veces será una aclaración, otras una llamada, una derivación o un cierre respetuoso. No optimizar únicamente conversión; un expediente delicado debe priorizar atención responsable.

## Alternativas consideradas y por qué no son V0

- **Extractor estático de leads:** fácil de demostrar, pero no evidencia cómo cambia la decisión cuando avanza la conversación.
- **Generador autónomo de respuestas:** insuficientes controles y riesgo de promesas incorrectas.
- **Bandeja priorizada:** interesante en un equipo con decenas de conversaciones, pero aumenta la superficie y no demuestra profundidad de resolución.
- **Copiloto vivo por expediente:** alternativa elegida; combina hechos, hitos, acciones, revaluación y aprobación humana en un flujo visible.

La bandeja y los atajos son la **expansión horizontal** posterior, reutilizando el mismo motor para cada Case.

## Recorrido principal: Laura, de principio a fin

1. **Abrir expediente sintético:** conversación ya contiene Valencia, pareja, intención de mudanza antes del verano, ~3.800 € netos conjuntos, ~18.000 € ahorrados, préstamo coche de 250 €/mes. La pregunta del asesor era «cuánto ganáis después de deudas»; no sabemos si la cuota ya se descontó.
2. **Interpretar:** extraer hechos con referencias a mensajes y marcar correctamente sus incertidumbres.
3. **Evaluar:** M2 puede estar completo; M3 financiero queda bloqueado por semántica de la deuda. No restar 250 € dos veces.
4. **Recomendar:** una sola aclaración focalizada («¿Los 3.800 € ya tienen descontados los 250 € del préstamo del coche?»). Mostrar motivo; el asesor puede editar, aprobar o descartar el borrador.
5. **Simular continuación:** registrar, de forma explícita, el envío simulado y añadir una respuesta ficticia de Laura: *sí, ya están descontados* o *no, aún no*. No afirmar envíos reales.
6. **Reevaluar:** actualizar `debt_deduction_semantics`, conservar la evidencia anterior, marcar M3 suficientemente comprendido para el **siguiente paso comercial** y ejecutar orientación M4 con política `demo-v1`.
7. **Proponer siguiente paso:** si existe interés confirmado, datos mínimos y ningún riesgo prioritario, recomendar llamada de orientación revisable; no «preaprobar» la compra.
8. **Extensión opcional:** simular que Laura acepta una llamada y registrar M5; sin aceptación, M5 continúa pendiente. La propuesta ni la aprobación del borrador son por sí solas un acuerdo.

**Mínimo irrenunciable de la prueba:** llegar hasta M3 desbloqueado y **siguiente acción propuesta**. El acuerdo de llamada hasta M5 es deseable si no compromete calidad, pruebas o entrega.

## Casos secundarios y por qué importan

- **Javier:** ingresos autónomo variables 2.000–3.000 €, neto/bruto desconocido, un audio de 1:12 sin transcripción y objeción «¿esto es fiable, no será una estafa?». Demuestra que el agente interrumpe la cualificación para abordar confianza, sin inventar audio ni presionar con preguntas financieras.
- **Rosa:** pareja, ingresos conjuntos 1.400 €, ahorro explícito cero, plazo urgente de dos semanas, pregunta condicional sobre alquiler solo y petición de aprobación escrita. Demuestra que la urgencia y la seguridad se priorizan sobre la venta; no descartar por edad, ahorro ni asignarle un interés exclusivo en alquiler que no ha confirmado.

## Interfaz única propuesta

- Selector pequeño Laura / Javier / Rosa (no dashboard).
- Historial y caja para añadir mensaje sintético.
- Ficha de conocimientos: valor, ámbito, precisión, evidencia y contradicción.
- Hito activo, progreso compacto y bloqueo principal.
- Próxima acción explicada, borrador editable y revisión/descartado simulados.
- Trazabilidad ligera de lo que cambió tras un evento.

No se necesitan pantallas separadas para administrar workflows o perfiles, CRM, gestión de usuarios, calendario, ofertas o analítica.

## Tres niveles de alcance

| V0 imprescindible | V0.1 / V0.2 con más tiempo | Solo preparado arquitectónicamente |
| --- | --- | --- |
| Un Case interactivo y dos casos alternativos | Crear expedientes y persistir sesiones | Multiempresa y varios canales |
| Facts con evidencia e incertidumbre | Conciliación mejorada y más ámbitos | Esquemas de datos editables en UI |
| Hitos declarativos y reapertura básica | Más rutas, correcciones y reanudación | Diseñador visual y migraciones |
| Agente único con borrador revisable | Estrategias y atajos | Multiagente y herramientas externas |
| Configuración demo editable | Versionado y catálogo avanzado | Integración real CRM/WhatsApp/calendario |
| Pruebas de casos difíciles | Métricas y regresión ampliada | Observabilidad y aprendizaje supervisado |

## Métricas futuras propuestas (no medidas)

Tiempo hasta la siguiente acción aprobada; turnos por hito; hitos con evidencia; proporción de correcciones humanas; ratio de abstención/derivación adecuada; falsas promesas (objetivo cero). La V0 demuestra comportamientos, **no resultados reales de negocio**.

## Criterio de éxito en la prueba

Una persona que revisa el proyecto debería ver un recorrido reproducible en el que una ambigüedad cambia la recomendación, la conversación continúa, el estado se actualiza y el humano controla la respuesta. Un bonito resumen sin evolución del caso no cumple la promesa diferenciadora del producto.
