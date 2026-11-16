# Continuación de evaluación E2E — 16 noviembre 2026

## Contexto y ejecución

HEAD de partida `a6211947c9629e105c2644d9e1f73cc1217c6e30`, rama `codex/lead-intake-v0-bootstrap`. El runtime evaluado es el mismo de `71831fc08b12dd98c562a414e3c30f0ff9f3b1dc`: el commit intermedio contiene únicamente la evaluación anterior. Árbol limpio al iniciar; no se modificó `src/`. Node 22.22.0, pnpm 12.16.1, Next 16.4.6, Chromium 159, Playwright 1.65.1, Axe 4.14.0, macOS. Datos exclusivamente ficticios.

`pnpm exec playwright test`: **15 aprobadas, 0 fallidas, 5 omitidas** (las cinco requieren opt-in de OpenAI). `RUN_E2E_REAL=1 pnpm exec playwright test tests/e2e/continuation.pw.ts -g 'real:'`: **4 aprobadas**, cinco llamadas reales en total (Laura dos, Javier, Rosa y Marta una cada uno). Estas pruebas afirman éxito y estados básicos; no convierten la semántica en aprobación automática. La prueba original optativa de Marta no se volvió a ejecutar en esta segunda orden. El [índice de evidencias](continuation/README.md) enlaza todas las capturas representativas, respuestas ficticias y resultados para reconstruir los estados observados. Tests `replay etiquetado` usan esas respuestas guardadas y **no** llaman a OpenAI.

`pnpm test`: 191 aprobadas, 4 omitidas. `pnpm typecheck`, `pnpm lint` y `pnpm build`: correctos. Un lint concurrente con Playwright falló por `ENOENT` al escanear `test-results` mientras Playwright lo regeneraba; repetido sin concurrencia pasó. En la ejecución concurrente de Playwright se registró un `ChunkLoadError` de HMR en el servidor de desarrollo; los tests acabaron pasando. No se ha establecido su causa; el diagnóstico de la prueba aislada no registró excepciones de página ni peticiones fallidas en la entrada inicial. Los resultados HTML/JSON automáticos se regeneran en `playwright-report/` y `test-results/`, ignorados por Git; se conserva una [copia JSON](continuation/playwright/results.json) y [HTML](continuation/playwright/index.html) de la ejecución determinista completa anterior a añadir la comprobación aislada de descarte de alerta, que también pasó. El historial anterior se conserva en `docs/audits/2026-11-16-e2e-71831fc/`.

## E2E-01: Marta, inferencia real

Las expectativas se fijaron antes en [REAL_EXPECTATIONS.md](REAL_EXPECTATIONS.md). La segunda ejecución independiente obtuvo la siguiente comparación, desde [respuesta](continuation/real-marta.json) y [fuentes desplegadas](continuation/real-marta-evidence.png):

| Campo | Juicio | Observación |
| --- | --- | --- |
| Interés | Correcto | Explorar SmartHousing; cita cliente m2. |
| Zona | Correcto | Zaragoza; m2. |
| Horizonte | Correcto | Unos ocho meses; `approximate`, m2. |
| Compradores | Correcto | Pareja y ella; m2. |
| Ingresos | Correcto | 3.400 €/mes, aproximado, conjunto y neto; m4. |
| Ahorros | Correcto | 12.000 €, aproximado; modelo marca conjunto, lectura plausible de «tenemos», no verificación independiente. |
| Cuota | Correcto con ambigüedad | 180 €/mes; inclusión `unknown`; m4. |

En todos los resultados reales guardados, 30/30 citas de candidatos son substrings de mensajes con rol cliente ([comprobación](continuation/source-audit.json)); eso no garantiza la interpretación semántica ni valida las citas de incidencias. Se abrieron las evidencias de Marta y se comprobó navegación de un enlace hacia el mensaje con foco; no se activaron los siete enlaces individualmente. La pregunta siguió siendo genérica en las dos observaciones de Marta ([F001](FINDINGS.md)).

## E2E-02: Laura

El análisis real original recuperó ingresos conjuntos netos aproximados, ahorro aproximado y cuota; identificó la duda de inclusión. Sin embargo, clasificó la aproximación del ingreso como incidencia y priorizó «¿Podéis aclarar los ingresos que habéis indicado?» sobre la cuota. También clasificó ver un anuncio como candidato de interés SmartHousing aunque el texto de incertidumbre advierte que no se declaró ([F002 y F003](FINDINGS.md)). Etapa visible: En cualificación.

Se corrigió ingreso a 3.700 € por asesor y se añadió «Sí, los 3.800 € netos conjuntos ya tienen descontada la cuota del coche». El reanálisis real conservó la revisión, mostró ambas fuentes y dos conflictos, bloqueó CRM y conservó la etapa En cualificación. Detectó la nueva declaración y no realizó descuento aritmético; mantuvo `debtIncluded: unknown` en el candidato de deuda pese a que el candidato de ingreso nuevo declara `included`. Produjo una nueva incidencia de ingreso y volvió a pedir aclaración genérica pese a la respuesta. El primer conflicto se resolvió en la ejecución real; la resolución de ambos manteniendo corrección se comprobó mediante replay etiquetado de esas respuestas guardadas. Adoptar una nueva declaración se probó con transporte controlado en la batería original. La etapa cualificada tras completar interés y cuota no se comprobó con inferencia real.

## E2E-03: Javier y Rosa

**Javier:** rango 2.000–3.000 con `range`, sujeto individual y base desconocida; audio m4 `null`, incidencia de contenido inaccesible, sin candidatos de ese audio. En esta llamada sí se detectó la expresión original de posible estafa como sensible y la intervención fue revisión humana. Se añadió una alerta manual. [Respuesta](continuation/real-javier.json), [captura](continuation/real-javier.png). No prueba que el detector sea consistente en otras llamadas.

**Rosa:** ahorros 0 explícitos; 1.400 € conjuntos con base desconocida (el texto no establece explícitamente periodicidad). Las incidencias sensibles de urgencia y petición escrita fueron reconocidas, con revisión humana; se añadió una alerta manual. Sin embargo la consulta condicional de alquiler se colocó como candidato bajo el campo «Interés en SmartHousing», con incertidumbre que niega interés explícito; replay confirma que aparece en la [vista CRM](continuation/replay-rosa-crm.txt), aunque no significa una etapa cualificada. [Respuesta](continuation/real-rosa.json), [captura](continuation/real-rosa.png). No se observó aprobación o envío en la interfaz; no se auditó una integración externa completa.

## E2E-04 y 05: CRM y recuperación

Con respuesta controlada se confirmó etapa, se confirmó un dato y se comparó el portapapeles real con la vista previa: alias, siete etiquetas, etapa, fuentes, metadatos y revisión humana estaban presentes; se declara copia manual y ausencia de sincronización. Se verificaron confirmación, corrección y descarte de candidatos, resolución, reapertura y descarte de alerta y ahorro cero con etapa Cualificado en transporte controlado. Se verificaron bloqueos por conflicto, etapa incoherente y ausencia de datos con vista previa no exportable; al editar o fallar el análisis anterior, no se ofrece botón de copia ni vista actual. Errores HTTP, `invalid_response` (502 simulado), JSON HTTP malformado y posterior recuperación conservaron entrada y revisión. El JSON malformado es una respuesta HTTP interceptada, no una respuesta interna de OpenAI. El audio se evaluó en la ejecución real de Javier. AC-13 se contrastó con `tests/unit/intake/p11.test.ts`, ejecutado en `pnpm test`, que cambia reglas y prioridades mediante parámetros sin modificar código; no se reinició la UI con otra configuración. No se prueba el fallo interno real de proveedor ni la denegación de permisos de portapapeles.

## Interfaz y accesibilidad

Comparación visual estática: [UX2](continuation/ux-reference-1440.png) presenta dos columnas y una vista vacía a la derecha; la [entrada real](continuation/desktop-1440.png) emplea presentación más simplificada y el resultado real oculta inicialmente la conversación, que se abre con botón. Conserva jerarquía de ficha, revisión, fuente y avisos, pero cambian composición, colores y densidad. El prototipo solo es referencia visual.

A 1440×900 y 390×844 no hubo desbordamiento horizontal de documento en entrada; tampoco en resultado controlado móvil ([captura](continuation/mobile-result-390.png)). No es revisión exhaustiva de truncamientos. Los primeros diez controles de entrada recibieron foco con contorno CSS sólido en orden DOM; el portal de desarrollo Next también es alcanzable. Se verificó un enlace de fuente y `role=alert` del error de autor, sin lector de pantalla. Axe en entrada y resultado controlado señaló únicamente `region` moderado sobre `.disclaimer` fuera de landmarks ([datos](continuation/accessibility.json), F004); no es certificación WCAG ni sustituye revisión manual completa de contraste y lector de pantalla. No se observaron excepciones ni peticiones fallidas en la navegación inicial aislada; la evaluación de red no cubre todas las interacciones.

## Decisión

**NO-GO para demo de aceptación sin reservas.** Los errores semánticos F001–F003 afectan la pregunta y la representación del interés; los resultados reales son un conjunto pequeño y no demuestran estabilidad. La copia manual funciona en el flujo controlado; una demo supervisada solo debería proponerse tras revisión humana de esos defectos y declarando explícitamente que la interpretación y las alertas son parciales, que la información es autodeclarada y que no hay sincronización CRM ni aprobación financiera. Ver [guion](DEMO_READINESS.md).
