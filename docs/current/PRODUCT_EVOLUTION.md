# Del Sales Copilot autónomo a AI Lead Intake

[← Volver al README](../../README.md) · [Cómo trabajé con Codex](DEVELOPMENT_PROCESS.md)

Empecé la prueba con una idea bastante más ambiciosa que el producto que finalmente entregué: un asistente que acompañase a un asesor durante todo el proceso comercial, no solo en la primera conversación. Quería que pudiera entender en qué punto estaba cada oportunidad, reconocer información relevante y ayudar a decidir cómo avanzar.

Conseguimos construir una primera versión funcional, pero probarla me hizo cambiar de opinión sobre qué parte del problema tenía sentido resolver primero.

## El primer enfoque: un Sales Copilot para todo el proceso

La propuesta inicial organizaba el trabajo alrededor de un expediente comercial y una secuencia de hitos. Diseñé tres piezas para separar las responsabilidades:

- `WorkflowDefinition`: qué etapas debía recorrer una oportunidad y qué condiciones permitían avanzar.
- `FactSchema`: qué información necesitábamos conocer y cómo representarla.
- `AgentProfile`: cómo debía comportarse el asistente y qué límites tenía.

A eso se sumaban el modelo de `Case`, reglas de negocio y una orquestación capaz de avanzar entre los hitos M0–M5.

Me interesaba esta separación porque hacía explícitas las reglas y evitaba dejar todo el comportamiento comercial en manos de un prompt. El sistema determinista podía evaluar condiciones y ordenar el trabajo a partir de los datos recibidos.

El problema era que **esas decisiones dependían de que los datos extraídos de la conversación fueran suficientemente fiables**.

## Lo que descubrimos al ponerlo a prueba

Las primeras iteraciones mostraron una diferencia importante entre generar una salida válida y entender correctamente la conversación. Un modelo puede devolver un JSON con campos y citas existentes y, aun así, atribuir mal una cifra, interpretar una intención que no se ha expresado o seguir tratando como pendiente algo ya aclarado.

Eso tenía poco impacto si el resultado era solo una propuesta que un asesor podía corregir. En cambio, se volvía crítico si pretendíamos utilizarlo para dar autonomía al proceso completo.

Probamos distintas estrategias para mejorar la interpretación. Una de ellas fue dividirla en varias pasadas (*multipass*) en lugar de realizar una extracción más directa (*single-pass*).

En una comparación de 24 escenarios sintéticos, el evaluador automático registró 23 comprobaciones PASS para single-pass y 2 para multipass, con 54 y 139 intentos al proveedor respectivamente. **No interpreto esas cifras como tasas de precisión**: hubo abstenciones conservadoras, diferencias en los criterios de evaluación y falsos positivos detectados al revisar el propio oráculo. Sí fueron suficientes para cuestionar si la complejidad añadida estaba justificada.

También exploramos LangExtract como alternativa experimental de extracción, sin integrarlo en el producto final. La [documentación del experimento](LANGEXTRACT_REPLAY_20261115.md) conserva sus resultados.

## La decisión del domingo

El domingo ya tenía una primera versión funcional del Sales Copilot. La parte determinista se comportaba como esperaba, pero la dificultad real seguía estando en extraer y reconciliar información de forma que pudiéramos confiar en ella para tomar decisiones comerciales automáticamente.

Podía continuar añadiendo validaciones, etapas de interpretación y mecanismos para resolver conflictos. Sin embargo, cada capa nueva aumentaba el trabajo de implementación y evaluación, mientras que el valor del producto seguía dependiendo de un punto que no habíamos resuelto suficientemente bien.

**Decidí simplificarlo en lugar de seguir ampliando la arquitectura.**

Me centré en una situación más concreta y frecuente: un asesor recibe una conversación, necesita construir una ficha con lo que sabe, detectar las dudas y decidir qué preguntar después.

Así surgió AI Lead Intake. El núcleo quedó reducido a tres capacidades:

- **B — Extraction:** proponer datos comerciales con citas y metadatos.
- **D — Issues:** señalar lo que falta, es ambiguo o necesita revisión.
- **E — Next Question:** seleccionar una intervención prioritaria para el asesor.

El resultado no intenta sustituir al asesor. Le permite revisar información aprovechable, corregir errores y preparar una ficha para cargarla manualmente en el CRM.

La diferencia esencial no es el número de módulos. Es **qué responsabilidad estamos dispuestos a delegar a partir de una inferencia probabilística**.

## Lo que aprendí y lo que dejaría para después

La simplificación no hizo desaparecer los problemas de interpretación. Durante el hardening seguimos encontrando preguntas demasiado genéricas, expresiones de interés mal clasificadas y aclaraciones que el modelo no vinculaba correctamente con lo dicho antes.

Por eso no presento esta entrega como una solución autónoma ni como una extracción semántica fiable en cualquier conversación. La última PoC incorpora controles deterministas y revisión humana para algunos de esos casos, pero quedan límites abiertos. El [resumen de evaluación](EVALUATION_SUMMARY.md) distingue las pruebas controladas de las llamadas reales y recoge lo que todavía no está demostrado.

Si continuara el desarrollo, priorizaría un conjunto más representativo de conversaciones evaluadas y mejoras en la reconciliación de aclaraciones antes de volver a añadir autonomía. El [roadmap](roadmap.md) describe las posibles evoluciones.

El primer Sales Copilot se conserva en [`archive/sales-copilot-v0`](https://github.com/w0xter/libeen-sales-copilot/tree/archive/sales-copilot-v0) y en la [documentación histórica](../legacy/README.md). No forma parte del runtime de AI Lead Intake, pero ayuda a entender por qué llegué a la versión actual.

**La decisión más importante de esta prueba no fue qué añadir, sino reconocer qué necesitábamos demostrar antes de seguir automatizando.**
