# Matriz de aceptación AC-01–AC-23

> **Lectura vigente:** la tabla inicial y sus actualizaciones son históricas. El criterio aprobado para evaluar el PoC supervisado y sus pendientes se describen en [Criterios de evaluación del PoC](POC_EVALUATION_CRITERIA.md); no se alteran retrospectivamente los criterios originales.

Actualizada tras la continuación: [informe](CONTINUATION_REPORT.md), [hallazgos](FINDINGS.md) y [tests](../../../tests/e2e/continuation.pw.ts). PASS se refiere a los ejemplos ejecutados, no a robustez general.

| ID | Requisito original | Cobertura | Evidencia | Estado | Observaciones |
| --- | --- | --- | --- | --- | --- |
| AC-01 | Analizar conversación ficticia inédita con inferencia real | continuation.pw.ts | real / controlado / replay, según informe | PASS | Marta real; siete valores y citas examinados en una ejecución; variabilidad no medida. |
| AC-02 | Distinguir asesor/cliente sin atribución incorrecta de datos | continuation.pw.ts | real / controlado / replay, según informe | PASS | 30 citas de candidato en mensajes de cliente; alcance limitado a cinco respuestas. |
| AC-03 | Extraer los **siete** campos comerciales cuando están presentes, con origen y precisión (actualización del borrador de seis campos) | continuation.pw.ts | real / controlado / replay, según informe | FAIL | Marta siete correctos; Laura/Rosa interés genérico clasificado como SmartHousing: F002. |
| AC-04 | Diferenciar desconocido, cero explícito, rango y aproximación | continuation.pw.ts | real / controlado / replay, según informe | PASS | Marta aproximación, Javier rango, Rosa cero y base desconocida observados. |
| AC-05 | Evidencia reconocible por campo extraído | continuation.pw.ts | real / controlado / replay, según informe | PASS | 30 citas literales de cliente comprobadas; un enlace de fuente activado. |
| AC-06 | Confirmar, corregir o descartar candidato y reflejarlo al exportar | continuation.pw.ts | controlado | PASS | Las tres acciones comprobadas con vista CRM y copia real. |
| AC-07 | Laura conserva duda de cuota y recibe aclaración específica | continuation.pw.ts | real / controlado / replay, según informe | FAIL | Laura prioriza ingreso aproximado en vez de cuota: F003. |
| AC-08 | Una respuesta posterior cambia resultado sin doble descuento | continuation.pw.ts | real / controlado / replay, según informe | FAIL | Se recibe aclaración sin doble descuento, pero persiste pregunta genérica: F003. |
| AC-09 | Javier no produce hechos desde audio sin transcripción | continuation.pw.ts | real / controlado / replay, según informe | PASS | Javier audio inaccesible m4; sin candidatos atribuidos a audio. |
| AC-10 | Rosa ahorros 0, solicitud sensible y nunca aprobación financiera | continuation.pw.ts | real / controlado / replay, según informe | FAIL | Ahorro cero y alertas reconocidas; consulta de alquiler clasificada bajo interés SmartHousing: F002. |
| AC-11 | Incidencias con motivo y posibilidad de revisar/descartar | continuation.pw.ts | real y controlado | PASS | Alerta manual añadida, resuelta, reabierta y descartada; motivos visibles. |
| AC-12 | Única pregunta editable y no enviada | continuation.pw.ts | real / controlado / replay, según informe | PARTIAL | Una pregunta editable y bloqueos; pregunta genérica F001/F003; red completa no auditada. |
| AC-13 | Orden de campos/prioridades modificable sin reescribir motor | tests/unit/intake/p11.test.ts | unitaria | PASS | Cambios de orden y prioridad ejecutados en prueba unitaria; sin reiniciar UI con configuración modificada. |
| AC-14 | Exportación real, excluyendo contradicciones no resueltas como valores consolidados | continuation.pw.ts | real / controlado / replay, según informe | PASS | Copia portapapeles controlada; conflicto, etapa, vacío y desactualización bloquean. |
| AC-15 | Nunca simular sincronización CRM ni envío a cliente | continuation.pw.ts | real / controlado / replay, según informe | PARTIAL | Interfaz indica copia manual y no envío; no se auditó red completa. |
| AC-16 | Fallo conserva entrada y deja claro resultado desactualizado | continuation.pw.ts | real / controlado / replay, según informe | PASS | Error controlado conserva entrada y revisión, señala desactualización y permite recuperación. |
| AC-17 | Reanálisis no sobreescribe corrección manual silenciosamente | continuation.pw.ts | real / controlado / replay, según informe | PASS | Reanálisis real conservó corrección y mostró conflictos; ambas decisiones comprobadas en controlado/replay. |
| AC-18 | Pruebas reproducibles, diferenciando replay de inferencia real | continuation.pw.ts | real / controlado / replay, según informe | PASS | Pruebas y evidencias reproducibles distinguen real, controlado y replay. |
| AC-19 | Ficha CRM muestra identificador, siete campos y stage | continuation.pw.ts | real / controlado / replay, según informe | FAIL | Siete etiquetas y etapa presentes; valores erróneos de interés en Laura/Rosa: F002. |
| AC-20 | Laura original no pasa a «Cualificado» hasta resolver interés explícito y cuota | continuation.pw.ts | real / controlado / replay, según informe | PARTIAL | Laura real permanece En cualificación; transición tras completar interés no probada. |
| AC-21 | Cualificado ≠ aprobado y ahorros 0 cuentan como informados | continuation.pw.ts | real y controlado | PASS | Cero Rosa reconocido; escenario controlado con cero alcanza Cualificado sin aprobación. |
| AC-22 | Contradicción material/corrección manual actualiza recomendación stage visiblemente | continuation.pw.ts | real / controlado / replay, según informe | PASS | Controlado: alerta tras Cualificado fuerza revisión y retorno a En cualificación; conflicto bloquea. |
| AC-23 | Exportación conserva stage y datos autodeclarados, sin afirmar sincronización | continuation.pw.ts | real / controlado / replay, según informe | PARTIAL | Portapapeles conserva etapa y procedencia; error semántico F002 limita utilidad. |

## Actualización de hardening (16-11-2026)

La tabla anterior conserva la evaluación histórica. En la ejecución descrita en [HARDENING_RELEASE_REPORT.md](HARDENING_RELEASE_REPORT.md), los cambios frente al punto de partida son los siguientes; los demás estados históricos no se elevan automáticamente. Resultado provisional: **16 PASS / 6 PARTIAL / 1 FAIL** para los casos evaluados, no certificación de robustez.

| AC | Antes | Ahora | Evidencia y límite |
| --- | --- | --- | --- |
| AC-03 | FAIL | PARTIAL | Laura/Rosa real ya no presentan interés genérico como positivo; Marta y caso reservado sí extraen interés explícito. Filtro conservador limitado a ciertas frases; no prueba interpretación universal. |
| AC-07 | FAIL | PASS | Laura real original y replay preguntan específicamente por inclusión de cuota; una inferencia real. |
| AC-08 | FAIL | FAIL | Laura real posterior conserva fuente de aclaración, pero vuelve a preguntar genéricamente ingresos por una incidencia de aproximación. F003 persiste. |
| AC-10 | FAIL | PASS | Rosa real conserva cero, interés pendiente y revisión humana; una inferencia. |
| AC-19 | FAIL | PARTIAL | Ficha/CRM controlados mantienen interés pendiente y etapa no cualificada; no se verificó copia CRM con el caso real reservado. |
| AC-12 | PARTIAL | PARTIAL | Marta y Laura inicial mejoran; Laura continuación sigue formulando una pregunta innecesaria. |
| AC-20 | PARTIAL | PARTIAL | Laura original permanece pendiente; transición positiva real no demostrada. |
| AC-23 | PARTIAL | PARTIAL | Copia manual controlada comprobada; semántica real y transición requieren revisión. |

### Reevaluación final posterior al ajuste

Esta reevaluación sustituye los estados provisionales de la actualización anterior: **15 PASS / 7 PARTIAL / 1 FAIL** frente a 14 / 4 / 5 de partida. AC-07 vuelve a **FAIL**: Laura original real recibió una pregunta genérica de ingresos por una incidencia de cuota etiquetada como `income`. AC-08 pasa de FAIL a **PARTIAL**: la continuación de Laura no repitió la pregunta en una ejecución real final y el replay de la ejecución anterior pasa con el ajuste, pero la prioridad inicial sigue fallando y la variabilidad no está resuelta. AC-12 permanece PARTIAL: el segundo reservado real formuló una pregunta genérica de cuota. Los demás cambios y límites de la actualización anterior permanecen.

### Evaluación del contrato de incidencia revisado

Esta sección sustituye los estados posteriores anteriores para el código actual. Resultado provisional **15 PASS / 6 PARTIAL / 2 FAIL**. AC-03 vuelve a **FAIL**: el reservado real no conservó el interés explícito, pese a estar presente en la conversación. AC-07 pasa a **PASS** para la ejecución de Laura original con motivo estructurado y replay; AC-08 vuelve a **FAIL**, ya que la continuación real repitió la duda ya aclarada. AC-10 queda **PARTIAL**: Rosa pasó en la evaluación anterior, pero no se repitió tras cambiar el contrato de proveedor. AC-19 sigue PARTIAL. Las cifras no certifican comportamiento general; el segundo fallo de replay también muestra que una cuota incierta puede quedar sin incidencia cuando el proveedor devuelve una lista semántica vacía.

### Criterio PoC supervisado 80/20

Se mantiene la matriz estricta y sus límites históricos; no se cambian automáticamente los 15 / 6 / 2 del contrato anterior. Para el criterio PoC acordado, una cuota incierta genera incidencia con fuente aun cuando el modelo la omita, y el asesor puede resolverla, continuar y conservar visible la decisión sin modificar el metadato desconocido: pruebas controladas y navegador `hardening-review.pw.ts`. Una inferencia real nueva produjo siete candidatos y la pregunta material; no mide robustez. AC-08 sigue sin demostrarse como resolución automática, pero el recorrido manual aceptado para PoC está demostrado en controlado. Ver [informe](HARDENING_RELEASE_REPORT.md).
