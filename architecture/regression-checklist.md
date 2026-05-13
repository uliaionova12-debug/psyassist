# Regression checklist

Golden case IDs for deep clinical passes: **`architecture/golden-test-cases.md`** (`CASE-001`…`CASE-013`). Flow smoke still uses checklist rows below.

Run before merging clinical / session / assistant changes. Adjust automation coverage over time; this list is the **manual minimum**.

## Session & flow

- [ ] **Normal full flow (smoke)** — confidentiality → narrative → material gate pass → supervision request → therapist profile → focus → depth → Q1–Qn → tension once → hypothesis → integration → closing → `post_reflection` without unexpected redirects.
- [ ] **New case starts** — reset clears prior answers and tension flags as expected.
- [ ] **Material gate passes rich case** — long pasted narrative with ZWSP/BOM still passes sufficiency when clinically dense (`intake` narrative path).
- [ ] **Material gate rejects low-data path** — intentionally short/generic narrative fails gate (or low-data branch) per policy; no silent promotion to full flow without user choice (`low_data_*` contract).
- [ ] **Q1 works** — submit advances index, answer persisted.
- [ ] **Q2 works** — same.
- [ ] **Q3 works** — same (for 3-question depth).
- [ ] **Tension appears once** — after final bank answer, not after Q1/Q2 only.
- [ ] **Tension never loops** — no second identical tension stop in same bank (`tensionCompleted` guard).
- [ ] **Hypothesis appears** — after probe, `analysis` stored on answer row.

## Integration & memory

- [ ] **Integration reflection appears** — loading → success text visible.
- [ ] **Memory handoff** — prompt / local fallback includes `fullNarrative`, `supervisionRequest`, `supervisionAnswers` (with `[Уточнение]` / `analysis` / `tensionStopQuestion` when present); verify `[MEMORY]` logs in devtools on integration load.
- [ ] **AI overload path** — simulate `TEMPORARY_AI_OVERLOAD`; user sees **case-aware** local fallback (`integration-local-fallback.ts`), not empty disclaimer copy (`ai-response-contract.md`).
- [ ] **Final synthesis uses case material** — overload path shows **case-aware** text, not “без модели” / “без данных о случае”.
- [ ] **Tension stop question** reaches integration / local fallback payload (`tensionStopQuestion` path).

## Product gates

- [ ] **Auth/paywall does not appear before post_reflection** during active clinical session (per `clinicalSessionBlocksAuth` behavior — verify banner timing); closing flow completes without surprise hard paywall blocking mandatory closing steps.
- [ ] **Case saves** — narrative append / case id when persistence available.
- [ ] **My cases opens** — list loads for authenticated user.
- [ ] **Case can resume after reload** — within implemented persistence limits (document known gaps).

## Build

- [ ] **`npm run build`** — succeeds.
- [ ] **`npx tsc --noEmit`** — succeeds.

---

## Notes

- Pair checklist items with **golden-test-cases.md** personas where possible.
- If a item fails, file must include **root cause**, **files changed**, **untouched areas**, **build/tsc result** per change-rules.
