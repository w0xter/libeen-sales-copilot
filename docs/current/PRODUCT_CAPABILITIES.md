# Capacidades del producto

> Documentación de Libeen AI Lead Intake V0. [Volver al README principal](../../README.md). La aceptación vigente es de una **PoC supervisada con limitaciones**; las observaciones históricas siguen disponibles en los informes.

## 2. Capacidades implementadas

### 2.1. Análisis de conversaciones

El asesor puede seleccionar una conversación ficticia de ejemplo o introducir texto libre identificando los turnos de `Cliente`, `Libeen` o `Asesor`.

El análisis se inicia expresamente mediante una acción del usuario; no se ejecuta automáticamente al escribir.

La conversación se procesa mediante una ruta de servidor que llama a OpenAI.

El parser comprueba que los turnos tengan un emisor reconocible y rechaza entradas ambiguas o mal formadas antes de enviarlas al modelo.

Los marcadores de audio sin transcripción se conservan como contenido inaccesible: el sistema no inventa su contenido.

### 2.2. Extracción de información comercial

El módulo de extracción propone valores para siete campos:

| Campo | Ejemplo |
|---|---|
| Interés en SmartHousing | Quiere explorar SmartHousing |
| Zona de búsqueda | Alicante |
| Horizonte de mudanza | Dentro de ocho meses |
| Compradores | Una persona |
| Ingresos mensuales | Aproximadamente 2.750 € netos |
| Ahorros declarados | 11.000 € |
| Cuotas o deudas mencionadas | 145 €/mes |

La extracción es parcial por diseño: un campo ausente o incorrecto no obliga a descartar toda la ficha.

Cada candidato conserva, cuando corresponde:

- Mensaje y fragmento de origen.
- Precisión: explícito, aproximado, rango o incierto.
- Sujeto: individual, conjunto o desconocido.
- Base de ingresos: neta, bruta o desconocida.
- Estado de inclusión de una cuota en los ingresos.
- Incertidumbres señaladas por el modelo.

**Una fuente literal demuestra de dónde procede el texto, pero no garantiza que la interpretación semántica sea correcta.**

Los valores extraídos se consideran declaraciones del cliente, no información verificada documentalmente.

### 2.3. Detección de incidencias

El sistema identifica cuatro categorías principales:

| Categoría | Ejemplo | Tratamiento |
|---|---|---|
| Información ausente | No conocemos los ahorros | Solicitar información |
| Ambigüedad o conflicto | No sabemos si una cuota está descontada | Preguntar o revisar |
| Contenido inaccesible | Audio sin transcripción | No inferir contenido |
| Solicitud sensible | Petición de garantía, aprobación o no contacto | Revisión humana |

Las incidencias pueden utilizar señales semánticas del modelo y comprobaciones deterministas sobre los candidatos extraídos.

Por ejemplo, si existe una cuota declarada cuya inclusión en los ingresos es desconocida, el sistema puede generar una incidencia incluso si el modelo omite esa señal.

No pretende detectar perfectamente todas las situaciones sensibles ni resolver automáticamente todos los conflictos.

### 2.4. Siguiente pregunta prioritaria

El sistema propone una única intervención a partir de los datos e incidencias disponibles.

La prioridad general es:

1. Revisión humana de una situación sensible.
2. Aclaración de una ambigüedad material.
3. Solicitud de un campo esencial ausente.
4. Ninguna pregunta prioritaria, si no corresponde intervenir.

La pregunta es editable y puede copiarse, pero nunca se envía automáticamente al cliente.

La formulación es una propuesta: puede necesitar corrección por parte del asesor.

### 2.5. Revisión y reconciliación humana

El asesor puede confirmar, corregir o descartar candidatos.

Cuando aparece información nueva, el sistema permite reanalizar la conversación y contrastar los candidatos con las revisiones anteriores.

Una corrección humana no debería desaparecer silenciosamente ante una nueva extracción.

Cuando no existe una correspondencia suficientemente clara, se mantiene un conflicto o una revisión pendiente en lugar de seleccionar arbitrariamente un valor.

Un aprendizaje importante de la implementación fue la necesidad de distinguir entre **lo que la interfaz muestra como seleccionado** y **el valor efectivo que utiliza el resto del sistema**.

Esto motivó la corrección P8.1 y la introducción de una representación compartida de la ficha efectiva mediante `deriveEffective`.

### 2.6. Etapa comercial y ficha CRM

El sistema maneja las etapas:

- `Nuevo`
- `En cualificación`
- `Cualificado`

Representan el grado de completitud de la información comercial, **no la solvencia ni la aprobación financiera del cliente**.

La ficha CRM presenta los valores disponibles, su procedencia, los campos ausentes y las incidencias.

La exportación se realiza mediante copia manual al portapapeles. No existe sincronización con un CRM real.

La aplicación puede bloquear la copia cuando detecta resultados desactualizados, conflictos sin resolver, ausencia de información utilizable o una etapa incoherente con la recomendación vigente.

---
