# Índice de evidencias de la continuación

Evidencias de la auditoría descrita en el [informe actualizado](../CONTINUATION_REPORT.md). Los expedientes son ficticios. Las respuestas «real» proceden de una llamada a OpenAI; «controlado» indica interceptación HTTP y «replay» reutiliza una respuesta real guardada, sin inferencia nueva. Las capturas no representan necesariamente la misma sesión entre sí.

| Evidencia | Estado y propósito |
| --- | --- |
| [desktop-1440.png](desktop-1440.png) | Entrada real sin analizar a 1440 × 900. |
| [mobile-390.png](mobile-390.png) | Entrada real sin analizar a 390 × 844. |
| [desktop-result-1440.png](desktop-result-1440.png) | Ficha de resultado controlado en escritorio. |
| [mobile-result-390.png](mobile-result-390.png) | La misma clase de ficha controlada en pantalla estrecha. |
| [ux-reference-1440.png](ux-reference-1440.png) | Prototipo UX2 como referencia visual estática, no prueba del producto. |
| [real-marta-evidence.png](real-marta-evidence.png) | Resultado de Marta con fuentes desplegadas y [respuesta real](real-marta.json). |
| [real-laura-initial.png](real-laura-initial.png) | Laura antes de corrección y continuación; [respuesta real](real-laura-initial.json). |
| [real-laura-continuation.png](real-laura-continuation.png) | Reanálisis real con corrección conservada, conflictos y fuentes; [respuesta real](real-laura-continuation.json). |
| [real-laura-keep.png](real-laura-keep.png) | La misma sesión real tras mantener la corrección en el primer conflicto; el segundo aún podía estar pendiente. |
| [laura-replay-kept.png](laura-replay-kept.png) | Replay etiquetado: corrección mantenida frente a ambas propuestas guardadas. |
| [real-javier.png](real-javier.png) | Resultado real de Javier antes de añadir alerta manual; [respuesta real](real-javier.json). |
| [real-rosa.png](real-rosa.png) | Resultado real de Rosa antes de añadir alerta manual; [respuesta real](real-rosa.json). |
| [stage-alert.png](stage-alert.png) | Transporte controlado: alerta sensible y etapa tras confirmar la sugerida. |

[Vista CRM Laura](replay-laura-initial-crm.txt) y [vista CRM Rosa](replay-rosa-crm.txt) fueron generadas con replay de respuestas reales. [source-audit.json](source-audit.json) comprueba la literalidad y el autor de las citas de candidatos; no valida su interpretación. [accessibility.json](accessibility.json) contiene los resultados de Axe y el orden de foco muestreado; [browser-diagnostics.json](browser-diagnostics.json), las medidas de ancho y eventos de la navegación inicial. [Informe HTML](playwright/index.html) y [JSON](playwright/results.json) corresponden a la ejecución determinista completa anterior a la comprobación aislada adicional de descarte de alerta, tal como explica el informe. Las carpetas automáticas `test-results/` y `playwright-report/` son regenerables y no se versionan.

[Log local de consola Playwright MCP](../../../../.playwright-mcp/console-2026-11-16T00-32-20-968Z.log): artefacto previo sin rastrear que contiene conexiones y errores HMR de localhost durante una sesión más amplia. Se conserva como diagnóstico contextual; no es el registro exclusivo de los tests de esta continuación ni demuestra por sí solo un fallo del producto.
