# Libeen AI Lead Intake V0

Un asesor recibe conversaciones comerciales y necesita convertirlas en información utilizable sin reconstruir cada dato a mano. Esta PoC local analiza conversaciones **ficticias**, propone datos con sus fuentes, señala incidencias y sugiere una siguiente pregunta. El asesor revisa y corrige antes de copiar una ficha para cargarla manualmente en el CRM.

**Estado:** demo supervisada aceptada con limitaciones. No es producción ni una aprobación de la automatización original: la resolución automática de aclaraciones no está demostrada. Consulta los [criterios aprobados](docs/current/evaluation/POC_EVALUATION_CRITERIA.md) y el [hardening](docs/current/evaluation/HARDENING_RELEASE_REPORT.md).

## Arranque

Requisitos: Node.js 22, pnpm 12.16.1, conexión a OpenAI y una clave válida para analizar. Desde la raíz:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Añade OPENAI_API_KEY en .env.local; OPENAI_MODEL es opcional.
pnpm dev
```

Abre http://localhost:3000. `.env.example` no contiene secretos. La ruta activa usa `OPENAI_API_KEY` y `OPENAI_MODEL` (por defecto `gpt-4.1-mini`); `AI_MODE` pertenece al código histórico y no cambia el proveedor de esta interfaz. El texto enviado para analizar llega al proveedor. Sin clave o ante un fallo se muestra un error, sin sustituirlo por una respuesta inventada.

## Recorrido

1. Selecciona un ejemplo o introduce una conversación ficticia con turnos `Cliente:`, `Libeen:` o `Asesor:` y pulsa **Analizar conversación**.
2. Revisa los candidatos y sus fuentes: son declaraciones e interpretaciones, no hechos verificados. Confirma, corrige o descarta cuando proceda.
3. Revisa y gestiona las incidencias; una aclaración puede necesitar resolución manual. Revisa la pregunta sugerida y la etapa comercial.
4. Abre la vista previa y copia la ficha para introducirla manualmente en el CRM. Los conflictos, estados desactualizados u otros bloqueos pueden impedir la copia hasta su revisión.

La arquitectura mínima es **B (Extraction) → D (Issues) → E (Next Question)**: el modelo interpreta la conversación y propone candidatos; las reglas deterministas identifican faltantes y priorizan incidencias y pregunta; el asesor conserva la decisión. Una señal sensible pendiente requiere revisión. «Cualificado» describe completitud comercial, no solvencia ni aprobación financiera. El [plan B/D/E](docs/current/02_MINIMAL_BDE_IMPLEMENTATION_PLAN.md) explica los límites.

## Pruebas

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium # una vez, si falta el navegador
pnpm test:e2e
```

`pnpm test` incluye pruebas deterministas y de integración con transporte controlado; no mide la calidad del modelo. Playwright comprueba la interfaz y recorridos controlados en navegador. Las pruebas con proveedor real son optativas, requieren clave, red y coste, y están desactivadas por defecto; por ejemplo `RUN_P4_REAL=1 pnpm exec vitest run tests/integration/intake/p4-real.test.ts` ejecuta el caso ficticio de León. Las entradas, expectativas y evidencias están en [pruebas y evaluación](docs/current/README.md#pruebas-y-evidencias). La evaluación de navegador y accesibilidad cubrió estados concretos, no una auditoría WCAG completa ni lector de pantalla.

## Configuración y límites

En [`src/intake/rules.ts`](src/intake/rules.ts) se ajustan los seis campos esenciales, el orden de ambigüedades y la prioridad de la base de ingresos. Hay que editar TypeScript y reiniciar o reconstruir; no existe editor en interfaz ni configuración sin tocar código, por lo que no se satisface literalmente ese requisito del enunciado. La deuda tiene tratamiento específico y no hay reglas financieras.

La inferencia es variable: puede omitir, atribuir o interpretar mal datos y el filtro de interés es conservador. Es obligatoria la revisión humana de la conversación, fuentes, incidencias y pregunta. La inclusión de una cuota puede permanecer desconocida incluso después de una revisión manual. Solo se usan datos ficticios; no hay persistencia entre sesiones, envío automático, integración CRM, verificación documental ni aprobación financiera.

Con más tiempo priorizaríamos: un conjunto representativo de casos ficticios y medición de errores para orientar mejoras semánticas; configuración externa validada para editar reglas sin código; y una evaluación más amplia de accesibilidad y recorridos de navegador. Ninguna sustituye la revisión humana.

## Desarrollo asistido por IA

La persona responsable definió alcance y criterios, delegó implementación y pruebas a Codex y revisó resultados. Por ejemplo, una revisión humana detectó en P8 que adoptar un valor nuevo solo cambiaba una insignia; P8.1 corrigió la ficha efectiva. Las evaluaciones posteriores detectaron preguntas genéricas y errores de interés; se conservaron los resultados y se aceptó después una PoC supervisada con intervención manual. Las pruebas controladas no se presentan como inferencia real. Más detalles en el [registro de colaboración](docs/current/AI_COLLABORATION_LOG.md). No existe una medición fiable del tiempo total dedicado; no se afirma que el trabajo haya durado cuatro horas.

La [documentación activa](docs/current/README.md) reúne especificación, demo y evidencias. El Sales Copilot anterior y su [documentación histórica](docs/legacy/README.md) permanecen en el repositorio, pero no son el runtime de esta interfaz.
