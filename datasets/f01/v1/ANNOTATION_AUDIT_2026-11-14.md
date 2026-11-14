# F-01 · Internal annotation audit and provisional freeze

**Date:** 2026-11-14  
**Dataset release:** `1.0.1` (content-hash locked)  
**Status:** Frozen *provisional labels*; **independent human review and adjudication outstanding**. No new model runs, no semantic accuracy claims.

## Scope of review

The authoring assistant examined the text and label summaries of all **88 linguistic template clusters** across the 22 category families and four numeric/geographic variations per cluster. Programmatic checks separately examined all 352 JSONL records for unique IDs, uniqueness of transcripts, category balance, case-message references and no cluster leakage. The same assistant session designed the dataset; **this is not an independent annotation review**. This freeze prevents silent editing and supports repeatable engineering experiments but does not create gold standard labels.

Source: `development.jsonl` (176 records), `validation.jsonl` (88), `holdout.jsonl` (88). All are synthetic. Changes from provisional `1.0.0` to frozen `1.0.1` are recorded below.

## Changes / adjudications in this release

| Finding | Correction in v1.0.1 | Coverage |
| --- | --- | --- |
| In some templates two earners or a couple did not imply *two buyers* | Explicitly state joint buying intentions before requiring `buyer_count=2` | `approx_finance`, `multiple_subjects` |
| The financial-debt question did not always identify a joint debt or monthly installment | Clarify *our car* and *monthly installment* in applicable text variants | `trust_false_friend` |
| “The savings account is empty” did not unambiguously attribute savings to the buying unit | Make the shared/buying-unit reference explicit | `zero_savings` |
| Monthly `facturo` amount was mislabeled as verified personal income | Remove its mandatory `declared_monthly_income` fact; prohibit asserting *net personal income* based on invoicing; retain the uncertainty for independent adjudication | `variable_income` template P2 |
| Several informational conversations were assigned a unique sales action with incomplete commercial context | Set `expectedAction: null`; grade explicitly labeled facts/blockers instead | `price_question`, `documentation_request`, `conditional_rental`, `rental_only`, `time_nonurgent` |
| Nonurgent planning was insufficiently negative-labeled | Explicitly forbid unsupported `TIME` objection | `time_nonurgent` |
| Ready-to-propose cases did not assert a known moving month in gold labels | Add explicit horizon and specific month-year annotations | `ready_call` |
| Annotation review and frozen status were not recorded per case | Add provenance and audit metadata to all 352 records, preserve `labelProvenance: template_derived` | All categories |

**Still ambiguous / manual review needed:** subject identity across participant facts (currently `subjectLabel` is annotation-side, not an authoritative participant ID), “gross turnover vs salary”, model normalization of moving dates and exact text spans, whether all allowable actions should be represented as sets instead of a single action, and financial corrections involving implied references. Some manual invariants do not have executable checks. Do not pretend the additional JSONL variants are independent naturalistic examples.

## Freeze controls

`FREEZE_MANIFEST.json` pins the Git content blob SHA-1 for each split, datasetVersion `1.0.1`, counts and an explicit `independentHumanSignOff: false` status. `pnpm dataset:validate` rejects any mutation of the frozen JSONL bytes and validates source/label integrity. A post-freeze annotation correction requires a new version, new hashes and an auditable adjudication record — **not** editing these files in place without versioning.

The holdout split was read by the authoring assistant during this annotation audit, so it is **not a blinded human set**. It has not been evaluated against new model outputs and should not be used to tune prompts or validators. `pnpm eval:openai --dataset f01 --split holdout` requires explicit `--unlock-holdout`. For reliable final performance claims, obtain a separately authored/annotated genuinely blind corpus.

## Internal checks and evidence boundaries

- 352 records: 176 development + 88 validation + 88 holdout.
- 88 nonoverlapping source template clusters and 22 equally represented categories.
- 352 distinct full transcripts and valid source IDs.
- The user previously ran `pnpm dataset:validate` successfully against **v1.0.0** before this audit. The code and locked dataset have changed to v1.0.1; that earlier execution **does not validate this release**. A fresh local run is required.
- JavaScript syntax of dataset CLI and validator was checked by source parsing during this iteration; no provider calls, full TypeScript compilation or local integrated execution were performed by this reviewer.
- Data is synthetic and labels remain internally audited, not externally verified.

## Next gates

1. Run `pnpm dataset:validate`, lint, typecheck, tests, and `pnpm eval:openai --dataset f01 --split development --sample 4 --dry-run` locally.
2. Have an independent reviewer audit/adjudicate sensitive labels, evidence and holdout before marking them gold. Lock a reviewed successor release with its own manifest and review provenance.
3. Run bounded development and validation experiments by category. Report per-category and per-template-cluster denominators, evidence validity, errors and fallback outcomes; do not use aggregate PASS alone as a reliability claim.
4. Only after design freeze, perform one explicitly unlocked held-out evaluation; do not tune against its results.

**Repo code and canonical fixtures are unchanged by this dataset-only review; source implementation changes were limited to the evaluation runner and tooling.**
