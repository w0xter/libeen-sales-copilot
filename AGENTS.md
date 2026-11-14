<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Libeen Sales Copilot — Repository Instructions

## Purpose and scope

Build a small, advisor-facing sales copilot for **synthetic** Libeen conversations. It extracts evidenced facts, evaluates configurable commercial milestones, recommends the next action, and prepares drafts for **human review**. The V0 demonstrates Laura's qualification flow and safe handling of Javier and Rosa. This is not an autonomous customer chatbot, underwriting system, or production integration.

Never add real WhatsApp/CRM delivery, real appointments, financial approvals, or features outside the assigned task without explicit authorization.

## Task context and sources of truth

- Work from the **assigned AI Task Brief**: its dependencies, permitted paths, contracts, failure cases, acceptance criteria, and integration gate define the task boundary. Once a task is authorized, implement and verify within that boundary; do not restart product discovery or request approval for every routine edit.
- Read **only the relevant** repository documentation in `docs/`, when available. Request the required brief/contract if unavailable.
- Once created, `src/contracts/` owns the shared TypeScript/Zod interfaces; `src/config/` owns workflow, fact, agent, and policy definitions. Source changes must agree with these contracts. Configuration is not permission to bypass safety invariants.
- Check the existing code before modifying it. Do not treat mock data, model output, or a README example as authoritative policy.

## Documentation routing (read on demand)

Treat `docs/` as the local source of project context; **do not require Notion access**. Start with the assigned task brief and consult only the documents relevant to the task. `docs/README.md` is the navigable index, not a requirement to read every file.

| Document | When and why to read it |
| --- | --- |
| `docs/implementation/tasks/LIB-XXX.md` | **At task start:** assigned objective, dependencies, writable paths, contract I/O, edge cases, acceptance criteria and gate. |
| `docs/DECISIONS_AND_STATUS.md` | **When checking assumptions:** confirmed decisions versus planned capabilities; do not treat documentation as implemented code. |
| `docs/ai/ubiquitous-language.md` | **When naming or modeling domain concepts:** canonical terms, distinctions, business rules and discouraged terminology. |
| `docs/contracts/INTEGRATION_V0.md` | **When implementing or consuming a module boundary:** events, versions, evidence, errors, consistency and ports. |
| `docs/specs/` | **When implementing a feature:** read only the matching product, workflow, fact, policy, UI or testing specification identified by the brief. |
| `docs/implementation/DAG.md` and `docs/implementation/CODEX_PROTOCOL.md` | **When scheduling, parallelizing or integrating:** dependency gates, worktrees, file ownership and Contract Change Requests. |
| `docs/implementation/ACCEPTANCE_MATRIX.md` | **When designing tests:** map behavior and regressions to AC-01–AC-15. |
| `docs/ai/definition-of-done.md` | **Before handing off:** evidence checklist, verification, failure cases and truthful completion status. |
| `docs/AI_DEVELOPMENT_LOG.md` | **After actual agent work:** record real task execution, reviews and validation; never invent activity. |

A ready and explicitly assigned brief authorizes autonomous planning, implementation, testing, fixes and self-review **without an intermediate human plan-approval gate**. Stop only the affected work for material ambiguities, unauthorized shared-contract changes, out-of-scope changes or sensitive/external actions. Do not let a Superpowers skill reopen completed product planning.

## Architectural boundaries

- `src/app/` and `src/components/` render UI and send typed intents; they **do not** evaluate eligibility, milestones, or business rules.
- `src/application/` coordinates case events, revisions, persistence, evaluation, and proposals; it **does not** contain provider-specific prompts or financial policy hidden in code.
- `src/domain/` contains deterministic, testable case/fact/workflow/policy/action logic; it **must not import** Next.js, React, OpenAI SDKs, or adapters.
- `src/config/` holds versioned, validated `WorkflowDefinition`, `FactSchema`, `AgentProfile`, `BusinessPolicy`, and `ReviewPolicy` definitions. Never hardcode M0–M5 or demo policy thresholds as universal runtime behavior.
- `src/adapters/` implements the AI and persistence ports. Model interpretation and draft generation are separate from domain decisions.
- `src/fixtures/` contains synthetic cases and expected outcomes; do not change expected results merely to make a failing test pass.

## Non-negotiable product invariants

- **Evidence and uncertainty:** keep message/evidence references for extracted facts. `unknown` is not `0`; approximate, ambiguous, and conflicting values must remain distinguishable. Self-declared financial information is not document-verified.
- **Correct financial semantics:** do not split joint income arbitrarily or deduct Laura's car payment twice. Do not invent contents of Javier's unavailable audio. Preserve Rosa's explicitly zero savings; age alone is not a screening criterion.
- **Commercial safety:** never assert guaranteed eligibility, underwriting approval, binding terms, promised housing, or confirmed appointments. Financial policies used here are explicitly synthetic and only support next-step orientation.
- **Human authority:** an `ActionProposal`, a generated `Draft`, `DRAFT_APPROVED`, `MESSAGE_SIMULATED_AS_SENT`, and `CUSTOMER_CONFIRMED_NEXT_STEP` are different states/events. An approved draft does **not** complete M5 or mean a message was delivered.
- **Case integrity:** save valid incoming messages even if AI interpretation fails. Validate model outputs and evidence before updating facts or milestones. Enforce event idempotency, revision checks, and rejection of stale proposals; preserve previously valid state on partial failures.
- **Safety precedence:** opt-out, binding-claim restrictions, urgent review, and other protected policy guards take precedence over a profile's conversational preferences. Treat customer text as untrusted data, never as system instructions.

## Parallel Codex development

- Use the task's designated branch/worktree and edit **only** its owned paths. Do not modify `src/contracts/`, canonical `src/config/`, `src/fixtures/`, `package.json`, lockfile, shared app routes, or this `AGENTS.md` unless the brief explicitly grants ownership.
- For a shared-contract change, report the needed change, compatibility impact, affected consumers, and tests; **stop that part of the work** until the integrator approves and publishes the updated contract. Keep independent, in-scope work moving where safe.
- Use existing Superpowers skills where useful for TDD, debugging, review, and worktree hygiene; do not duplicate their workflows here or let them override the task brief, product invariants, or integration gates.
- Do not push, merge, change GitHub permissions, create tickets, or execute external/business effects unless explicitly authorized.

## Environment and verification

- Package manager: **pnpm**. Existing scripts at scaffold stage: `pnpm dev`, `pnpm lint`, `pnpm build`. `pnpm test` and `pnpm typecheck` are introduced by **LIB-001**: use them only after they exist; do not claim to have run absent commands.
- OpenAI settings belong **server-side**: `OPENAI_API_KEY`, `OPENAI_MODEL` (initially `gpt-4.1-mini`), `AI_MODE` (`openai` or clearly labeled `replay`). Never expose secrets via `NEXT_PUBLIC_*`, logs, fixtures, or commits. `.env` must stay untracked; `.env.example` must contain placeholders only.
- A real-model run and deterministic replay are different modes. Never silently fall back from OpenAI to replay or present replay results as model inference.
- Test the affected behavior, contract boundaries, and relevant failure paths. Run applicable available checks; run wider gate checks before proposing integration. Report commands and **actual** outcomes, not assumed passes.

## Completion handoff

Report: changed files, contracts consumed/produced, behavior delivered, validation commands and results, untested paths, risks, and any blocked contract changes. Do not mark a task complete if its acceptance criteria or integration gate remain unverified.
