# Libeen Sales Copilot

**Estado al preparar este paquete (13/11/2026):** repositorio privado con **scaffold inicial solamente**. Todavía no se ha implementado el copilot, no se han instalado Zod/Vitest/OpenAI ni se han ejecutado tests de producto. Los documentos de `docs/` son especificaciones y planes; **no evidencia de funcionalidad existente**.

Esta V0 es un copiloto para asesores comerciales que interpreta conversaciones **ficticias**, consolida hechos con evidencia y ambigüedad, evalúa hitos configurables y propone la siguiente acción con revisión humana. No es un sistema de concesión de financiación ni un agente que envía mensajes automáticamente.

## Empezar con el scaffold

Requiere Node.js compatible con la versión de Next.js instalada y pnpm. En la versión inicial inspeccionada: Next.js 16.4.6, React 19.3.0 y pnpm 12.16.1.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Este comando arranca **la página base de Next.js**, todavía no la interfaz del copiloto. Actualmente existen `pnpm lint` y `pnpm build`; **`pnpm test` y `pnpm typecheck` no están disponibles** hasta completar LIB-001.

## Documentación y ejecución con Codex

1. Lee [AGENTS.md](AGENTS.md), que define las restricciones globales para Codex.
2. Entra en [docs/README.md](docs/README.md) para encontrar producto, contratos y criterios.
3. Revisa el [DAG de implementación](docs/implementation/DAG.md) y el [brief de tu tarea](docs/implementation/tasks/).
4. Trabaja solo dentro de las rutas permitidas por el brief y valida el gate correspondiente antes de integrar.

## OpenAI (planificado, no implementado)

El proveedor confirmado para las pruebas es **OpenAI**, con `gpt-4.1-mini` como modelo inicial, configurable por `OPENAI_MODEL`. La integración prevista usará `OPENAI_API_KEY` exclusivamente en el servidor y `AI_MODE=openai|replay`. LIB-001 preparará `.env.example` y las dependencias; LIB-007 implementará el adaptador. Nunca publiques un `.env` con claves.

## Límites

- Solo expedientes y mensajes inventados de Laura, Javier y Rosa y variantes claramente etiquetadas.
- Todo mensaje dirigido al cliente queda pendiente de revisión humana; en V0 solo se simula el envío.
- La política comercial `demo-v1` es **ficticia**. Su máximo resultado es orientar hacia una llamada o derivación, nunca aprobar o rechazar financiación.
- La demo imprescindible: **Laura pasa de M3 bloqueado por deuda ambigua a M3 aclarado y siguiente acción propuesta**; Javier y Rosa comprueban el comportamiento seguro.
- La prueba técnica original sugiere unas cuatro horas de esfuerzo y prioriza un proyecto pequeño y verificable. No presentar futuras capacidades como completadas.

**Fuente oficial:** [Prueba técnica, PDF](docs/reference/Prueba_tecnica_AI_Product_Engineer.pdf). **Plan local:** [DAG y 13 AI Task Briefs](docs/implementation/DAG.md).
