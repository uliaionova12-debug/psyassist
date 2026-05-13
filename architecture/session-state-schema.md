# Session state schema (critical fields)

Source of truth: `SupervisionSession` and related types in `src/lib/clinical/session.ts`. This doc lists **regression-critical** fields for clinical memory and flow.

Golden clinical dataset (frozen IDs): **`golden-test-cases.md`**. Reusable clinical patterns: **`clinical-pattern-library.md`** (not a substitute for session fields).

---

## `step: SupervisionStep`

Finite state machine position. Drives which UI block renders and which effects run (e.g. reflection fetch, tension fetch).

**Canonical mapping:** Every step value is indexed in **`clinical-flow-contract.md` (Appendix — step index)**. This doc does **not** invent extra steps — it describes fields that exist while those steps run.

---

## Intake & narrative

| Field | Type | Role |
|-------|------|------|
| `intake` | `Partial<CaseIntakeState>` | `client_alias`, `therapy_duration` — case naming and session framing. |
| `narrativeContext` | string | First narrative layer (“социальный контекст”). |
| `narrativeClinical` | string | Second layer (“клиническое описание”). |
| `fullNarrative` | string | Combined canonical narrative for prompts and persistence. |
| `narrativeSufficient` | `boolean \| null` | Material gate outcome. |

---

## Detection & low-data (auxiliary)

| Field | Type | Role |
|-------|------|------|
| `pendingDetectedRequest` | string | Extracted request text during detection step. |
| `pendingDetectionConfidence` | number | Confidence score from detector. |
| `ionovaIndex` | number | Progress in structured low-data questionnaire. |
| `ionovaAnswers` | `string[]` | Answers for ionova path. |

---

## Supervision request & focus

| Field | Type | Role |
|-------|------|------|
| `supervisionRequest` | string | Explicit запрос в супервизию. |
| `focusLabel` | `string \| null` | Display label for focus. |
| `focusKey` | `QuestionBankKey \| null` | Internal key for question bank. |
| `sessionDepth` | `SessionDepth \| null` | `sdepth_3` / `sdepth_5` / `sdepth_ai` — determines question count. |

---

## Therapist profile (prompt context)

| Field | Type | Role |
|-------|------|------|
| `therapistSpecializations` | `string[]` | Selected specializations. |
| `therapistMethods` | `string[]` | Selected methods. |
| `therapistOtherSpecialization` | string | Free text when “other”. |
| `therapistOtherMethods` | string | Free text when “other”. |
| `supervisorStyle` | `string \| null` | RU label for supervisor stance — fed into prompts. |

---

## Question bank progress

| Field | Type | Role |
|-------|------|------|
| `questionModuleIdx` | number | Index into bank for current question. |
| `supervisionAnswers` | `SupervisionAnswer[]` | Completed Q/A rows. |
| `transitionLine` | `string \| null` | Optional UX line between questions. |

### `SupervisionAnswer`

| Field | Type | Role |
|-------|------|------|
| `module` | string | e.g. “Вопрос 1”. |
| `question` | string | Bank question text. |
| `answer` | string | User answer; may include `[Уточнение]` block after tension probe. |
| `analysis` | optional string | **Working hypothesis** after tension (`TENSION_HYPOTHESIS_SUCCESS`). |
| `tensionStopQuestion` | optional string | **Tension stop** clarifying question text persisted for integration (must survive clearing `tensionStopText`). |

---

## Tension (ephemeral + flags)

| Field | Type | Role |
|-------|------|------|
| `tensionPending` | `TensionPendingState \| null` | Active interrupt: module metadata, `originalAnswer`, optional **`probeAnswer`** (not a top-level session field). |
| `tensionStopText` | string | Current tension question shown during `tension_stop` / loading; cleared on completion. |
| `tensionFlowError` | string | Error message for tension API failures. |
| `tensionCompleted` | boolean | **After** successful hypothesis for this bank cycle — prevents duplicate tension stop on final submit. |

**Note:** There is **no** `tensionProbeAnswer` on `SupervisionSession`. Probe lives on `tensionPending.probeAnswer` until merged into `supervisionAnswers[].answer`.

---

## Integration reflection

| Field | Type | Role |
|-------|------|------|
| `reflectionStatus` | `"idle" \| "loading" \| "success" \| "error"` | Integration fetch lifecycle. |
| `reflectionText` | string | Final integration synthesis (AI or case-aware local fallback). |
| `reflectionError` | string | Error copy when integration fails fatally (non-fallback paths). |

---

## Closing (post-synthesis)

| Field | Type | Role |
|-------|------|------|
| `closingStep1Answer` | `string \| null` | Step 1 selection/text. |
| `closingTherapistTakeaway` | string | Step 2 — что забираю в практику. |
| `closingIntegrationStatus` | `ClosingIntegrationStatus` | Loading/success/error for step 3 AI block. |
| `closingIntegrationText` | string | Step 3 personal integration text. |
| `closingIntegrationError` | string | Step 3 error message if any. |
| `closingNextModuleChoice` | `string \| null` | Step 4 direction. |

---

## Persistence & identity

| Field | Type | Role |
|-------|------|------|
| `remoteCaseId` | `number \| null` | Supabase case id when saved. |

Other persistence-related refs live outside React state (queues, etc.) — see `assistant-reducer` / client persistence helpers.

---

## NAV tail / chat (secondary)

| Field | Role |
|-------|------|
| `navKey`, `navQuestions`, `navAnswers`, … | Advanced navigation module flow. |
| `chatAnalysisFocusKey`, `chatAnalysisResult`, … | Chat analysis feature. |

---

## Draft & misc

| `draftInput` | Current textarea content for steps that use a single draft buffer. |

---

## Frozen invariants

1. **Bank answers + `analysis` + `tensionStopQuestion`** must be reconstructible into integration prompts and local fallbacks.
2. **`tensionCompleted`** must prevent duplicate tension after one full tension cycle per bank.
3. **`clinicalSessionBlocksAuth(step)`** defines when auth/persistence banners are suppressed during active clinical work.
