# AI Task Brief — plantilla para Codex (adaptada de Nomu Labs)

Inspirada en [02 — AI Task Brief](https://nomulabs.atlassian.net/wiki/x/AQBqFQ). Los 13 apartados originales se mantienen y se amplían con dependencias, ownership, contratos y gate. Esta plantilla describe **una tarea autorizable**, no sustituye `AGENTS.md` ni el DAG.

```markdown
# AI Task Brief — [ID · título]

## 1. Task ID / repository / branch / owner
- ID: LIB-XXX
- Repo: w0xter/libeen-sales-copilot
- Suggested worktree/branch: codex/lib-xxx
- Owner (role): ...
- Dependencies: LIB-... (must be integrated and gate-passed)
- Gate: G0/G1/G2/G3/G4

## 2. Objective
[Outcome in 2–4 sentences.]

## 3. User / business value
[Who benefits, why this step saves time or reduces risk.]

## 4. Context and sources
[Only the relevant docs, modules and expected behavior.]

## 5. Scope
[Allowed implementation work.]

## 6. Out of scope
[Explicit non-goals.]

## 7. Functional requirements
[Observable behaviors, including adverse cases.]

## 8. Technical requirements
[Interfaces, schemas, states, errors, tests.]

## 9. Constraints
[Safety/privacy, architecture, task isolation, performance only if relevant.]

## 10. Acceptance criteria
- [ ] User-visible/domain outcome A
- [ ] Error behavior B
- [ ] Tests added, actually executed and results reported

## 11. Validation expected
[Real commands that exist at execution time; manual scenarios and actual outcomes.]

## 12. Risks and sensitive areas
[Contracts and files most likely to regress.]

## 13. Instructions for the agent
[Read assigned brief, inspect code, plan briefly, implement authorized scope, use relevant Superpowers skills, verify, hand off.]

## 14. Dependencies and contract I/O
- Consumes: ...
- Provides: ...
- Edge cases: ...

## 15. File ownership and integration gate
- Writable paths: ...
- Read-only paths: ...
- Gate / reviewer / evidence: ...
```

Una tarea ya autorizada puede implementarse sin aprobaciones repetidas para cada edición en su scope. Ante cambios de contratos públicos, tareas nuevas, permisos, pushes, merges o impactos fuera de scope, detener esa parte y escalar. Nunca declarar pruebas como pasadas sin ejecutarlas.
