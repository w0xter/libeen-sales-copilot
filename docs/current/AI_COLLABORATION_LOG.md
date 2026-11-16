# Registro de colaboración con IA

La persona responsable definió el alcance y aprobó puertas; delegó en Codex implementación, pruebas y documentación, y revisó los resultados. La colaboración no fue autónoma sin supervisión: hubo cambios de criterio, revisión humana, pruebas que fallaron y límites aceptados explícitamente.

## Primeras puertas P0–P11

Las pruebas iniciales B/D/E con transporte simulado verificaron integración y casos preparados, no inferencia real. Las interacciones con React Test Renderer y portapapeles simulado no demostraron comportamiento ni accesibilidad en navegador. En esas puertas se informó que el navegador no estaba disponible y la validación visual quedó pendiente **en aquel momento**.

En P8 una revisión humana detectó que adoptar una nueva declaración cambiaba solo una insignia y no el valor efectivo. [P8.1](P8_1_RESULT.md) corrigió la selección compartida del valor y la fuente, conservando los conflictos para revisión. En [P11](P11_RESULT.md) se contrastó otra revisión humana (H1–H5), se repararon las brechas descritas y se ejecutó una prueba optativa real de León: varios datos se extrajeron con fuente, pero no interés ni deuda. Una llamada no demuestra robustez.

## Evaluación posterior y hardening

Después se realizaron pruebas en navegador, accesibilidad en estados concretos y pruebas con proveedor real sobre conversaciones ficticias. Se observaron errores de clasificación de interés y preguntas genéricas o repetidas respecto a la cuota; la [matriz](evaluation/ACCEPTANCE_MATRIX.md) y el [informe de hardening](evaluation/HARDENING_RELEASE_REPORT.md) preservan los fallos, replays y cambios de resultado. No hubo auditoría WCAG completa ni con lector de pantalla.

El hardening incorporó una incidencia para cuota de inclusión desconocida y revisión manual conservada en sesión. El último caso real ficticio, Alicante, devolvió siete candidatos y la pregunta específica en una ejecución; después se modificó la conservación de la revisión y se verificó en navegador controlado, sin repetir inferencia. Continuación y copia se comprobaron con respuestas controladas. Ninguna de estas observaciones establece estabilidad estadística.

El responsable aceptó el 16-11-2026 una **demo PoC supervisada con limitaciones**, no el contrato anterior de resolución automática: los NO-GO anteriores siguen siendo resultados históricos de ese contrato. La revisión humana, el interés conservador y la posible resolución manual siguen siendo necesarios. Ver [criterios aprobados](evaluation/POC_EVALUATION_CRITERIA.md). No consta auditoría independiente ni aprobación para producción. El tiempo total de desarrollo no se midió de forma fiable.
