# Libeen AI Lead Intake V0

**AI Product Engineer — Proof of Concept**

Una herramienta de asistencia comercial que transforma conversaciones no estructuradas en **información revisable**, con fuentes, incertidumbres visibles y una siguiente intervención sugerida. La IA propone; el asesor valida y decide.

> **Estado de entrega:** PoC aceptada para una **demostración supervisada con limitaciones** (16/11/2026). No es un sistema autónomo ni un producto preparado para producción. La interpretación semántica del modelo es probabilística y requiere revisión humana.

### Ver la solución

- **[Vídeo de la demo](https://nomulabs-my.sharepoint.com/:v:/p/luis/IQDdKF378eYuRbWc5xw3F2IDAaZ96sHPvi8cMUiGNx3edpM?e=dzgXcl)** — presentación y recorrido funcional.
- **[Demo online](https://libeen-sales-copilot.vercel.app/)** — aplicación para explorar la PoC.
- **[Roadmap](docs/current/roadmap.md)** — posibles líneas de evolución.

## Qué resuelve

Durante la cualificación comercial, un asesor necesita reconstruir datos dispersos, identificar lo que falta y decidir qué preguntar a continuación. Esta PoC permite **pegar una conversación ficticia**, analizarla bajo demanda y preparar una ficha comercial revisada, sin automatizar decisiones o comunicaciones.

El recorrido implementado es:

1. **Extracción con fuentes (B):** el LLM propone candidatos para siete campos comerciales (interés, zona, horizonte, compradores, ingresos, ahorros y cuotas/deudas), preservando citas y metadatos.
2. **Incidencias (D):** las reglas y señales semánticas detectan ausencias, ambigüedades, contenido inaccesible y posibles solicitudes sensibles.
3. **Siguiente intervención (E):** se propone una sola pregunta editable o una revisión humana.
4. **Supervisión y exportación:** el asesor confirma, corrige o descarta valores; puede revisar conflictos y copiar una ficha para su carga **manual** en el CRM.

**Ejemplo:** ante «gano unos 2.750 € netos y pago una cuota de 145 €, pero no sé si ya está descontada», la aplicación puede conservar ambos datos y su fuente, marcar la inclusión como desconocida y sugerir aclararla, **sin inventar una respuesta ni hacer cálculos financieros**.

[Capacidades y recorrido detallado](docs/current/PRODUCT_CAPABILITIES.md) · [Arquitectura B → D → E](docs/current/TECHNICAL_ARCHITECTURE.md)

## Por qué cambió el enfoque

El trabajo comenzó como un **Sales Copilot autónomo** para acompañar todo el proceso comercial mediante hitos, reglas y orquestación. Una primera versión permitió comprobar el componente determinista, pero las evaluaciones mostraron que **extraer información verificable no equivale a tener suficiente certeza para delegar decisiones comerciales**. La complejidad adicional dificultaba demostrar valor en el alcance de la prueba.

Opté por reducir el problema a **extraer información útil, hacer visibles las incertidumbres y ayudar al asesor a dar el siguiente paso**. La implementación original se conserva en la rama [`archive/sales-copilot-v0`](https://github.com/w0xter/libeen-sales-copilot/tree/archive/sales-copilot-v0) y en [documentación histórica](docs/legacy/README.md).

[Decisiones y experimentos del cambio de enfoque](docs/current/PRODUCT_EVOLUTION.md)

## Fiabilidad y limitaciones

Ante una entrada mal formada, un error del proveedor o una respuesta inválida, el sistema muestra un fallo y **no inventa resultados ni sustituye la inferencia por un replay oculto**. Los candidatos sin fuente válida pueden descartarse conservando los restantes. Las revisiones humanas y los conflictos se reflejan en la ficha efectiva; el sistema bloquea determinadas exportaciones desactualizadas o inconsistentes.

**Límites conocidos:** la detección de interés y de solicitudes sensibles es imperfecta; la formulación de preguntas y la resolución automática de aclaraciones no están garantizadas. Una revisión manual puede seguir siendo necesaria. No hay persistencia entre sesiones, envío de mensajes, sincronización CRM, scoring ni aprobación financiera. Las reglas configurables requieren editar TypeScript.

[Errores, mecanismos de protección y known issues](docs/current/AI_RELIABILITY_AND_LIMITATIONS.md) · [Hallazgos registrados](docs/current/evaluation/FINDINGS.md)

## Evaluación y colaboración con IA

El último cierre de hardening documenta **232 PASS / 4 SKIP** en Vitest y **19 PASS / 9 SKIP** en Playwright, además de comprobaciones satisfactorias de typecheck, lint y build. Estos tests verifican principalmente reglas y recorridos controlados; **no miden la precisión del modelo**.

Una llamada real sobre un caso ficticio de Alicante recuperó los siete campos y la pregunta material esperada. Es **una observación**, no una garantía de robustez ni una evaluación estadística. Las evaluaciones fallidas anteriores, los replays y los cambios de criterio se conservan.

La implementación se desarrolló con **Codex**, bajo definición del alcance, evaluación y revisión humanas. Entre las correcciones documentadas está P8.1: una selección visual no cambiaba el dato efectivo, por lo que se unificó la fuente de verdad de la ficha.

[Resumen de evaluación](docs/current/EVALUATION_SUMMARY.md) · [Criterios vigentes de la PoC](docs/current/evaluation/POC_EVALUATION_CRITERIA.md) · [Proceso humano–Codex](docs/current/DEVELOPMENT_PROCESS.md) · [Registro de colaboración](docs/current/AI_COLLABORATION_LOG.md)

## Ejecutar localmente

**Requisitos:** Node.js 22, pnpm 12.16.1, conexión de red y clave de OpenAI para la inferencia real.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
# Añadir OPENAI_API_KEY en .env.local; OPENAI_MODEL es opcional
pnpm dev
```

Abrir **http://localhost:3000**. El modelo predeterminado es `gpt-4.1-mini`. No introducir datos personales reales; esta PoC se ha desarrollado y evaluado con conversaciones ficticias.

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium  # una vez, si es necesario
pnpm test:e2e
```

Las pruebas con proveedor real son **optativas**, requieren credenciales y pueden tener coste. Véanse [las pruebas y evidencias](docs/current/README.md#pruebas-y-evidencias) para detalles.

## Documentación para la evaluación

| Documento | Qué contiene |
| --- | --- |
| [Capacidades y recorrido](docs/current/PRODUCT_CAPABILITIES.md) | Entrada, siete campos, incidencias, revisión y ficha CRM |
| [Arquitectura](docs/current/TECHNICAL_ARCHITECTURE.md) | Stack, pipeline B/D/E, reglas y separación entre LLM y lógica |
| [Evolución del enfoque](docs/current/PRODUCT_EVOLUTION.md) | Sales Copilot original, experimentos y motivos de simplificación |
| [Fiabilidad y known issues](docs/current/AI_RELIABILITY_AND_LIMITATIONS.md) | Validaciones, recuperación ante errores, limitaciones y exclusiones |
| [Resumen de evaluación](docs/current/EVALUATION_SUMMARY.md) | Tests, inferencias reales, accesibilidad y criterios de aceptación |
| [Proceso de desarrollo](docs/current/DEVELOPMENT_PROCESS.md) | Colaboración humano–Codex, correcciones y dedicación |
| [Roadmap](docs/current/roadmap.md) | Próximos pasos y posibles capacidades |
| [Índice documental](docs/current/README.md) | Informes originales, matrices, evidencias y pruebas |

**Conclusión:** la dirección del producto consiste en obtener valor de la interpretación de lenguaje natural sin presentar la salida del modelo como verdad verificada. **La IA propone, el sistema estructura y el asesor decide.**
