# P5 — Resultado del puente mínimo

## Alcance y contrato

`parseConversation` transforma turnos etiquetados `Cliente:`, `Libeen:` y `Asesor:` en mensajes con ID secuencial, rol y texto. Las líneas sin etiqueta solo se aceptan como continuación cuando están indentadas; las líneas de autor incierto y los turnos vacíos se rechazan con número de línea. Los marcadores independientes entre corchetes `[audio …]`, `[nota de voz …]` y `[mensaje de voz …]` se representan con `text: null`. La mezcla de marcador y texto en un turno se rechaza: hay que separarlos. Solo se admiten conversaciones ficticias.

`POST /api/intake` recibe JSON `{ "conversation": "…" }`. Usa en servidor `OPENAI_API_KEY` y, opcionalmente, `OPENAI_MODEL` (por defecto `gpt-4.1-mini`). No hay replay ni credenciales en la respuesta. Con resultado de B devuelve `messages`, `extraction`, `issues`, `intervention` y `discarded` (el mismo recuento agregado de B). Con error de B devuelve las tres salidas con su error y `discarded: null`, HTTP 502. Entrada o JSON inválidos devuelven HTTP 400 y configuración ausente HTTP 503; los errores de parsing incluyen `error` y, cuando corresponde, `line`. No se obtienen causas individuales de descarte, porque B no las proporciona.

## Verificación observada

- `pnpm test`: 156 pruebas aprobadas, 2 omitidas; 21 archivos aprobados, 2 omitidos. Las omitidas son pruebas opt-in de proveedor real.
- `pnpm typecheck`: correcto (incluye `next typegen`).
- `pnpm lint`: correcto.
- La prueba P5 integra parser, ruta y B/D/E reales con transporte simulado: comprueba atribución, fuentes, descarte de fuente de asesor y audio, incidencia de audio, intervención, errores de proveedor y respuesta malformada. No demuestra inferencia real; no se ha ejecutado una llamada real durante P5.

## Limitaciones y riesgos

- El formato es deliberadamente restrictivo: no reconoce autores arbitrarios ni transcribe audio. Un marcador de audio no reconocido se trata como texto; deben usarse los marcadores documentados. Una continuación indentada se considera parte del turno anterior, por lo que debe emplearse solo cuando su autor sea conocido.
- D solo señala como inaccesible el audio del cliente; E no fuerza revisión por audio. Permanecen las limitaciones de B/D/E y las señales sensibles no detectadas descritas en `P4_RESULT.md`. La evidencia literal no garantiza interpretación semántica correcta.
- No se ha probado red ni credenciales reales en esta puerta; los fallos no recurren a resultados anteriores o simulados. No hay UI, persistencia, etapa, CRM ni envíos.

## Archivos de P5

- `src/intake/parse-conversation.ts` — adaptador y validación de atribución.
- `src/app/api/intake/route.ts` — ruta server-side y configuración del proveedor.
- `tests/integration/intake/p5.test.ts` — pruebas deterministas del puente.
- `docs/current/P5_RESULT.md` — contrato, resultados y limitaciones.

P5 queda pendiente de revisión humana. P6 no está autorizado por esta entrega.
