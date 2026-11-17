# Cuando la IA se equivoca: controles y límites de la PoC

[← Volver al README](../../README.md) · [Qué evalué y qué aprendí](EVALUATION_SUMMARY.md) · [Arquitectura técnica](TECHNICAL_ARCHITECTURE.md)

Una de las cosas que más me interesaba comprobar era qué ocurre **cuando el modelo devuelve algo incompleto, incorrecto o directamente no responde**. En una herramienta comercial, el problema no es solo que falle una llamada: también lo es que una interpretación dudosa termine pareciendo un dato confirmado.

Por eso separé la extracción con IA de las reglas que comprueban sus resultados y de la revisión del asesor. No resuelve todos los errores semánticos, pero permite que muchos de ellos sean visibles y no se propaguen automáticamente.

## 1. Si el análisis no puede completarse

**Ejemplo:** el usuario pega una conversación sin identificar quién habla, la clave de OpenAI no está configurada o el proveedor devuelve un error.

La aplicación valida primero los turnos de la conversación (`Cliente:`, `Asesor:` o `Libeen:`). Si hay mensajes sin autor reconocible, contenido vacío o un marcador de audio mezclado con texto incompatible, devuelve un error antes de llamar al modelo. Un audio sin transcripción se trata como contenido inaccesible, no como algo que podamos deducir.

La ruta de servidor comprueba la configuración y procesa la respuesta de OpenAI. Si falla la llamada, no se completa o la salida no tiene la estructura mínima esperada, **no inventa una nueva ficha ni utiliza un replay oculto**. La interfaz comunica el error y permite corregir el texto o volver a analizar. Si existía un resultado anterior, se considera desactualizado después de un error y no debe utilizarse como si correspondiera al último intento.

El transporte actual tiene un timeout de 30 segundos y los reintentos automáticos del cliente de OpenAI están desactivados. Esto no constituye una estrategia completa de disponibilidad; para la PoC preferí un fallo visible a una recuperación que ocultase qué se había ejecutado.

## 2. Si el modelo devuelve un dato con una fuente incorrecta

**Ejemplo:** el asesor pregunta «¿Ganas 3.000 €?» y el cliente no responde. Esos 3.000 € no deberían convertirse en ingresos declarados.

Cada candidato debe identificar un mensaje del **cliente** y citar un fragmento literal de ese mensaje. Después de la inferencia comprobamos, entre otras cosas, que la estructura sea válida, que el mensaje exista, que pertenezca al cliente y que la cita aparezca en él. También descartamos candidatos atribuidos a contenido inaccesible.

Si una propuesta no supera estas comprobaciones, se descarta de forma individual; el resto puede seguir siendo útil. La interfaz puede indicar cuántos elementos fueron descartados.

**El límite importante:** una cita real no garantiza una interpretación correcta. De hecho, observamos casos en los que el modelo asociaba menciones genéricas a vivienda con interés explícito en SmartHousing. Añadimos un filtro conservador para ese campo, pero puede dejar sin clasificar expresiones válidas que no reconozca. [Hallazgo F002](evaluation/FINDINGS.md).

## 3. Si falta información o una afirmación es ambigua

**Ejemplo de la demo:** una persona declara ingresos de unos 2.750 € netos al mes y una cuota de 145 €, pero no sabe si esa cuota ya está descontada.

Hay dos datos aprovechables y una relación que seguimos sin conocer. El sistema conserva los importes y las fuentes, deja la inclusión de la cuota como `unknown` y puede generar una incidencia específica para aclararla.

Esta incidencia no depende únicamente de que el modelo la proponga: cuando existe una cuota no nula con inclusión desconocida, las reglas pueden detectarlo a partir del candidato. En un caso sencillo se plantea una pregunta concreta; ante varias cuotas, varios ingresos o una continuación difícil de relacionar, puede pedirse revisión humana.

También distinguimos entre **no saber un dato** y **conocer un valor cero**. Por ejemplo, que alguien no mencione sus ahorros no autoriza a escribir «0 €».

En las evaluaciones encontramos preguntas demasiado genéricas y aclaraciones repetidas. Introdujimos motivos más específicos y una salida conservadora de revisión manual, pero **no está demostrada la resolución automática fiable de todas las continuaciones**. [Hallazgos F001 y F003](evaluation/FINDINGS.md).

## 4. Si el asesor corrige un dato y la conversación cambia

**Ejemplo:** el asesor revisa una declaración y luego incorpora un nuevo mensaje del cliente con otra cantidad.

Al reanalizar, no queremos que una nueva respuesta del modelo borre una corrección humana sin avisar. La aplicación conserva las revisiones durante la sesión y calcula una **ficha efectiva** a partir de los candidatos, las decisiones del asesor y los conflictos que sigan abiertos.

El asesor puede mantener una revisión anterior o adoptar una nueva declaración cuando la correspondencia es clara. Si hay propuestas duplicadas, múltiples cambios posibles o una revisión que ya no puede vincularse con seguridad, el sistema muestra un conflicto en lugar de consolidar arbitrariamente un valor.

Durante el desarrollo detecté un fallo distinto: adoptar un valor modificaba el estado visual, pero no el dato utilizado operativamente. Lo corregimos centralizando la selección y procedencia en `deriveEffective`. [Detalle de P8.1](P8_1_RESULT.md).

Marcar una incidencia como resuelta no equivale a verificar documentalmente el dato ni convierte por sí solo `unknown` en `included` o `excluded`. La ficha puede conservar la revisión humana y seguir mostrando esa incertidumbre.

## 5. Si la acción propuesta no es segura o la ficha ya no está actualizada

La siguiente intervención nunca se envía automáticamente. El asesor puede editarla y copiarla, y la interfaz exige volver a revisarla si una modificación puede haberla dejado obsoleta.

Las peticiones sensibles —como garantías de aprobación o una solicitud de no contacto— pueden priorizar revisión humana y bloquear el uso de una pregunta mientras permanezca una alerta sensible pendiente. **La detección no es exhaustiva**: en las evaluaciones hubo tanto señales omitidas como alertas que no estaban suficientemente justificadas.

También se limita la exportación. Si la conversación cambió desde el último análisis, hay conflictos sin resolver, no existe información utilizable o la etapa comercial seleccionada es incoherente con la sugerida, se impide copiar la ficha CRM actual. La aplicación puede mostrar una vista previa no exportable para explicar qué está pendiente.

La etapa `Cualificado` describe **completitud de información**, no solvencia ni aprobación financiera. El sistema no hace cálculos de elegibilidad, no decide sobre financiación y no sincroniza ningún CRM.

## Qué problemas siguen abiertos

| Área | Límite actual | Cómo se gestiona en la PoC |
| --- | --- | --- |
| Interpretación del interés | El filtro es conservador y puede omitir formulaciones válidas | Fuente visible y revisión del asesor |
| Aclaraciones posteriores | El modelo puede no vincular correctamente una respuesta con una duda anterior | Conflicto o revisión manual, sin cerrar la relación por suposición |
| Preguntas propuestas | Pueden ser poco específicas o no priorizar la duda esperada | Pregunta editable, comprobaciones de prioridad y validación humana |
| Señales sensibles | No hay cobertura completa ni ausencia de falsos positivos | Revisión humana cuando se detectan; no se envían mensajes |
| Correspondencias entre declaraciones | Algunos casos ambiguos permanecen en conflicto | No consolidar valores sin una selección segura |
| Disponibilidad del proveedor | No hay recuperación automática ni modo offline de análisis | Error explícito y nuevo intento manual |
| Calidad semántica | Pocas inferencias reales con el código final; no hay métricas representativas | Evaluaciones registradas y supervisión obligatoria |

Estas limitaciones son distintas de las funcionalidades que decidí **no construir** para esta versión: autenticación, base de datos y persistencia entre sesiones, WhatsApp, transcripción, envío automático, sincronización CRM, recordatorios, verificación documental y un proceso comercial autónomo de principio a fin. Las reglas comerciales existentes se editan en TypeScript; todavía no hay una interfaz de configuración.

## Qué considero demostrado y qué no

Los tests unitarios y los recorridos de navegador controlado cubren las reglas, las revisiones, los conflictos, la recuperación ante errores y los bloqueos de exportación. Una inferencia real registrada sobre el caso ficticio de Alicante obtuvo los siete campos y la pregunta de cuota esperada.

Eso permite mostrar el **recorrido supervisado** y las protecciones implementadas. No demuestra que el modelo vaya a interpretar correctamente cualquier conversación ni que todos los errores semánticos sean detectados.

El historial detallado de las incidencias está en [FINDINGS.md](evaluation/FINDINGS.md) y los resultados del cierre en [Evaluation Summary](EVALUATION_SUMMARY.md).

**La decisión de fondo fue preferir una ficha parcial y revisable a una ficha aparentemente completa en la que no sepamos distinguir datos, interpretaciones y suposiciones.**
