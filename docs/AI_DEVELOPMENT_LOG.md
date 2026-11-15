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

### 2026-11-14 — F-01 semantic reliability, second iteration

- Added field-specific model schemas, message-grounded evidence and conservative guards for unsupported amounts and interrogative rental intent. Added deterministic regression coverage without changing shared contracts or fixtures.
- Ran 20 synthetic provider requests; mixed outcomes and every latency are recorded in `docs/evaluation/F01_OPENAI_REMEDIATION.md`. F-01 remains partially fixed: false TRUST, uncertainty errors and blocker omissions remain.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (112 tests) and `pnpm build` passed. No push or merge.

### 2026-11-14 — F-01, tercera iteración limitada

Se investigaron límites de evidencia, precisión y correcciones; se añadieron salvaguardas conservadoras en el adaptador y dos regresiones deterministas. Doce intentos de interpretación real devolvieron `MODEL_UNAVAILABLE`; no se recibió respuesta. El verificador independiente de bloqueos y la evaluación semántica real quedan pendientes. Detalles y resultados en `docs/evaluation/F01_OPENAI_REMEDIATION.md`; F-01 sigue abierto.

## Estabilización de entrega — 14 de noviembre de 2026

Se partió de `1a09a1a`. Se diagnosticó DNS restringido en sandbox y se comprobó una única petición autenticada al endpoint de modelos fuera de sandbox (HTTP 200), sin nuevas inferencias ni cambios semánticos. Se corrigieron presentación del fallo, envío y derivación simulados, revisión de acuerdo en UI y configuración JSON de R10. Se verificaron los tres casos y R10 off/on en navegador aislado; las pruebas y limitaciones concretas están en [DELIVERY_READINESS.md](evaluation/DELIVERY_READINESS.md). F-01 permanece PARTIALLY FIXED y F-06 pendiente. No se hizo push ni merge.

### 2026-11-14 — F-01 trust boundaries, partial implementation

In an isolated worktree based on preparation commit `4f985f2`, added opt-in sanitized transport categorization, independent customer-text safety verification with fail-closed errors, bounded financial context, a narrow stored-assertion correction path, singleton draft selection, and deterministic tests. A separate recorded-result test evaluated the first three live outputs through policy and action. The 19-request synthetic run (one transport plus 18 semantic calls) found a safe rejection for the gross correction, an evidence failure on one opt-out attempt and a false COST objection on its repeat. The original three case actions were appropriate in the observed runs, but this is not proof of reliability. Blocker lifecycle requires the documented CCR; F-01 remains PARTIALLY FIXED. Details and evidence are in `docs/evaluation/F01_TRUST_BOUNDARIES_EVALUATION.md`. No contract, fixture, push, merge or external business effect was made.

### 2026-11-14 — U0 stabilization, deterministic work

Worked in the existing `codex/f01-trust-boundaries` worktree at `09001b7`, retaining the pre-existing uncommitted structured extraction prompt experiment. The local configured model and the supplied acceptance artifacts identify `gpt-5.4-mini`; this task made no model requests. The prior artifacts report differing extractor/verifier labels, verifier-only TIME, invalid amount carry-over and conflicting corrected amounts. Updated the prompt guidance, conservatively hold unilateral noncritical findings rather than persisting them, and added narrow evidence-aware correction and repeated-text handling. Original assertions and blocker lifecycle remain intact; uncertainty remains when correction targets cannot be identified. Added focused deterministic tests without changing datasets, canonical fixtures, or shared contracts.

Final local checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (155 passed / 3 skipped), `pnpm build`, `pnpm dataset:validate`, and `git diff --check` passed. The 24-case command selection was checked with `--dry-run` only. These results do not establish semantic correctness: routine-question disagreements can still hold analysis, location/debt attribution is model-dependent, and amount/basis correction is deliberately narrow. Independent model evaluation and the existing blocker lifecycle CCR remain open; U0 is not declared complete.

### 2026-11-14 — U0 safety and commercial reconciliation

In the existing `codex/f01-trust-boundaries` worktree at `bc2d8fa`, separated independent protected-signal discovery from review of proposed commercial objections. The internal review accepts cited explanations for unsupported commercial candidates; unresolved sensitive disagreements remain safe failures, and existing persisted blockers are not closed. R07 now handles ordinary objections while TRUST and privacy remain protected handoffs. Added deterministic adapter and policy regressions. `pnpm lint`, `pnpm typecheck`, `pnpm test` (160 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, and `git diff --check` passed. No paid model run was made; real-model acceptance and the existing blocker lifecycle CCR remain open.

### U0 final interpretation stabilization (2026-11-14)

Worked on `codex/f01-trust-boundaries` at `5de0729` in its existing clean worktree. Added narrowly anchored reviewer-quote correction for agreed candidates, internal evidence-backed TRUST/BINDING_CLAIM dismissals, independent review of proposed desired locations, and clearer shared-debt extraction guidance. Added deterministic adapter regressions for the reported failures and safety/financial/location boundaries. No shared contracts, policies, fixtures, evaluator, or persisted blocker lifecycle were changed. The verifier still makes semantic judgments and may err; real-model acceptance remains outstanding and the existing blocker lifecycle CCR remains proposed.

Validation: focused adapter tests passed (54); `pnpm lint`, `pnpm typecheck`, `pnpm test` (172 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, and `git diff --check` passed. Typecheck initially found an inferred array type error, which was corrected. Three category selections were checked with `--dry-run` (no model requests); U0 acceptance is not claimed.

### Protected dismissal reconciliation (2026-11-14)

On `codex/f01-trust-boundaries` at `41b1835`, inspected the recorded documentation-request failure. The dismissal already matched type and message, but its exact quote covered only the first sentence of a two-sentence customer message; protected dismissal reconciliation required equality with the entire message. Allowed a literal complete-sentence quote while retaining same-candidate matching, independent protected findings, inconclusive failure and customer-text evidence validation. Added deterministic regressions for the recorded payload through action planning and for conflicting, missing, wrong-type, wrong-message and invalid evidence. Semantic relevance still depends on the reviewer; previously persisted blockers remain unchanged.

Validation: focused adapter tests passed (66); `pnpm lint`, `pnpm typecheck`, `pnpm test` (184 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, and `git diff --check` passed. No paid evaluation was run.

### U0 financial attribution and optional metadata (2026-11-14)

On `codex/f01-trust-boundaries` at `3af965e`, clarified model instructions for financial ownership and JSON null, and normalized only optional assertion metadata before choosing the validation route. Added deterministic adapter coverage for scope preservation, null variants, invalid metadata and nonurgent TIME review. The attribution itself remains model-dependent; no historical facts or shared contracts were rewritten. No paid model requests were made, so Javier B05, the real-model TIME case and the 24-scenario U0 acceptance remain unverified.

Validation: focused adapter tests passed (85); `pnpm lint`, `pnpm typecheck`, `pnpm test` (203 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate` and `git diff --check` passed.

### F-02 MP-G0–MP-G2, partial implementation (2026-11-14)

Created isolated `codex/f02-multipass-interpreter` from `5309484662b6eff4cde631e9416e78ddc9c35087`; the source worktree and its F-02 brief were preserved. Baseline: `pnpm test` 203 passed, 3 skipped. Added preliminary internal schemas, UTF-16 evidence checks, adapter-generated candidate IDs, and position-based grouping with rejection of missing/multi-number focus, duplicate contributions and invalid evidence. Added deterministic tests. No model requests, public contracts, fixtures or replay changes.

Final checks: focused tests 11 passed; `pnpm lint`, `pnpm typecheck`, `pnpm test` (214 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate` and `git diff --check` passed. The first build failed because Turbopack rejected the external node_modules symlink; a frozen offline local installation fixed it.

MP-G1 and MP-G2 are not declared complete: candidate validation is not enforced by the grouping entry point, subject identity and correction links are not checked against a case snapshot, alignment only recognizes identical focus offsets, and broader adversarial coverage and cross-contract validation are still needed. No MP-03 or later work was started; no push or merge.

### F-02 MP-G1/MP-G2 continuation (2026-11-14)

On `codex/f02-multipass-interpreter` from `17bd98c`, required FactSchema and assertion context at grouping entry; added field/type/unit/scope and evidence validation, correction dimension and prior-assertion checks, UTF-16 surrogate boundary checks, structured subject/ambiguity diagnostics, and deterministic numeric and contained-text alignment. Conflicting duplicate extractor outputs are rejected; literal `entre 2000 y 3000` is a range while `pasé de 2000 a 3000` is left ambiguous. The case contract has no participant registry; unverified subject identities remain explicit diagnostics. The cited v0.3 design was not present in the repository.

Focused tests: 26 passed, including the original 11 test cases (adapted to the required context). Final `pnpm lint`, `pnpm typecheck`, `pnpm test` (229 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, and `git diff --check` passed. MP-G1's specified deterministic checks pass. MP-G2 remains open: alignment is conservative and only recognizes specific literal numeric ranges; an isolated broad nonnumeric focus has no independent proof of atomicity. Semantic equivalence, unsupported range formulations and subject identity cannot be guaranteed from the current structured inputs. No MP-03 work, public contract changes, model calls, push or merge.

### F-02 MP-G2 structural alignment and semantic review (2026-11-14)

On `codex/f02-multipass-interpreter` from `a55fd1d`, made `ClaimGroup.semanticAtomicity` require `context_review_required`: structural alignment, including agreement among extractors, does not confirm a fact. Preserved collection candidates, subject diagnostics and ambiguous alignments; added deterministic alignment for unique partially overlapping textual focuses. Focused tests cover isolated broad focus, separate mentions, collections, extractor agreement, competing overlaps, input permutations, and no assertion mutation. MP-G2 passes the requested structural gate and is ready for integration; contextual semantic resolution remains MP-03 work. No public contract or provider calls were changed.

Validation: 32 focused tests passed; `pnpm lint`, `pnpm typecheck`, `pnpm test` (235 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, and `git diff --check` passed. No push or merge.

### F-02 MP-03 partial reconciliation (2026-11-14)

On `codex/f02-multipass-interpreter` at `fc74495`, added preliminary internal contextual review and discriminated result schemas, deterministic reconciliation, protected-signal verdict handling and adjudication validation, with focused synthetic tests. No model calls, public contract changes, push or merge. Contextual support is required before consolidation; subject disagreement, missing material amounts and contradictory reviews remain unresolved. Safety tests preserve historical blockers and separate a dismissed opt-out from confirmed urgency.

This is partial work, not MP-G3: basis-only historical corrections remain unresolved; candidate and safety validation need further hardening, and the complete Laura, Javier, Rosa, TRUST/COST, adjudication/protected-conflict and ordering acceptance matrix is not covered. Integration must not consume this prototype as complete. No CCR established.

Final checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (245 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, and `git diff --check` passed. Focused adjudication tests also passed. The first build failed with externally linked dependencies; a local dependency installation allowed the subsequent build to pass. No paid evaluation was run.

### F-02 MP-G3 hardening continuation (2026-11-14)

On `codex/f02-multipass-interpreter` from `ba8a475`, added FactSchema, known-subject, historical-assertion and grouping-diagnostic checks before reconciliation; contextual review is tied to the candidate's exact evidence and material corroboration counts only independently reviewed candidates. Duplicate candidates and incompatible occurrences are rejected. Final new assertions and blockers pass the existing interpretation validator. The safety input now requires completed simulated scan and review, binds verdicts to the same identifiable evidence span, preserves historical blockers, and retains findings in the result. Adjudication validates membership, evidence, duplicate responses and contextual support and conservatively routes same-message confirmed protected findings to human review. No model calls or public contract changes were made.

Correction candidates for amount, basis, period, unit and subject remain in human review, retaining prior assertion IDs and both evidence references rather than assigning the historical amount to the correction. An explicitly reviewed absence can remain a clarification. Added deterministic tests for joint income/savings/debt, zero savings, disputed scopes and values, safety categories, prior evidence, stable candidate IDs and numeric focus variations, invalid and duplicate candidates, protected conflicts and permutation.

MP-G3 remains partial: stable IDs are verified for identical occurrence anchors and numeric focus variants; nonnumeric focus boundaries can still change between analyses, so canonical identity for all textual declarations is not established. The simulated tests do not provide full integrated Javier/Laura/Rosa transcripts or prove all real semantic distinctions. Corrections intentionally remain unresolved. Same-message protected findings conservatively prevent adjudication even where unrelated. No CCR has been established and MP-04 was not started.

Validation: `pnpm lint`, `pnpm typecheck`, `pnpm test` (277 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 passed) and `git diff --check` passed. No paid evaluation, push, merge or PR.

### F-02 MP-G3 final closure (2026-11-15)

On `codex/f02-multipass-interpreter` from `46d0a68`, added validated contextual identity spans and canonical literal anchors for textual declarations; unique equivalent spans resolve to the same identity, while missing, conflicting, overlapping or historically ambiguous identities require human review. Matching historical assertions are reused unchanged only when their source evidence and dimensions match uniquely and validate. Added regression tests for collections, repeated mentions, distinct same-field declarations, reordered candidates, reanalysis and history. Numeric anchors retain the existing normalization. No universal semantic inference is claimed.

Reconciliation now projects only newly validated blockers: historical open and resolved blockers remain in the case rather than being returned as new observations. A confirmed signal matching resolved history requires human review instead of reopening it. Full original Laura, Javier and Rosa transcripts from `cases` are tested with simulated candidate, contextual and safety responses. The tests preserve Laura's joint income and separate debt, Javier's untranscribed audio and trust finding, and Rosa's zero savings, urgency, binding request and conditional rental question. Javier's conflicting subject scope remains in review. No fixtures or public contracts were modified.

MP-G3 PASS for the stated deterministic acceptance criteria. Historical corrections remain in human review with their evidence; protected findings in the same message conservatively inhibit adjudication. Identity that cannot be established from validated anchors also remains in review. No CCR identified; MP-04 and MP-05 not started. No model calls, push, merge or PR.

Final verification: focused multipass tests 60 passed; `pnpm lint`, `pnpm typecheck`, `pnpm test` (295 passed, 3 skipped), `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 passed), and `git diff --check` passed.

### F-02 / MP-04 — pipeline simulado (2026-11-15)

- Implementado pipeline interno con transporte inyectado, snapshot clonado y congelado, cuatro fases iniciales concurrentes, revisión contextual, agrupación y reconciliación. No está conectado al adaptador público ni a OpenAI.
- Presupuesto máximo de siete intentos, una reparación global, adjudicación focalizada, cancelación y plazos; errores y trazas no incluyen transcripciones ni respuestas completas. Las revisiones protegidas fallidas y las revisiones contextuales incompletas no producen interpretación consolidada.
- Pruebas simuladas ejercitan concurrencia, ceguera de S1, orden de S2, reparación, siete intentos con adjudicación inválida, diagnóstico de duplicado, cancelación, timeouts, snapshot y un hecho por cada conversación original de Laura, Javier y Rosa. También cubren una señal protegida detectada por S2 y la omisión de una revisión ordinaria.
- Durante TDD se observó que una revisión ordinaria ausente podía producir consolidación; se añadió una comprobación de cobertura de candidatos y la regresión correspondiente. Quedan pendientes las pruebas completas de todos los hechos y señales de los tres casos mediante el pipeline, más varios casos de aceptación de MP-04; por ello el gate se informa como parcial.

### F-02 / cierre MP-G4 — pipeline simulado (2026-11-15)

- Ampliada la integración con respuestas simuladas de los tres extractores, S1 y S2 sobre las conversaciones completas de Laura, Javier y Rosa; se comprueban sus hechos y señales pertinentes, además de la discrepancia de sujeto de Javier.
- Una prueba con dos fallos iniciales y órdenes de terminación invertidos reprodujo una carrera en la selección de reparación. Se espera ahora al conjunto inicial y solo se repara un único fallo inválido; con varios fallos se devuelve error seguro sin reparación.
- Una prueba detectó que un candidato refutado podía quedar eclipsado por otros apoyos y por adjudicación. El pipeline conserva revisión humana cuando S2 proporciona apoyos y refutaciones para una misma ocurrencia.
- Las pruebas de pipeline comprueban orden de terminación, candidatos, dos ingresos diferentes o iguales, identidad ambigua, corrección histórica, reanálisis sin duplicados, revisiones incompletas o contradictorias, riesgos protegidos, adjudicaciones válidas e inválidas, presupuestos de cinco, seis y siete intentos, cancelación, timeout y trazas sin contenido completo. No se conectó OpenAI ni se añadieron efectos externos o persistencia.
- Verificación observada antes de la última prueba adicional: `pnpm lint`, `pnpm typecheck`, `pnpm test` (334 aprobadas, 3 omitidas), `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 aprobadas) y `git diff --check` pasaron. La prueba adicional de snapshot sin mutación y ausencia de `fetch` pasó junto con las 40 pruebas focalizadas; lint y typecheck también pasaron después de añadirla.
- Verificación final repetida: `pnpm lint`, `pnpm typecheck`, `pnpm test` (335 aprobadas, 3 omitidas), `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 aprobadas) y `git diff --check`: PASS. MP-G4: PASS para los criterios deterministas del brief; MP-05 no iniciado.

### F-02 / MP-05 — configuración parcial (2026-11-15)

- En `codex/f02-multipass-interpreter` desde `59c2006`, se añadió la lectura de `AI_INTERPRETER_STRATEGY`: replay conserva prioridad, single es el valor predeterminado, los valores desconocidos se rechazan y multipass devuelve `MODEL_UNAVAILABLE` mientras no exista la integración. No hay fallback silencioso ni cambios en DraftGenerator.
- Las pruebas nuevas fallaron inicialmente para estrategia desconocida y multipass; después del cambio, la suite completa pasó. El transporte OpenAI multipass, sus esquemas wire, prompts, normalización y adaptador público siguen pendientes. MP-G5 es PARCIAL; no se realizaron llamadas reales a OpenAI.
- Verificación: `pnpm lint`, `pnpm typecheck`, `pnpm test` (338 aprobadas, 3 omitidas), `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 aprobadas) y `git diff --check` pasaron antes de esta entrada de registro.

### F-02 / MP-05 — transporte OpenAI multipass (2026-11-15)

- Desde `685c483`, la factory selecciona el intérprete multipass mediante activación explícita; replay conserva prioridad y single sigue predeterminado. Se añadieron transporte SDK con `maxRetries: 0`, esquemas wire estrictos anulables, normalización y prompts `multipass-openai-1`. Repair regenera desde la entrada original, sin conservar la salida inválida. El adjudicador recibe alternativas sin revisiones ni identificadores de extractores.
- El perfil interno `poc-material-1` marca ingresos, ahorro, deuda y número de compradores. La identidad del caso es intrínseca; otras referencias se toman únicamente de assertions históricas no rechazadas que pasan validación. Un participante inventado en un caso inicial falla de forma segura.
- Pruebas SDK simuladas comprueban estructura requerida de los esquemas generados, normalización, refusal, respuesta incompleta, regeneración, ceguera de votos, fallo de S2 y cinco operaciones para cada uno de los tres expedientes con respuestas vacías. Estas últimas son pruebas de conexión, no de extracción completa de los casos. Los tests previos del pipeline simulado cubren los casos completos y el presupuesto, pero no pasan por este transporte SDK. Quedan pendientes las pruebas semánticas completas de los tres expedientes a través de toda la cadena y otras pruebas de fallos y presupuesto a ese nivel. MP-G5 permanece PARCIAL. No hubo llamadas reales a OpenAI.
- Verificación observada: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 aprobadas) y `git diff --check` pasaron; `pnpm test` pasó con 354 aprobadas y 3 omitidas. El último test de fallo S2 se añadió después de lint, typecheck y build, y se ejecutó en la suite completa.

### F-02 / MP-G5 — pruebas de identidad y límites SDK (2026-11-15)

- Desde `fad8456` se añadieron pruebas con respuestas wire no vacías para Laura, Javier y Rosa mediante la factory y el SDK simulado, sin insertar sujetos históricos. Las tres fallan: la factory devuelve error y no se consolidan las afirmaciones esperadas. Se conservan las pruebas fallidas; no se cambió código productivo ni se inventaron sujetos.
- Se añadieron pruebas SDK para seis solicitudes con regeneración, dos salidas iniciales inválidas sin regeneración arbitraria, salida inválida persistente de S1/S2, propagación de abort por cancelación y por los plazos individual y global, y rechazo wire de propiedades adicionales y adjudicaciones incompatibles. Pasan las 24 pruebas restantes de este archivo. El máximo de siete y la adjudicación real siguen sin demostrarse a nivel SDK.
- Solicitud de cambio contractual propuesta para revisión: incorporar al contexto autorizado un registro estable y versionado de unidades compradoras y participantes, con procedencia verificable y relación del emisor de cada mensaje con dicho registro cuando se conozca; los valores desconocidos deben permitir abstención. El contrato actual solo identifica `role` y `conversationId`, sin identificador de emisor ni registro de sujetos, por lo que no proporciona por sí mismo un vínculo verificable entre personas o unidades a través de mensajes. Una alternativa de derivación interna más limitada podría evitar parte del cambio si se demuestra segura. El cambio propuesto afectaría contratos de mensaje/caso, constructores y persistencia, adaptadores, fixtures y pruebas de consumidores; debería ser compatible con datos históricos ausentes y probar identidad estable, mensajes sin emisor, varias personas, importes iguales, atribución ambigua y reanálisis. No se modificaron contratos ni se solicita aplicar el CCR sin aprobación.
- Verificación: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 aprobadas) y `git diff --check` pasaron; `pnpm test` falló con 3 fallos, 362 aprobadas y 3 omitidas. Build se ejecutó antes de la última prueba wire añadida. MP-G5 permanece PARCIAL; no se realizaron llamadas reales a OpenAI.

### F-02 / MP-G5 — exploración de identidad local (2026-11-15)

- Desde `3efc7d6` se examinó la diferencia entre entidad del expediente, referente textual e identidad persistente. El rechazo actual se produce porque el snapshot solo incluye el ID del caso y sujetos de assertions históricas validadas; `reconcile` exige que cada candidato esté en `knownSubjects`. El replay usa IDs fijos, pero no demuestra por sí mismo la vinculación.
- Se añadió un helper experimental aislado, sin conexión al pipeline, que reconoce una gramática deliberadamente muy estrecha y devuelve IDs reproducibles y procedencia local. Sus 10 pruebas focalizadas pasan: incluyen unidad de dos personas, comprador único, declaración propia, varios referentes con importes distintos o iguales, pareja, citas o reenvíos, mensajes distintos, repetición y foco inadecuado. No autentica mensajes ni comprueba referencias históricas, por lo que no constituye todavía una política apta para producción y no cambia los resultados del intérprete.
- Las pruebas SDK completas de Laura, Javier y Rosa siguen fallando. Quedan pendientes las comprobaciones de IDs inventados y de historia compatible e incompatible a través de la política integrada, así como asegurar que una unidad canónica no fusione grupos incompatibles. El experimento muestra que existen referentes textuales locales derivables sin establecer identidad personal persistente; no demuestra todavía una solución interna suficiente ni que el CCR sea imprescindible. El CCR anterior sigue siendo una propuesta, no una aprobación. MP-G5 permanece PARCIAL.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 aprobadas), pruebas focalizadas (10 aprobadas) y `git diff --check` pasaron. La última suite completa ejecutada falló en las 3 pruebas SDK ya conocidas, con 372 aprobadas y 3 omitidas; después se corrigió únicamente el estrechamiento de tipos de una prueba y se repitió la prueba focalizada. No se efectuaron llamadas reales a OpenAI.

### F-02 / MP-G5 — atribución contextual parcial (2026-11-15)

- Desde `e1532bf`, se amplió el contrato interno de revisión contextual con `subjectAttribution` separado de `identitySpan`, con tipo, mensaje, evidencia y justificación. El schema wire exige el campo anulable; los mocks anteriores suministran `null`. El prompt S2 `multipass-openai-2` solicita atribución explícita y mantiene al hablante local limitado al mensaje. No se modificaron contratos públicos.
- Se añadió una validación experimental aislada para un `local_speaker`: comprueba rol cliente, alcance, mensaje, cita literal, pertenencia al fragmento y límites UTF-16, y deriva un ID determinista del caso y mensaje, no del ID propuesto. Seis pruebas focalizadas pasan para estabilidad, fuentes no cliente, evidencia falsa, mensajes y ámbitos incorrectos y categorías inciertas. La función no comprueba la pertenencia real del candidato a un grupo, contradicciones entre revisiones, compatibilidad histórica ni semántica de citas o terceros; no está conectada al pipeline y no autoriza sujetos. La gramática experimental anterior tampoco se conectó.
- Las pruebas wire y del prompt añadidas pasan. Las tres pruebas completas de Laura, Javier y Rosa siguen fallando; falta implementar y probar el flujo de agrupación, validación contextual e incorporación segura a `knownSubjects`, incluyendo unidad compradora, terceros, contradicciones, historial y reanálisis. No se demuestra todavía una solución interna suficiente ni la necesidad del CCR. MP-G5 continúa PARCIAL.
- Verificación observada: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 aprobadas), pruebas focalizadas (6 aprobadas) y `git diff --check` pasaron. La suite completa falló en las tres pruebas SDK existentes (381 aprobadas, 3 omitidas); posteriormente solo se cambió el acceso tipado de la prueba focalizada y se repitieron lint, typecheck y esa prueba. No se hicieron llamadas reales a OpenAI.
- 2026-11-15, continuación F-02 MP-G5: se reprodujeron los tres fallos SDK de Laura, Javier y Rosa en `8d6699d`. Se sustituyó `subjectAttribution: null` en sus respuestas simuladas S2 por atribuciones del ámbito correspondiente con evidencia literal del mensaje original, sin precargar sujetos históricos. Las tres pruebas continúan fallando: la etapa SubjectBinding no se implementó ni conectó. No se ha demostrado la validación semántica de citas, reenvíos, terceros, unidades incompatibles o correspondencias históricas; no se debe autorizar un sujeto basándose únicamente en una cita exacta. Verificación observada: pruebas focalizadas 33 pasadas y 3 fallidas; suite completa 381 pasadas, 3 fallidas y 3 omitidas; `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` y `git diff --check` pasaron. No se ejecutó OpenAI real. MP-G5 sigue parcial y no está listo para integración.

- 2026-11-15, continuación desde `d0b614f`: se conectó SubjectBinding después de S2 y antes de reconciliación, con IDs internos estables para unidad y hablante local, comprobación de evidencia, ámbito, revisiones e historial, y abstención que conserva hallazgos protegidos. Los mocks SDK clasifican independientemente con fragmentos localizados; Laura, Javier y Rosa pasan sin sujetos históricos precargados y Javier se reanaliza con los mismos IDs. Se probaron atribuciones ausentes, a otro mensaje, contradictorias, terceros y citas clasificados por S2, unidades históricas incompatibles, mensajes separados y preservación de TRUST. Los sujetos ya suministrados explícitamente como conocidos mantienen compatibilidad en pruebas internas; una corrección histórica sigue pendiente de revisión. La clasificación semántica de S2 no autentica identidad y sus falsos positivos quedan para MP-G6; la equivalencia histórica no canónica se conserva en revisión. Verificación: focalizadas 92 pasadas; suite 400 pasadas y 3 omitidas; lint, typecheck, build, dataset:validate, eval:recorded y diff check pasaron. No se usó OpenAI real. MP-G5 continúa parcial: faltan cobertura SDK de adjudicación y presupuesto máximo.

### F-02 / MP-G5 — adjudicación y presupuesto SDK (2026-11-15)

- Desde `dd3432c`, J recibe los grupos normalizados por SubjectBinding; el transporte elimina votos y nombres de extractores y reemplaza los `candidateId` que revelaban el extractor por alias, traduciendo de vuelta una selección válida antes de reconciliar. La prueba SDK reprodujo primero el ID libre y después la filtración del extractor en el payload; ambas pasaron tras los cambios. La disputa material simulada cubre selección válida, respuesta irresuelta, ID inventado, evidencia ajena, wire inválido, refusal, error, contradicción S2 y rechazo de SubjectBinding. Las pruebas cuentan llamadas a `responses.create`, comprueban cinco, seis y siete, una única regeneración, agotamiento seguro, schema J durante Repair, `maxRetries: 0` y ausencia de HTTP en los escenarios de adjudicación. Laura, Javier y Rosa, replay, single, DraftGenerator, timeout, cancelación y fallos S1/S2 se ejecutaron en la suite.
- Verificación observada: `pnpm test` 412 pasadas y 3 omitidas; `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm dataset:validate`, `pnpm eval:recorded` (3 pasadas) y `git diff --check` pasaron. No se ejecutaron OpenAI real ni `eval:openai`. **MP-G5 PASS** para integración SDK simulada; no se afirma precisión real del modelo.

#### Diseño propuesto del dry-run MP-G6 — no ejecutado

1. Congelar commit, versiones de prompts/configuración/modelo y criterios; usar los mismos 24 escenarios sintéticos existentes para single y multipass, más casos sintéticos adicionales con expectativas revisadas de forma independiente, sin modificar el oracle para ajustar resultados. Reservar muestras y registrar los casos omitidos o no evaluables.
2. Antes de cualquier llamada, inspeccionar la compatibilidad del evaluador con multipass y fijar límites explícitos de solicitudes, gasto y tiempo. Multipass necesita entre cinco y siete solicitudes por análisis: 24 casos supondrían 120–168 solicitudes, además de las de single y cualquier fallo o ejecución adicional. El límite actual del runner de 20 solicitudes exige lotes realmente compatibles con ese límite o una modificación del evaluador autorizada por separado; no asumir soporte de lotes. No ejecutar bajo la presente instrucción.
3. Comparar por caso valores y ámbitos financieros, base neta/bruta, evidencia, hechos inventados, señales protegidas y falsos OPT_OUT/STOP_CONTACT/TRUST/HANDOFF; registrar análisis completos, fallidos y con revisión humana. Medir solicitudes reales, latencia y coste por estrategia, incluyendo fallos, y preservar la trazabilidad sin secretos.
4. Publicar resultados emparejados, discrepancias, límites de muestra y revisión humana, separando regresiones de calidad y seguridad; no inferir mejora de precisión ni fiabilidad del 99 % sin evidencia independiente. Las atribuciones semánticas erróneas de S2 y los audios no disponibles requieren análisis explícito. La ejecución real y cualquier cambio de presupuesto quedan fuera de esta entrega.

### 2026-11-15 — F-02 MP-G6 preparación parcial

Se auditó el CLI F-01 y el manifiesto F-01; se añadió un preflight exclusivamente offline con presupuestos conservadores de solicitudes para seis casos y tests locales. No se ejecutaron llamadas de modelo. La comparación, métricas, controles de coste/tiempo efectivos y revisión independiente del oráculo siguen pendientes; no se declara MP-G6 PASS. Véase `docs/evaluation/F02_MULTIPASS_PREP.md`.

### 2026-11-15 — F-02 comparador offline parcial

Se añadió una simulación con adaptadores de producción y transportes sintéticos en memoria, presupuesto compartido de intentos, emparejamiento y métricas parciales. La simulación no llama al proveedor; las limitaciones de respuestas, historial de C01, cobertura de métricas y cancelación se documentan en `docs/evaluation/F02_MULTIPASS_PREP.md`. MP-G6 PREP permanece parcial y MP-G6 real no se ejecutó.

### 2026-11-15 — F-02 cierre offline, avance parcial

Se separaron guiones, fixtures y proyección del oráculo; se añadió el recorrido `staged-interpreter`, transferencias históricas, señales y hechos simulados de los seis escenarios, cancelación propagada, detección parcial de ocurrencias y evidencias, y pruebas de mutación y red interceptada. Los resultados siguen siendo simulados. Las métricas pendientes y la falta de revisión independiente se describen en `docs/evaluation/F02_MULTIPASS_PREP.md`; MP-G6 PREP permanece parcial. Sin llamadas al proveedor.

### 2026-11-15 — F-02 repetición C01 con timeouts alineados

Se cambió el timeout predeterminado multipass a 25 s por operación y 75 s por etapa, sin modificar el presupuesto ni single-pass. Lint y typecheck pasaron; la suite pasó con 453 tests y 5 omitidos, incluidas pruebas de cancelación y presupuesto. Una única comparación real con `gpt-5.4-mini` consumió 9 de 18 intentos: single completó ambas etapas (4 intentos, 9,26 s); multipass terminó la primera con `MODEL_OUTPUT_INVALID` (5 intentos, 13,16 s). El informe local permanece ignorado por Git. El fallo anterior `MODEL_UNAVAILABLE` no demuestra que la causa fuera el timeout; multipass sigue sin ser evaluable para la corrección C01.

### 2026-11-15 — F-02 investigación offline del fallo

Se examinó el informe local, el mapeo de errores y las rutas de pipeline, sin nuevas llamadas reales. El informe no conserva trazas internas ni respuestas de las pasadas: cinco intentos son compatibles con una reparación inicial fallida o con S2 seguido de un rechazo de validación, por lo que no se puede identificar la causa concreta retrospectivamente. Las pruebas existentes de pipeline, transporte SDK y presupuesto pasaron: 105 tests. No se modificó el comportamiento; para discriminar causas en una futura ejecución haría falta conservar diagnósticos técnicos acotados, sujetos a autorización.

### 2026-11-15 — F-02 diagnóstico técnico local

Se añadió un observador opcional del resultado interno multipass y su proyección al informe local por etapa: estados, códigos técnicos, roles, duración y número de intentos, sin mensajes ni respuestas en la traza. Las pruebas offline distinguen reparación fallida de revisión contextual incompleta y comprueban que un fallo del observador no altera la interpretación. `pnpm lint` y `pnpm typecheck` pasaron; `pnpm test` pasó con 456 tests y 5 omitidos. No se ejecutó ninguna evaluación real adicional; los informes anteriores no contienen estos datos.

### 2026-11-15 — F-02 C01 real con diagnóstico

Tras pasar lint, typecheck y 456 tests (5 omitidos), se realizó una comparación real autorizada con `gpt-5.4-mini`: 8 de 18 intentos. Single completó la etapa inicial, pero la corrección falló con `EVIDENCE_INVALID` (3 intentos, 7,79 s). Multipass falló en la etapa inicial (5 intentos, 13,25 s); la traza registró E1/E2/E3/S1/S2 con formato válido y `incomplete_contextual_review`. La traza no precisa si faltaron, sobraron o se duplicaron revisiones. No se ejecutaron más evaluaciones; informe local ignorado por Git.

### 2026-11-15 — F-02 conteos offline de revisión S2

Para futuros fallos `incomplete_contextual_review` se incorporaron conteos de revisiones esperadas, recibidas, ausentes, duplicadas y ajenas, sin guardar identificadores ni contenido. Pruebas simuladas distinguen las tres condiciones; lint, typecheck y suite completa pasaron (459 tests, 5 omitidos). La validación no cambió y no se ejecutaron llamadas reales. Los conteos no permiten reconstruir el informe anterior.

### 2026-11-15 — F-02 C01 real con conteos S2

Tras lint, typecheck y 459 tests (5 omitidos), se ejecutó una comparación real autorizada con `gpt-5.4-mini`: 9 de 18 intentos. Single completó ambas etapas (4 intentos, 8,69 s); multipass falló en la inicial con `incomplete_contextual_review` (5 intentos, 12,28 s). S2 devolvió nueve revisiones frente a cero esperadas: nueve ajenas, ninguna duplicada o ausente. La traza no permite saber si se extrajeron candidatos ni por qué no hubo candidatos agrupados. Informe local ignorado por Git; ninguna ejecución real adicional.

### 2026-11-15 — F-02 diagnóstico de extracción y agrupación

Se instrumentaron conteos agregados por extractor, candidatos, grupos, rechazos y códigos de rechazo, sin contenido ni identificadores. Las pruebas offline distinguen extracción vacía, rechazo de todos los candidatos y agrupación correcta; no reproducen la respuesta real anterior ni establecen su causa. `invalid_candidate` sigue agrupando varias causas. Lint y typecheck pasaron; suite completa: 462 tests pasados y 5 omitidos. No hubo nuevas llamadas reales ni cambios en la validación.

### 2026-11-15 — F-02 C01 real con diagnóstico de agrupación

Tras lint, typecheck y 462 tests (5 omitidos), se ejecutó una comparación real autorizada con `gpt-5.4-mini`: 9 de 18 intentos. Single completó ambas etapas (4 intentos, 8,08 s); multipass falló en la inicial (5 intentos, 12,38 s). Cada extractor produjo tres candidatos; los nueve fueron rechazados como `invalid_candidate` y quedaron cero grupos. S2 entregó nueve revisiones ajenas a los grupos esperados; el resultado fue `incomplete_contextual_review`. La categoría de rechazo no identifica qué validación falló ni permite reconstruir las respuestas. Informe local ignorado por Git; ninguna ejecución real adicional.

### 2026-11-15 — F-02 diagnóstico de rangos de evidencia

Se añadieron conteos técnicos de primera causa de rechazo y presencia del texto, sin conservar contenido ni identificadores. Lint, typecheck y suite pasaron (463 tests y 5 omitidos). Dos comparaciones reales autorizadas con `gpt-5.4-mini` consumieron 9 intentos cada una. En ambas, multipass rechazó nueve candidatos: ocho por rango de declaración y uno por rango de foco. En la segunda se comprobó que los nueve fragmentos estaban presentes, pero sus offsets eran incorrectos: cinco con inicio correcto y fin incorrecto, cuatro con ambos extremos incorrectos. S2 devolvió nueve revisiones ajenas frente a cero esperadas; single completó ambas etapas en las dos comparaciones. La instrucción solicita offsets UTF-16 al modelo. No se alteraron prompts ni validaciones; queda por decidir cómo abordar esta frontera sin sobreajustar C01. Informes locales ignorados por Git.

### 2026-11-15 — F-02 localización literal de rangos

El intérprete calcula los rangos de extracción desde citas únicas en mensaje y declaración; rechaza citas ausentes o ambiguas y mantiene las validaciones de evidencia. Tests offline cubren UTF-16, importes iguales y ausencia/ambigüedad; lint, typecheck y suite pasaron (467 tests, 5 omitidos). Una comparación real autorizada consumió 7 de 18 intentos: single falló en su etapa inicial con `EVIDENCE_INVALID` (2 intentos); multipass produjo 9 candidatos, agrupó 5 en 3 grupos y rechazó 4 por `invalid_evidence`, después S2 devolvió 3 revisiones para 5 esperadas y terminó en `incomplete_contextual_review` (5 intentos). No se han modificado prompts. Se detiene el ajuste conductual para evaluar la instrucción de S2 y la validación de evidenceRefs; no se atribuye una causa concreta sin más evidencia. Informe local ignorado por Git.

### 2026-11-15 — F-02 diagnóstico de evidencia y cobertura S2

Se añadieron conteos agregados de tipos de error de evidencia y cobertura por grupo, sin citas ni identificadores. Una prueba offline comprueba offsets erróneos de citas presentes y una revisión por grupo; lint, typecheck y suite pasaron (468 tests, 5 omitidos). Una comparación real autorizada con `gpt-5.4-mini` consumió 9 de 18 intentos: single completó ambas etapas; multipass extrajo 10 candidatos, rechazó 9 (5 por offsets de evidencia inconsistentes con citas presentes y 4 por ámbito no permitido), agrupó 1 y S2 duplicó su única revisión esperada. El resultado fue `incomplete_contextual_review`. No se cambiaron prompts ni reglas. La causa de los ámbitos inválidos y revisiones duplicadas requiere evaluar instrucciones/salida del modelo; no se generaliza desde una muestra. Informe local ignorado por Git.

### 2026-11-15 — F-02 evidencia, ámbitos y S2 v3

Se localizaron las referencias de extracción por citas literales únicas y se aclararon las instrucciones generales sobre ámbitos permitidos y revisión individual, versionadas como `multipass-openai-3`, sin convertir sujetos ni rellenar revisiones. Lint, typecheck y suite pasaron (471 tests, 5 omitidos). Dos comparaciones reales autorizadas consumieron 9 intentos cada una; single completó ambas etapas en ambas, multipass completó las cinco operaciones iniciales y se detuvo para revisión humana. En la segunda ejecución se agruparon 14 de 14 candidatos y se identificaron categorías de seguridad protegida, material no resuelto y atribución de sujeto. No se ha establecido si las abstenciones son correctas ni se ha evaluado generalización real fuera de C01. Informes locales ignorados por Git.

### 2026-11-15 — F-02 investigación de abstenciones

Se añadió captura local autorizada de entradas y salidas sintéticas y detalles de revisión, sin claves ni texto de excepciones. Lint y typecheck pasaron; suite: 473 tests pasados y 5 omitidos. Una comparación real consumió 9 intentos: single completó ambas etapas; multipass solicitó revisión humana por seguridad y atribución, sin la categoría material no resuelto. S1 señaló TRUST, PRIVACY y URGENT; S2 repitió las cinco señales y las confirmó, con citas presentes pero offsets incorrectos en las seis referencias. El conciliador marca señales inciertas y detecta IDs duplicados. En la deuda, dos de tres atribuciones citaron texto fuera de su declaración y SubjectBinding rechazó el grupo. Los hallazgos TRUST y urgencia no se justifican por esas citas; la clasificación de privacidad requiere contrastar la política, no descartarla por su cuenta. Los motivos de la ejecución anterior no pueden reconstruirse. Informe sintético local ignorado por Git.

### 2026-11-15 — F-02 protección y señales repetidas v4

Se localizaron referencias de seguridad con citas únicas y se eliminó únicamente la copia idéntica de una señal S1 repetida una vez por S2; señales contradictorias o duplicaciones adicionales siguen requiriendo revisión. Las instrucciones `multipass-openai-4` piden valorar el contexto de confianza, privacidad y urgencia sin descartar señales genuinas. Tests cubren OPT_OUT confirmado y duplicado contradictorio; lint, typecheck y suite pasaron (475 tests, 5 omitidos). Una comparación real autorizada consumió 9 intentos: single completó ambas etapas; multipass solicitó revisión humana tras descartar dos señales de privacidad y dejar urgencia incierta, además de una atribución de deuda cuya cita excedía la declaración en uno de tres candidatos. No se ha probado la generalización real en Javier y Rosa. Informe local ignorado por Git.

### 2026-11-15 — Preparación de evaluación de 24 escenarios

Se verificaron lint, typecheck y suite (475 tests pasados, 5 omitidos), además del corpus F-01 (352 registros, anotaciones pendientes de revisión independiente). La matriz semántica local enumera 23 IDs y mezcla escenarios de conversación con fallos de proveedor, borradores y replay; el comparador multipass real existente solo ejecuta C01. Su preflight offline para seis escenarios estima hasta 63 intentos y rechaza el límite de 18. Se solicitó identificar la lista de 24; no se ejecutaron nuevas llamadas reales ni se sustituyó la lista por una muestra arbitraria.

### 2026-11-15 — Evaluación real F-01 de 24 escenarios

El usuario aportó el guion de 24 casos; se ejecutó con `gpt-5.4-mini`, end-to-end y tope de 18 intentos por lote. El runner utiliza single-pass, no multipass. Resultado de checks: 23 PASS y 1 FAIL, 54 intentos; en `F01D1-trust_real-P1-V2` el verificador emitió una cita no literal y el análisis terminó en `EVIDENCE_INVALID` sin `HANDOFF`. Los informes sintéticos detallados están ignorados por Git; resumen en `docs/evaluation/F01_24_SCENARIOS_2026-11-15.md`. Las anotaciones del dataset son provisionales y sin revisión independiente.

### 2026-11-15 — Comparación multipass de 24 escenarios

Se adaptó el evaluador F-01 para estrategia multipass con presupuesto compartido por intentos y preflight que incluye pasadas y borradores; el guion divide los 24 IDs en lotes de hasta 18. Lint y typecheck pasaron; suite 479 tests y 5 omitidos, recorded 3 y dataset válido. La ejecución real con `gpt-5.4-mini` completó los 24 IDs con 139 intentos: 2 PASS y 22 FAIL automáticos (17 revisiones humanas y 5 salidas inválidas). Una revisión manual detectó que uno de los PASS automáticos activaba OPT_OUT y STOP_CONTACT sin solicitud de no-contacto; el oráculo no lo prohibía. Detalles y límites en `docs/evaluation/F02_24_COMPARISON_2026-11-15.md`; informes sintéticos locales ignorados por Git.

### 2026-11-15 — Investigación offline de los resultados multipass

Se reprodujeron offline salidas de 21 casos de una etapa reconstruyendo el snapshot: los 21 resultados públicos coincidieron con los informes previos. Se identificaron solapamientos en motivos de revisión, 5 fallos de correspondencia S2, casos de señales protegidas detectadas que no llegan al orquestador, falsos OPT_OUT en salidas y una ausencia estructural de COST en señales multipass. Se excluyeron tres correcciones de dos etapas; no hubo llamadas reales ni cambios de política, contratos o prompts. Análisis y límites en `docs/evaluation/F02_24_CAUSAL_ANALYSIS_2026-11-15.md`; diagnóstico sintético detallado ignorado por Git.

### F02-R01 — diagnóstico offline de capturas

Se añadió una prueba opt-in que lee el ZIP sintético capturado, reproduce las respuestas multipass sin proveedor y compara el estado público de 21 casos de una etapa; tres casos con historial se marcan como no reconstruidos. Se documentan inventario, causas y límites en `docs/evaluation/F02_R01_CAPTURED_REPLAY.md`. No se alteraron intérprete, prompts, contratos, oráculos ni fixtures. La verificación y sus resultados se detallan en el handoff de la tarea.
