# P0 — límites y ejemplos del núcleo B/D/E

Documento de trabajo funcional para conversaciones ficticias. Las expectativas siguientes no son resultados de una ejecución ni prueban que el código existente las cumpla.

## 1. Contrato observable B/D/E

- **B — Extracción.** Recibe una conversación ficticia de texto con intervenciones distinguibles; identifica también contenido inaccesible o autor incierto. Devuelve candidatos para los siete campos, con referencia reconocible al mensaje del cliente y fragmento de apoyo, precisión y sujeto/base cuando corresponda, además de ausencias y dudas visibles. Puede devolver resultados parciales. Una cita respalda el texto, no garantiza que la interpretación sea correcta ni verifica documentalmente la autodeclaración.
- **D — Incidencias.** Recibe candidatos y conversación disponible; devuelve motivos concretos de aclaración o revisión de las cuatro categorías de la sección 2, con fuente cuando exista, sin invalidar otros datos útiles. Los faltantes se determinan a partir de los campos, sin inventarlos. Los avisos son provisionales y revisables.
- **E — Siguiente pregunta.** Recibe ficha e incidencias y ofrece como máximo una pregunta breve, editable y copiable, o una indicación de revisión, con motivo y campo objetivo cuando corresponda. Precedencia: **revisión sensible > ambigüedad material > primer dato esencial faltante > ninguna pregunta prioritaria**. Ante revisión sensible indica «Revisión del asesor»; si no hay pregunta, «Sin preguntas pendientes prioritarias», sin declarar aprobación. Nunca envía nada.

Para desempatar faltantes se propone el orden sencillo modificable: interés, zona, horizonte, compradores, ingresos y ahorros. Una cuota mencionada con tratamiento incierto puede generar una ambigüedad prioritaria; no se exige certificar que no haya deudas. Por ejemplo, ante la duda de Laura: «¿Los 3.800 € que me comentáis ya tienen descontados los 250 € del préstamo del coche?».

## 2. Siete campos y cuatro incidencias

| Campo comercial | Qué conservar |
| --- | --- |
| Interés explícito en SmartHousing | Interés en explorar, desinterés o pendiente; interés genérico en vivienda o pregunta condicional no confirman interés. |
| Zona | Ciudad o área declarada, incluida su imprecisión. |
| Horizonte | Fecha o período declarado, sin convertir aproximaciones en fechas exactas. |
| Compradores | Número o composición de quienes comprarían, si se puede interpretar. |
| Ingresos mensuales | Cantidad o rango, período, aproximación, sujeto individual o conjunto y base neta, bruta o desconocida; no dividir ingresos conjuntos. |
| Ahorros | Cantidad o rango, sujeto y precisión; cero explícito es un valor informado. |
| Cuotas/deudas mencionadas | Importe, periodicidad y sujeto si constan; si importa, si la cuota ya está descontada de los ingresos, o tratamiento desconocido. |

Alias y estado comercial son operativos y no los extrae B. Desconocido no equivale a cero: no mencionar deudas no demuestra que no existan. Conservar rectificaciones inequívocas y su fuente; ante contradicción no resuelta, mostrarla sin consolidar silenciosamente. Una afirmación del asesor no es una autodeclaración del cliente, incluso si contiene una cifra plausible.

1. **Ausente:** dato esencial no informado; sin fuente inventada.
2. **Ambiguo o contradictorio:** significado, base, sujeto o valores materialmente inciertos o incompatibles; conservar las referencias disponibles.
3. **Inaccesible o autor dudoso:** audio sin transcripción u origen que no permite atribuir con fiabilidad; no inventar contenido ni emisor.
4. **Solicitud delicada:** por ejemplo, oposición al contacto, petición de aprobación o garantía, urgencia de vivienda u otra solicitud que requiera criterio humano; señalar la fuente disponible y revisión.

Un fallo del proveedor o resultado desactualizado se señala aparte de estas categorías comerciales; no presentar una ejecución fallida como resultado nuevo válido ni perder la conversación.

## 3. Ejemplos y expectativas

- **Laura:** Valencia, compra en pareja, horizonte «antes del verano», ~3.800 € netos mensuales conjuntos, ~18.000 € ahorrados y cuota de coche de 250 €/mes. La inclusión de la cuota en ingresos es desconocida y el interés explícito en SmartHousing no está confirmado. E prioriza aclarar la cuota; después puede preguntar por el interés si sigue ausente.
- **Javier:** Madrid o alrededores, compra solo e ingresos variables de 2.000–3.000 €/mes con base no resuelta. El audio sin transcripción no aporta hechos; señalarlo junto con la objeción de confianza y las dudas pertinentes. E indica revisión humana cuando la objeción lo requiera.
- **Rosa:** compra en pareja, ~1.400 € con base dudosa, ahorros **0 informados** y urgencia; solicita aprobación escrita y faltan otros datos esenciales. E indica revisión humana, nunca aprobación automática.
- **Chat nuevo:** el cliente y su pareja quieren comprar por «Alcalá de Henares o cerca», mudarse en unos cinco o seis meses y explorar SmartHousing. Declaran conjuntamente ~3.100 €/mes con base neta/bruta desconocida, ~9.000 € ahorrados y una cuota de moto de 120 €/mes cuyo descuento de ingresos es desconocido. Compradores: 2; no fabricar fecha exacta, inclusión de la cuota ni inexistencia de otras deudas. D puede señalar ambas dudas materiales. Como desempate propuesto, E pregunta primero por la base: «¿Los 3.100 € mensuales que indicáis son brutos o netos?». No implica cálculo crediticio ni promesa.
- **Atribución incorrecta a evitar:** asesor: «Entonces ganáis 5.000 € netos entre los dos, ¿verdad?»; cliente: «No puedo confirmar esa cifra todavía». No extraer 5.000 € como ingresos autodeclarados del cliente.

La futura comprobación de inferencia debe usar una llamada real con chat libre y, preferiblemente, una variación no pregrabada; replay o coincidencia de texto no demuestran inferencia.

## 4. Reutilizar / adaptar / excluir

Revisión estática y selectiva; ninguna clasificación implica que se haya probado o aprobado código para P1.

- **Reutilización directa:** ninguna pieza queda aprobada como reutilización directa de bajo acoplamiento tras esta revisión.
- **Adaptar conceptos:** `src/contracts/messages.ts` aporta roles, identificadores, referencias a fragmentos y audio inaccesible; `src/fixtures/index.ts` aporta conversaciones ficticias Laura/Javier/Rosa, no sus expectativas heredadas como autoridad; `src/adapters/ai/openai.ts` muestra una llamada estructurada y tratamiento de fallos, pero está acoplado a contratos y esquema anteriores; `src/adapters/ai/validation.ts` ilustra comprobaciones de fuente, fragmento y tipo, sin que la coincidencia textual pruebe la semántica; `src/adapters/ai/templates.ts` aporta ejemplos de redacción, no su selección ligada a reglas antiguas; `src/config/index.ts` aporta nombres y matices de campos, no su motor de reglas.
- **Excluir del camino crítico:** contratos, políticas, etapas y decisiones del producto anterior, selección de plantillas gobernada por ellos y expectativas de escenarios heredadas. En particular, `src/config/index.ts` exige base neta en decisiones antiguas, mientras la V0 conserva base bruta o desconocida y señala la duda pertinente; prevalece la especificación actual. La validación antigua de cantidades en `src/adapters/ai/openai.ts` puede rechazar importes escritos con letras: no convertir esa limitación en requisito de V0.

## 5. Puerta para empezar P1

No se identifica ninguna decisión funcional pendiente que impida proponer P1. P1 requiere **autorización independiente** y una prueba con modelo real y conversación ficticia libre, diferenciada de replay, con evidencia y dudas observables. P0 no implementa B/D/E, no ejecuta llamadas a modelos y no habilita automáticamente P1 ni etapas posteriores.
