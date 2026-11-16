# Preparación para demo

> **Decisión del responsable (16-11-2026):** demo supervisada de PoC aceptada expresamente con las limitaciones descritas en [criterios y pendientes](POC_EVALUATION_CRITERIA.md). No consta auditoría independiente y no se aprueba uso de producción.

> **Estado vigente:** demo supervisada de PoC aceptada con limitaciones. Los NO-GO posteriores en este documento registran evaluaciones históricas del criterio de automatización original. Véanse [criterios y pendientes](POC_EVALUATION_CRITERIA.md).

No hay evidencia suficiente para recomendar una demo de aceptación completa: faltan los recorridos reales de Laura, Javier y Rosa, revisión de fuentes/metadatos, bloqueos CRM completos y accesibilidad. La pregunta real observada no especificó la duda material (F001). Las pruebas controladas sí muestran una corrección, conflicto, bloqueo y copia manual; no prueban semántica. Una llamada real no demuestra robustez.

## Guion propuesto para cuando se completen las comprobaciones (máximo cinco minutos)

1. Abrir expediente ficticio, explicar que requiere acción explícita y que se envía al proveedor; analizar.
2. Revisar la ficha y abrir fuentes; explicar que son declaraciones no verificadas y comprobar la pregunta antes de usarla.
3. Corregir un candidato y mostrar su fuente. Añadir continuación ficticia, reanalizar y resolver cualquier conflicto que aparezca.
4. Revisar incidencias y etapa; abrir vista previa y copiar ficha para carga manual, sin afirmar sincronización.

Declarar expresamente: datos ficticios, detección sensible incompleta y revisión humana obligatoria, posible variabilidad del modelo, sin persistencia, sin envíos ni conexión CRM y sin aprobación financiera. No presentar como demostrados escenarios que no se hayan comprobado con la ejecución concreta.

## Actualización tras la continuación

Se mantiene **NO-GO para demo de aceptación sin reservas**. Ya se ejecutaron Javier, Rosa, Laura y Marta con OpenAI y las comprobaciones ampliadas de CRM. Los riesgos determinantes ahora son los fallos observados F001–F003: clasificación de interés no explícito y pregunta que no resuelve la duda material; la incertidumbre es visible, pero requiere intervención del asesor. La guía anterior solo sirve para una demo supervisada si se declaran esas limitaciones. Véase [informe actualizado](CONTINUATION_REPORT.md).

## Actualización de hardening

**NO-GO provisional para aceptación.** En la evaluación real posterior Laura volvió a recibir una pregunta genérica de ingresos tras aclarar la cuota; no se modificó el prompt ni se repitieron llamadas para obtener una respuesta favorable. La demo supervisada puede mostrar el caso reservado ficticio y revisión manual, con los límites indicados, pero no debe presentar la continuación de Laura como resuelta. Ver [informe](HARDENING_RELEASE_REPORT.md).

La reevaluación final mantiene **NO-GO**: incluso el segundo reservado recibió una pregunta genérica sobre cuota, y Laura inicial una pregunta genérica sobre ingresos. Ninguno de los dos es adecuado como demostración de la pregunta material sin intervención y explicación del asesor.

La revisión del contrato mantiene **NO-GO**: el nuevo reservado real omitió tanto la incidencia de cuota incierta como el interés explícito; Laura continuación volvió a preguntar una cuota resuelta. No se recomienda usar esos recorridos como demostración de aceptación sin una corrección posterior y verificación independiente.

### Demo PoC supervisada 80/20

Propuesta **GO WITH LIMITATIONS**, sujeta a aceptación humana, exclusivamente para demo supervisada con datos ficticios. Usar un caso ficticio nuevo, revisar fuente y estado de la cuota, resolver manualmente si la aclaración no se representó, revisar la siguiente pregunta y copiar la ficha de forma manual. Explicar que la revisión humana no cambia por sí sola el metadato `unknown`, que no se ha medido la estabilidad del modelo y que no existe envío, sincronización ni aprobación financiera. El NO-GO histórico sigue aplicando al criterio anterior de resolución automática.

## Guion de grabación vigente (3–4 minutos; máximo 5)

El vídeo es opcional según el enunciado. La aceptación vigente es la del responsable para la PoC supervisada; las secciones anteriores documentan evaluaciones históricas. Preparar una conversación de prueba ficticia de Alicante:

> Cliente: Quiero explorar SmartHousing en Alicante. Compraría yo sola y me gustaría mudarme dentro de ocho meses. Gano unos 2.750 euros netos al mes, tengo 11.000 euros ahorrados y pago una cuota de 145 euros mensuales; no sé si la cuota está descontada de mis ingresos.

**Antes de grabar:** usar una ventana de navegador de escritorio a 1920×1080 o tamaño legible, zoom 100 % y comprobar que no se corta la interfaz; cerrar notificaciones, pestañas y datos privados. Instalar dependencias, configurar `OPENAI_API_KEY` y, si se desea, `OPENAI_MODEL` en `.env.local`, iniciar `pnpm dev` y abrir `http://localhost:3000`. No mostrar la clave. Usar exclusivamente datos ficticios. Ensayar el recorrido y preparar la explicación de una salida parcial o error sin ocultarlos.

| Tiempo | Mostrar y explicar |
| --- | --- |
| 0:00–0:30 | El asesor transforma conversaciones en información comercial revisable; se eligió una PoC supervisada, sin decisiones financieras ni envíos. |
| 0:30–1:45 | Abrir **Texto libre**, introducir alias ficticio y el texto de Alicante, pulsar **Analizar conversación**. Mostrar candidatos y abrir sus fuentes; son declaraciones e interpretaciones, no verificación. Si faltan campos o falla el proveedor, mostrar el estado y explicar que se conservan la conversación y la necesidad de revisión; no afirmar que todos fueron extraídos. |
| 1:45–2:45 | Revisar la incidencia de cuota y su fuente; si procede, resolverla manualmente y explicar que la inclusión puede seguir como `unknown`. Revisar la pregunta y etapa. Abrir la ficha CRM y copiarla si está habilitada; si hay bloqueo, explicar y resolver solo con evidencia o mostrar el bloqueo sin inventar datos. La copia es para carga manual. |
| 2:45–3:45 | Explicar B → D → E: interpretación del modelo, decisiones deterministas y revisión del asesor. Contar la revisión humana P8.1, pruebas y aprendizaje: preguntas genéricas y errores de interés motivaron intervención; la PoC fue aceptada con límites. Declarar variabilidad, datos ficticios, ausencia de persistencia e integración CRM. |

**Qué demuestra cada evidencia:** una inferencia real anterior sobre Alicante produjo siete candidatos con fuentes y la pregunta específica ([respuesta registrada](hardening/poc-real.json)); una nueva inferencia puede producir otro resultado. La resolución, continuación, conservación/reapertura y copia se comprobaron en navegador con respuestas controladas, no como un único recorrido completo con inferencia real final. Si la salida observada no permite completar un paso, explicarlo y mostrar la revisión o el bloqueo; no simular el éxito.
