# P5 — Puente mínimo A → B/D/E (encargo para Codex)

**Estado:** brief preparado; pendiente de autorizar ejecución. **Producto:** Libeen AI Lead Intake V0. **Referencia UX:** `ux-reference/libeen-ux2-prototipo-v0.3.html` (HTML de diseño, NO implementación del producto ni código del motor).

Trabaja sobre `w0xter/libeen-sales-copilot`, rama `codex/lead-intake-v0-bootstrap`; comprueba HEAD antes de modificar (referencia de partida: `3e829229cc4f59bf494aefec4038121d82963a1f`). Sigue el plan de Notion: https://app.notion.com/p/419a4247646881ea83d1d7b38b78d231

## Lee primero

- `docs/current/01_FUNCTIONAL_SPEC_V0.md`
- `docs/current/P4_RESULT.md`
- `src/intake/extraction.ts`
- `src/intake/issues.ts`
- `src/intake/next-question.ts`
- `src/intake/run-intake.ts`
- `ux-reference/libeen-ux2-prototipo-v0.3.html` como referencia visual para P6; no copies sus datos preparados ni su JavaScript simulado como lógica de negocio.

## Tu única tarea: P5

1. Implementar un adaptador mínimo de texto de conversación sintética a `Message[]` (`id`, `role: customer|advisor`, `text:string|null`). Reconocer `Cliente:`, `Libeen:` o `Asesor:`; no adjudicar automáticamente declaraciones con autor incierto. Audio sin transcripción debe tratarse como contenido inaccesible, no inferirse.
2. Exponer una ruta server-side **nueva y acotada para el Intake**, que invoque `runIntake` con `openAITransport` mediante configuración en el entorno del servidor. Las credenciales nunca se envían al cliente.
3. Devolver de forma explícita `extraction`, `issues`, `intervention`, el contador agregado `discarded` y los errores reales. No inventar las causas de descarte que B no devuelve, no ocultar provider_error y no pasar a replay sin señalarlo.
4. Añadir pruebas deterministas de parsing, autor, audio, datos fuente, errores y recorrido de un texto ficticio nuevo.

## Límites explícitos

- NO REUTILIZAR ni reconectar `src/app/api/cases/*`, el viejo `CaseOrchestrator` / `LiveWorkspace`, M0–M5, las políticas legacy ni F02.
- No implementar todavía la UI de UX1/UX2 (será P6/P7), la exportación CRM, la lógica de etapa, persistencia, envíos, agenda o WhatsApp.
- No refactorizar B/D/E salvo ajuste mínimo imprescindible y justificado. Cualquier desviación relevante requiere revisión humana.
- Solo casos sintéticos, sin claves ni datos reales en Git.

## Criterios de aceptación y entrega

- Una conversación ficticia nueva se transforma en mensajes correctamente atribuidos y llega al núcleo real B/D/E.
- Un audio no transcrito jamás produce facts inventados; se conserva la incidencia pertinente.
- Un fallo del proveedor queda como fallo; ningún resultado viejo/simulado se marca como inferencia nueva.
- Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm lint`; reportar las salidas reales, fallos, cobertura y cualquier omitido, sin inventar ejecución.
- Enumerar archivos modificados, contratos creados, decisiones, límites y riesgos.
- **Detenerse al finalizar P5 y esperar aprobación del usuario antes de P6.**
