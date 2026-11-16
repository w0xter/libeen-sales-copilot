# Evaluación E2E: resultados y límites

Fecha: 2026-11-16 (Europe/Madrid). Rama `codex/lead-intake-v0-bootstrap`, HEAD evaluado `71831fc08b12dd98c562a414e3c30f0ff9f3b1dc`; árbol inicialmente limpio. Node 22.22.0, pnpm 12.16.1, Next 16.4.6, Playwright 1.65.1, Chromium 159.0.8154.6, macOS arm64. Runtime: `src/app/page.tsx` → `IntakeWorkspace` → POST `/api/intake`; ruta usa parser y transporte OpenAI. No se modificó `src/`.

## Ejecución

`pnpm install --frozen-lockfile` precisó acceso fuera del sandbox: dentro falló DNS del registro. `pnpm exec playwright install chromium` instaló Chromium. `pnpm test:e2e` usa webServer Next en localhost:3000, Chromium, un worker, sin reintentos, trazas en fallo, HTML y JSON. El sandbox denegó listen (`EPERM 0.0.0.0:3000`); la ejecución fuera de él sí abrió la aplicación. Inicialmente hubo 2 fallos por selector de `role=alert` ambiguo con el anunciador de Next, corregido en el test, no en producto. Repetición: **4 aprobadas, 0 fallidas, 1 omitida** (real optativa). Ejecución separada `RUN_E2E_REAL=1 pnpm exec playwright test -g 'OpenAI real'`: **1 aprobada**; esa aserción comprueba que aparece la ficha, no exactitud semántica. No se repitió la llamada para buscar una salida mejor. Informes generados: `playwright-report/`, `test-results/results.json`; trazas solo en fallo, ignoradas por Git. `pnpm exec playwright show-report` las abre.

Comprobaciones existentes: `pnpm test` 191 aprobadas y 4 omitidas; `pnpm typecheck`, `pnpm lint`, `pnpm build` pasaron. Un primer build concurrente con la instalación falló en prerender (`useContext` null); se repitió tras instalar y pasó, por lo que no se atribuye al producto.

## Recorridos

- **E2E-01 real:** expectativas fijadas en [REAL_EXPECTATIONS.md](REAL_EXPECTATIONS.md). Una llamada sin interceptación. En [captura](real-result.png), interés, zona, horizonte, compradores, ingresos, ahorros y cuota coinciden en contenido visible con la declaración. La cuota figura ambigua. Las etiquetas de precisión/sujeto y los enlaces de cada fuente no se desplegaron en esta ejecución: **no evaluables**, tampoco la atribución exhaustiva. La siguiente pregunta es demasiado genérica: [F001](FINDINGS.md). No se observaron aprobaciones en pantalla; una captura no prueba ausencia de todos los hechos inventados.
- **E2E-02:** respuesta HTTP controlada, no extracción de Laura. Corrección de ingresos, persistencia tras fallo/reintento y conflicto posterior; adopción de declaración nueva, bloqueo de copia y captura [conflicto](conflict.png). No se probó la continuación original de Laura, mantener corrección, actualización completa de pregunta ni descuento financiero real.
- **E2E-03:** no se ejecutaron Javier ni Rosa con OpenAI real. Alerta sensible manual con respuesta controlada bloqueó copiar pregunta. Los falsos negativos históricos P4/P11 son riesgos conocidos, no reproducción actual.
- **E2E-04:** respuesta controlada: corrección, copia real mediante `navigator.clipboard.readText()` igual a vista previa y con valor corregido; [captura](desktop-result.png). Conflicto bloqueó copia. Desactualización y error mostraron estado anterior, pero no se comprobó exhaustivamente cada bloqueo ni los siete campos/metadatos en portapapeles. Sin verificación de etapas incoherentes ni ausencia de datos en navegador.
- **E2E-05:** entrada vacía deshabilita análisis, autor no reconocido muestra alerta, error HTTP controlado preserva resultado anterior desactualizado y reintento conserva revisión. No se probaron audio, JSON inválido ni todos los estados de recuperación.

## Interfaz y accesibilidad

Capturas realizadas en Chromium headless: escritorio predeterminado de Playwright 1280×720, no los 1440×900 solicitados; [móvil 390×844](mobile-error.png) sin desbordamiento horizontal de documento en el estado de error. No constituye auditoría responsive completa. Se observaron etiquetas y `role=alert` en el error de autor; no se evaluaron navegación por teclado, foco, contraste, anuncios por lector, truncamiento, consola, red ni fidelidad completa con UX2. No se ejecutó Axe. El prototipo se leyó como referencia, no como aplicación. Falta contraste visual sistemático.

Las capturas y datos son ficticios. Resultados controlados comprueban interfaz, no comprensión del modelo. No se inspeccionaron trazas del proveedor ni se exponen credenciales. El informe y la [matriz](ACCEPTANCE_MATRIX.md) distinguen lo pendiente; esta evaluación es parcial y no demuestra preparación integral de demo.
