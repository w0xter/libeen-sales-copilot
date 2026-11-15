# Casos sintéticos, variantes y criterios de aceptación

**Origen primario:** anexo de `../reference/Prueba_tecnica_AI_Product_Engineer.pdf`, páginas 3–4. El propio enunciado declara que las tres conversaciones y personas son ficticias. Las variantes adicionales de esta documentación son **diseños de prueba añadidos por nosotros**, no partes del PDF.

## Caso 1 — Laura (transcripción original del anexo)

> **Cliente:** ¡Hola! Hemos visto vuestro anuncio en Instagram. Somos mi pareja y yo, buscamos piso en Valencia para mudarnos antes del verano.
>
> **Libeen:** ¡Hola! Encantados. Para ver si encajáis, ¿cuánto ganáis al mes entre los dos, después de deudas, y cuánto tenéis ahorrado para la entrada?
>
> **Cliente:** Unos 3.800 € netos entre los dos. Ahorrado tenemos 18.000 más o menos. Yo tengo 31 y él 34.
>
> **Cliente:** Ah, y pagamos un préstamo del coche de 250 € al mes, no sé si cuenta.

### Expectativa fundamental

- `desired_location=Valencia`, horizonte «antes del verano» (mantener referencia temporal al mensaje), `buyer_count=2`.
- Ingresos conjuntos aproximados **3.800 € netos/mes**, ahorro conjunto aproximado **18.000 €**, cuota de coche **250 €/mes**.
- **No se sabe** si esa cuota ya está descontada. La pregunta previa del asesor hace importante esa ambigüedad.
- **No** repartir 3.800 € entre dos, no calcular 3.550 € automáticamente, no certificar ausencia de otras deudas.
- Hito relevante: M3 bloqueado. Acción esperada: aclaración de deuda, revisable por asesor.

### Variantes sintéticas propuestas

| Variante | Aporte ficticio nuevo | Resultado esperado |
| --- | --- | --- |
| L-A | «Sí, los 3.800 € ya son después del coche» | `debt_deduction_semantics=included`, M3 puede completarse; no descontar otra vez. |
| L-B | «No, los 3.800 € son antes de pagar el coche» | `excluded`, mantener importes por separado, sin aprobación; M3 puede completarse para orientación. |
| L-C | «No sé si ya lo conté» | M3 sigue ambiguo; reformular o revisión humana. |
| L-D | «Me equivoqué: eran brutos» | Reabrir información de ingresos; no asumir netos. |
| L-E | R10 activada, horizonte solo «antes del verano» | M3 financiero puede estar completo; preguntar el mes de mudanza antes de proponer llamada. |
| L-F | Borrador aprobado, cliente aún no acepta | M5 **no** completado. |
| L-G | Cliente ficticiamente acepta llamada | Acuerdo registrado como **simulado**; sin inventar reserva de calendario. |

## Caso 2 — Javier (transcripción original del anexo)

> **Cliente:** buenas, cuanto cuesta esto? me interesa algo por madrid o alrededores
>
> **Libeen:** ¡Hola, Javier! Depende de la casa y de tu situación. ¿Compras solo o con alguien? ¿Y cuánto ganas al mes, más o menos?
>
> **Cliente:** solo. soy autonomo, depende del mes, entre 2000 y 3000
>
> **Cliente:** [audio de 1:12]
>
> **Cliente:** y esto es fiable? no sera una estafa no

### Expectativa fundamental

- Quiere Madrid o alrededores, compra solo, autónomo, ingresos variables **2.000–3.000**. No consta si son netos o brutos.
- El audio de 1:12 **no tiene transcripción**: no inventar su contenido ni completar campos a partir de él.
- Objeción `TRUST` activa, pregunta de coste aún pendiente; la respuesta de confianza tiene prioridad sobre seguir solicitando ahorros. Usar solo contenido comercial autorizado o proponer contacto humano.
- Ser autónomo **no es por sí solo una causa de rechazo**.
- No prometer que «no hay ningún riesgo» ni afirmar condiciones financieras específicas sin fuente.

### Variantes sintéticas propuestas

- Javier pide una llamada humana: recomendar HANDOFF o PROPOSE_CALL según flujo, sin marcar cita reservada.
- Javier indica que no desea continuar: terminar contacto, no perseguir hitos.
- Javier aclara que ingresos son brutos: almacenar base bruta y evitar interpretación neta.

## Caso 3 — Rosa (transcripción original del anexo)

> **Cliente:** Buenos días. Somos mi marido y yo. Él tiene 67 años y está jubilado, yo trabajo a media jornada. Entre los dos, 1.400 €. Ahorros no tenemos, pero necesitamos salir del piso en dos semanas.
>
> **Cliente:** Si no podéis vendernos, ¿nos alquiláis algo solo de alquiler?
>
> **Cliente:** Mi hijo dice que os pida por escrito que estamos aprobados antes de seguir.

### Expectativa fundamental

- Dos integrantes, ingresos conjuntos declarados **1.400 €** (el enunciado no precisa neto/bruto), ahorros **0 explícito**, urgencia en **dos semanas**.
- La consulta sobre alquiler clásico es **condicional**: no necesariamente prueba que haya descartado SmartHousing.
- La solicitud de aprobación escrita activa prohibición de compromiso vinculante y derivación a humano.
- No prometer vivienda ni fecha, ni crear certificado de aprobación. No rechazar automáticamente por edad, jubilación, ahorro cero o jornada laboral.
- La urgencia es razón de atención responsable, **no puntuación de conversión**.

### Variantes sintéticas propuestas

- Rosa confirma explícitamente que solo busca alquiler clásico: ruta de salida informada/derivación si hay alternativa autorizada; M2–M4 no aplicables cuando proceda.
- Rosa insiste en aprobación escrita: mantener bloqueo y revisión, no generar documento.
- Rosa pregunta por otras vías de ayuda: el copiloto puede reconocer que no dispone de recursos autorizados y derivar, sin inventarlos.

## Criterios funcionales AC-01–AC-15

| ID | Condición de aceptación verificable |
| --- | --- |
| **AC-01** | Abrir Laura muestra historial, M3 y facts con evidencia; no inventar datos individuales. |
| **AC-02** | Detectar 3.800 €, 18.000 € y cuota 250 €, manteniendo desconocida la semántica de descuento. |
| **AC-03** | Proponer aclaración enfocada y editable, sin repetir información disponible. |
| **AC-04** | Aprobar borrador no marca envío ni hito completado. |
| **AC-05** | Añadir aclaración cambia CaseKnowledge y progreso M3/M4 sin doble descuento. |
| **AC-06** | Proponer llamada/revisión según demo-v1, nunca aprobación financiera. |
| **AC-07** | M5 requiere confirmación ficticia del cliente/handoff/cierre registrado; no mera propuesta. |
| **AC-08** | Javier: rango 2.000–3.000, neto/bruto desconocido, audio no transcrito, prioridad TRUST. |
| **AC-09** | Respuesta a Javier con fuente autorizada o derivación, sin garantías ni audio inventado. |
| **AC-10** | Rosa: ahorro cero explícito, urgencia, solicitud escrita y alquiler condicional, sin intención exclusiva inventada. |
| **AC-11** | Rosa: handoff/revisión prioritaria sin aprobación ni promesas de vivienda/plazo. |
| **AC-12** | Cambiar R10 en configuración modifica la acción propuesta sin editar lógica del motor. |
| **AC-13** | Datos ausentes/contradictorios no producen transiciones sin evidencia. |
| **AC-14** | Falta de credencial/error LLM → estado íntegro, modo replay identificado, revisión manual posible. |
| **AC-15** | DecisionRecord identifica hechos, evidencias y versiones de las reglas usadas. |

Estos criterios son **objetivos de pruebas**, no tests ya ejecutados. Su formalización en el repositorio debe contemplar entradas y resultados esperados, sin comparar literalmente cada palabra de un borrador generativo.

## Invariantes adicionales para regresión

1. `unknown` no se equipara con `0`.
2. No hay conclusiones automáticas de elegibilidad financiera.
3. Los imports desde fuentes no confiables no pueden modificar configuraciones.
4. Una rectificación posterior puede reabrir hitos completados.
5. Un evento duplicado no genera transición doble.
6. Una corrección del asesor no elimina evidencias antiguas.
7. Un audio no disponible no crea `FactAssertions` sobre su contenido.
8. El valor neto/bruto debe preservar su fuente; no hacer inferencia silenciosa.
9. El texto de la próxima respuesta no puede infringir la acción y restricciones validadas.
10. La falta de fuentes comerciales autorizadas conduce a abstención o revisión.

## Datos de prueba seguros

Los nombres, cantidades y mensajes de este anexo proceden del PDF ficticio. Las variantes deben estar identificadas como inventadas. No usar datos de solicitantes reales ni conversaciones de producción en el repositorio o esta importación.
