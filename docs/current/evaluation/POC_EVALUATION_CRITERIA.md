# Criterios vigentes de evaluación del PoC

**Decisión de alcance:** tras el hardening se acordó priorizar una demostración supervisada que permita evaluar la dirección del producto. No existe un conjunto de conversaciones suficientemente amplio para calibrar el modelo ni estimar tasas de error. La revisión humana es parte del recorrido; no se cambia retroactivamente el resultado de la evaluación anterior ni se presenta el PoC como producto listo para producción.

## Dos decisiones diferentes

| Decisión | Criterio | Estado |
| --- | --- | --- |
| Demo supervisada de PoC | Con datos ficticios, el asesor puede analizar, revisar fuentes y dudas, corregir, resolver manualmente cuando sea necesario y preparar una copia CRM sin presentar inferencias inciertas como hechos. | **GO WITH LIMITATIONS propuesto**, sujeto a revisión y aceptación humana. |
| Aceptación del contrato original | Las puertas originales incluyen resolución automática de la aclaración de Laura y evidencia de estabilidad suficiente para su entrega. | **Pendiente / NO-GO histórico**: esa resolución automática no se ha demostrado y ya no es requisito para la demo PoC acordada. |

El cambio afecta al **criterio de éxito**, no al rigor de la evidencia: se mantienen visibles los fallos originales, los replays, las evaluaciones invalidadas al cambiar el código y los casos que requirieron intervención. Una prueba con transporte controlado o replay no demuestra calidad del modelo; una llamada real satisfactoria tampoco establece fiabilidad estadística. Las pruebas con proveedor se ejecutan con conversaciones ficticias, expectativas anteriores, presupuesto limitado y sin repetir llamadas hasta conseguir un resultado favorable. No se ajusta el prompt después de observar un caso reservado sin invalidar expresamente esa evaluación.

## Evidencia para la demo

- Cuota conocida con inclusión desconocida: D propone una incidencia con referencia a la declaración aunque falte la señal del modelo. Un caso sin complicaciones permite preguntar si la cuota está descontada.
- Si hay varias cuotas, varios candidatos de ingresos o una intervención posterior que no puede vincularse con seguridad, se solicita revisión humana. El asesor puede resolver la incidencia, continuar y conservar la decisión visible durante la sesión; la inclusión permanece `unknown` si no tiene evidencia vinculada. No se hace ningún descuento aritmético.
- Los tests de navegador controlado verifican revisión, continuación, conservación y reapertura tras reanálisis; las pruebas anteriores cubren copia manual, conflictos, errores y datos desactualizados. No prueban la calidad semántica del modelo.
- La última evaluación real consistió en una llamada con un caso ficticio reservado: recuperó los siete campos y la pregunta material prevista. La conservación de revisión en interfaz se modificó después y se verificó en navegador controlado; no hubo otra llamada real. El detalle, incluidos los fallos observados en versiones anteriores, está en el [informe de hardening](HARDENING_RELEASE_REPORT.md).

## Pendiente y límites

1. **Auditoría independiente y aceptación expresa** de la demo supervisada y de estos criterios. La recomendación es provisional.
2. La resolución automática de aclaraciones y la detección general de interés siguen sin garantías. La revisión humana es necesaria, y el filtro conservador puede dejar interés válido pendiente.
3. La inferencia real es probabilística y solo se ha observado en pocos casos; no hay dataset representativo ni medición de estabilidad, precisión o cobertura. Antes de invertir en más automatización, recopilar aprendizaje de sesiones supervisadas con datos ficticios y decidir si el beneficio compensa.
4. La copia real de portapapeles y los conflictos se verificaron con respuestas controladas; el recorrido de continuación con el código final no se evaluó con una nueva inferencia real. La accesibilidad se comprobó en los estados indicados, sin auditoría WCAG completa ni lector de pantalla; no se auditó toda la red.
5. Sin persistencia entre sesiones, sin envío automático ni sincronización CRM, y sin aprobación financiera. Solo datos ficticios.

**Guion:** abrir un caso ficticio, analizar explícitamente, revisar fuentes e incidencias, aclarar o resolver manualmente la cuota cuando corresponda, revisar la pregunta y copiar la ficha para carga manual. Advertir los límites anteriores. La [matriz de aceptación](ACCEPTANCE_MATRIX.md), [hallazgos](FINDINGS.md) y [preparación de demo](DEMO_READINESS.md) conservan la evolución de los resultados.
