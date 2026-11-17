# Proceso de desarrollo y colaboración humano–Codex

> Documentación de Libeen AI Lead Intake V0. [Volver al README principal](../../README.md). La aceptación vigente es de una **PoC supervisada con limitaciones**; las observaciones históricas siguen disponibles en los informes.

## 9. Desarrollo asistido por IA y colaboración humano–Codex

La implementación se realizó con apoyo intensivo de Codex, mediante delegación incremental.

Definí el problema, el alcance, las prioridades, los criterios de aceptación y las decisiones de continuación. Codex implementó módulos, interfaces, pruebas y documentación dentro de esos límites.

El desarrollo se organizó en puertas P0–P11, seguidas de evaluaciones y varias iteraciones de hardening.

### Ejemplo de revisión humana: P8.1

Una revisión detectó que adoptar una nueva declaración modificaba una insignia en pantalla, pero no el valor utilizado operativamente.

Se corrigió mediante `deriveEffective` y pruebas que verifican selección de valores, fuentes y conflictos.

El caso demuestra que la revisión humana no fue únicamente estética: detectó un error en la fuente de verdad del producto.

### Cómo utilizamos las evaluaciones

Las pruebas también detectaron defectos que no aparecían en los tests unitarios: citas correctas con interpretaciones erróneas, preguntas genéricas, problemas de continuación e interés mal clasificado.

Se conservó evidencia de los fallos y se ajustaron tanto el comportamiento como el alcance del producto.

En algunos casos se decidió no añadir más automatización hasta disponer de mejores datos de evaluación.

### Límites de la trazabilidad

El repositorio conserva documentación de las puertas, commits, informes y una exportación de sesiones de Codex.

La reconstrucción cronológica permite justificar decisiones y correcciones relevantes, pero no establece una atribución perfecta entre cada mensaje, decisión técnica y commit.

No he llevado un registro exacto del tiempo dedicado al desarrollo, pero he trabajado en la prueba a lo largo de todo el fin de semana y durante el lunes.

El **viernes por la tarde** lo dediqué a la planificación y definición del alcance. El **sábado** trabajé en el primer enfoque: un Sales Copilot concebido como un asistente autónomo capaz de acompañar al asesor durante todo el proceso comercial.

El **domingo**, tras conseguir una primera versión funcional, decidí replantear el alcance. Aunque la lógica determinista funcionaba correctamente, comprobé que la principal dificultad estaba en extraer información suficientemente fiable y verificable como para delegar decisiones comerciales en el agente. Esa incertidumbre, sumada a la complejidad de la solución, dificultaba demostrar su valor real.

Por ello, opté por simplificar el producto y centrarlo en un problema más concreto: **extraer información comercial, identificar incertidumbres y proponer la siguiente acción, manteniendo al asesor como responsable de las decisiones**.

Finalmente, el **lunes** lo dediqué a consolidar el trabajo, organizar la documentación y preparar la demostración.

Más información en [AI_COLLABORATION_LOG.md](AI_COLLABORATION_LOG.md).

---
