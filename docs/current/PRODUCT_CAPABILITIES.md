# Qué puede hacer el asesor con AI Lead Intake

[← Volver al README](../../README.md) · [Arquitectura técnica](TECHNICAL_ARCHITECTURE.md) · [Limitaciones conocidas](AI_RELIABILITY_AND_LIMITATIONS.md)

La idea detrás de AI Lead Intake es sencilla: cuando un asesor recibe una conversación comercial, no debería tener que releerla entera para reconstruir los datos del cliente y decidir qué preguntar después.

Esta primera versión le ayuda a convertir esa conversación en una **ficha comercial revisable**, con las declaraciones originales a mano, las dudas visibles y una siguiente intervención sugerida. No intenta mantener una conversación por su cuenta ni decidir si un cliente puede obtener financiación.

## Un recorrido completo con un cliente ficticio

Para explicar el producto, utilizo el mismo caso de Alicante que aparece en la demo. Es una conversación preparada para la prueba, no información de un cliente real:

> **Cliente:** Quiero explorar SmartHousing en Alicante. Compraría yo sola y me gustaría mudarme dentro de ocho meses. Gano unos 2.750 euros netos al mes, tengo 11.000 euros ahorrados y pago una cuota de 145 euros mensuales; no sé si la cuota está descontada de mis ingresos.

### 1. Introducir la conversación y analizarla

El asesor puede elegir un ejemplo ficticio o utilizar **Texto libre**, indicar un alias para el expediente y pegar una conversación. Los turnos deben identificar quién habla mediante `Cliente:`, `Libeen:` o `Asesor:`.

El análisis empieza cuando pulsa **Analizar conversación**. No hay un agente escuchando ni ejecutándose automáticamente en segundo plano.

Antes de llamar al modelo se comprueba que la entrada sea interpretable. Si no se distingue quién escribió un mensaje, se pide corregirlo en lugar de atribuirlo por intuición. Los audios marcados sin transcripción no se convierten en afirmaciones inventadas.

### 2. Obtener una ficha inicial sin perder las fuentes

El modelo propone candidatos para siete campos comerciales. En la ejecución real registrada del caso de Alicante se obtuvieron:

| Campo | Información extraída en esa ejecución |
| --- | --- |
| Interés | Quiere explorar SmartHousing |
| Zona | Alicante |
| Horizonte | Dentro de ocho meses |
| Compradores | Una persona |
| Ingresos | Aproximadamente 2.750 € netos al mes |
| Ahorros | 11.000 € |
| Cuotas o deudas | Cuota de 145 € mensuales |

Cada valor se puede contrastar con el **mensaje y fragmento del cliente** del que procede. Cuando corresponde, también se conservan matices como si una cantidad es aproximada, si los ingresos son individuales o conjuntos o si la cifra es neta o bruta.

En este ejemplo, el sistema conoce la existencia de la cuota, pero mantiene **desconocido** si ya se ha descontado de los ingresos.

Esta es una distinción central del producto: una respuesta puede ser útil aunque no esté completa. **No informar de una deuda no equivale a declarar que la deuda es cero; declarar que no hay ahorros sí permite registrar un cero explícito.**

La [respuesta real del caso de Alicante](evaluation/hardening/poc-real.json) documenta una ejecución satisfactoria; otra inferencia puede devolver un resultado diferente. Los valores son declaraciones, no datos verificados por documentos.

### 3. Ver qué falta o qué conviene aclarar

Después de la extracción, el sistema analiza lo que tenemos y lo que sigue siendo incierto. En Alicante identifica la duda de si la cuota está descontada de los ingresos.

No depende exclusivamente de que el modelo haya señalado esa duda: si existe una cuota no nula con inclusión desconocida, las reglas pueden generar una incidencia conservadora a partir del candidato y su fuente.

También se contemplan otros motivos de revisión: campos esenciales ausentes, ambigüedades, mensajes inaccesibles o solicitudes sensibles como una petición de aprobación o de no contacto.

Si falta algo, el sistema **no completa los huecos con suposiciones**. Y detectar una incidencia sensible no significa que pueda interpretar correctamente todas las variantes posibles.

### 4. Proponer una sola siguiente intervención

Con la ficha parcial y las incidencias, el sistema decide qué intervención conviene presentar primero.

En el caso de Alicante, la ejecución registrada propuso:

> ¿La cuota que habéis indicado ya está descontada de vuestros ingresos?

La pregunta **se puede editar y copiar**, pero no se envía. Si aparece una solicitud sensible, el sistema puede priorizar una revisión humana en lugar de una pregunta comercial.

La selección responde a reglas sencillas: primero situaciones sensibles, después ambigüedades materiales y, si no las hay, campos esenciales ausentes. No hay un agente negociando, enviando mensajes ni manteniendo una conversación autónoma.

La pregunta es una ayuda, no una instrucción que el asesor deba seguir sin revisar. En las evaluaciones hemos visto casos en los que la formulación resultaba genérica o repetía una aclaración anterior.

### 5. Corregir datos y continuar la conversación

El asesor puede **confirmar, corregir o descartar** candidatos. La aplicación conserva esas intervenciones para construir la ficha efectiva y no confundir un dato propuesto por el modelo con uno corregido manualmente.

Si llega otra respuesta del cliente, se puede incorporar al texto y volver a analizar el historial completo. Cuando las declaraciones nuevas no encajan con una revisión previa, la aplicación puede mostrar el conflicto y permitir mantener la decisión anterior o adoptar la nueva, en lugar de sobrescribirla sin avisar.

También puede marcar una incidencia como resuelta o descartada. En el caso de una cuota, resolver manualmente la incidencia no implica que el metadato pase automáticamente de `unknown` a `included` o `excluded`: **la revisión no fabrica la evidencia que falta**.

Las pruebas de estas interacciones se realizaron con respuestas controladas del navegador. No debemos interpretarlas como prueba de que el modelo reconciliará correctamente cualquier conversación nueva.

### 6. Preparar la ficha para el CRM

Al final, el asesor puede abrir una **vista previa de ficha CRM** con datos disponibles, procedencia, campos pendientes, incidencias y etapa comercial.

Las etapas son `Nuevo`, `En cualificación` y `Cualificado`. Se refieren a **completitud de información comercial**, nunca a solvencia o financiación aprobada.

La ficha se copia al portapapeles para cargarla manualmente. La aplicación puede impedir esa copia si hay conflictos, resultados desactualizados, ausencia de datos utilizables o una etapa pendiente de revisar. Aun así, es posible consultar una vista previa no exportable para entender qué falta.

No existe conexión con un CRM, ni envío al cliente, ni persistencia de expedientes entre sesiones.

## Qué valor buscamos demostrar

Para esta prueba me interesaba validar un recorrido concreto: que un asesor pueda pasar de una conversación a una **lectura comercial útil y corregible**, sin perder tiempo reconstruyendo manualmente cada dato y sin depender ciegamente de una interpretación del LLM.

Por eso prefiero que el sistema muestre una incertidumbre o pida revisar un caso antes que presentar una ficha aparentemente completa sobre suposiciones.

La PoC demuestra ese flujo con los límites descritos en las evaluaciones. No mide todavía cuánto tiempo ahorra a un asesor en un entorno real, ni acredita precisión semántica general.

Para entender **cómo** funciona el pipeline, véase [Arquitectura técnica](TECHNICAL_ARCHITECTURE.md). Para los fallos que hemos observado y cómo los tratamos, [Fiabilidad y limitaciones](AI_RELIABILITY_AND_LIMITATIONS.md).
