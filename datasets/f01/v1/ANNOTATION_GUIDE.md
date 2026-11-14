# F-01 dataset v1 · Independent annotation and adjudication guide

**This guide is normative for labeling, not proof the provisional labels are correct.** The separate `README.md` documents population, origins and split constraints.

## Review roles

- The case designer/generator provides a provisional structured expectation. It is not ground truth.
- An **independent reviewer** receives customer/advisor messages, task policy and FactSchema, but **not** model predictions, model prompts or previous failures for that case.
- For protected signals and all holdout cases, a second reviewer or adjudicator should resolve uncertainty before the holdout is opened for benchmarking. Record label version, reviewer, review date and adjudication decisions outside the runtime data or as clearly separated metadata.
- A disputed or underspecified label must not be forced into PASS/FAIL; mark an allowed alternatives set or exclude the contested criterion from that metric until resolved.

## Fact annotation decisions

1. **Value and scope**: identify amount, unit, period and the person or buying unit who actually stated it. No arbitrary split or sum of separately attributed incomes. Do not infer a gross/net basis from context alone.
2. **Known vs approximate**: “unos”, “sobre”, “rondamos”, “aproximadamente”, ranges and qualified uncertainty are not exact. “0”, “nada ahorrado” is an explicit zero, not unknown. No number may be attributed to a message that merely corrects the basis of an earlier amount.
3. **Unknown vs ambiguous vs conflicting**: a missing amount is unknown; a statement with unresolved reference can be ambiguous; independently incompatible assertions require documented reconciliation or conflict. Correcting “neto” to “bruto” must preserve the original quote and uncertainty, not silently discard evidence.
4. **Evidence**: mark `messageId` and the smallest exact source quote sufficient for the claim. A whole-message reference may be structurally valid but is not necessarily semantic support. Do not cite advisor prompts or unavailable audio as customer facts.
5. **Field coverage**: annotate all *required* fields necessary to assess the scenario. A field omitted from `requiredFacts` is **unlabeled**, not necessarily forbidden or absent; use `forbiddenFacts` only for a precise, verifiable negative assertion.
6. **Corrected amount**: determine whether the customer explicitly supersedes the earlier value or simply offers a contradictory value; annotate the historical relationship, not just the final number. Do not assume the current reconciler already has that functionality.

## Safety and blocker labeling

- `TRUST`: direct or indirect doubt about provider/company legitimacy or reliability. A question about whether a car repayment counts is **not** a trust objection.
- `COST`: substantive cost objection or price barrier, **not** a routine question asking for a price.
- `URGENT`: urgent housing crisis with genuine near-term vulnerability, **not** any near-term desired move.
- `BINDING_CLAIM`: request for written approval, guarantees or binding finance/property assurance; a brochure request does not qualify.
- `OPT_OUT`: a request not to receive further contact dominates sales progression.
- `PRODUCT`, `PRIVACY`, `TIME`, `FIT`: use only where clearly supported by their actual category semantics; never turn routine questions into objections.
- Multiple independently supported blockers may coexist. An extractor omission is a false negative; a verifier-introduced unsupported blocker is a false positive. Both are independently measurable.
- If the text plausibly supports more than one interpretation, annotate uncertainty or escalate to adjudication; do not invent a quotation to justify a label.

## Policy/actions and stages

- Record the version of `BusinessPolicy` and `FactSchema` used to derive action expectations. A `PROPOSE_CALL` is a proposal, not a confirmed call; human review is mandatory. `HANDOFF` is not financial rejection.
- When an input has materially missing data, prefer labeling the mandatory fact/invariant rather than inventing a unique customer action.
- Correction cases must run **incrementally**: process initial stage, update the same case, and then process the follow-up stage. Repeating a conversation from a clean snapshot tests model variance; updating the same snapshot tests history.
- Never make a protected policy permissive merely to increase benchmark score.

## Label QA checklist

- [ ] Role, timestamp and audio status are realistic and valid
- [ ] Conversation text and all source message references exist
- [ ] Values, units, periods and subject identity match literal sources
- [ ] Approximation, zero, unknown, conflict and correction handled explicitly
- [ ] Positive blockers have evidence, negative controls are not mislabeled
- [ ] Conditional rental is not exclusive rental intent
- [ ] Expected action is justified by actual policy and known facts, or explicitly unset
- [ ] No prompt-injection instruction was treated as authority
- [ ] Unresolved disagreement marked for adjudication, not hidden
- [ ] Reviewer and label revision recorded before scoring the held-out subset

## Release gate

The corpus may be used immediately for **data pipeline and structural regression tests**. Do not call its provisional labels a verified gold standard, cite an aggregate accuracy based on them, or claim representativeness of real Libeen customers. Only mark a reviewed, version-frozen release suitable for an inferential evaluation when labels and their quality checks have been signed off.

**Do not change canonical `src/fixtures/` during annotation or modeling.**
