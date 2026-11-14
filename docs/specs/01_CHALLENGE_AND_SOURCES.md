# Enunciado y fuentes de autoridad

**Fuente primaria:** PDF `../reference/Prueba_tecnica_AI_Product_Engineer.pdf`, titulado «Prueba técnica · AI Product Engineer», fechado el **11 de noviembre de 2026** y firmado por Rafael Casuso. Es la fuente primaria del ejercicio y se incluye en `../reference/`.

## Qué pide exactamente Libeen

Construir, usando herramientas de codificación asistida por IA, **la primera versión de algo que ahorre tiempo al equipo comercial**, justificando las decisiones. El enunciado prioriza el **criterio de producto** sobre la cantidad de funcionalidades.

Contexto de negocio proporcionado: Libeen ofrece SmartHousing, descrito como alquiler con opción a compra; la familia vive en la vivienda desde el comienzo y parte de lo que paga contribuye a la entrada. Las oportunidades llegan por WhatsApp y web. Los asesores necesitan entender dónde se busca vivienda, cuándo, cuántos compradores hay, los ingresos y los ahorros, y decidir si preguntar lo que falta, proponer una llamada o explicar prudentemente un posible desajuste.

El enunciado propone ideas opcionales: extraer datos con incertidumbres, proponer mensajes revisables, priorizar una bandeja o explorar otra alternativa defendible. **No exige construir todas**; prefiere una funcionalidad pequeña, operativa y bien pensada.

## Reglas obligatorias del ejercicio

| Regla del PDF | Implicación para nuestra V0 |
| --- | --- |
| Desarrollar con IA (Claude Code, Cursor, Copilot u otro) | Documentar qué se delegó, aceptó y corrigió. |
| Usar cualquier LLM o simulado; si es simulado, señalar dónde iría el real | Distinguir modo de inferencia real y modo replay. |
| **Solo datos inventados** | Casos Laura, Javier y Rosa + variantes sintéticas. |
| Un humano decide: nada se envía ni se decide sobre dinero sin aprobación del asesor | Borradores editables, simulación clara, sin concesiones. |
| Reglas comerciales inventadas y editables sin tocar código | Configuración declarativa y demostración de cambio. |
| Dedicación sugerida de **como mucho unas cuatro horas** | Priorizar alcance; si se supera, reconocerlo y explicar el recorte. |
| Sin secretos en repo | Variables de entorno, sin credenciales en fixtures ni documentación. |

## Entregables solicitados

1. Enlace a repositorio GitHub público o privado con acceso, ejecutable localmente desde README.
2. README breve: problema elegido y por qué, decisiones, límites, cómo se comprueba el funcionamiento y qué se haría con una semana adicional.
3. Casos de prueba de la parte de IA con entrada, expectativa y comando de ejecución.
4. Evidencia de colaboración con agentes de codificación: conversación exportada o registro honesto de peticiones, aceptación, revisión y correcciones.
5. Vídeo opcional de máximo cinco minutos.

**Plazo según PDF:** una semana desde la recepción del enunciado. No se ha confirmado en estos documentos un plazo contractual diferente. La empresa señala que en una entrevista posterior puede pedir un cambio pequeño sobre el código entregado.

## Orden de valoración publicado

1. Criterio de producto.
2. IA bien situada: modelo donde aporta, reglas explícitas donde hacen falta, manejo de fallos o falta de información.
3. Funcionamiento local y mantenibilidad.
4. Comprobación con pruebas, incluidas las difíciles, y honestidad sobre fallos.
5. Dirección y revisión del desarrollo con IA.
6. Comunicación breve y clara.

No se valora el diseño visual ni el volumen de código.

## Qué hemos decidido nosotros, y qué NO viene en el PDF

**Decisiones nuestras:** copiloto continuo con hitos M0–M5, arquitectura modular, esquema de datos, estrategia de agente, una pantalla, recorrido Laura hasta desbloquear M3, política demo R01–R10, pruebas AC-01–AC-15 y expansión horizontal posterior. Son elecciones de producto, no requisitos obligatorios de Libeen.

**No disponibles:** políticas internas reales de aceptación, mínimos de ingreso/ahorro, territorios definitivos, textos comerciales autorizados, condiciones económicas actuales, reglas oficiales de concesión o capacidad de calendarios/CRM. No inventar ninguna como si proviniera de la empresa.

## Fuentes y precedencia

- La especificación funcional del proyecto está en esta carpeta.
- El contrato de integración se encuentra en `../contracts/INTEGRATION_V0.md`.
- El plan y briefs de Codex están en `../implementation/`.

**Jerarquía:** primero el PDF para las reglas del ejercicio; después las decisiones confirmadas en `../DECISIONS_AND_STATUS.md`; luego las especificaciones de esta carpeta y el contrato de integración. Una consulta a Notion no es un requisito para trabajar en el repositorio. La web pública de Libeen solo sirve como contexto público y no reemplaza políticas internas.
