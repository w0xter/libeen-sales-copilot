# P13-A · Exploración de diseño

Tres prototipos aislados para comparar arquitecturas de trabajo, no propuestas de interfaz definitiva. Todos usan la misma conversación ficticia de Laura y el mismo estado inicial: solicitud sensible pendiente, conflicto de revisión de ingresos, datos parciales y exportación bloqueada. La solicitud sensible tiene prioridad sobre la pregunta; al marcarla revisada aparece la pregunta sobre la base neta o bruta.

## Abrir y recorrer

Desde la raíz, `python3 -m http.server 8765 --directory public` y abrir:

- [A · Commercial Brief](http://localhost:8765/design-exploration/?concept=a)
- [B · Operator Workbench](http://localhost:8765/design-exploration/?concept=b)
- [C · Action Queue](http://localhost:8765/design-exploration/?concept=c)

«Editar conversación» o «Conversación» abre la entrada. «Ver resultado de ejemplo» carga el mismo fixture independientemente del texto: **no analiza ni llama a la API**. Abrir una fuente permite revisar el fragmento y, en ingresos, probar una corrección local. Marcar la solicitud sensible muestra la pregunta; resolver el conflicto de ejemplo habilita la copia de una ficha de ejemplo. Añadir una intervención marca el resultado como desactualizado; cargar el ejemplo de nuevo no reanaliza la intervención. Los estados viven solo en memoria y se reinician al cambiar de concepto o recargar. La copia usa el portapapeles del navegador cuando está disponible. El contenido de la ficha es estático y no refleja correcciones: no debe utilizarse como ficha real.

## A · Commercial Brief

Una ficha editorial, con titular, próxima decisión en un plano destacado y atributos en filas. La evidencia se abre junto al dato y las incidencias ocupan una columna lateral. La tipografía serif y el verde suave aportan una voz calmada. La estructura hace legible la historia comercial y evita convertir cada atributo en una tarjeta.

**Crítica:** tiene carácter y favorece la comprensión inicial, pero el titular consume espacio y la exportación queda más abajo. En móvil, el perfil precede a las incidencias: la acción lleva a ellas, aunque exige desplazamiento. Coste de implementación medio; hay que adaptar el diseño a alias, valores largos y estados parciales sin fabricar titulares narrativos.

## B · Operator Workbench

Tres zonas simultáneas para conversación, ficha y decisiones; cabecera oscura, tipografía más compacta y divisiones funcionales. Es la alternativa más eficiente para contrastar una fuente con un atributo sin perder contexto. En portátil se pasa a dos columnas; en móvil la decisión se presenta antes del resto.

**Crítica:** presenta más información por pantalla y facilita el escaneo de datos y fuentes. La densidad y las columnas compiten por atención, especialmente en portátiles; la conversación se vuelve larga en móvil. El contraste del enlace activo se corrigió tras revisar la captura. Coste alto: necesitaría estrategia de paneles, foco, estados de carga y navegación accesible para conversaciones extensas.

## C · Action Queue

La decisión prioritaria domina una columna; incidencias y salida siguen en orden de trabajo. La ficha queda como contexto lateral. El acento cálido concentra la atención sin depender exclusivamente del color para expresar el estado.

**Crítica:** la siguiente acción se identifica más rápido y el orden funciona bien en móvil. Sacrifica visión simultánea del expediente y puede resultar repetitivo para usuarios expertos; la ficha queda lejos en pantallas pequeñas. Coste medio: necesita validar que el orden de prioridades siga siendo comprensible con varias incidencias y fallos parciales.

## Capturas comparables

Mismo estado inicial y ventana visible; las áreas inferiores requieren desplazamiento.

| Dirección | Escritorio 1440 × 900 | Portátil 1024 × 768 | Móvil 390 × 844 |
| --- | --- | --- | --- |
| A | [Ver](p13-captures/a-desktop.png) | [Ver](p13-captures/a-laptop.png) | [Ver](p13-captures/a-mobile.png) |
| B | [Ver](p13-captures/b-desktop.png) | [Ver](p13-captures/b-laptop.png) | [Ver](p13-captures/b-mobile.png) |
| C | [Ver](p13-captures/c-desktop.png) | [Ver](p13-captures/c-laptop.png) | [Ver](p13-captures/c-mobile.png) |

## Recomendación para revisión humana

Recomiendo **C como dirección principal**, por la claridad de la decisión y su comportamiento móvil, tomando de B la visibilidad simultánea de fuente y dato cuando el espacio lo permita. A es una buena referencia para el ritmo y la lectura de la ficha, pero su cabecera resta espacio a la tarea. Esta recomendación no constituye una elección definitiva: conviene observar a asesores resolviendo el mismo caso, midiendo tiempo hasta detectar la incidencia, precisión de revisión y facilidad para encontrar la fuente.

## Decisiones y límites

Se han eliminado deliberadamente la navegación multi-lead, métricas, gráficos, tarjetas por atributo, controles de envío y promesas de sincronización: no representan capacidades de esta V0 o no ayudan a revisar este caso. No se han heredado los componentes ni las restricciones visuales anteriores. No se han añadido dependencias ni cambiado configuración. La exploración comparte fixture y mecánica para garantizar comparabilidad, pero cada concepto organiza las zonas de forma distinta.

Los prototipos no ejecutan extracción, validación comercial, reconciliación ni exportación real; el conflicto se resuelve mediante un cambio de estado ilustrativo. No representan todas las combinaciones, no prueban lectores de pantalla ni gestión completa del foco del diálogo, y la pregunta no es editable. Es necesario validar contraste y accesibilidad con herramientas y usuarios, así como errores, campos ausentes, descartes y correcciones reales antes de producción. El conjunto de datos es sintético y la revisión no equivale a verificación documental ni aprobación financiera.

**Limitación conocida del producto real:** la reconciliación de citas reformuladas puede dejar una revisión huérfana y bloquear CRM incluso después de resolver las propuestas visibles. El prototipo no corrige ni reproduce ese algoritmo; su bloqueo de ejemplo no demuestra que el bloqueo real haya desaparecido.

## Verificación

En navegador se recorrieron los tres conceptos: entrada, fuente, revisión sensible, vista previa bloqueada y salida disponible; también se comprobó una corrección local de ingresos y ausencia de desbordamiento horizontal en los nueve tamaños. Las capturas se revisaron visualmente; se corrigieron contraste del enlace activo y orden móvil en B. `pnpm test`: 180 pruebas aprobadas y 2 omitidas; `pnpm typecheck`: correcto; `pnpm lint`: sin errores y 93 advertencias en scripts preexistentes de `.agents/skills/impeccable`. El catálogo remoto de direcciones de Impeccable no estuvo disponible, por lo que la exploración se realizó en modo degradado y la crítica se efectuó sobre los prototipos renderizados.
