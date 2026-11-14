# Decisiones y estado real — corte 13/11/2026

> **Actualización de ejecución — 14/11/2026:** LIB-001 a LIB-012 están implementadas en la rama local de integración y G0–G3 se han verificado. La suite integrada registró 101 tests, lint, typecheck y build correctos. LIB-013 y G4 permanecen pendientes de comprobación de entrega limpia. El modo OpenAI real no se ha ejecutado. Las tablas siguientes conservan el corte histórico de planificación del 13/11; no describen el estado actual del código. Consulta [AI_DEVELOPMENT_LOG.md](AI_DEVELOPMENT_LOG.md) para la evidencia y limitaciones.

| ID | Decisión o hecho | Estado |
| --- | --- | --- |
| D-01 | Copiloto interno para asesores, no chatbot autónomo | Confirmado |
| D-02 | Siguiente hito comercial apropiado por Case | Confirmado |
| D-03 | V0 vertical Laura primero; bandeja horizontal después | Confirmado |
| D-04 | Todo texto saliente y decisión relacionada con dinero bajo control humano; sin efectos reales | Obligatorio por ejercicio |
| D-05 | Case como agregado, WorkflowDefinition/FactSchema/AgentProfile separados | Dirección de arquitectura elegida |
| D-06 | Funcional V0 cerrada provisionalmente | Confirmado |
| D-07 | Next.js 16.4.6 + React 19.3.0, TS, pnpm 12.16.1 ya presentes | Comprobado en repo main |
| D-08 | Zod, Vitest y SDK OpenAI; scripts test/typecheck | **Planificado, no instalado** |
| D-09 | Proveedor de IA OpenAI; modelo inicial `gpt-4.1-mini` en `.env` mediante `OPENAI_MODEL` | Confirmado por usuario; **no implementado** |
| D-10 | `AI_MODE=replay` para pruebas; inferencia real diferenciada explícitamente | Decisión de diseño |
| D-11 | Política `demo-v1` R01–R10 sintética sin umbrales financieros; R10 editable | Decisión de alcance demo |
| D-12 | Desarrollo con Codex en ramas/worktrees y Superpowers como método, DAG como coordinación | Enfoque de ejecución elegido |
| D-13 | Plan LIB-001–LIB-013 y puertas G0–G4 | **Plan, tareas aún no realizadas** |
| D-14 | `AGENTS.md` raíz aprobado por el usuario | **Archivo documental aprobado** |

## Estado comprobado del repositorio

- GitHub: `w0xter/libeen-sales-copilot` (privado), rama principal `main`.
- Scaffold instalado: Next.js 16.4.6 / React 19.3.0 / TypeScript, con un `src/app/page.tsx` que solo mostraba `Hello world!` al realizar la inspección.
- Carpetas iniciales del dominio, componentes, adapters, fixtures y tests estaban vacías, con `.gitkeep`.
- Scripts existentes en `package.json`: `dev`, `build`, `start`, `lint`. Ningún script `test`/`typecheck` comprobado en ese corte.
- La existencia de este paquete documental **no significa** que se haya implementado código, ejecutado tests ni completado un gate.
- No se ha confirmado acceso de los evaluadores al repositorio privado. Requiere acción explícita del usuario cuando corresponda.

## Pendientes explícitos al ejecutar G0

1. Verificar el árbol real justo antes de editar: podrían existir cambios posteriores al corte documental.
2. Instalar dependencias, scripts y `.env.example` seguro; el `.gitignore` contiene `.env*` y deberá permitir `!.env.example`.
3. Materializar los contratos TS/Zod, definiciones versionadas y fixtures; estos documentos describen interfaces y ejemplos, no los implementan.
4. Confirmar cómo se documentará y evaluará el interés en SmartHousing antes de recomendar una llamada a Laura: el primer mensaje no equivale por sí solo a interés informado.
5. Seleccionar fuentes comerciales autorizadas para responder la objeción de confianza de Javier, o derivar si no las hay.
6. En cada PR, registrar comandos realmente ejecutados, fallos y revisiones de Codex.

## Jerarquía y alcance

V0: Laura M3 bloqueado → aclaración → M3 reevaluado → próxima acción revisable; Javier y Rosa como casos de seguridad; R10 configurable. M5 acordado es extensión deseable, no prerrequisito si compromete la demo. Sin CRM, WhatsApp real, underwriting, colas, microservicios, base de datos productiva o automatizaciones externas.

**Fuentes locales:** [PDF original](reference/Prueba_tecnica_AI_Product_Engineer.pdf), [contrato](contracts/INTEGRATION_V0.md), [DAG](implementation/DAG.md). No se necesita acceder a fuentes externas para ejecutar los briefs definidos en este paquete.
