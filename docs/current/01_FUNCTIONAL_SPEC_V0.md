# Libeen AI Lead Intake — Especificación funcional V0

**Versión:** 0.1 (consolidada para repositorio) · **Fecha:** 2026-11-15  
**Estado:** especificación de trabajo; sin arquitectura técnica aprobada.  
**Ámbito:** únicamente la prueba técnica y conversaciones **sintéticas/ficticias**.  
**Prioridad de implementación actual:** los módulos **B, D y E**, pero esta especificación cubre el recorrido completo para construir la plataforma **después** de validar el núcleo.

> **Decisión de producto confirmada:** la extracción y clasificación pueden ser deliberadamente imperfectas, siempre que generen información comercial aprovechable, las incertidumbres sean visibles y el asesor conserve la autoridad para revisar. Esto **no** permite inventar datos, ocultar errores ni presentar información autodeclarada como verificada.

## 1. Problema, usuario y valor

Un asesor comercial interno recibe una conversación sobre una posible compra y necesita convertirla en una ficha que pueda introducir **manualmente** en un CRM. Hoy esa tarea obliga a volver a leer el chat, reconstruir datos dispersos y decidir qué falta por preguntar.

**Promesa verificable V0:** pegar una conversación ficticia desconocida para el sistema; analizarla con un modelo real; ver datos útiles, fragmentos de origen e incertidumbres; corregir una extracción; revisar incidencias; obtener una sola pregunta sugerida; copiar o descargar una ficha preparada para CRM. Si llega una respuesta nueva, reanalizar y ver un cambio coherente.

**No prometemos:** conexión a WhatsApp o CRM, mensajes enviados, citas, recordatorios automáticos, aprobación crediticia, análisis financiero, inferencia perfecta o persistencia entre sesiones.

## 2. Recorrido principal del asesor (V0 completa, no alcance de P0)

1. Abrir un expediente temporal: conversación pegada manualmente o elegir Laura, Javier o Rosa.
2. Verificar que puede distinguirse quién habla; pulsar **Analizar**. No hay inferencia automática cada vez que se escribe.
3. Revisar la ficha preliminar, evidencias e incidencias, diferenciando claramente información conocida, dudosa y ausente.
4. Si hace falta, **Confirmar / Corregir / Descartar** una afirmación del modelo; no es necesario revisar manualmente todos los valores.
5. Consultar **una sola** pregunta sugerida, o una indicación de revisión humana cuando corresponda.
6. Preparar y **copiar/descargar realmente** el resultado para cargarlo manualmente en un CRM, con incidencias separadas.
7. Opcionalmente, añadir una intervención ficticia y **Reanalizar** el historial completo, conservando visibles los cambios y correcciones.

Puede ser una sola pantalla y un expediente activo. No necesita bandeja de leads, perfiles, autenticación ni trabajo colaborativo.

## 3. Ficha comercial canónica

El primer borrador funcional describía **seis** campos comerciales. El anexo posterior añadió el **interés explícito en SmartHousing**. Para esta versión consolidada, la ficha contiene **siete campos comerciales**, más dos elementos operativos.

| Elemento | Interpretación de V0 | Matices que se deben preservar |
| --- | --- | --- |
| **Identificador/alias** (operativo) | Identifica el expediente ficticio | No necesita datos personales reales; **no** lo extrae B |
| **Interés en SmartHousing** | Quiere explorar el producto / no le interesa / pendiente | Interés genérico por vivienda o una pregunta condicional **no** prueban interés explícito |
| **Zona de búsqueda** | Ciudad o área | «Madrid o alrededores» no se concreta artificialmente |
| **Horizonte de mudanza** | Fecha o período aproximado declarado | «Antes del verano» no se convierte en fecha exacta |
| **Compradores** | Personas que participarían en la compra | No dividir automáticamente ingresos de pareja |
| **Ingresos mensuales declarados** | Cantidad o rango, mensualidad, neto/bruto/desconocido, sujeto individual/conjunto, precisión | «Unos 3.800 € netos entre los dos» = conjunto y aproximado; no inventar base desconocida |
| **Ahorros declarados** | Cantidad/rango, sujeto y precisión | «No tenemos ahorros» = **0 conocido**, no dato ausente |
| **Deudas/cuotas mencionadas** | Cuotas declaradas y, si importa, si están descontadas de los ingresos | No mencionarlas ≠ declarar deuda 0; no deducirlas dos veces |
| **Estado comercial** (operativo) | `Nuevo`, `En cualificación`, `Cualificado` | Es completitud comercial, **no** aprobación financiera; **no** lo extrae B |

La **pregunta siguiente** y las **incidencias** son resultados de trabajo, **no** columnas obligatorias adicionales de la ficha CRM.

### Semántica y evidencia

- **Conversación:** texto original con intervenciones distinguibles de cliente y asesor; se conserva incluso si falla la IA.
- **Afirmación candidata:** interpretación del modelo que atribuye un dato al cliente, no hecho documentalmente probado.
- **Evidencia:** referencia reconocible al mensaje del cliente y fragmento que respalda la interpretación. La fuente puede respaldar el texto literal, pero no garantiza que la interpretación sea correcta.
- **Estados/atributos:** no informado, candidato explícito, aproximado o rango, ambiguo/conflictivo, corregido/confirmado por asesor, descartado. «Confirmado por asesor» no equivale a verificado por documentos.
- **Atribución:** no convertir afirmaciones del asesor en declaraciones del cliente; en caso de emisor no distinguible, señalarlo.
- **Desconocido != 0**. No presuponer ausencia de compromisos porque no se mencionan. No inventar audios inaccesibles ni bases neto/bruto.
- **Correcciones:** ante rectificación inequívoca del cliente, puede proponerse el dato nuevo con referencia; si hay contradicción no resuelta, no consolidarla silenciosamente. Un reanálisis no pisa sin aviso una corrección manual.
- **Información incompleta:** no exige devolver todos los campos; los resultados parciales son valiosos y deben permanecer disponibles.

## 4. Módulos funcionales

### A — Entrada y continuidad de conversación (posterior al núcleo)

Permite pegar conversaciones libres con autores reconocibles o cargar Laura/Javier/Rosa. Muestra texto original, incorpora continuaciones sintéticas, permite restablecer el expediente con aviso de pérdida de datos no exportados y vuelve a analizar el historial completo a demanda. Audio sin transcripción = contenido inaccesible. No importar WhatsApp, transcribir, gestionar adjuntos o múltiples expedientes simultáneos.

### B — Extracción de información (primera capacidad del núcleo)

**Entrada observable:** conversación ficticia arbitraria con autores distinguibles, no necesariamente de los fixtures.  
**Salida observable:** valores candidatos para los **siete campos comerciales** con evidencia, precisión y sujeto/base cuando corresponda; ausencias e incertidumbres visibles.

Condiciones:

- Un valor claro puede ser aprovechable aunque otro sea ambiguo o falte.
- No inferir contenido de audio no transcrito, no dividir ingresos conjuntos ni asumir que una cuota está o no descontada si no se declara.
- Preservar rangos, aproximaciones, rectificaciones y sujeto de cantidades monetarias.
- No utilizar replay como sustituto encubierto de inferencia real sobre chat nuevo.
- B no decide elegibilidad ni aprueba operaciones.

**Ejemplos:** Laura: ingresos conjuntos ~3.800 € netos/mes, ahorros ~18.000 €, cuota 250 €/mes de inclusión desconocida. Javier: 2.000–3.000 €/mes de base no aclarada; audio sin texto no produce hechos. Rosa: ahorros 0 explícitos.

### C — Revisión humana de ficha (posterior al núcleo)

Mostrar valores y fuente con estados «sin informar», «propuesto», «pendiente por duda» y «revisado por asesor». Permitir **Confirmar**, **Corregir** y **Descartar**, sin obligar a confirmar cada campo. Lo descartado no se exporta como válido. Si un reanálisis contradice una corrección del asesor, mostrar revisión pendiente, no sobreescribirla silenciosamente. No llamar «financiación validada» a un dato revisado.

### D — Incidencias y revisión por excepción (segunda capacidad del núcleo)

**Entrada observable:** datos candidatos B y texto disponible.  
**Salida observable:** motivos concretos para que el asesor aclare o revise información, sin perder otros valores válidos.

Las cuatro categorías básicas de negocio son:

1. **Dato esencial ausente** para completar la ficha; se calcula desde los campos, no se pide al modelo que invente «missing».
2. **Ambigüedad o contradicción material:** p. ej., si la cuota del coche ya está descontada.
3. **Contenido inaccesible o atribución incierta:** p. ej., audio sin transcripción o mensaje de autor no fiable.
4. **Solicitud delicada:** oposición expresa al contacto, petición de garantía/aprobación, urgencia de vivienda real u otra solicitud comercial que exige criterio humano.

**Adicional, separado de las categorías comerciales:** error de análisis o resultado desactualizado (gestionado por G). No se debe presentar una ejecución fallida como resultados válidos nuevos.

En la V0 completa cada incidencia muestra tipo, explicación corta, fuente cuando exista, pendiente/resuelta/descartada y acción manual mínima. Una señal automática es provisional y corregible, no sentencia jurídica ni decisión de STOP_CONTACT; no se construye plataforma compliance, programación semanal ni motor universal de políticas.

### E — Una siguiente pregunta (tercera capacidad del núcleo)

**Entrada observable:** ficha e incidencias. **Salida:** una pregunta breve o indicación de revisión del asesor, con motivo y campo objetivo; editable, copiable y nunca enviada automáticamente.

Prioridad básica:

1. Si hay solicitud delicada que necesita revisión, **«Revisión del asesor»**, sin redactar continuidad comercial como si estuviera resuelta.
2. De lo contrario, **una** ambigüedad material.
3. Si no hay ambigüedades relevantes, **un** dato esencial ausente conforme a un orden sencillo, modificable sin reescribir la lógica del producto.
4. Si no queda pregunta prioritaria, **«Sin preguntas pendientes prioritarias»**, no «Cliente aprobado».

**Laura:** «¿Los 3.800 € que me comentáis ya tienen descontados los 250 € del préstamo del coche?». Al responder inequívocamente, esta pregunta desaparece; si el interés explícito por SmartHousing sigue pendiente, puede convertirse en la siguiente aclaración. No hay ActionPlanner, agente que negocie ni DraftGenerator de mensajes comerciales.

### F — Resultado CRM y exportación (posterior al núcleo)

Previsualizar valor, unidad/base/sujeto, condición de dato autodeclarado/revisado y procedencia. **Copiar o descargar realmente** una ficha utilizable. Separar datos claros, campos ausentes e incidencias pendientes; no exportar contradicciones como valores definitivos. Confirmar «preparado/exportado», **nunca** «CRM actualizado». Si no hay datos utilizables, solicitar revisión en lugar de inventar ficha completa.

### G — Reanálisis, estado y fallos (posterior al núcleo, salvo comprobación mínima de errores)

Estados: sin analizar; analizando; resultados; resultados con incidencias; error; conversación cambiada/resultados desactualizados. Al pulsar Reanalizar, considerar el historial completo y reflejar cambios. Ante fallo del proveedor/parseo: conservar conversación y correcciones humanas; permitir reintento; no introducir valores ficticios ni fallback implícito a replay. No afirmar actualidad de datos anteriores. Sin persistencia productiva, operaciones concurrentes o continuidad entre sesiones.

## 5. Estado comercial (funcionalidad del producto completo, no de P0–P3)

- **Nuevo:** expediente creado, sin analizar.
- **En cualificación:** interpretación preliminar con algún campo esencial ausente o duda crítica.
- **Cualificado:** información comercial mínima registrada de forma utilizable, sin bloqueos críticos abiertos. **No significa** solvencia, elegibilidad, cita ni financiación aprobada.

La aplicación **podrá proponer** «Cualificado» solo cuando:

1. El expediente tiene identificador/alias ficticio.
2. Hay interés **explícito** en explorar SmartHousing, no solo interés en vivienda.
3. Zona, horizonte y número de compradores son inteligibles; horizonte aproximado sirve.
4. Ingresos y ahorros declarados están disponibles; ingresos preservan periodicidad, sujeto y base neta/bruta o dejan una ambigüedad relevante pendiente. Ahorro 0 **sí** es valor informado.
5. Si una cuota mencionada plantea una ambigüedad material sobre si está ya descontada, se ha aclarado. No se exige certificar inexistencia de deudas.
6. No existe petición vinculante, conflicto crítico o incidencia sensible sin resolver que impida la transición propuesta.

El asesor puede confirmar/rectificar el stage; debe quedar visible la intervención manual. Un reanálisis puede proponer volver a «En cualificación» si aparece un conflicto material, con motivo. No hay stages `Aprobado`, `Rechazado` o `No apto`; no hay mínimos de ingresos/ahorros ni ratios de asequibilidad.

**Ejemplos:** Laura original = «En cualificación» por deuda e interés no confirmado; tras aclaración de cuota + interés explícito podría proponerse «Cualificado» si todo lo demás está informado. Javier = «En cualificación» por ingresos de base dudosa/ahorro no informado y objeción de confianza/audio. Rosa = «En cualificación» por datos esenciales pendientes y solicitud de aprobación escrita/urgencia; sus ahorros 0 no son el problema de completitud.

## 6. Criterios de aceptación de la V0 completa

Estos criterios describen **el producto al final**, no autorizan construir todo durante P0–P4. El plan de implementación siguiente identifica qué subconjunto comprobar en cada puerta.

| ID | Comprobación observable | Etapa prevista |
| --- | --- | --- |
| AC-01 | Analizar conversación ficticia inédita con inferencia real | B/P1 y después A |
| AC-02 | Distinguir asesor/cliente sin atribución incorrecta de datos | P1 |
| AC-03 | Extraer los **siete** campos comerciales cuando están presentes, con origen y precisión (actualización del borrador de seis campos) | P1 / V0 completa |
| AC-04 | Diferenciar desconocido, cero explícito, rango y aproximación | P1 |
| AC-05 | Evidencia reconocible por campo extraído | P1 |
| AC-06 | Confirmar, corregir o descartar candidato y reflejarlo al exportar | C/F posteriores |
| AC-07 | Laura conserva duda de cuota y recibe aclaración específica | P2/P3 |
| AC-08 | Una respuesta posterior cambia resultado sin doble descuento | P3/P4 y G posterior |
| AC-09 | Javier no produce hechos desde audio sin transcripción | P2 |
| AC-10 | Rosa ahorros 0, solicitud sensible y nunca aprobación financiera | P1/P2 |
| AC-11 | Incidencias con motivo y posibilidad de revisar/descartar | P2 + UI posterior |
| AC-12 | Única pregunta editable y no enviada | P3 + UI posterior |
| AC-13 | Orden de campos/prioridades modificable sin reescribir motor | P3 |
| AC-14 | Exportación real, excluyendo contradicciones no resueltas como valores consolidados | F posterior |
| AC-15 | Nunca simular sincronización CRM ni envío a cliente | Todo el recorrido |
| AC-16 | Fallo conserva entrada y deja claro resultado desactualizado | P4 + G posterior |
| AC-17 | Reanálisis no sobreescribe corrección manual silenciosamente | C/G posteriores |
| AC-18 | Pruebas reproducibles, diferenciando replay de inferencia real | P4 |
| AC-19 | Ficha CRM muestra identificador, siete campos y stage | C/F posteriores |
| AC-20 | Laura original no pasa a «Cualificado» hasta resolver interés explícito y cuota | Estado posterior |
| AC-21 | Cualificado ≠ aprobado y ahorros 0 cuentan como informados | Estado posterior |
| AC-22 | Contradicción material/corrección manual actualiza recomendación stage visiblemente | Estado posterior |
| AC-23 | Exportación conserva stage y datos autodeclarados, sin afirmar sincronización | F posterior |

**Criterio de cierre V0 completa:** un recorrido completo y realmente exportable, con errores transparentes y limitaciones conocidas documentadas; no se exige que todas las variantes lingüísticas salgan perfectas.

## 7. Restricciones y exclusiones

- Solo datos ficticios; sin login, CRM integrado, WhatsApp, herramientas de envío, agenda, transcripción, multiusuario, multi-lead, scheduler, memoria entre sesiones o monitorización semanal.
- No scoring, underwriting, ratio financiero, elegibilidad aprobada, garantía, oferta de vivienda, promesa de plazos o cita confirmada.
- No uso de información financiera real ni secretos en repositorio. Claves de OpenAI solo en servidor, nunca en código/documentación de fixtures.
- No inferencia de audio no transcrito ni obedecer instrucciones contenidas en mensajes del cliente como si fueran órdenes del sistema.
- Se admiten falsos positivos/negativos observables, resultados parciales, espera de segundos y corrección humana. **No** se admite ocultar fallos, inventar origen, confundir autodeclaración con documentación o presentar datos viejos como actuales.
- Ni esta especificación ni su anexo obligan a adoptar WorkflowDefinition, FactSchema, AgentProfile, políticas R01–R10, hitos M0–M5, multipass, reconciliación genérica o el CaseOrchestrator legado.

## 8. Estado de decisiones y referencias

**Confirmado:** aceptación explícita de incertidumbre y resultados parciales comercialmente útiles; no inventar ni automatizar aprobaciones/envíos; aislamiento de documentación histórica bajo `docs/legacy/`.

**Alcance de trabajo propuesto:** siete campos, módulos A–G según arriba, etapa comercial de completitud y secuencia de implementación B/D/E. Son **baseline funcional de trabajo**, no arquitectura aprobada ni prueba de que alguna capacidad esté implementada.

**Fuente de consolidación:** especificación funcional v0.1 y anexo de ficha del lead, 2026-11-15. Se ha resuelto explícitamente la contradicción de seis/siete campos en favor del anexo posterior. Referencia humana: https://app.notion.com/p/419a424764688127ad37dd43f3e13552. Codex no necesita acceder a ese enlace.
