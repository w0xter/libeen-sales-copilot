# Qué evalué y qué aprendí

[← Volver al README](../../README.md) · [Capacidades del producto](PRODUCT_CAPABILITIES.md) · [Hallazgos detallados](evaluation/FINDINGS.md)

Las evaluaciones fueron una parte importante de esta prueba porque el primer Sales Copilot planteaba una dificultad que los tests habituales no podían resolver: **que el código funcionase y el modelo devolviese un JSON válido no significaba que hubiéramos entendido correctamente al cliente**.

Al principio comprobamos módulos, reglas y recorridos preparados. Después incorporamos conversaciones ficticias, llamadas reales a OpenAI, replays de respuestas anteriores y pruebas de navegador. Los fallos que aparecieron influyeron tanto en la implementación como en la decisión de reducir el alcance a una PoC supervisada.

## Los problemas que cambiaron el producto

### 1. Confundir una mención con interés comercial

En conversaciones de Laura y Rosa, el sistema llegó a interpretar menciones generales sobre vivienda o alquiler como interés explícito en SmartHousing. Era un problema serio: una ficha comercial aparentemente correcta podía contener una conclusión que el cliente no había expresado.

**Qué cambiamos:** añadimos un filtro conservador sobre las evidencias de interés y pruebas que distinguen expresiones explícitas, negativas y condicionales.

**Qué sigue pendiente:** el filtro también puede dejar sin clasificar un interés legítimo expresado de otra manera. No hemos demostrado cobertura semántica general. [Detalle del hallazgo F002](evaluation/FINDINGS.md).

### 2. Detectar una duda, pero formular la pregunta equivocada

En una evaluación, la aplicación identificaba que no sabíamos si una cuota mensual ya estaba descontada de los ingresos, pero proponía una pregunta genérica sobre «la cuota». En otros casos volvía a preguntar por información que parecía haber quedado aclarada.

**Qué cambiamos:** introdujimos motivos de incidencia más concretos para seleccionar la pregunta, y una regla que identifica cuotas de inclusión desconocida aunque el modelo no emita la señal correspondiente. Cuando una aclaración posterior no puede vincularse con seguridad, la interfaz puede solicitar revisión humana en lugar de cerrar el caso automáticamente.

**Qué sigue pendiente:** la reconciliación automática de todas las aclaraciones no está resuelta. Es una de las razones por las que el alcance final incluye explícitamente al asesor. [Hallazgos F001 y F003](evaluation/FINDINGS.md).

### 3. Mostrar un cambio en pantalla sin cambiar el dato efectivo

Durante una revisión funcional detecté que adoptar una declaración nueva podía actualizar la indicación visual, pero mantener el valor anterior en la ficha operativa.

**Qué cambiamos:** unificamos la selección del valor y su fuente mediante `deriveEffective`, con tests específicos de revisión, adopción y conflictos. Este defecto no era del LLM, sino de cómo habíamos conectado la interfaz con el estado de negocio.

Para mí fue una buena muestra de por qué revisar el producto completo importa tanto como tener pruebas de cada función. [Corrección P8.1](P8_1_RESULT.md).

## Cómo comprobamos el comportamiento

No utilizamos todas las pruebas para responder a la misma pregunta:

| Tipo de prueba | Qué nos permitió comprobar | Qué no permite concluir |
| --- | --- | --- |
| Unitarias e integración | Reglas, validaciones, reconciliación, contratos B/D/E | Si el LLM interpreta bien una conversación nueva |
| Replay con respuestas guardadas | Reproducir fallos y evitar regresiones concretas | Que una nueva llamada al proveedor dé el mismo resultado |
| Playwright con respuestas controladas | Recorrido del asesor, correcciones, conflictos, preguntas, CRM y errores | Fiabilidad semántica de la inferencia |
| Inferencias reales con conversaciones ficticias | Observar respuestas efectivas del modelo en casos concretos | Precisión o estabilidad estadística |
| Revisión humana | Identificar interpretaciones incorrectas que pasan validaciones técnicas | Cobertura completa del dominio |

Durante las iteraciones también se probaron casos adversos y un corpus sintético más amplio. Una [evaluación de 32 snapshots](SEMANTIC_ISSUES_32_EVALUATION.md) encontró, entre otros, preguntas repetidas, alertas sensibles injustificadas y atribuciones económicas incorrectas. Fue una muestra de desarrollo con adjudicación manual, **no un benchmark independiente ni una estimación de precisión**.

## Qué conseguimos verificar en el cierre de la PoC

El último [informe de hardening](evaluation/HARDENING_RELEASE_REPORT.md) registra los siguientes resultados:

| Comprobación | Resultado documentado |
| --- | --- |
| Vitest | **232 PASS / 4 SKIP** |
| Playwright | **19 PASS / 9 SKIP** |
| Typecheck, lint y build | **PASS** |
| Última inferencia real | **Una ejecución satisfactoria** sobre un caso ficticio reservado |

Los tests de proveedor real son optativos y no se incluyen por defecto en los recorridos de navegador. Los resultados anteriores corresponden al cierre registrado; no representan una auditoría independiente posterior.

### El caso ficticio de Alicante

En la última inferencia real documentada utilizamos una conversación preparada previamente: una persona quiere explorar SmartHousing en Alicante, comprar sola, mudarse en ocho meses, declara unos 2.750 € netos mensuales, 11.000 € ahorrados y una cuota de 145 €/mes cuya inclusión en los ingresos desconoce.

**En esa ejecución**, el modelo devolvió los siete campos con sus fuentes y la aplicación propuso la pregunta concreta sobre si la cuota ya estaba descontada. La [respuesta registrada](evaluation/hardening/poc-real.json) permite revisar el resultado.

No extrapolo ese acierto a otras conversaciones. Después de la llamada se ajustó la conservación de la revisión humana en la interfaz y se comprobó con respuestas controladas; **no se repitió una inferencia real completa con el código final**.

### Qué se verificó en la interfaz

Los recorridos de navegador controlado cubren confirmación, corrección y descarte de datos; continuación y reanálisis; conservación y reapertura de incidencias; conflictos; edición y copia de preguntas; vista previa y copia manual al CRM; bloqueos por estados desactualizados y recuperación ante errores.

También se corrigió un problema de landmarks y se pasaron comprobaciones automatizadas con Axe sobre los estados documentados, en escritorio y móvil, además de verificaciones de teclado y foco. **No se realizó una auditoría WCAG completa ni una validación integral con lector de pantalla.**

## Por qué cambió el criterio de entrega

La primera evaluación de aceptación de la versión amplia comprendía **23 criterios funcionales** y registró **14 PASS, 4 PARTIAL y 5 FAIL**. Las siguientes iteraciones corrigieron problemas, pero no demostraron de manera suficientemente estable la resolución automática de determinadas aclaraciones.

En lugar de presentar esos fallos como resueltos, distinguimos dos objetivos:

- **El contrato original:** una automatización más completa, incluida la resolución automática de la continuación de Laura. No quedó demostrado en su totalidad; conserva su resultado histórico.
- **La PoC que finalmente entregamos:** un recorrido supervisado con datos ficticios, fuentes visibles, revisión, tratamiento manual de incertidumbres y preparación de una ficha CRM sin acciones externas.

El **16 de noviembre de 2026** acepté cerrar esta segunda versión como demostración supervisada con limitaciones. Es una decisión de alcance del proyecto, **no una certificación de calidad del modelo ni aprobación para producción**. Los [criterios de cierre](evaluation/POC_EVALUATION_CRITERIA.md) y la [matriz de aceptación](evaluation/ACCEPTANCE_MATRIX.md) mantienen separadas ambas evaluaciones.

## Qué mediría antes de continuar

La siguiente inversión no sería añadir más agentes. Primero necesitaría un conjunto de conversaciones ficticias suficientemente variado, anotado con expectativas estables y revisado por personas, para medir cosas distintas:

- Si los campos atribuidos al cliente son correctos y tienen fuentes válidas.
- Si se reconocen las aclaraciones y rectificaciones sin repetir preguntas.
- Cuántas intervenciones humanas hacen falta para obtener una ficha útil.
- Si las preguntas propuestas ayudan realmente al asesor y cuánto tiempo ahorran.
- Qué falsos positivos y falsos negativos producen los avisos sensibles.

**Mi principal aprendizaje:** las pruebas técnicas sirven para comprobar que hemos construido bien el comportamiento definido. Pero, cuando una decisión depende de interpretar lenguaje natural, también necesito evaluar si ese comportamiento tiene sentido en conversaciones concretas. Esa diferencia fue lo que acabó determinando el alcance del producto.

Para profundizar: [informe de hardening](evaluation/HARDENING_RELEASE_REPORT.md), [hallazgos](evaluation/FINDINGS.md), [matriz](evaluation/ACCEPTANCE_MATRIX.md) y [criterios vigentes](evaluation/POC_EVALUATION_CRITERIA.md).
