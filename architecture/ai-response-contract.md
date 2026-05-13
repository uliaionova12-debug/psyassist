# AI response contract

Applies to **`POST /api/assistant`** (integration reflection + closing integration prompts) and client handling in `src/app/assistant/page.tsx`. Tension routes have separate contracts.

Golden cases / patterns (documentation only): **`golden-test-cases.md`**, **`clinical-pattern-library.md`**.

**Consistency with clinical flow:** This contract governs **payload delivery and fallback substitution** only at **`integration_reflection`** and **`closing_step*`** (see `clinical-flow-contract.md` §17–§18). It does **not** reorder, skip, or insert clinical steps §1–§16.

---

## AI success

**HTTP:** 200  

**JSON shape (conceptual):**

```json
{
  "ok": true,
  "text": "<non-empty trimmed synthesis>",
  "source": "ai"
}
```

**Client behavior:** Dispatch success with `stripClinicalMarkdown(text)` as reflection or closing integration body.

---

## AI fallback (service overload / empty model output)

**Gemini layer** may return `TEMPORARY_AI_OVERLOAD`, empty text, or other non-success codes.

**Route contract (`src/app/api/assistant/route.ts`):**

- On failure or empty output, respond with **`ok: true`**, **`source: "fallback"`**, **`text: ""`** (empty string).
- **Do not** send long generic static synthesis in `text` for integration — the client **must** substitute text.

**Rationale:** Session holds full narrative and answers; server must not imply loss of user material.

---

## Local case-aware fallback

**Module:** `src/lib/clinical/integration-local-fallback.ts`

**Function:** `buildLocalIntegrationFallbackFromSession(session: SupervisionSession): string`

**When:** Client receives `source === "fallback"`, or HTTP/parse failure, or non-success body — any path that would previously show a generic disclaimer.

**Must include (when present in session):**

- Case name (`intake.client_alias`)
- Clinical narrative (`fullNarrative` or `buildFullNarrative` fallback)
- Supervision request
- Bank Q/A formatted with `buildIntegrationAnswerLines` (includes tension stop question prefix, `[Уточнение]`, hypothesis `analysis`)
- Closing fragments when available (`closingStep1Answer`, `closingTherapistTakeaway`)

**Sanitization:** `stripForbiddenIntegrationFallbackPhrases` removes accidental forbidden substrings.

---

## Forbidden user-facing text (integration / closing fallback)

These phrases **must not** appear in user-visible integration or closing synthesis, including static fallbacks:

- «без модели»
- «без данных о случае»
- «общий вопрос»
- «ваши факты не восстанавливаются»
- Variants such as «Ответ сформирован без модели»

**Intent:** The user’s facts **are** in the client session; copy must not gaslight or imply absence of material.

---

## Telemetry logs (contractual prefixes)

**Memory / payload (prompt construction):**

- `[MEMORY] questionAnswers count`
- `[MEMORY] tensionAnswer present`
- `[MEMORY] hypothesis present`
- `[MEMORY] integration payload chars`
- `[MEMORY] integration context preview`

**Post-reflection fetch:**

- `[POST_REFLECTION] step entered`
- `[POST_REFLECTION] request started`
- `[POST_REFLECTION] request resolved`
- `[POST_REFLECTION] source=ai|fallback`
- `[POST_REFLECTION] failure reason` (when applicable)

**Local fallback:**

- `[LOCAL_FALLBACK] case_name present`
- `[LOCAL_FALLBACK] answers count`
- `[LOCAL_FALLBACK] tension answer present`
- `[LOCAL_FALLBACK] hypothesis present`
- `[LOCAL_FALLBACK] rendered`

---

## Change policy

Any change to JSON shape **or** fallback substitution rules requires:

1. Parser updates on client for all call sites.
2. Regression pass against golden narratives (see `golden-test-cases.md`).
3. Verification that forbidden phrases never ship.
