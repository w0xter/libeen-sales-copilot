# Cómo trabajé con IA durante la prueba

[← Volver al README](../../README.md) · [Registro técnico de colaboración](AI_COLLABORATION_LOG.md)

Para desarrollar esta prueba utilicé Codex como agente de programación. No le pedí que generase una aplicación completa a partir de una descripción general: empecé definiendo el problema que quería resolver, el recorrido del asesor y qué debía considerarse un resultado aceptable. Después fui delegando tareas concretas y revisando sus resultados antes de continuar.

## Qué hice yo y qué delegué

Mi trabajo estuvo principalmente en la **definición funcional, las decisiones de arquitectura, el alcance y la evaluación**. Preparé los modelos y las reglas del primer enfoque, planteé casos ficticios para ponerlo a prueba y fui decidiendo qué problemas merecía la pena corregir y cuáles indicaban que debíamos cambiar de dirección.

Delegué en Codex buena parte de la **implementación, los tests y la documentación técnica**. Para que esa delegación fuera útil, dividimos el trabajo en tareas con comportamientos observables y comprobaciones concretas. La secuencia de trabajo quedó recogida en las puertas P0–P11 y, después, en las iteraciones de evaluación y hardening.

No todas las comprobaciones las hice personalmente ni revisé cada línea del código generado. Mi intervención se concentró en las decisiones, la revisión de casos relevantes y la detección de discrepancias entre lo que se había implementado y el comportamiento que necesitaba el producto.

## Lo que cambió al probarlo con conversaciones reales del modelo

La primera versión del Sales Copilot avanzó razonablemente bien en la parte determinista. El problema apareció al usar las extracciones del modelo como base para decisiones comerciales.

Nos encontramos con respuestas que tenían el formato esperado y citas aparentemente válidas, pero cuya interpretación no era correcta. Por ejemplo, se clasificaba una consulta genérica de vivienda como interés explícito en SmartHousing, o se volvía a preguntar por una cuota que el cliente ya había aclarado.

Eso me llevó a dar más importancia a las **evaluaciones semánticas**, además de los tests habituales. Utilizamos conversaciones ficticias, respuestas reales del proveedor, replays para reproducir fallos y pruebas controladas de la interfaz. Procuré no confundir una regresión que pasa sobre una respuesta guardada con evidencia de que el LLM funcionará igual en una nueva llamada.

La documentación de [evaluaciones](EVALUATION_SUMMARY.md) y [hallazgos](evaluation/FINDINGS.md) conserva tanto los aciertos como los fallos.

## Un error que detecté revisando el producto

Hubo un problema que no dependía del LLM. Al adoptar una declaración nueva, la interfaz llegaba a mostrar que se había aceptado el cambio, pero el dato efectivo utilizado para construir la ficha seguía siendo el anterior.

Lo detecté durante una revisión funcional y encargué corregirlo. La iteración P8.1 unificó la selección de valores y fuentes en `deriveEffective`, y añadió pruebas para las distintas resoluciones y los conflictos.

Me parece un buen ejemplo de cómo trabajé: Codex podía implementar una funcionalidad y sus tests, pero seguía siendo necesario **comprobar que el comportamiento real respondía a la intención del producto**. [Detalle técnico de P8.1](P8_1_RESULT.md).

## Por qué terminé reduciendo el alcance

El domingo, cuando ya teníamos una primera versión funcional del Sales Copilot, decidí cambiar el enfoque. Seguir incorporando orquestación, reglas y mecanismos de reconciliación podía aumentar la sofisticación del sistema, pero no solucionaba por sí solo la falta de confianza en las interpretaciones que alimentaban esas decisiones.

Preferí centrar la entrega en una capacidad más concreta: extraer información de una conversación, señalar lo que falta o es dudoso y ayudar al asesor a preparar la siguiente intervención. En esta versión, la revisión humana no es un parche para ocultar fallos: forma parte explícita del producto.

Ese cambio está explicado con más detalle en [Evolución del producto](PRODUCT_EVOLUTION.md). Los resultados del contrato anterior se mantienen en los informes; no los hemos convertido retrospectivamente en pruebas superadas.

## Dedicación y cierre

No llevé un registro preciso de horas. El **viernes por la tarde** lo dediqué a planificar el problema y el enfoque inicial; el **sábado**, a desarrollar el Sales Copilot; y el **domingo**, después de obtener una primera versión funcional, a simplificarlo y trabajar sobre AI Lead Intake. El **lunes** lo dediqué a consolidar la documentación y preparar la demo.

Me llevo una conclusión bastante clara: con un agente de código puedo avanzar mucho más rápido en la implementación, pero eso desplaza una parte importante del trabajo hacia **formular buenas especificaciones, identificar riesgos, evaluar comportamientos y saber cuándo dejar de añadir complejidad**.

El [registro de colaboración](AI_COLLABORATION_LOG.md), las [evaluaciones](evaluation/HARDENING_RELEASE_REPORT.md) y el historial del repositorio permiten profundizar en lo que se hizo. No constituyen un registro exhaustivo de cada decisión o de todo el tiempo invertido.
