# Libeen AI Lead Intake

**Prueba técnica · AI Product Engineer · PoC funcional**

Un asistente para la cualificación comercial que ayuda a convertir una conversación en una ficha revisable: **qué sabemos del cliente, de dónde sale cada dato, qué dudas quedan y qué convendría preguntar después**.

El asesor mantiene el control. La aplicación no envía mensajes, no aprueba operaciones ni actualiza automáticamente un CRM.

**[Ver demo en vídeo](https://nomulabs-my.sharepoint.com/:v:/p/luis/IQDdKF378eYuRbWc5xw3F2IDAaZ96sHPvi8cMUiGNx3edpM?e=dzgXcl)** · **[Probar la aplicación](https://libeen-sales-copilot.vercel.app/)** · **[Ver roadmap](docs/current/roadmap.md)**

## Qué he construido

En una primera conversación comercial es habitual que los datos importantes estén repartidos entre mensajes: zona, plazo, compradores, ingresos, ahorros, cuotas y nivel de interés. El asesor tiene que reconstruir todo eso, detectar lo que falta y preparar la siguiente intervención.

AI Lead Intake propone un recorrido sencillo:

1. **Analizar una conversación ficticia** pegada o seleccionada en la interfaz.
2. **Extraer datos con sus fuentes**, sin tratar las interpretaciones del modelo como hechos verificados.
3. **Detectar información pendiente o ambigua** y sugerir una pregunta prioritaria.
4. **Revisar la ficha:** confirmar, corregir, descartar o contrastar declaraciones posteriores.
5. **Preparar una vista CRM** para copiarla manualmente, con los datos y las incidencias visibles.

Por ejemplo, si una persona declara que gana **2.750 € netos al mes** y paga una **cuota de 145 €**, pero no sabe si esa cuota ya está descontada, la aplicación puede conservar ambas cifras y proponer una aclaración específica. No deduce la respuesta ni realiza una evaluación financiera.

[Ver el recorrido completo con el caso ficticio de Alicante](docs/current/PRODUCT_CAPABILITIES.md)

## La decisión más importante: reducir el alcance

Empecé desarrollando un **Sales Copilot** más amplio, pensado para acompañar una oportunidad por distintos hitos del proceso comercial. Llegué a una primera versión funcional y comprobé que la lógica de negocio podía estructurarse mediante reglas explícitas.

El problema apareció al apoyar esas decisiones en información extraída por un LLM. Las pruebas mostraron interpretaciones incorrectas incluso cuando la salida tenía el formato esperado y citas literales. **Una extracción estructurada no es necesariamente una extracción fiable.**

En lugar de seguir ampliando la arquitectura, decidí centrar la entrega en una tarea más acotada: ayudar al asesor a entender una conversación y avanzar, con la incertidumbre y la revisión humana como partes visibles del producto.

[Por qué cambié el enfoque](docs/current/PRODUCT_EVOLUTION.md) · [Arquitectura y decisiones técnicas](docs/current/TECHNICAL_ARCHITECTURE.md)

## Cómo funciona y qué aprendí al evaluarlo

El núcleo sigue tres pasos: **B — Extraction** (candidatos y fuentes mediante OpenAI), **D — Issues** (incidencias a partir de señales y comprobaciones) y **E — Next Question** (una intervención prioritaria mediante reglas). La interfaz permite revisar el resultado antes de utilizarlo.

Las evaluaciones detectaron problemas que no aparecían en los tests convencionales: interés comercial mal interpretado, preguntas genéricas o repetidas y una inconsistencia entre la selección visual de un valor y la ficha efectiva. Esos hallazgos motivaron cambios en el código y también en el alcance del producto.

En el último cierre documentado se registraron **232 tests PASS / 4 SKIP** en Vitest, **19 PASS / 9 SKIP** en Playwright y comprobaciones satisfactorias de TypeScript, lint y build. La última llamada real registrada sobre un caso ficticio de Alicante extrajo los siete campos y propuso la aclaración esperada sobre una cuota. **Una ejecución satisfactoria no mide la precisión general del modelo**; los tests de navegador controlado tampoco sustituyen la inferencia real.

Desarrollé la implementación con **Codex**, delegando código, pruebas y documentación técnica mientras dirigía el alcance, revisaba comportamientos y decidía cómo continuar a partir de las evaluaciones.

[Qué evalué y qué aprendí](docs/current/EVALUATION_SUMMARY.md) · [Cómo trabajé con Codex](docs/current/DEVELOPMENT_PROCESS.md)

## Alcance de esta entrega

Esta versión está preparada como **demostración supervisada con datos ficticios**, no para uso comercial real. Decidí cerrar la PoC con ese alcance el 16 de noviembre de 2026; no equivale a una auditoría independiente ni a una aprobación para producción.

La extracción puede omitir información o interpretarla incorrectamente; la detección de solicitudes sensibles y la reconciliación automática de aclaraciones tampoco son exhaustivas. Por eso el asesor puede revisar fuentes y resolver incertidumbres. No hay persistencia entre sesiones, integración con CRM, envío de mensajes ni decisiones de financiación.

[Cómo responde ante errores y qué sigue pendiente](docs/current/AI_RELIABILITY_AND_LIMITATIONS.md)

## Ejecutarlo localmente

**Stack:** Next.js 16, React 19, TypeScript, OpenAI Responses API, Zod, Vitest y Playwright.

**Requisitos:** Node.js 22, pnpm 12.16.1 y una clave de OpenAI válida.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
# Configurar OPENAI_API_KEY en .env.local
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000). El modelo predeterminado es `gpt-4.1-mini`; puede cambiarse con `OPENAI_MODEL`. La clave se utiliza desde el servidor. Las pruebas con proveedor real requieren credenciales, son optativas y pueden generar costes.

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## Documentación de la entrega

| Documento | Para qué consultarlo |
| --- | --- |
| [Recorrido y capacidades](docs/current/PRODUCT_CAPABILITIES.md) | Ver lo que puede hacer un asesor, paso a paso |
| [Arquitectura](docs/current/TECHNICAL_ARCHITECTURE.md) | Entender B/D/E, las reglas y las decisiones de implementación |
| [Evolución del producto](docs/current/PRODUCT_EVOLUTION.md) | Entender el Sales Copilot inicial y el cambio de enfoque |
| [Evaluaciones](docs/current/EVALUATION_SUMMARY.md) | Revisar hallazgos, pruebas y resultados |
| [Fiabilidad y limitaciones](docs/current/AI_RELIABILITY_AND_LIMITATIONS.md) | Ver cómo se tratan los errores y qué falta resolver |
| [Desarrollo con Codex](docs/current/DEVELOPMENT_PROCESS.md) | Conocer mi forma de trabajo, las revisiones y la dedicación |
| [Roadmap](docs/current/roadmap.md) | Explorar las siguientes etapas y sus dependencias |
| [Índice técnico y evidencias](docs/current/README.md) | Acceder a informes, criterios, casos y pruebas detalladas |

El primer enfoque queda conservado en [`archive/sales-copilot-v0`](https://github.com/w0xter/libeen-sales-copilot/tree/archive/sales-copilot-v0) y en [`docs/legacy`](docs/legacy/README.md). No forma parte de la aplicación actual.
