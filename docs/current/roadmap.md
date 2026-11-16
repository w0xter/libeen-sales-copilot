# Roadmap — Libeen AI Lead Intake

## Visión de producto

La V0 se centra en transformar conversaciones comerciales en información estructurada, trazable y revisable, reduciendo el trabajo manual necesario para mantener actualizado el CRM.

La evolución natural del producto sería pasar de **entender qué sabemos del cliente** a **comprender cómo evoluciona cada oportunidad comercial y ayudar al asesor a decidir qué hacer a continuación**.

El objetivo a largo plazo no es sustituir al comercial, sino permitirle dedicar menos tiempo a tareas administrativas y más a las interacciones que realmente necesitan su atención.

Los siguientes incrementos son propuestas de evolución, no funcionalidades comprometidas ni implementadas como parte de la prueba técnica.

## Fase 1 — Continuidad y gestión de compromisos

**Objetivo:** enriquecer el contexto temporal de las conversaciones y detectar actuaciones pendientes.

### Timestamps y contexto temporal

Incorporar timestamps opcionales y explícitos en los mensajes para representar escenarios similares a los de WhatsApp.

Esto permitirá interpretar mejor referencias temporales como «mañana» o «la semana que viene» y sentará las bases para futuros análisis de tiempos de respuesta e inactividad.

La especificación funcional está definida, pero su implementación y validación deben verificarse por separado.

### Extracción de tareas y compromisos

Identificar compromisos expresados durante una conversación, por ejemplo:

- «Mañana te envío la documentación».
- «El jueves te llamamos para explicártelo».
- «La próxima semana podemos revisar las condiciones».

Cada compromiso podría incluir responsable, fecha límite, prioridad sugerida, estado y referencia al mensaje original.

El asesor tendría la posibilidad de confirmar, corregir o descartar estas propuestas antes de convertirlas en tareas operativas.

### Estado operativo de la conversación

Distinguir el estado comercial del estado conversacional.

Además de saber si un lead está en cualificación o cualificado, identificar si estamos esperando una respuesta del cliente, una actuación del asesor, una revisión humana o si no corresponde intervenir.

**Valor esperado:** reducir seguimientos olvidados y evitar que el comercial tenga que reconstruir manualmente qué quedó pendiente en cada conversación.

## Fase 2 — Inteligencia conversacional

**Objetivo:** comprender cómo evoluciona una conversación y detectar cuándo puede ser conveniente intervenir.

### Análisis del ritmo conversacional

Analizar métricas temporales y patrones de interacción:

- Frecuencia de mensajes y períodos de actividad.
- Agrupación de mensajes enviados en una misma tanda.
- Tiempo de respuesta por interlocutor.
- Preguntas y mensajes pendientes de contestación.
- Períodos de inactividad que requieren atención.

Estas métricas deberían considerar quién tiene pendiente actuar, los horarios comerciales y los acuerdos explícitos con el cliente. La inactividad por sí sola no implica un problema.

### Evolución del sentimiento

Analizar cómo cambia el tono de la conversación, identificando señales de interés, preocupación, frustración, desconfianza o satisfacción.

Más que clasificar al cliente como positivo o negativo, buscamos reconocer cambios relevantes.

Por ejemplo, detectar que una conversación que inicialmente mostraba interés ha evolucionado hacia una objeción de confianza puede ayudar a priorizar una respuesta adecuada antes de continuar con la cualificación.

### Priorización contextual

Combinar ritmo conversacional, compromisos pendientes, incidencias y estado comercial para responder:

1. ¿Quién tiene que actuar ahora?
2. ¿Qué actuación está pendiente?
3. ¿Por qué es relevante?
4. ¿Qué consecuencias puede tener retrasarla?

El resultado sería una recomendación explicable, respaldada por los mensajes originales, no un score opaco de probabilidad de conversión.

**Valor esperado:** ayudar al asesor a concentrarse en las oportunidades que realmente necesitan atención y entender el motivo de su prioridad.

## Fase 3 — Personalización y coaching comercial

**Objetivo:** adaptar las recomendaciones a cada conversación y ayudar a mejorar la calidad de las interacciones comerciales.

### Perfil de comunicación del cliente

Construir un perfil contextual a partir de preferencias explícitas y patrones observados durante la conversación.

Por ejemplo:

- Preferencia por llamadas frente a mensajes.
- Necesidad de explicaciones detalladas.
- Preocupaciones recurrentes sobre determinadas condiciones.
- Preferencia por comunicaciones breves y directas.

Este perfil permitiría personalizar las respuestas sugeridas y la estrategia de comunicación.

Las preferencias inferidas deberían ser revisables y estar respaldadas por evidencia. No se trataría de elaborar perfiles psicológicos ni de utilizar atributos sensibles para influir en decisiones financieras.

### Evaluación de calidad del asesor

Introducir un sistema de evaluación basado en cómo se gestiona una oportunidad comercial, no exclusivamente en cuántas ventas se cierran.

Algunas dimensiones candidatas serían:

- Calidad y pertinencia de las respuestas.
- Identificación y gestión de objeciones.
- Cumplimiento de compromisos.
- Capacidad para completar la información necesaria.
- Progreso hacia el siguiente hito comercial apropiado.
- Respeto de las preferencias y circunstancias del cliente.

Cada evaluación debería ser explicable, permitir revisión humana y distinguir entre falta de evidencia y bajo rendimiento.

Con suficiente validación, podría evolucionar hacia una herramienta de coaching que identificase oportunidades de mejora individuales y del proceso comercial.

**Valor esperado:** mejorar la calidad y consistencia de las conversaciones sin incentivar comportamientos orientados únicamente a cerrar ventas.

## Evolución operativa — Integraciones y automatización supervisada

Una vez validadas las capacidades anteriores, el sistema podría integrarse progresivamente con WhatsApp y el CRM.

La visión sería que los asesores siguieran trabajando desde sus canales habituales, mientras el copiloto mantiene información comercial actualizada, identifica excepciones y propone actuaciones.

La automatización debería ser gradual: extracción de información, preparación de actualizaciones para CRM, revisión por excepción y, posteriormente, ejecución de acciones expresamente autorizadas.

No se automatizarían decisiones financieras, comunicaciones con clientes ni compromisos comerciales sin las validaciones y permisos correspondientes.

## Estrategia de desarrollo y validación

La evolución se plantearía mediante incrementos pequeños, cada uno con un resultado observable y pruebas específicas.

Las primeras capacidades deberían aprovechar la arquitectura y los datos estructurados de la V0, evitando introducir sistemas complejos antes de demostrar su necesidad.

Priorizaríamos la validación de:

- **Calidad:** exactitud de la extracción, trazabilidad y tasa de correcciones humanas.
- **Productividad:** tiempo dedicado a registrar información y preparar seguimientos.
- **Utilidad:** porcentaje de recomendaciones consideradas relevantes por los asesores.
- **Fiabilidad:** falsos compromisos detectados, seguimientos incorrectos y alertas injustificadas.
- **Seguridad:** ausencia de decisiones financieras o actuaciones externas no autorizadas.

Para evolucionar hacia conversaciones reales sería imprescindible definir previamente las condiciones de privacidad, acceso, conservación de datos y supervisión correspondientes.

## Resultado esperado

La visión es evolucionar desde un **AI Lead Intake**, capaz de convertir conversaciones en datos comerciales útiles, hacia un **Sales Intelligence Copilot** que ayude a gestionar continuamente cada oportunidad.

Un sistema que no solo sepa **qué información tenemos y qué falta**, sino también **qué está pasando, quién debe actuar, cuándo conviene hacerlo y por qué**.

Todo ello manteniendo al asesor como responsable de las decisiones y utilizando la IA allí donde realmente aporta valor.
