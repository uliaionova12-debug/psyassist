# Change rules (PsyAssist architecture freeze)

These rules reduce regressions while product code remains **frozen** unless explicitly approved.

---

## One bug = one fix = one regression test

- Each defect maps to **one** coherent fix (avoid drive-by refactors).
- Where automated tests exist or are added, one logical assertion target per bug.
- Document **root cause** in PR/commit message.

---

## Separation of concerns

| Change type | Rule |
|-------------|------|
| **Prompts** (`reflection.ts`, tension prompts, etc.) | Do **not** combine with state machine edits in the same PR unless unavoidable — isolate for bisect. |
| **UI** | Do **not** mix with clinical reducer logic in the same change set when possible — separate PRs. |
| **Auth / billing / persistence** | Do **not** combine with clinical flow transitions in one PR. |

---

## AI response shape

- Any change to **`/api/assistant`** JSON shape or `source` / `text` semantics requires **client parser review** for every fetch site (`integration_reflection`, `closing_step3`).
- Update **`architecture/ai-response-contract.md`** when contract changes.

---

## Fallback behavior

- Changes to **`buildLocalIntegrationFallbackFromSession`** or substitution logic require **golden persona** spot-check (`golden-test-cases.md`) and forbidden-phrase scan.

---

## Required reporting (every code change)

1. **Root cause** — why the bug happened.
2. **Files changed** — exact paths.
3. **Untouched areas** — what was deliberately not modified.
4. **Build / typecheck** — `npm run build` and `npx tsc --noEmit` results.

---

## Documentation

- Architecture docs in `/architecture` are **living** but updates should accompany behavioral contract changes.
- Golden dataset identifiers: **`golden-test-cases.md`** (`CASE-001`…`CASE-013`); reusable tags: **`clinical-pattern-library.md`**.

---

## Contract coupling (mandatory)

| Rule | Requirement |
|------|----------------|
| **Flow / state machine** | Any change to transitions or step sequence must update **`architecture/clinical-flow-contract.md`** and **`architecture/session-state-schema.md`** in the same change set (or immediate follow-up PR). |
| **Prompts** | Any change to clinical prompt strings must run **`architecture/regression-checklist.md`** (at minimum integration + material gate + tension rows) before merge. |
| **Auth / paywall / billing** | Any change touching auth, billing, or paywall surfaces must include a **clinical closing check**: mandatory closing steps §17–§19 remain reachable; no new hard block before `post_reflection` unless contract explicitly revised. |

---

## Exceptions

- Hotfix production incidents may bundle narrowly scoped changes; post-incident follow-up must split debts per rules above.
