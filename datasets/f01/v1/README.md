# F-01 synthetic evaluation corpus v1.0.0

**Status: version 1.0.1 content-frozen for provisional engineering evaluations; NOT independently gold-labeled, no independent human sign-off. No new live inference runs were made as part of freezing.**

This is an evaluation dataset distinct from the three canonical exercise fixtures in `src/fixtures/`. It targets the semantic boundary of the OpenAI interpreter, its independent blocker verifier, reconciliation, and the deterministic policy engine. Synthetic Spanish customer messages only; no real customers, secrets, or external effects.

## Composition

| Split | Conversations | Template clusters | Role |
| --- | ---: | ---: | --- |
| `development.jsonl` | 176 | 44 | Investigate and fix discovered behavior |
| `validation.jsonl` | 88 | 22 | Compare revisions, never tune on individual results |
| `holdout.jsonl` | 88 | 22 | One controlled assessment after implementation/design freeze |
| **Total** | **352** | **88** | **22 behavior categories, four controlled profiles per template** |

Template clusters do **not** cross splits. Each of 22 categories has two distinct development phrasing templates, one validation template and one holdout template; each template is realized with four synthetic profiles (amounts, geography, timing). All 352 full transcripts are textually unique, but they are **not 352 independent linguistic designs**: the effective source diversity is 88 templates. Do not use `352` as the statistical denominator for natural-language generalization without accounting for clustered samples.

### Behavior categories

Financial facts: `approx_finance`, `exact_finance`, `gross_income`, `variable_income`, `zero_savings`, `multiple_subjects`.

Protected and sensitive signals: `trust_real`, `trust_false_friend`, `cost_real`, `price_question`, `urgent_real`, `time_nonurgent`, `binding_request`, `documentation_request`, `optout`.

Product/workflow, corrections and adversarial: `conditional_rental`, `rental_only`, `basis_correction`, `amount_correction`, `audio_unavailable`, `prompt_injection`, `ready_call`.

**Main contrasts:** direct vs false-positive trust, actual price objection vs routine price question, immediate housing emergency vs nonurgent planning, binding approval demand vs informational documentation request, conditional vs exclusive rental, net vs gross, exact vs approximate, explicit zero vs unknown, single vs joint money, corrections and unavailable audio.

## Data contract (one JSON object per line)

- `id`, `datasetVersion`, `split`, `clusterId`, `category`, `variation`, `source`.
- `labelProvenance: "template_derived"`, `reviewStatus: "internally_audited_pending_external_review"`. These are designed expectations, **not** proven annotations from independent reviewers.
- `messages`: arrays compatible with the existing `Message` shape (`messageId`, `conversationId`, `role`, `occurredAt`, `content`, `simulated`). No real-world data.
- `stages`: ordered markers for full initial input and, when applicable, sequential corrections; evaluate stages **incrementally** rather than treating a correction as an independent conversation.
- `gold.requiredFacts`: `fieldId`, `scope`, `value`, semantic `status`, `sourceMessageId`; optional income basis, unit, period, multi-evidence, subject label.
- `gold.forbiddenFacts`: negative expectations with explanatory reason and optional `disallowedValue` or `disallowedIncomeBasis`. They are **conditional**, not blanket field bans when attributes are supplied.
- `gold.requiredBlockers` and `gold.forbiddenBlockers`: expected categories and evidence message IDs. Blocker absence is meaningful, especially in negative controls.
- `gold.transitions`: correction-specific references and change semantics. A latest active corrected amount need not imply the existing V0's reconciler can already handle it.
- `gold.expectedAction` when semantically/policy-grounded; `null` when a single action cannot safely be inferred from the input alone.
- `gold.invariants` and optional `forbiddenEvidenceMessageIds` / `expectedMilestones`.

**Important annotation caveat:** `sourceMessageId` is not a verified minimal textual span. Before treating this dataset as gold for fine-grained evidence grounding, reviewers should add and verify exact source spans, subject identity and the full set of allowed/forbidden interpretations where needed. Some messages intentionally omit facts; absence of a field in `requiredFacts` does **not** imply that extracting it is incorrect.

## Required independent review before verified benchmarking

1. The internal annotation audit and content freeze are recorded in `ANNOTATION_AUDIT_2026-11-14.md` and `FREEZE_MANIFEST.json`. Validate the files and hashes with `pnpm dataset:validate`.
2. The 88 linguistic clusters were examined during this same-assistant internal audit, but that is **not independent**. Have a separate reviewer check all 88 clusters, their four variants and every holdout annotation before granting gold-standard status. Hash locking is already done; after any adjudicated correction, create a new version and manifest.
3. Correct ambiguous or mistaken labels *before* model evaluation. Version changes; never secretly rewrite the same dataset after viewing model failures. If a label is contested, mark `ambiguous` / exclude from that metric with a documented reason; do not force a single invented truth.
4. Do not view or use holdout contents during model/prompt tuning. Technical visibility in the same private repo cannot enforce blindness; this is an operational rule and should be enforced by the evaluator's selection controls and review discipline.
5. Audit whether synthetic wording is naturalistic and representative. This templated corpus is excellent for controlled regressions but cannot, by itself, establish real-world production reliability. Consider a separately sourced, privacy-safe, human-reviewed naturalistic corpus before production claims.

## Evaluation protocol after review

Use development for debugging, validation for decisions and one sealed holdout pass for the final report. Sample and report by **category** and **template cluster**, not only across all 352 records. Track separate denominators for field-level extraction, status/precision, evidence, subject attribution, false/true blockers, policy actions, transport and safe failure.

The original six-scenario `pnpm eval:openai` mode still works. To evaluate the new frozen corpus, opt in explicitly:

```bash
pnpm dataset:validate
pnpm eval:openai --dataset f01 --split development --category trust_real --sample 4 --seed 42 --dry-run
pnpm eval:openai --dataset f01 --split development --category trust_real --sample 4 --seed 42
pnpm eval:openai --dataset f01 --split validation --sample 8 --mode end-to-end --seed 10
# Holdout requires an explicit unlock after implementation/design freeze:
pnpm eval:openai --dataset f01 --split holdout --sample 5 --unlock-holdout
```

The runner checks frozen content hashes before inference, samples deterministically across template clusters, counts extraction and verification calls, and writes local reports to `.eval-results/`. It **scores only expressly labeled properties**, reports manual invariants separately, and identifies the missing independent sign-off. It does not certify general semantic reliability. See `docs/evaluation/OPENAI_BACKEND_RUNNER.md` and the annotation audit report.

`max-requests=20` remains a **per-run** safety cap, not a total dataset estimate: 352 complete interpretations could require up to 704 provider requests at two calls each, before repetitions, provider failures or model changes. Plan a staged, cost-capped evaluation and do not silently launch the full corpus. Never interpret a connection failure as a semantic failure.

## Verification and source boundaries

The dataset was created on `codex/f01-trust-boundaries`; production code, canonical fixtures and the default branch were not modified to create it. The content-hashed 1.0.1 snapshot reflects an internal template-level audit, but the author-derived labels are still provisional without independent human sign-off. It does not report new accuracy or claim that the dataset passed independent semantic review.

Related reference: `docs/evaluation/F01_SEMANTIC_EVALUATION_PLAN.md` (original case oracle), `docs/evaluation/OPENAI_BACKEND_RUNNER.md` (existing six-scenario CLI), and `docs/evaluation/F01_TRUST_BOUNDARIES_EVALUATION.md` (earlier live results).
