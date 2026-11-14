# AI Development Log — evidencia de trabajo con Codex

**Estado inicial:** **sin entradas de ejecución**. La documentación y planificación previa no prueban que una rama, commit o test exista. Rellenar solamente después de cada sesión/tarea real.

| Fecha | Tarea | Solicitud al agente / skill | Archivos o PR/commit reales | Revisión humana (aceptado/corregido/rechazado) | Validación realmente ejecutada | Riesgos / resultados |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — |

## Plantilla de entrada

```markdown
### YYYY-MM-DD — LIB-XXX
- Agent / Superpowers skill:
- Goal + authorized scope:
- Branch and commit/PR (if created):
- Agent output:
- Human corrections / rejected suggestions:
- Commands run and exact results:
- Tests not run / remaining risks:
- Effect on downstream tasks / contracts:
```

No almacenar API keys, transcripciones de clientes reales ni secretos. No inventar resultados, timestamps de sesiones, PRs, prompts ejecutados o cifras de productividad. Mantener los resultados relevantes y no copiar automáticamente todo el chat de trabajo.

### 2026-11-14 — LIB-001 in progress (integration worktree)

- Added Zod, OpenAI SDK and Vitest, test/typecheck scripts, a Zod runner smoke test, and a placeholder-only `.env.example`; allowed the example through `.gitignore`.
- Clean-worktree typecheck initially failed because Next route types had not been generated. Updated the script to run `next typegen` first, as prescribed by the installed Next documentation.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (1 test), `pnpm build`, and `pnpm peers check` passed after installation. `.env` is ignored and `.env.example` is explicitly unignored.
- **Blocked:** clean `pnpm install --frozen-lockfile` exits with `ERR_PNPM_IGNORED_BUILDS` for optional `esbuild@0.28.2`, a Vite dependency. `pnpm-workspace.yaml` contains the pnpm build policy but is not in LIB-001's allowed write paths. No approval policy was changed. LIB-001 and G0 remain incomplete; LIB-002 and downstream tasks have not started.
- Earlier Vitest 3 attempt had the same install failure; current dependencies use Vitest 5 and Node 22 types with no reported peer issues. No model inference or product behavior has been implemented or tested.

### 2026-11-14 — LIB-001 verification after policy authorization

- User authorized extending ownership to `pnpm-workspace.yaml`; configured `esbuild: false` to skip the optional package's install script, without enabling new dependency scripts.
- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (1 test), `pnpm build`, and `pnpm peers check` passed. The sandboxed install could not reach the registry; the successful install used approved access to the existing pnpm store.
- LIB-001 validation complete. G0 remains open pending LIB-002 and LIB-003.

### 2026-11-14 — LIB-002 shared contracts

- Delegated implementation and reviewed the resulting TypeScript/Zod contracts for serializable case events, evidence, facts, configuration, decisions, errors and ports. Review identified missing income-basis, field constraints and declarative policy rules; these were added before consumption.
- Integrator ran `pnpm test` (10 tests across two files), `pnpm typecheck`, `pnpm lint`, and `git diff --check`; all passed. The contracts import Zod only. Cross-catalog checks and runtime evidence, precedence, concurrency and lifecycle semantics remain downstream work.
- G0 remains open pending LIB-003 and its integration checks. The original exercise PDF was extracted with macOS PDFKit for fixture comparison; `pdftotext` was unavailable.
- During LIB-003 integration, the integrator approved additive contract changes for `NOT`, `blocker_open`, and optional unavailable-audio duration, with strict schema tests. Missing debt is not treated as a declaration of zero debt. These changes affect predicate evaluators, configuration validation, and audio display; downstream consumers must implement them.

### 2026-11-14 — LIB-003 configuration and fixtures

- Added versioned demo configuration, cross-reference validation, canonical synthetic transcripts, scenario variants and evidence-linked expected outcomes. Compared conversation text to pages 3–4 of the exercise via PDFKit. Timestamps and variants are explicitly synthetic; Javier's audio has duration but no content.
- Approved an additional typed `fact_income_basis` predicate after identifying that a gross correction could otherwise not be expressed declaratively. Configuration requires evidenced net income before the demo's financial milestone; no missing debt is assumed to be zero.
- Integrator ran `pnpm test` (16 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`: all passed. R10 and safety scenarios are expected outcomes only until evaluators exist; their end-to-end behavior is unverified.
- G0 foundation checks pass; LIB-002 explicitly requires human review of the contracts before opening G1. No downstream workstream has been started.

### 2026-11-14 — Contract organization and G0 review

- User approved the shared contracts and requested cohesive modules for all subsequent code. Split the contracts into focused files while retaining the existing public barrel and contract semantics.
- Integrator reran `pnpm test` (16 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`; all passed. Human contract review and G0 foundation checks are complete. G1 work may begin; scenario outcomes are still unverified until the domain and integration work is implemented.

### 2026-11-14 — LIB-004 in-memory repository

- Added a single-process repository with defensive copies, conditional revision writes, stable event fingerprints, idempotent receipts, message persistence before analysis, and fixture reset. No production persistence is claimed.
- `pnpm test` passed 20 tests (including four repository tests), `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Concurrent calls were exercised as sequential competing writes from the same revision; multi-process concurrency and orchestration failure paths remain untested and outside this adapter's scope.
- G1 remains open. Additional worktree creation stalled; continuing safely with isolated or sequential work within the available worktrees.
