# Roadmap — de AI Lead Intake a Sales Intelligence Copilot

[← Volver al README](../../README.md) · [Qué aprendí de las evaluaciones](EVALUATION_SUMMARY.md) · [Evolución del producto](PRODUCT_EVOLUTION.md)

La V0 demuestra un recorrido concreto: partir de una conversación comercial, extraer información con sus fuentes, hacer visibles las dudas y ayudar al asesor a preparar la siguiente intervención.

Mi visión es llevar esa ayuda más allá del primer contacto: que el sistema pueda seguir la evolución de una oportunidad, recordar qué se ha acordado y sugerir acciones cuando sean necesarias. Pero las pruebas también dejaron claro que **no tiene sentido construir más autonomía sobre interpretaciones que todavía requieren tanta supervisión**.

Por eso ordenaría la evolución en función de lo que necesitamos aprender y resolver, no de la cantidad de funcionalidades que podemos añadir.

> Este roadmap es una propuesta de producto, no un calendario ni un compromiso de entrega. Ninguna de las capacidades descritas a continuación forma parte de la V0 salvo que se indique expresamente.

## Primero: hacer fiable y útil el núcleo

**Prioridad inmediata:** demostrar que el recorrido de AI Lead Intake aporta valor de forma consistente antes de ampliar el ámbito del copiloto.

En el desarrollo vimos tres problemas especialmente relevantes: interés comercial mal interpretado, aclaraciones que no se relacionaban con su pregunta original y recomendaciones demasiado genéricas. La V0 incorpora controles y revisión humana, pero no hemos medido aún su comportamiento sobre un conjunto representativo de conversaciones.

### Lo que trabajaría

- **Evaluación de la extracción y las preguntas.** Construir un corpus de conversaciones ficticias etiquetadas, incluyendo expresiones de interés, rechazos, cifras rectificadas, ingresos conjuntos, cuotas y solicitudes sensibles. Comparar el resultado con expectativas revisadas por personas y no solo con el formato JSON.
- **Reconciliación de declaraciones.** Mejorar la relación entre una duda, la pregunta que se hizo y la aclaración posterior; evitar repetir preguntas ya resueltas sin ocultar contradicciones reales.
- **Medición del trabajo humano.** Registrar cuántos campos se corrigen o descartan, cuántas preguntas se reescriben y cuánto tiempo necesita un asesor para preparar una ficha útil. Estas métricas todavía no están medidas.
- **Reglas configurables.** Sacar progresivamente los campos obligatorios y las prioridades del código TypeScript, con validación y versionado antes de plantear un editor completo.

**Criterio para avanzar:** observar, en escenarios diversos y revisados, que la calidad de las fichas y de las recomendaciones justifica el esfuerzo de supervisión. No fijaría un porcentaje objetivo arbitrario antes de disponer de una línea base.

## Después: dar continuidad a cada oportunidad

Una vez validado el núcleo, el siguiente problema natural es que la información y las decisiones no desaparezcan al cerrar el navegador.

### Persistencia, historial y revisión

Introducir una ficha persistente con historial de declaraciones, cambios y decisiones humanas. Antes de trabajar con conversaciones reales habría que definir acceso, privacidad, conservación de datos y permisos; la V0 no los contempla.

Esta base también permitiría distinguir mejor entre una corrección, una nueva declaración y una contradicción todavía pendiente.

### Contexto temporal

Añadir **timestamps explícitos y opcionales** a los mensajes. Sin ellos es difícil interpretar correctamente referencias como «mañana» o «la semana que viene» y calcular tiempos de respuesta.

No inferiría fechas exactas a partir de mensajes sin contexto temporal suficiente.

### Compromisos y tareas

Explorar la extracción de compromisos como «el jueves te llamamos» o «mañana envío la documentación», conservando la fuente original y proponiendo responsable, fecha y estado.

Antes de convertirlos en tareas, el asesor debería poder confirmar, corregir o descartar cada propuesta. Lo mediría tanto por compromisos correctos como por **falsos compromisos**, porque un seguimiento inventado puede ser peor que uno no detectado.

### Estado operativo de la conversación

Separar la **etapa comercial** (`Nuevo`, `En cualificación`, `Cualificado`) de la situación conversacional: esperando al cliente, acción del asesor, revisión pendiente o ninguna actuación necesaria.

**Valor que buscaría demostrar:** que el asesor pueda retomar una oportunidad sin releer todo el historial y sin olvidar compromisos reales.

## Más adelante: priorizar y entender la conversación

Con información persistida, timestamps y tareas suficientemente fiables, empezarían a tener sentido capacidades más avanzadas.

### Ritmo de la conversación

Analizar tiempos de respuesta, tandas de mensajes y periodos de inactividad. Una conversación silenciosa no implica necesariamente desinterés: habría que considerar horarios, acuerdos de contacto y quién tiene realmente la siguiente acción pendiente.

### Cambios de tono e intención

Explorar señales de preocupación, desconfianza, satisfacción u objeciones que aparecen a lo largo de la conversación, en lugar de asignar al cliente una etiqueta fija de sentimiento.

Esta capacidad requiere especial cautela: una interpretación del tono no debería convertirse en un hecho sobre la persona, ni condicionar decisiones financieras.

### Priorización contextual

Combinar compromisos, incidencias, estado comercial y contexto temporal para responder a cuatro preguntas:

1. ¿Quién tiene que actuar?
2. ¿Qué hay pendiente?
3. ¿Por qué importa ahora?
4. ¿Qué evidencia respalda la recomendación?

Preferiría recomendaciones explicables y revisables frente a un score de conversión opaco.

**Criterio para avanzar:** comprobar que las prioridades propuestas resultan útiles para asesores reales, sin generar una carga excesiva de alertas falsas.

## Visión a largo plazo: integración y coaching

Si las capacidades anteriores resultan útiles, el copiloto podría acercarse progresivamente a los canales donde ya trabajan los asesores, como WhatsApp y el CRM.

Empezaría por **preparar actualizaciones para revisión** antes de sincronizar información automáticamente. Cualquier ejecución de tareas o comunicación externa necesitaría permisos claros, confirmación de las acciones y trazabilidad. No plantearía automatizar decisiones de financiación.

También veo dos líneas de producto posteriores:

- **Personalización de la comunicación.** Adaptar sugerencias a preferencias explícitas del cliente (canal, nivel de detalle, horarios), sin construir perfiles psicológicos ni deducir atributos sensibles.
- **Coaching comercial.** Revisar la gestión de objeciones, la pertinencia de respuestas y el cumplimiento de compromisos para proponer mejoras al asesor. Las evaluaciones tendrían que ser explicables, revisables y distinguir falta de información de una actuación deficiente.

Ambas ideas dependen de tener primero datos y criterios de evaluación suficientemente sólidos; no son prioridades inmediatas.

## Cómo decidiría qué construir

Más que comprometer fechas para todas estas fases, evaluaría cada incremento con cinco preguntas:

| Dimensión | Qué comprobaría |
| --- | --- |
| **Calidad** | ¿Se extraen datos y compromisos correctos con fuentes útiles? |
| **Productividad** | ¿Reduce el tiempo de registro y preparación de seguimientos? |
| **Utilidad** | ¿El asesor considera relevantes las preguntas y acciones propuestas? |
| **Fiabilidad** | ¿Cuántas correcciones, preguntas repetidas o alertas injustificadas aparecen? |
| **Control** | ¿El asesor puede entender, revisar y detener las acciones antes de ejecutarlas? |

Los resultados deberían recogerse primero con datos ficticios y escenarios controlados. Para avanzar hacia conversaciones reales, privacidad, seguridad, permisos y retención de información pasarían a ser requisitos previos, no mejoras opcionales.

## Hacia dónde quiero llevarlo

El objetivo final sigue siendo evolucionar de **AI Lead Intake** a un **Sales Intelligence Copilot**: no solo saber qué información tenemos de una oportunidad, sino también **qué ha cambiado, qué hemos acordado, quién debe actuar y por qué**.

La lección de esta primera versión condiciona el camino: **antes de automatizar más decisiones, necesitamos demostrar que la información sobre la que se apoyan es suficientemente buena y que el asesor puede corregirla con poco esfuerzo**.
