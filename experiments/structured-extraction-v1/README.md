# EXP-EXTRACT-01 — Structured Gold v0.1

**Status:** proposed, requiring independent human review; **not frozen** and **not evaluated**.

Source: [approved 48-sentence Notion corpus](https://app.notion.com/p/41ba4247646881db88eff6c0ff6e93ba), [A/B/C protocol](https://app.notion.com/p/41ba424764688164ab42c161f163921e).

This directory contains **48 original synthetic messages**, **51 proposed atomic assertions** across the seven agreed business fields, exact quote provenance, negative field expectations, and contextual error checks. Original source sentences are preserved unchanged.

- `datasets/gold.v0.1.jsonl`: one annotated record per case. `input.messages[].role` distinguishes advisor statements from customer assertions; `evidence.exactQuote` must be literal.
- `datasets/gold.schema.json`: structural JSON Schema for the dataset envelope.
- `validate-gold.mjs`: dependency-free checks on counts, quote substrings, speaker attribution and absence consistency.

Run `node experiments/structured-extraction-v1/validate-gold.mjs` from repo root.

## Semantics

`interest` is **explicit interest or explicit rejection of rent-to-own**, with no requirement to say SmartHousing. A question or interest in housing generally is not the same.

`buyers` is only set when signatories or purchasers are stated; collective finances do not identify purchasers. A denial of loans (F3-23) is `debts.state:"none_declared"`, not missing and not a verified numeric zero. Partial commissions (F4-27) are **contextual** and out of the seven scored total-income fields. An inferred income basis is distinguished using `value.basisDerivation`. Total savings may include an explicitly immobilized amount; do not infer available savings. Relative dates stay relative without a timestamp. Unspecified debt periodicity stays `null`.

Each `gold.assertions[]` is an atomic expected statement; `gold.absentFields` is a complement of the seven fields when no scored assertion exists. `gold.contextChecks` records meaningful no-go inferences, not an extra output field. `annotation.oracleSummary` preserves the written Notion oracle for audit.

## Limits and next actions

All cases use `split:"unassigned"`. This corpus has already been visible while designing the experiment: an internal split cannot be honestly called a *blind* holdout. Create separately protected new cases if blind testing is required.

The annotations were drafted from approved semantic rules, but **the user has not independently reviewed all 48 atomic gold records**; do not mark them approved or use them as a production certification. Review every assertion, omitted field and quote, then freeze a version and execute the comparison. The legacy V0 baseline still restricts `interest` to SmartHousing, so score that dimension separately.

This commit intentionally does **not** change the shipped V0, run a model, publish metrics, or build the benchmark runner.
