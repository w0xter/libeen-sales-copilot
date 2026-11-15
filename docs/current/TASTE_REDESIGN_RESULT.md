# Rediseño de Lead Intake — estado de trabajo

La dirección propuesta convierte la conversación en una transcripción y los siete campos en filas de un registro comercial. Una cabecera clara, azul marino y coral inspirados en la web oficial de Libeen, tipografía Manrope con alternativa de sistema y una intervención destacada sustituyen la composición anterior basada en tarjetas. Se mantiene la revisión junto a cada evidencia, y las advertencias usan una jerarquía visual propia.

## Comparación y comprobaciones

La captura inicial de escritorio está en `.taste-skill/before/1440.png`. La referencia mostraba la conversación en un contenedor centrado y campos presentados en bloques. La nueva ficha usa filas con valores y evidencia desplegable. No hay mediciones comparables completas de escritorio, portátil y móvil: el comprobador de la skill falló con `r.sections is not iterable` y faltan capturas iniciales de portátil y móvil.

Se probó en navegador la entrada de Laura mediante el endpoint real: devolvió seis candidatos y dos incidencias. Se abrió la evidencia de ingresos y se confirmó el dato; la pregunta quedó bloqueada hasta nueva revisión. Antes del cambio, Vitest pasó con 186 pruebas y cuatro omitidas. El lint inicial fallaba al analizar los archivos de la skill instalada en `.agents`; se ha excluido ese directorio de ESLint.

## Pendiente

Queda por verificar la corrección, navegación a la fuente, alertas sensibles, contradicciones, reanálisis, resultados obsoletos, confirmación de etapa, copia CRM, recuperación de errores, accesibilidad y los tres tamaños solicitados. La limitación existente de revisiones huérfanas tras reformular citas no se ha modificado. Este documento no certifica una verificación funcional completa.

La identidad visual se contrastó con la web oficial de Libeen el 16 de noviembre de 2026. La familia Manrope no está incluida localmente; se usa solo si está disponible en el sistema.

## Comprobaciones adicionales del 16 de noviembre

Con el endpoint real y datos ficticios se verificaron la corrección de ingresos, el foco en el mensaje fuente, el estado desactualizado al editar, el reanálisis, la aparición de un conflicto y el bloqueo de exportación. También se comprobó que una alerta sensible manual bloquea la pregunta hasta resolverla y que la copia de una ficha limpia indica que no se sincroniza el CRM. Al elegir la nueva declaración tras cambiar la fuente, la revisión huérfana sigue bloqueando la copia: limitación conocida conservada.

Las capturas posteriores de la entrada están en `.taste-skill/after/1440-brand.png`, `1024.png` y `390.png` (alturas completas respectivas: 1060, 1046 y 1441 px). Se revisó visualmente la captura móvil: la entrada se apila en una columna. No son mediciones equivalentes al antes de portátil y móvil, que no se capturó. No se han auditado todos los estados en los tres tamaños ni el contraste con una herramienta automática.

Después de los cambios pasaron `pnpm test` (186 pruebas; cuatro omitidas), `pnpm typecheck`, `pnpm lint` y `pnpm build`. Se comprobó además el error por autor no reconocible y su recuperación al corregir el texto. La confirmación de etapa y el recorrido completo de teclado siguen sin verificar manualmente.
