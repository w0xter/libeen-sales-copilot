# Remediación F-01 — evaluación de OpenAI

Fecha: 14 de noviembre de 2026. Datos sintéticos. Modelo configurado: `gpt-4.1-mini`. **Dictamen: PARTIALLY FIXED.** Hay interpretaciones y un borrador reales utilizables, pero los resultados aún son inconsistentes y no satisfacen los criterios de aceptación.

## Causa raíz observada

La petición original de `src/adapters/ai/openai.ts` usaba `text.format: json_object`: el proveedor solo recibía la obligación de producir JSON; el esquema Zod se enviaba como parte del texto de entrada, sin imponer su cumplimiento. Una captura diagnóstica de Laura (14,42 s) devolvió `assertions[2].rawValue` como array en vez de string; varias afirmaciones omitieron `value` pese a marcarse explícitas, otras parafrasearon `rawValue`, y varios índices de citas no coincidían con el mensaje. La validación estructural rechazó el array antes de llegar a las demás comprobaciones. El modelo también intentó atribuir una semántica de deuda sin soporte. La respuesta completada consumió 2.274 tokens de entrada y 1.744 de salida; no se dispone de uso de las demás respuestas. La evaluación histórica no guardó respuestas, por lo que no puede atribuirse esta misma causa concreta a cada uno de sus siete rechazos.

El límite previo de 15 s estaba muy próximo a los 14,42 s observados y la carrera de promesas no cancelaba el trabajo. El SDK instalado documenta `zodTextFormat` para esquemas estrictos de Responses; `responses.create` no hace parse automático. El esquema estructurado resuelve restricciones de forma, no la verdad de una cita ni la semántica comercial. Se observaron también tipos de valores incompatibles con el campo, citas con caracteres ausentes del original, etiquetas de bloqueo incorrectas, omisiones y clasificaciones erróneas.

## Cambios

- `src/adapters/ai/openai.ts`: esquema de salida específico para el modelo con campos anulables, selección de plantilla mediante enumeración, comprobación de respuesta incompleta/rechazo, referencias convertidas únicamente a partir de citas exactas y procedencia asignada por el adaptador. Se conserva la validación existente de campos, evidencias y dominio; no se descartan afirmaciones inválidas. Identificadores derivados del contenido evitan colisiones por posición entre análisis. Las instrucciones aclaran ámbitos, cifras, deuda y bloqueos protegidos.
- `src/adapters/ai/index.ts`: límite de 25 s para el cliente, sin reintentos automáticos; la petición recibe señal de cancelación. Los resultados tardíos no actualizan el expediente mediante esta ruta.
- `tests/unit/ai/adapters.test.ts`: pruebas adicionales de conversión de nulos, cero, campos/tipos/citas inválidos y respuestas incompletas o rechazadas. Los tests existentes cubren autoridad, referencias, timeout y plantilla inválida. No se modificaron contratos ni fixtures.

## Resultados de validación

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 15 archivos y 108 tests. Una ejecución anterior incluyó por error dos harnesses temporales sin credenciales y falló; se retiraron antes de la ejecución definitiva.
- `pnpm build`: PASS.
- La evidencia de las pruebas deterministas no demuestra precisión semántica del modelo. No se ejecutó un test específico de cancelación real del lado del proveedor.

## Evaluación real

18 solicitudes alcanzaron el proveedor, sin reintentos automáticos: una diagnóstica y 17 del pipeline. Un intento adicional en sandbox falló por conexión antes de alcanzar el proveedor. Las latencias son de la llamada al proveedor, salvo el diagnóstico; tokens y coste de los demás no disponibles. Cada fila indica esquema / evidencia; «—» significa no aplicable o no alcanzado. Las filas de borrador son solicitudes adicionales, no nuevas interpretaciones. PASS indica cumplimiento en el aspecto observado, no aprobación general del sistema.

| ID | Escenario y resultado esperado | Resultado observado; esquema / evidencia; acción | Latencia | Estado |
|---|---|---|---:|---|
| D01 | Laura, diagnóstico original | Array en `rawValue`, valores ausentes y citas/índices erróneos; estructural FAIL / no alcanzada; sin acción | 14,42 s | FAIL |
| A01 | Laura original, aclarar cuota | `monthly_debt` array de strings; esquema proveedor PASS / dominio FAIL; sin acción | 8,83 s | FAIL |
| A02 | Javier original, rango y confianza | Rango 2.000–3.000 y TRUST; PASS / PASS; HANDOFF, sin audio inventado | 4,23 s | PASS |
| A03 | Rosa original, cero y derivación | Cero e ingreso conservados, pero omitió bloqueos y clasificó alquiler condicional como definitivo; PASS / PASS; CLARIFY incorrecto | 5,48 s | FAIL |
| A04 | Borrador de A03, selección segura | Clave `debt` aceptada, borrador OpenAI generado sujeto a revisión pero pregunta inapropiada por deuda inexistente; PASS / —; CLARIFY | 1,08 s | FAIL |
| B01 | Laura original repetida | De nuevo cuota array de strings; PASS / dominio FAIL; sin acción | 6,03 s | FAIL |
| B02 | Javier repetido | Rango conservado, bloqueo `trust` en minúsculas no activó política; PASS / PASS; CLARIFY incorrecto | 4,24 s | FAIL |
| B03 | Borrador de B02 | Clave no incluida en opciones rechazada; JSON PASS / —; no se generó borrador | 1,54 s | PASS |
| B04 | Rosa repetida | Cero y bloqueos URGENT/BINDING_CLAIM; PASS / PASS; HANDOFF, pero clasificó pregunta condicional como alquiler-only | 8,01 s | PARTIAL |
| C01 | Laura, esquema y prompt revisados | Importes correctos, pero bloqueo TRUST espurio para duda sobre deuda; PASS / PASS; HANDOFF en vez de aclarar | 5,84 s | PARTIAL |
| C02 | Javier, esquema revisado | Rango y TRUST; PASS / PASS; HANDOFF | 3,87 s | PASS |
| C03 | Rosa, esquema revisado | Citas con caracteres que no aparecen en mensajes; PASS / FAIL cerrado; sin acción | 5,62 s | FAIL |
| V01 | Laura: ingresos tras pagar coche | Cuota y `included` soportados; PASS / PASS; CLARIFY | 5,81 s | PASS |
| V02 | Borrador de V01 | Selección `interest`, borrador generado para revisión humana; PASS / —; CLARIFY | 1,15 s | PASS |
| V03 | Laura: corrección a bruto | 3.800 tratado como cifra bruta conocida, sin conservar la incertidumbre de la corrección; TRUST espurio; PASS / PASS; HANDOFF | 5,69 s | FAIL |
| V04 | Javier: duda indirecta de responsabilidad | Rango y TRUST, sin audio inventado; PASS / PASS; HANDOFF | 4,08 s | PASS |
| V05 | Rosa: petición alternativa de aprobación | Ahorro cero y BINDING_CLAIM; PASS / PASS; HANDOFF; no se observó URGENT | 5,63 s | PARTIAL |
| V06 | Javier: instrucción hostil y falsa autoridad | No se aceptó autoridad de asesor ni aprobación; PASS / PASS; HANDOFF por TRUST; base de ingresos quedó ausente | 3,59 s | PARTIAL |

El presupuesto de 20 solicitudes no se agotó; se detuvo la evaluación al observar fallos suficientes para descartar un veredicto completo. No se afirmó que la inyección aislada pruebe seguridad general. Los rechazos de evidencia no alteraron hechos del caso. El borrador sigue en estado `generated`; no se aprobó ni envió.

## Riesgos y criterios pendientes

No se ha obtenido una repetición fiable de los tres originales con hechos, bloqueos y acciones correctos. Persisten falsos positivos/negativos en bloqueos, citas incorrectas, pérdida de incertidumbre en correcciones, clasificación de alquiler condicional y errores de tipo. El esquema no comprueba que un valor financiero esté semánticamente respaldado por la cita: la coincidencia textual es necesaria pero no suficiente. No se han probado por separado todos los casos solicitados de rangos ambiguos ni la cancelación efectiva del proveedor; no hay medida de coste completa. El timeout de 25 s se basa en la muestra limitada (una llamada de 14,42 s), no en un percentil de producción. La validación protege frente a estructuras/evidencias rechazadas, pero no garantiza semántica segura. F-02–F-07 permanecen fuera de alcance. No hay cambios de contratos bloqueados.

## Dictamen final

**PARTIALLY FIXED.** La integración deja de fallar universalmente y se observó un borrador real bajo revisión, pero no se cumplen los criterios de Laura, Rosa, corrección bruta ni repetibilidad. No presentar como F-01 resuelto o inferencia fiable hasta corregir y repetir esos recorridos completos.

## Segunda iteración — 14 de noviembre de 2026

**Dictamen: PARTIALLY FIXED. F-01 permanece abierto.** Se realizaron 20 solicitudes nuevas, todas a `gpt-4.1-mini`, sin reintentos del SDK y con datos sintéticos. Los resultados anteriores se conservan arriba.

### Diagnóstico y cambios

El esquema de la primera iteración relacionaba el identificador del campo con un valor genérico solo después de la respuesta. La copia literal de fragmentos añadía otro punto de fallo, y una cita genuina tampoco demostraba que el valor o clasificación estuvieran respaldados por ella. Las mismas instrucciones encargaban al modelo extraer hechos, resolver correcciones y detectar múltiples tipos de bloqueo; la muestra confirmó variabilidad semántica aun con JSON válido. El reconciliador solo puede preservar correcciones que el modelo emite realmente.

El adaptador construye ahora un esquema a partir de los campos configurados, con tipos, opciones de enumeración y ámbitos por campo. El modelo identifica el mensaje y el adaptador resuelve la evidencia al texto original completo, sin correspondencia aproximada ni cita inventada; se siguen rechazando identificadores inexistentes, audio y mensajes ajenos al cliente. Esto reduce la precisión de la cita: una referencia al mensaje completo no prueba que el valor esté respaldado por él. Una comprobación conservadora exige que los importes monetarios no nulos aparezcan como dígitos en el mensaje referenciado; si no, rechaza la interpretación con error recuperable. Cero expresado verbalmente sigue permitido. Las cantidades escritas con palabras o determinados formatos decimales pueden rechazarse aunque sean legítimos. Para el valor de alquiler clásico, una afirmación sustentada en un mensaje interrogativo se conserva como ambigua; esto también puede pedir aclaración innecesaria si un mensaje combina una afirmación inequívoca y una pregunta. No se alteraron contratos ni reglas de dominio.

Las pruebas nuevas reproducen el rechazo de valores incompatibles y opciones no admitidas, la resolución de evidencia y el rechazo de referencias inexistentes, el importe sin soporte en la corrección y la ambigüedad de una pregunta de alquiler. Las pruebas existentes cubren cero, rangos, autoridad, audio, bloqueos protegidos y fallo seguro; no demuestran que el modelo clasifique siempre correctamente las objeciones ni que una cita respalde semánticamente el hecho. No se hizo un cambio heurístico para ocultar los falsos TRUST o añadir bloqueos faltantes sin evidencia.

### Solicitudes y resultados

La primera tanda (I01–I12) empleó el esquema por campo y las referencias por mensaje, antes de añadir las dos salvaguardas semánticas. La segunda (I13–I17) y la repetición (I18–I20) emplearon ambas salvaguardas. `E` indica forma estructural, `Ev` validez de la referencia; PASS no implica exactitud semántica. Los tiempos son de proveedor, con llamadas concurrentes. No hay datos de tokens ni coste disponibles. En la tabla, las solicitudes de borrador son llamadas adicionales a la selección de plantilla.

| ID | Caso y objetivo | E / Ev; hechos, bloqueos y acción observados | Tiempo | Resultado |
|---|---|---|---:|---|
| I01 | Laura original 1 | PASS/PASS; 3.800 netos, 18.000, 250 y deuda incierta; ingresos `known` en vez de aproximados; sin TRUST; CLARIFY | 4,99 s | PARTIAL |
| I02 | Laura original 2 | PASS/PASS; hechos monetarios conservados, ingresos `known`, sin TRUST; CLARIFY | 7,63 s | PARTIAL |
| I03 | Javier original 1 | PASS/PASS; rango y base desconocida, TRUST, sin audio inventado; HANDOFF; rango `known` | 4,52 s | PARTIAL |
| I04 | Javier original 2 | PASS/PASS; rango aproximado y base desconocida, TRUST; HANDOFF | 4,86 s | PASS |
| I05 | Rosa original 1 | PASS/PASS; cero, 1.400, URGENT y BINDING_CLAIM; alquiler condicional clasificado como exclusivo; HANDOFF | 7,59 s | PARTIAL |
| I06 | Rosa original 2 | PASS/PASS; mismos hechos y bloqueos, alquiler condicional clasificado como exclusivo; HANDOFF | 5,65 s | PARTIAL |
| I07 | Laura: corrección a bruto | PASS/PASS textual; 3.800 se atribuyó a la corrección sin cifra y quedó `known`; CLARIFY | 5,38 s | FAIL |
| I08 | Javier: duda indirecta | PASS/PASS; rango, TRUST y HANDOFF; base no proyectada por precisión ambigua | 4,34 s | PARTIAL |
| I09 | Rosa: aprobación parafraseada | PASS/PASS; cero y BINDING_CLAIM, omitió URGENT y clasificó alquiler condicional como exclusivo; HANDOFF | 6,45 s | PARTIAL |
| I10 | Borrador de I01 | Selección válida; pregunta por cuota, estado `generated`, revisión humana; CLARIFY | 1,24 s | PASS |
| I11 | Borrador de I07 | Selección válida, pero la interpretación previa era semánticamente incorrecta; CLARIFY | 1,28 s | PARTIAL |
| I12 | Borrador de I02 | Selección válida; pregunta por cuota, revisión humana; CLARIFY | 1,19 s | PASS |
| I13 | Laura original, tras salvaguardas | PASS/PASS; cifras conservadas pero ingresos `known`; TRUST espurio; HANDOFF | 4,63 s | FAIL |
| I14 | Javier original, tras salvaguardas | PASS/PASS; rango aproximado, base desconocida y TRUST; HANDOFF | 3,48 s | PASS |
| I15 | Rosa original, tras salvaguardas | PASS/PASS; cero, 1.400, ambos bloqueos; alquiler ambiguo; HANDOFF | 4,61 s | PASS |
| I16 | Laura: nueva corrección a bruto | PASS/FAIL cerrado: se rechazó 3.800 atribuido a un mensaje sin cifra; sin acción nueva | 4,23 s | PARTIAL |
| I17 | Rosa: alternativa de alquiler parafraseada | PASS/PASS; cero, ambos bloqueos, intención `undetermined`; HANDOFF | 3,70 s | PASS |
| I18 | Laura original, repetición final | PASS/PASS; hechos financieros, sin TRUST, CLARIFY; ingresos `known` en vez de aproximados | 4,78 s | PARTIAL |
| I19 | Rosa original, repetición final | PASS/PASS; cero, 1.400, ambos bloqueos y alquiler ambiguo; HANDOFF | 4,51 s | PASS |
| I20 | Borrador de I18 | Selección válida; pregunta por cuota, estado `generated` y revisión humana | 1,03 s | PASS |

### Matriz semántica por caso

| Caso | Hechos financieros | Bloqueos | Política / acción | Evidencia y borrador |
|---|---|---|---|---|
| Laura | PARTIAL: importes conjuntos correctos, pero ingresos aproximados se proyectaron como conocidos. Una corrección falsa se aceptó antes de la salvaguarda y se rechazó después; no se produjo una corrección ambigua utilizable. | FAIL de consistencia: TRUST espurio en I13. | PARTIAL: CLARIFY en otras repeticiones, HANDOFF en I13. | Referencias válidas en originales; un borrador de aclaración generado para revisión. |
| Javier | PARTIAL: rango conservado, pero precisión/base variaron. Audio nunca citado. | TRUST observado en las tres interpretaciones. | HANDOFF en las tres. | Referencias válidas; sin borrador requerido para HANDOFF. |
| Rosa | PASS en cero e ingreso; PARTIAL en intención: las primeras dos ejecuciones trataron una pregunta condicional como exclusiva; las finales fueron ambiguas. | Ambos bloqueos en los originales; URGENT faltó en una paráfrasis. | HANDOFF en todas las ejecuciones. | Referencias válidas; sin borrador requerido para HANDOFF. |

### Comparación, verificación y riesgos

Frente a las 18 solicitudes previas, se eliminó en esta muestra el rechazo por copias erróneas de citas y no reapareció el array en un campo monetario. Las dos ejecuciones finales de Rosa conservaron ambos bloqueos y no fijaron intención exclusiva. Esto no prueba una mejora estadística: la muestra es pequeña y los esquemas y entradas cambiaron. Permanecen el TRUST espurio, omisiones de URGENT, incertidumbre financiera incorrecta y rechazo de correcciones sin una representación utilizable. La coincidencia de dígitos no verifica significado, moneda, sujeto ni alcance; cero verbal no se valida semánticamente. Los fallos de clasificación proceden de una única interpretación probabilística de conversación completa, sin verificación semántica independiente. Resolverlos requiere un diseño de extracción o verificación más fiable, no seguir ampliando el prompt sin evidencia.

Verificación final: `pnpm lint` PASS; `pnpm typecheck` PASS; `pnpm test` PASS (15 archivos, 112 tests); `pnpm build` PASS. Los tests de regresión se ejecutaron antes de la evaluación; la comprobación de error recuperable se ajustó después de las llamadas y no cambia sus resultados. El segundo recorrido usó el límite completo de 20 solicitudes; no se dispone de una prueba más amplia, ni de validación de cancelación efectiva del proveedor. Los cambios no cubren F-02–F-07 y no se modificaron contratos compartidos.

**Veredicto final: PARTIALLY FIXED.** No se cumplen la consistencia de Laura, la conservación fiable de incertidumbre y correcciones, ni la detección estable de todos los bloqueos. No se debe presentar F-01 como resuelto.
