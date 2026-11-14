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

### 2026-11-14 — LIB-005 facts

- Integrated the independently developed fact validator and reconciler. Review identified a source-authority gap; added regressions and checks so customer evidence cannot claim advisor confirmation and correction evidence must match its declared source.
- Combined `pnpm test` passed 39 tests (including work in progress from LIB-006), `pnpm typecheck` and `pnpm lint` passed. Customer corrections that conflict remain unresolved until advisor confirmation; missing fact views mean unknown. The future orchestrator must reject model output claiming advisor authority, since role checks alone cannot authenticate the producer.

### 2026-11-14 — LIB-006 workflow, policy and actions

- Added deterministic, modular condition, workflow, policy and action evaluation. Integrator approved additive contract/config changes for an advisor-confirmed terminal handoff route and option-gated predicates; critical-blocker protection is mandatory. These changes affect configuration validation and predicate consumers.
- Integrator reviewed safety precedence and ran focused contract, configuration and workflow/policy/action suites (33 tests), `pnpm typecheck`, `pnpm lint`, and `git diff --check`; all passed. Full fixture-to-engine and orchestration behavior remains unverified pending integration. Call confirmation cannot bypass the normal prerequisite path; a confirmed human handoff may follow the alternate terminal route.

### 2026-11-14 — LIB-007 and LIB-008

- Integrated separate OpenAI and replay adapters, output/evidence validation and action-specific safe draft templates. Replay handles the canonical synthetic messages and defined variations only; unknown inputs fail closed. Live OpenAI inference was not run, so its provider path remains unverified. Model output is barred from claiming advisor authority.
- Added modular advisor workspace components using typed illustrative mocks; the mock UI labels its mode and does not persist or send. The UI agent checked case selection, evidence, Javier's unavailable audio and draft approval in a browser; it observed a missing favicon 404 and no other runtime errors.
- Integrator ran `pnpm test` (60 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`; all passed. UI lifecycle behavior and fixture-to-engine flows still require LIB-009–012 integration and acceptance testing.

### 2026-11-14 — LIB-009 orchestrator

- Integrated modular case orchestration and approved a repository-port change: stable receipts now include a separate duplicate indicator, and non-message events commit atomically with their projections. Incoming messages still commit before interpretation; tests exercise conflicting and repeated events.
- Integrator ran `pnpm test` (72 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`; all passed. Focused cases cover replay, AI and draft failures, stale proposals, R10, source authority, evidence fragments, duplicate simulated sends and delayed-model CAS.
- Human-edited draft text is not semantically screened for prohibited claims; generated text uses constrained templates and no external delivery exists. This remains an integration limitation. G2 remains open until API/UI wiring and end-to-end verification.

### 2026-11-14 — LIB-010 live API/UI, partial

- Wired the advisor workspace to in-memory case operations, replaced mock rendering, and added API tests and stable retry payloads. Browser smoke exercised Laura initial replay, draft approval without agreement, debt clarification, and retained message on unsupported replay input.
- Corrected R05 evidence to include the known debt message (with a regression), and changed safe draft selection to ask about missing SmartHousing interest after debt clarification.
- Integrator ran `pnpm test` (79 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`; all passed. A concurrent build attempt in the UI workstream hit a build lock; the subsequent integrator build passed.
- **Incomplete:** the contract accepts a customer-confirmation event based on an existing customer message reference but cannot establish that the message actually expresses agreement. The HTTP operation and UI control fail closed rather than allowing an unrelated message to complete M5. LIB-010's simulated-agreement capability and G2 are not fully verified; LIB-011–013 have not started. Human-edited draft text is also not semantically screened for prohibited claims; no external delivery exists.

### 2026-11-14 — LIB-010 agreement review and G2

- User authorized advisor-recorded simulated agreement after selecting, reading and explicitly confirming a customer's message. Updated the event contract, workflow and UI to require an advisor attestation, simulation flag and quoted customer evidence; old unreviewed payloads are rejected. The reviewer is a symbolic advisor; production authentication is outside V0.
- Integrator ran `pnpm test` (82 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`; all passed. Integration tests cover reviewed Laura agreement, invalid evidence and prerequisite checks. No appointment or message delivery is created. LIB-010's previous agreement blocker is resolved; G2 checks pass.

### 2026-11-14 — LIB-011 / LIB-012 acceptance and G3

- Added Laura replay acceptance for evidenced facts, both debt clarifications, interest, reviewed drafts and agreement, R10 and gross correction. Added Javier/Rosa and adversarial/failure coverage for trust, unavailable audio, explicit zero, urgency, opt-out, invalid model output/evidence, revisions and stale proposals.
- Integrator ran `pnpm test` (101 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`; all passed. G3 acceptance checks pass. Earlier LIB-010 browser smoke covered the Laura initial, approval and debt paths; the new suites did not repeat browser smoke.
- Prompt-injection coverage demonstrates that replay fails closed on unknown text; live OpenAI resistance was not tested. Human-edited draft content remains unscreened for prohibited claims, and there is no external delivery.

### 2026-11-14 — LIB-013 delivery and agreement follow-up

- A clean local clone at `88a4938` passed `pnpm install --frozen-lockfile`, lint, typecheck, 101 tests and build. With `AI_MODE=replay`, `pnpm dev -p 3218` served the page and the Laura API returned 200 with replay mode and four fixture messages. A tracked-file scan for common OpenAI key/private-key patterns found no matches; `.env` is ignored and `.env.example` is explicitly unignored. This is a limited pattern scan, not a guarantee that every possible secret format was detected.
- Visual review of the advisor agreement flow confirmed the selected customer message is displayed and explicit attestation is required; it also exposed a new call proposal after agreement. Reproduced and corrected the rule priority and orientation handling, with tests for prerequisite preservation, later corrections, R10 and safety precedence.
- After that fix, integrator ran `pnpm test` (105 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check`; all passed. The clean-clone check above predates this final fix and README changes; a final clone will be checked separately. Live OpenAI and semantic screening of human-edited drafts remain unverified.

### 2026-11-14 — Final clean-clone verification

- Fresh local clone of `f00de60`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (105 tests), and `pnpm build` all passed. Following the README environment setup (`cp .env.example .env.local`), `pnpm dev -p 3219` started; the page and Laura API returned HTTP 200 and the API identified replay mode with four original messages. The server was stopped afterward.
- LIB-013/G4 delivery checks are complete for this local synthetic PoC. No remote push or permission change was made. Live OpenAI inference, live-model prompt-injection resistance, production authentication/persistence, and semantic screening of human-edited drafts remain untested or out of scope.


### 2026-11-14 — F-01 OpenAI remediation, partial

- Diagnosed a real synthetic response, added a strict model-facing schema and evidence-preserving conversion, bounded cancellable requests, and regression tests. Ran 18 provider requests and retained mixed results in `docs/evaluation/F01_OPENAI_REMEDIATION.md`; the original evaluation remains unchanged.
- Lint, typecheck, 108 tests and build passed. Live corrections and canonical cases remain inconsistent, so F-01 is **not resolved**. No external delivery or shared-contract changes.
