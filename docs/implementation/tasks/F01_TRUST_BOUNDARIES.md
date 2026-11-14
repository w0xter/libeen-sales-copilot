# F-01 · Trust boundaries and incremental interpretation — Implementation Brief

**Status:** Ready for implementation by Codex, pending execution and verification.  
**Prepared:** 2026-11-14.  
**Base:** `main` at `b837cdb1dcec9bb7725658a2b04f39b9eed940eb`; preparation branch `codex/f01-trust-boundaries-prep`.  
**Issue:** F-01 remains **PARTIALLY FIXED**. Do not treat this brief as evidence that any fix has been implemented.

## 1. Outcome, scope, and authority

Repair the OpenAI interpretation boundary while keeping the existing `Interpreter` / `DraftGenerator` ports, `CaseOrchestrator`, deterministic `CaseKnowledge`, workflow and policy engines, replay mode, and human authority. We are **not migrating to Agents SDK** in this iteration. After implementation, perform a new independent real-model evaluation; only then decide whether an Agents SDK experiment is worthwhile.

This brief authorizes Codex to implement and test the listed changes locally in an isolated branch/worktree, using existing `OPENAI_API_KEY` and **exact** configured `OPENAI_MODEL` for a bounded synthetic-data evaluation. Never print/log/commit secrets. No external messaging, appointments, CRM, financial approvals, Notion work, or real customer data. **No merge or push to `main` without explicit user authorization.** Follow `AGENTS.md`; if a public shared-contract change is genuinely necessary, produce a Contract Change Request (CCR) and stop only the affected task until approved. Do not silently modify `src/contracts/**`, canonical `src/config/**`, or `src/fixtures/**` to force a pass.

## 2. Confirmed baseline (source: code and reports)

- `src/adapters/ai/openai.ts`: a fixed `interpretInstructions` prompt, `responses.create()` with `zodTextFormat(modelSchemaFor(factSchema))`, then `normalizeModelInterpretation` and `validateInterpretation`. The call sends `messages` and `factSchema` but **not** `caseSnapshot` or `agentProfile`, although the port receives both.
- `src/adapters/ai/validation.ts` and `src/application/cases/helpers.ts` verify types, reference IDs, message provenance and quoted text. They do not independently establish whether a semantic label (e.g. `TRUST`) is supported by that text.
- `src/application/cases/orchestrator.ts` merges extracted blockers into stored blockers by ID; the model has no authorized closure/retraction path. An incorrect open blocker can persist across reanalysis.
- `src/domain/policies/evaluate-policy.ts`: `OPT_OUT`, `URGENT`, `BINDING_CLAIM`, `TRUST`, and other open blockers can force `STOP_CONTACT` or `HANDOFF`. This behavior is intentional **when the signal is valid**.
- `src/domain/facts/reconcile.ts`: reconciles independent assertions by field, subject, period and unit. Customer basis-only corrections are not first-class edits; the adapter currently contains a narrowly worded special case.
- `src/adapters/ai/templates.ts`: most draft decisions have exactly one permitted template. Calling an LLM to choose a singleton template is unnecessary latency, but is not the primary F-01 reliability defect.
- `src/adapters/ai/openai.ts`: unknown SDK/provider exceptions are collapsed to generic `MODEL_UNAVAILABLE`. Recent 12 attempts returned that error without an observed provider response; subsequent sandbox diagnostic found `ENOTFOUND`, while a separate authenticated `GET /v1/models` returned 200 outside sandbox. Neither establishes successful inference.
- Baseline delivery report: replay browser routes Laura/Javier/Rosa and R10 verified by Codex, with 120 tests, lint, typecheck and build reported PASS. OpenAI semantic reliability is **not** verified.

Authoritative references: `docs/evaluation/F01_OPENAI_REMEDIATION.md`, `docs/evaluation/INDEPENDENT_EVALUATION.md`, `docs/evaluation/DELIVERY_READINESS.md`, `docs/implementation/ACCEPTANCE_MATRIX.md`, `docs/contracts/INTEGRATION_V0.md`, `AGENTS.md`.

## 3. Definition of success

An OpenAI interpretation cannot directly create an authoritative, persisted critical blocker merely by supplying an existing message ID. It must have valid provenance **and** pass an independent semantic verification boundary; disagreements and unavailable verification fail closed and remain visible, never silently vanish. Conversely, missed `URGENT`, `BINDING_CLAIM` and `OPT_OUT` signals must be checked independently, not just corroborated when the extractor happens to emit them.

Basis-only customer corrections (e.g. “Me equivoqué: eran brutos”) must refer to earlier evidence and yield usable ambiguity **without attributing the old numeric amount to a new message**. Existing facts and history must remain auditable. Approximate money stays approximate; zero is not unknown; joint income is not redistributed; unavailable audio is never transcribed.

The real OpenAI request/response boundary must be diagnosable by safe error category, with no credential disclosure. All replay and existing domain behavior must remain valid.

## 4. Workstream A — Transport visibility, before semantic experiments

**Primary owner:** `src/adapters/ai/openai.ts`; tests `tests/unit/ai/adapters.test.ts`.

Implement structured, privacy-safe internal diagnostic categories: DNS/network/TLS, 401/403 authentication, 429 rate or quota, 400/422 request/schema errors, 5xx provider, timeout/abort, incomplete/refusal, parse/schema, semantic validation. Where available, retain provider status/error code/request ID in a sanitized **server-only diagnostic**; do not echo raw messages, request bodies, API keys, headers, or complete model outputs to the UI. Public `ApplicationError` should remain stable unless a CCR is approved. Guard logs behind a local opt-in diagnostic flag and redact.

Inspect actual exception classes from the installed OpenAI SDK; do not infer status from string matches alone. Distinguish outbound connectivity checks (`/models`) from real `/responses` calls. Prove that cancellation is requested on timeout; do not claim server-side cancellation if not observed.

**Gate A:** unit tests distinguish representative provider failures and timeout; a *single* controlled real call in a network-capable environment demonstrates transport or precisely names the environment blocker. If connectivity remains absent, continue deterministic work, but mark live gate blocked.

## 5. Workstream B — Verified candidate blockers and lifecycle

**Primary owners:** `src/adapters/ai/**`, `src/application/cases/orchestrator.ts`, narrowly scoped tests. `src/domain/policies/evaluate-policy.ts` only if independently proven necessary.

The extractor's `blockers` are **candidate observations**, not authorized policy inputs. Add a focused, independent verification step using customer text evidence and explicit category definitions, separate from the original extract/classify operation. It should review the relevant **customer text messages**, including cases where the extractor returned no blocker: false negatives matter as much as false positives. Limit added inference steps and document cost/latency. A second focused model call is an option, not an assumption; justify using adversarial comparisons. No blind agreement=truth claim from two model calls. Never rely solely on brittle case-specific regexes, or the LLM's own unsupported explanation.

Important safety behavior:
- Confirmed `OPT_OUT` must result in stop contact; confirmed `URGENT` / `BINDING_CLAIM` in human review; confirmed genuine trust objection in human review.
- An unsupported `TRUST` (Laura asks whether her car installment “counts”) must **not** enter persistent open blockers or trigger R07.
- On verification disagreement, missing required evidence, or verifier outage: do **not** silently discard plausible safety concerns and proceed to `PROPOSE_CALL`. Prefer a recoverable analysis failure / explicit review-required safe state, preserving existing facts/messages and invalidating unsafe active proposals. If the existing `Blocker` schema cannot represent candidate uncertainty, do not label an unverified candidate as verified; propose a CCR if explicit persistence is needed.
- Design a deterministic, evidence-aware lifecycle across reanalyses: prior **model-derived** blockers must not remain permanently authoritative when new evidence disproves or resolves them. Do not automatically close protected objections merely because a later LLM omits them; require verified resolution evidence or explicit advisor confirmation under existing authority rules. Preserve audit history and do not change `replay` fixtures to hide defects.
- Preserve idempotency, revision CAS and no accidental proposal activation during failed verification.
- Avoid converting a model failure into a “safe” `HANDOFF` with an invented type/evidence. Review states must truthfully represent uncertainty.

**Gate B:** deterministic tests for no spurious TRUST in Laura, genuine TRUST in Javier (direct and indirect), URGENT and BINDING_CLAIM in Rosa **even if first extractor omitted them**, OPT_OUT, disagreement/timeout, unrelated citations, prior false blocker across reanalysis, genuine blocker not silently removed, no unsafe proposed call.

## 6. Workstream C — Context-aware facts and corrections

**Primary owners:** `src/adapters/ai/**`; `src/domain/facts/**` only if needed while preserving public contracts.

Use the existing `Interpreter.interpret({ caseSnapshot, messages, factSchema, agentProfile })` input. Provide a **bounded, relevant, server-side context projection** from `caseSnapshot.knowledge` and prior assertion provenance to the model, alongside the messages and `FactSchema`. Prior model assertions are context, **not proof**; original customer messages remain the authority. Exclude any sensitive fields not required for the task; use synthetic data for evaluation.

Handle new messages and corrections explicitly: identify which previous fact/field/subject/period a correction targets, what property changes (value, gross/net basis, timeframe), the old and new evidence, and what remains unknown. Determine whether the current shared `Interpretation` contract supports projecting these semantics safely; if not, propose CCR explaining exact schema change, compatibility and migration. An internal model-facing DTO is allowed and preferred before modifying public types.

For Laura's “Me equivoqué: eran brutos.”: retain the earlier €3,800 **approximately** and its original message; link the new correction evidence; keep the consolidated view **ambiguous/blocked** until clarified; do not claim the customer re-stated €3,800 in that correction. Explicit corrected amounts on a later message must not be discarded. Avoid treating any occurrence of “brutos” as a correction without a contextual target.

Improve source-span grounding where feasible. A copied full message is not semantic proof; an amount occurring in a message may still belong to a different field or person. Do not weaken validators or treat cosine/fuzzy similarity as evidence of truth. Preserve zero vs unknown, range bounds, gross/net unknown, approximation and participant/buying-unit attribution.

**Gate C:** isolated tests for basis-only correction, corrected amount, contradictory figures, two simultaneous amounts in one message, another subject's amount, approximate/exact distinction, natural Spanish paraphrases, and invalid evidence. Full original audit trail must remain available.

## 7. Workstream D — Simplify deterministic draft template selection (low priority)

Inspect `optionsFor()`. When precisely one key is allowed, select it in code, without making a provider request; preserve all existing permission checks and generated-draft metadata. When multiple keys become valid, decide separately whether an LLM choice adds value. Do not introduce free-text generation or loosen prohibited claims. Do not allow draft selection to mutate decision authority. This item is lower priority than Gates A–C.

## 8. Execution plan and boundaries

Suggested dependency chain: **A → B → C → D → independent evaluation**. Gates B and C may be implemented in separate worktrees once their shared DTO/contract expectations are clear; one integrator owns cross-cutting changes. Follow `docs/implementation/CODEX_PROTOCOL.md` and update the log with actual outcomes.

Existing code paths likely affected:
- `src/adapters/ai/openai.ts`, `validation.ts`, and optionally new `semantic-verification.ts` / `context-projection.ts` under `src/adapters/ai/`.
- `src/application/cases/orchestrator.ts` and its tests.
- `src/domain/facts/reconcile.ts` and tests only if necessary.
- `src/adapters/ai/templates.ts` for the singleton optimization.
- `tests/unit/ai/adapters.test.ts`, `tests/unit/application/orchestrator.test.ts`, `tests/unit/facts/reconcile.test.ts`, `tests/acceptance/**`, and a new `tests/evaluation/**` suite.

Do **not** redesign the UI, rewrite replay, add Agents SDK, create multiple autonomous agents, enable external tools, or modify business policy meaning. Shared contracts/config/fixtures follow CCR rules.

## 9. Evaluation after implementation

Use `docs/evaluation/F01_OPENAI_REMEDIATION.md` as history; append a **new dated** section, never rewrite earlier results. Produce `docs/evaluation/F01_TRUST_BOUNDARIES_EVALUATION.md` with deterministic and live test matrices, case inputs or fixture IDs, baseline and after outcomes, response categories, model name, usage when available, latency, evidence links and uncertainty.

Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; test an actual OpenAI `/responses` request outside restricted sandbox if required, with **at most 20** billable model requests for this iteration including verifier calls and retries. Model must match `OPENAI_MODEL`; key remains confidential. Repeat Laura, Javier, Rosa and selected unseen synthetic paraphrases, plus corrections and disagreements. Count separately **structural validity, evidence validity, semantic fact correctness, blocker precision/recall on covered scenarios, policy/action correctness, full-case result**. Do not infer statistical generalization from a few runs.

At least one independent reviewer/test pass should challenge the new implementation, not only rerun tests written by its author. Preserve initial inputs, expected behavior and outcomes when comparing. If network unavailable, publish **BLOCKED (transport)**, not “semantic fail” or “semantics verified”.

## 10. Acceptance and stopping conditions

1. No confirmed false `TRUST` for Laura; no unsafe advancement on verification uncertainty.
2. Javier's genuine trust objection triggers human review; unavailable audio remains untranscribed.
3. Rosa's urgent move, binding approval request, explicit zero savings and conditional rental semantics remain correct, including when initial candidate blockers are omitted.
4. Gross/net basis-only corrections preserve links to prior evidence, financial uncertainty, and policy blocking.
5. Candidate blockers are not permanently sticky because of a single model error; genuine protected blockers are not cleared by mere omission.
6. Provider errors are categorized safely; timeout cancellation is requested; no secret exposure.
7. Existing replay and AC-01–AC-15 behavior unchanged; tests plus lint/typecheck/build pass.
8. Real inference demonstrates repeated correctness on representative canonical and novel inputs **or** is explicitly marked unverified/blocked with evidence.
9. No shared contract, fixtures, real-world effects, repo permissions or default branch changed without approval.

Final verdict only **FIXED AND VERIFIED / PARTIALLY FIXED / NOT FIXED / BLOCKED BY ENVIRONMENT**. Distinguish defects, limits, and proposals. If continued model variation persists after bounded tests, report results and stop speculative prompt tweaking; recommend a separate controlled Agents SDK experiment for a later decision, not an automatic migration.
