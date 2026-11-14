# F-02 — Multi-pass Interpreter Implementation Brief

**Repository:** `w0xter/libeen-sales-copilot`  
**Base branch:** `codex/f01-trust-boundaries`  
**Last verified SHA:** `35b29cf38efa4938fd25a2ac97aab48d69b300f4`  
**Suggested work branch:** `codex/f02-multipass-interpreter`

## Mission

Implement an internal Multi-pass Interpreter for Libeen Sales Copilot, prioritizing interpretation quality and evidence-grounded decisions over inference cost.

The architecture must execute three independent extraction passes, one blind safety scan and one contextual review, with optional focused adjudication and repair.

**Implementation order is mandatory:** pure contracts and grouping first, fake transport tests next, actual OpenAI integration last.

Do not implement the entire architecture in a single large change.

## Source of truth

Read:

- `AGENTS.md`
- `docs/implementation/CODEX_PROTOCOL.md`
- `docs/contracts/INTEGRATION_V0.md`
- `docs/ai/definition-of-done.md`
- Relevant existing AI adapter, fact reconciliation and contract files.

Materialize this assignment into `docs/implementation/tasks/F02_MULTIPASS_INTERPRETER.md` as the repository implementation brief.

Review the worktree, existing tests and current branch HEAD before editing. Preserve unrelated changes.

## Invariants

Preserve the public `Interpreter` contract, CaseOrchestrator, FactSchema, BusinessPolicy, WorkflowDefinition, historical FactReconciler, replay mode and human authority.

Do not modify shared contracts, business policy, canonical fixtures, domain logic, public routes, UI, dependencies or the evaluation oracle without explicit authorization.

No real customer messages, external messaging, financial approvals, calendar bookings, push or merge.

If a shared-contract change is unavoidable, produce a Contract Change Request and stop only that dependent work.

## MP-01 — Internal Zod contracts and evidence validation

**Writable paths:**

`src/adapters/ai/multipass/contracts.ts`  
`src/adapters/ai/multipass/normalization.ts`  
`src/adapters/ai/multipass/evidence.ts`  
`tests/unit/ai/multipass-contracts.test.ts`  
`tests/unit/ai/multipass-evidence.test.ts`

Implement internal validated representations of:

- RawClaim
- ClaimCandidate
- OccurrenceRef
- ClaimGroup
- Dispute
- Resolution
- AdjudicationResponse
- ReconciliationResult

Use existing FactValue, SubjectRef, EvidenceRef and Interpretation schemas wherever applicable.

Keep provider-facing wire schemas separate from internal Zod schemas.

Validate `statementSpan` and `focusSpan` using start-inclusive/end-exclusive JavaScript UTF-16 offsets, exact original text, customer role and valid message references.

Normalize only safe metadata representations, including string variants of JSON `null`.

**Gate MP-G1:** schemas compile, invalid evidence is rejected, genuine zero and unknown remain distinct, and focused deterministic tests pass. No model calls.

## MP-02 — Atomic claim grouping

**Writable paths:**

`src/adapters/ai/multipass/alignment.ts`  
`src/adapters/ai/multipass/grouping.ts`  
`tests/unit/ai/multipass-grouping.test.ts`

Implement deterministic grouping by source message, field and atomic textual occurrence.

Do not use scope, amount, income basis or model vote count as the primary grouping key. Those may be the attributes in disagreement.

Support multiple claims for the same field within a single message.

Required scenarios:

- "Yo gano 2.400 € y mi pareja 1.800 €" produces two groups.
- "Yo gano 2.000 € y ella 2.000 €" also produces two groups.
- Three versions of Javier's same income declaration form one group even when scope differs.
- A quote covering two salaries without an unambiguous focus cannot merge them.
- Repeated identical content in different messages remains distinct.
- A basis-only correction forms its own occurrence linked to the previous assertion, not a duplicate monetary statement.

Each extractor may contribute at most one compatible candidate to an atomic occurrence unless a genuine separate claim is demonstrated.

**Gate MP-G2:** grouping passes all synthetic tests without provider access or persisted duplicated facts.

## MP-03 — Reconciliation and safety adjudication

**Writable paths:**

`src/adapters/ai/multipass/reconcile.ts`  
`src/adapters/ai/multipass/safety.ts`  
`src/adapters/ai/multipass/adjudication.ts`  
`tests/unit/ai/multipass-reconcile.test.ts`  
`tests/unit/ai/multipass-safety.test.ts`  
`tests/unit/ai/multipass-adjudication.test.ts`

Implement per-field reconciliation with separate treatment of ordinary, material and protected discrepancies.

Acceptance rules:

- Ordinary evidence-backed candidates may be accepted if noncontradictory.
- Material facts require independent corroboration plus contextual validation or focused adjudication.
- Majority voting alone never proves a fact.
- Missing information does not mean zero or false.
- Conflicting subject, value, basis, period or correction semantics require explicit resolution.
- Protected findings must be examined even if only one reviewer detects them.
- Confirmed protected findings remain active.
- Contextually disproven findings may be dismissed with a recorded justification.
- Unresolved protected discrepancies require safe human review.
- Previously persisted protected blockers are not silently closed.

The adjudicator may select only an existing candidate belonging to the relevant dispute, or return `unresolved`.

Validate the adjudicator's candidate ID, evidence and consistency deterministically.

**Gate MP-G3:** tests cover Javier, Laura, Rosa, false and genuine OPT_OUT, true TRUST versus pure COST, binding requests, urgency, financial corrections, abstention and invalid adjudication.

## MP-04 — Fake Multi-pass pipeline

**Writable paths:**

`src/adapters/ai/multipass/pipeline.ts`  
`src/adapters/ai/multipass/scheduler.ts`  
`src/adapters/ai/multipass/trace.ts`  
`tests/unit/ai/multipass-pipeline.test.ts`

Build the full execution pipeline using injected deterministic model transports only.

Execution:

1. Freeze the same case snapshot and configuration for all passes.
2. Run extractors E1/E2/E3 and safety scan S1 independently and concurrently.
3. Validate each output.
4. Run contextual reviewer S2 using the candidates.
5. Reconcile deterministically.
6. Optionally execute one focused adjudication and one repair.
7. Validate the final result and produce one Interpretation.

Normal budget: five model requests.

Maximum total budget: seven requests, including repairs and retry attempts.

Enforce timeouts, cancellation and a total analysis budget. Do not hide SDK retries outside the budget.

Record run ID, attempt IDs, durations, errors, prompt versions, disagreement and resolution reasons without duplicating complete conversations or exposing secrets.

A failed protected review must not be treated as evidence that no risk exists.

**Gate MP-G4:** prove concurrency, correct sequencing, five/seven request budgets, cancellation, fake recovery, deterministic output and safe failure.

## MP-05 — OpenAI integration behind an explicit option

**Integration-owner paths:**

`src/adapters/ai/index.ts`  
`src/adapters/ai/openai.ts`  
Relevant multipass modules  
`tests/unit/ai/adapters.test.ts`

Introduce a conservative internal strategy switch such as:

`AI_INTERPRETER_STRATEGY=single|multipass`

Default remains `single`.

Do not change `AI_MODE=replay`.

Preserve the existing single-pass engine and DraftGenerator.

Connect the validated wire schemas for the extractor, safety scan, contextual review and adjudicator to the existing model transport.

Avoid a model or SDK migration unless separately authorized.

An unresolved protected disagreement must follow the current safe failure path, not produce an apparently successful interpretation without protection. A richer public `human_review_required` state requires a separate approved CCR.

**Gate MP-G5:** adapter factory tests, transport simulation tests, replay compatibility and the complete deterministic validation suite pass.

## MP-06 — Evaluation plan

Do not execute paid OpenAI calls without explicit approval.

First prepare a dry-run plan to compare the existing engine and Multi-pass with the same model, cases and evaluation criteria.

Account for the higher number of requests; the current runner budget of 20 requests may require smaller batches or a separately authorized evaluator adjustment.

Use the existing 24 scenarios as regression tests and additional synthetic scenarios with independent human-reviewed expectations.

Measure:

- Correct financial values, scopes and gross/net basis.
- Evidence grounding and false fact creation.
- Protected-signal recall.
- False OPT_OUT, STOP_CONTACT, TRUST and HANDOFF.
- Complete versus failed analyses.
- Model requests, latency and inference cost.
- Cases requiring human review.

Do not change expected fixture results to obtain a higher pass rate or claim 99% reliability without independent evidence.

**Gate MP-G6:** actual comparison results are documented after authorization and execution.

## Required verification

At each gate, run focused tests and verify the diff.

Before reporting MP-G5 complete, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dataset:validate
pnpm eval:recorded
git diff --check
```

Report observed PASS, FAIL or NOT RUN results.

## Delivery and handoff

After each gate, report:

- Task and gate ID.
- Files created or modified.
- Contracts consumed and produced.
- Acceptance scenarios executed.
- Actual test commands and results.
- Remaining errors, uncertainty and blockers.
- Any CCR required.
- Whether the next phase is unblocked.

Update `docs/AI_DEVELOPMENT_LOG.md` only with work actually completed.

No push, merge or PR without explicit authorization.

**Implementation priority: correctness of grouping and reconciliation with simulated responses before any live-model execution.**