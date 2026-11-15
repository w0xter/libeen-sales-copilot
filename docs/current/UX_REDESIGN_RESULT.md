# P12 — Resultado del rediseño de experiencia

Fecha: 15-11-2026. Base: auditoría `fbf7ee93b2a1bf60477542ab4e75c1f2e96d132c`; alternativa A aprobada. Implementación en la misma ruta y sin cambios a B/D/E, reglas, ficha efectiva ni condiciones de exportación.

## Decisiones

- **Entrada y trabajo:** al obtener resultado se recoge la conversación; «Ver conversación» la recupera. El botón de retorno lleva el foco a la ficha. Una continuación añade un turno de cliente y coloca el cursor al final. El resultado anterior queda identificado como desactualizado hasta el reanálisis.
- **Prioridad:** avisos de alerta sensible, conflicto y etapa se muestran antes de la intervención; la descripción de alerta sensible permanece visible. El resumen comercial aparece antes de la lista completa de incidencias. La detección parcial continúa advertida.
- **Incidencias y conflictos:** incidencias pendientes primero, sensibles primero dentro de su estado, y acciones según estado. Los conflictos se agrupan por campo; cada propuesta conserva su fuente y decisión individual. No se resuelven automáticamente.
- **Detalle:** evidencia y revisión por campo, alerta manual y vista previa CRM se despliegan bajo demanda. Incertidumbres de candidatos siguen visibles. Los bloqueos se explican junto a la copia; el contenido de exportación sigue siendo el del dominio.
- **Recuperación y accesibilidad:** error de autor con indicación de formato; texto y revisiones se conservan. Las fuentes abren la conversación y enfocan el mensaje; existe retorno a la ficha. Los nombres accesibles de revisión e incidencias incluyen contexto. El cierre de revisión devuelve el foco al control que la abrió.
- `DESIGN.md` recoge los principios y tokens de la identidad existente. Se separaron conversación, incidencias, conflictos y exportación en componentes; el controlador de estado y la ficha permanecen en `workspace.tsx` y admiten una futura separación adicional.

## Evidencia visual

Las capturas usan datos ficticios y tamaños emulados. Las de antes proceden de la auditoría; los resultados de extracción pueden variar entre llamadas. Las capturas de después son de página completa y no equivalen a una prueba con comerciales.

| Tamaño | Antes | Después |
|---|---|---|
| Escritorio | [Auditoría](ux-audit/desktop-resultado.png) | [P12](ux-redesign/despues-escritorio.png) |
| Portátil 1024×768 | [Auditoría](ux-audit/portatil.png) | [P12](ux-redesign/despues-portatil.png) |
| Estrecha 390×844 | [Auditoría](ux-audit/estrecha.png) | [P12](ux-redesign/despues-movil.png) |

También: [conflicto agrupado](ux-redesign/conflicto.png) y [error recuperable](ux-redesign/error.png).

## Comprobaciones observadas

En navegador local se analizó Laura ficticia con el proveedor configurado. Se abrió evidencia de ingresos, se corrigió un valor, se añadió alerta sensible y se observó bloqueo de pregunta. El enlace de fuente abrió y enfocó el mensaje; «Volver a la ficha» devolvió el foco al resumen y Tab avanzó a la primera evidencia. Se añadió una continuación: el foco quedó en el editor y el texto se insertó al final; el resultado quedó desactualizado. El reanálisis conservó la revisión y presentó propuestas agrupadas. Se comprobó bloqueo de copia por conflicto, error de autor con mensaje de recuperación y, en otro análisis, apertura de vista previa y confirmación de copia manual.

En la ejecución real de reanálisis, el proveedor reformuló la cita y se mostró una revisión conservada sin correspondencia segura. Aunque se eligieron las dos propuestas mostradas, la ficha siguió bloqueada por conflicto. No se cambió el algoritmo de reconciliación para forzar una salida: este caso requiere investigación funcional antes de considerar el recorrido resuelto. Las pruebas simuladas existentes sí cubren un caso en el que el conflicto se resuelve y se puede copiar; no garantizan todas las variaciones del proveedor.

En anchura 390 CSS px se midió documento de 375 px para viewport de 390 px: no se detectó desbordamiento horizontal en ese estado. Se revisaron estados y etiquetas en el árbol accesible y pasos puntuales de teclado; no se completó una auditoría exhaustiva de teclado, lector de pantalla, zoom 200/400 %, objetivos táctiles ni dispositivos físicos. El contraste calculado de combinaciones concretas fue: coral oscuro sobre blanco 6,30:1; tinta sobre blanco 13,66:1; tinta secundaria sobre blanco 6,59:1; advertencia sobre su fondo 8,63:1. No se ha medido cada combinación ni se afirma conformidad WCAG 2.2.

## Verificación técnica

- `pnpm test`: 180 pruebas aprobadas, 2 omitidas, 30 archivos aprobados y 2 omitidos.
- `pnpm typecheck`: correcto.
- `pnpm lint`: sin errores; 93 advertencias procedentes de archivos preexistentes no versionados de `.agents/skills/impeccable/scripts`.
- `pnpm build`: correcto.

La prueba nueva comprueba la transición a trabajo y la reapertura de conversación. Las pruebas existentes comprueban estados de revisión, alerta y exportación con respuestas simuladas. No sustituyen recorridos de usuario.

## Pendiente de comprobación humana

La reducción de tiempo y carga cognitiva es una hipótesis, no un resultado medido. Contrastar con asesores las tareas y métricas de la auditoría, especialmente descubrimiento de la evidencia, prioridades y recuperación del conflicto. Completar revisión de accesibilidad con teclado y tecnologías de asistencia, contraste de todas las combinaciones, zoom y dispositivos reales. Investigar la reconciliación de citas variables antes de declarar resuelto el caso de conflicto observado.
