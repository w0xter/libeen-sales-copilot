# F02-R07b-0 — Protocolo y paquete ciego de adjudicación

**Estado:** preparado para revisión; no hay respuestas humanas ni adjudicaciones. Este trabajo no implementa validadores semánticos ni cambia runtime. R07b y cualquier integración necesitan autorización independiente.

## Archivos y separación

El coordinador distribuye **solo** el directorio [reviewer](r07b0/reviewer/INSTRUCCIONES.md): instrucciones, `casos.v1.json` y plantilla vacía. Los revisores reciben copias separadas y no acceso a informes R07a, capturas, clave, repositorio completo, resultados del modelo ni respuestas ajenas hasta el cierre de la primera ronda. La clave y los archivos de fuentes están en el repositorio para reproducibilidad, **no constituyen una frontera de acceso**: el coordinador debe exportar solo esos tres archivos por un canal privado y evitar enlaces al repositorio. Asignar seudónimos y solicitar que nadie busque los casos. La independencia es procedimental y no se demuestra automáticamente.

La [clave reservada](r07b0/coordinator/clave.v1.json) relaciona cada ID opaco con escenario y ocurrencia originales, categoría, partición y, para los nuevos, familia. No contiene etiquetas humanas. Su hash de fuentes permite identificar la versión exacta. La lista visible está ordenada por ID derivado de SHA-256; el mismo caso recibe el mismo ID al reconstruir. Estos IDs son seudónimos reproducibles, no anonimización criptográfica frente a quien posea las fuentes. Los dos grupos están mezclados para no revelar su procedencia. La separación de los 34 diagnósticos R07a y 17 nuevos se conserva en la clave para análisis. Los nuevos se reservan para la evaluación posterior de hipótesis y no deben utilizarse para formularlas o ajustarlas; comparten autoría de Codex y no son un holdout independiente ni aleatorio. Ninguno contiene una salida de modelo inventada.

Reproducir desde la raíz con Python 3, sin red:

```sh
python3 tests/evaluation/f02-r07b0-package.py
pnpm exec vitest run tests/evaluation/f02-r07b0-integrity.test.ts
```

El generador sobrescribe solo los dos JSON generados. Lee las anotaciones R07a, las conversaciones del dataset, el texto de fixtures y los [nuevos casos sintéticos](../../tests/evaluation/f02-r07b0-additional.v1.json); no modifica las fuentes. `target_message` identifica la ocurrencia evaluada y los IDs `M*` son locales a cada caso. Las conversaciones B08/B10 incluyen el contexto disponible completo; los demás diagnósticos mantienen el mensaje completo del dataset o, para sintéticos R07a, el texto completo que constituye su fuente. Los nuevos pueden incluir varios mensajes y se evalúa el último con los anteriores como contexto. El paquete no incluye etiquetas esperadas, certeza o razonamientos de Codex, predicciones, veredictos, resultados ni familia de origen. La categoría sí se muestra porque es la pregunta asignada.

## Ronda 1 — evaluación independiente

Dos revisores humanos reciben el mismo paquete y trabajan sin comunicación entre ellos. Cada uno usa una copia independiente de la [plantilla individual](r07b0/reviewer/respuesta-individual.csv), una fila por caso. Opciones exactas: `yes`, `no`, `ambiguous`, `not_evaluable`; se recogen justificación, evidencia con IDs y citas literales, hablante, alcance y certeza. `ambiguous` expresa múltiples interpretaciones razonables; `not_evaluable` registra falta de información indispensable. No inferir el contenido del audio. La categoría es una pregunta dirigida, no una indicación de respuesta. El coordinador verifica exhaustividad, valores válidos, referencias y duplicados sin cambiar respuestas; pide corrección solo al autor, manteniendo versión inicial y fecha. Cierra y conserva las dos copias originales antes de compararlas. Faltantes son pendientes, no `no`.

Si participa una sola persona, registrar identidad seudónima, cobertura y motivo. Sus respuestas son revisión individual: no hay acuerdo interevaluador ni adjudicación independiente múltiple. La segunda ronda solo puede recoger una revisión posterior identificada como tal, o quedar pendiente; no simular un segundo juicio.

## Ronda 2 — desacuerdos y adjudicación

Tras cerrar ambas copias, el coordinador compara decisión **y** justificación, evidencia, sujeto y alcance. Registrar también discrepancias sustantivas aunque ambos hayan elegido la misma opción. En el [registro vacío](r07b0/coordinator/registro-adjudicacion.csv) copiar ambos juicios literalmente, con sus revisores, sin reemplazar las fuentes. Un tercer adjudicador humano independiente recibe contexto, categoría y ambos juicios cerrados; documenta decisión final entre las cuatro opciones, evidencia y razonamiento, fecha e identidad seudónima. Puede dejar el caso `pendiente` cuando faltan datos o política; no debe forzar consenso ni interpretar el voto mayoritario como verdad. No mostrar salidas del modelo o etiquetas de Codex para resolver intención; mantener un análisis de errores posterior separado. El acuerdo inicial no impide auditar ejemplos; registrar explícitamente si una etiqueta final se aceptó por acuerdo de dos o por adjudicación, sin borrar originales. Una decisión de política controvertida se eleva al integrador y queda pendiente hasta resolución explícita.

Conservar archivos originales inmutables, el registro de adjudicación y un manifiesto de versiones, fechas y hashes en ubicación de acceso controlado. Identificar cambios posteriores mediante nueva versión, sin sobrescribir las dos rondas. No hay datos humanos completados en esta entrega.

## Contexto disponible y sus límites

- `Q-30EEE8356B39`: existe un audio sin transcripción en el contexto; su contenido es desconocido. El mensaje posterior sí está disponible; corresponde al revisor decidir si alcanza para la categoría.
- `Q-4E3E304D225A`: se cita y rectifica un mensaje previo pero no se aporta el mensaje original; solo existe el relato del hablante. `Q-4B6723B93341` es un caso nuevo distinto que sí incluye ambos mensajes.
- `Q-8ECEEFA0E8FF`: no se especifican el objeto ni duración de «lo dejemos aquí». `Q-2B00FD394E4E` y `Q-A1BD440A1A2C`: no se identifica el objeto de «lo»/«lo» confirmado. No se añade contexto inventado; el revisor elige `ambiguous` o `not_evaluable` si lo estima.
- En general no hay historial anterior al proporcionado para conversaciones de un solo mensaje, ni identidad externa o acciones posteriores. La falta no obliga automáticamente a declarar todo NE: juzgar si impide resolver la pregunta concreta. El protocolo conserva evidencia ausente y límites expresados por cada revisor.

## Decisiones del integrador pendientes de aprobación

1. Alcance de OPT_OUT: duración, canales, interlocutor, preferencias parciales, pausas y qué implica una rectificación posterior; distinguir intención expresada y política operativa de contacto.
2. Cuándo una petición transmitida por un tercero se adopta como propia y cómo tratar citas, negaciones, hipótesis e historia incompleta.
3. Alcance de BINDING_CLAIM: preguntas informativas frente a peticiones de aprobación, reservas, compromisos escritos o garantías, incluido B08.
4. Límites operativos de TRUST y URGENT, y qué incertidumbre requiere revisión humana.
5. Tratamiento de `ambiguous` y `not_evaluable`, discrepancias y adjudicación pendiente; autoridad humana y cualquier contrato necesario.
6. Selección previa de métricas y umbrales, población y conjuntos de evaluación, con aprobación explícita antes de evaluar integración. Nada de esto cambia por el presente paquete.

## Criterios propuestos para evaluación posterior

Antes de R07b: finalizar revisión independiente y adjudicación documentada; mantener un conjunto de evaluación separado de ajustes por familias y paráfrasis y, si se pretende medir generalización, incorporar fuentes y autores independientes. Informar por categoría y por etapa S1, S2 y público: VP, VN, FP, FN, ambiguos, NE, sin etiqueta y denominadores; separar ausencia de candidato, rechazo explícito y fallo de entrega. Medir errores en positivos genuinos y controles negativos, seguridad ante abstención, colisiones y fallos parciales; conservar casos multietapa como NE si no se reconstruyó historia. Reportar acuerdo interevaluador y desacuerdos con denominadores y categoría, sin confundir consenso con certeza. Fijar de antemano límites de error y condiciones de aceptación por el integrador; **no se proponen aquí números aprobados**. Una muestra pequeña y correlacionada no acredita robustez estadística.

## Referencias y verificación

R07a es diagnóstico y sus anotaciones son provisionales, no independientes. El ZIP R01 sigue congelado; el replay estricto R01 falla históricamente en `price_question-P2` por una operación J no consumida bajo el código posterior. R05a registra únicamente las dos divergencias J conocidas; no se ha cambiado la prueba histórica. C01 y las dos correcciones multietapa permanecen NE en lo dependiente de historial no reconstruido. Este paquete no ejecuta proveedor ni reproduce salidas históricas.

La prueba de integridad compara las 51 conversaciones, roles, mensajes objetivo y categorías con sus fuentes, comprueba la cobertura exacta de las 34 anotaciones y los 17 nuevos, IDs únicos y una lista cerrada de campos visibles; no clasifica semántica. La reproducción se verificó ejecutando dos veces el generador y comparando los SHA-256 de ambos archivos generados, sin diferencias. Los CSV contienen solo cabeceras.
