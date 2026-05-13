# Clinical flow contract (frozen)

This document describes the **intended end-to-end supervision journey** in PsyAssist. Step **names in bold** are product-language labels; **code step** is `SupervisionSession.step` in `src/lib/clinical/session.ts` where applicable.

Branching (low-data path, detection path, NAV tail, chat analysis) exists but the **core golden path** below is regression-critical.

---

## 1. Intake — confidentiality

| | |
|--|--|
| **Code step(s)** | `confidentiality` → optionally `confidentiality_more` |
| **Entry** | Session start / reset. |
| **Exit** | User accepts confidentiality → `case_reminder`. |
| **Allowed next** | `case_reminder`. |
| **Forbidden** | Jumping to narrative or question bank without `CASE_REMINDER_CONTINUE`. |

---

## 2. Case name

| | |
|--|--|
| **Code step** | `case_name` |
| **Entry** | From `case_reminder` after billing gate (free intro, etc.). |
| **Exit** | Valid alias submitted → `therapy_duration`. |
| **Allowed next** | `therapy_duration` only. |
| **Forbidden** | `question_flow` without duration + narrative. |

---

## 3. Session count (“сколько встреч”)

| | |
|--|--|
| **Code step** | `therapy_duration` |
| **Product label** | session_count |
| **Entry** | Valid case name. |
| **Exit** | Duration string stored in `intake.therapy_duration` → `narrative_context`. |
| **Allowed next** | `narrative_context`. |
| **Forbidden** | Skipping to clinical description without this field when intake requires it. |

---

## 4. Social / situational context

| | |
|--|--|
| **Code step** | `narrative_context` |
| **Product label** | social_context |
| **Entry** | From `therapy_duration`. |
| **Exit** | Context submitted → `narrative_clinical`. |
| **Allowed next** | `narrative_clinical`. |
| **Forbidden** | Direct entry to `question_flow`. |

---

## 5. Clinical description

| | |
|--|--|
| **Code step** | `narrative_clinical` |
| **Product label** | clinical_description |
| **Entry** | From `narrative_context`. |
| **Exit** | Clinical layer submitted; `fullNarrative` built; **material gate** (`is_narrative_sufficient`) decides path. |
| **Allowed next** | If sufficient: request detection / `supervision_request` path. If not: `low_data_choice` → optional `low_data_add_material` / `low_data_ionova` / `LOW_DATA_CONTINUE_ANYWAY`. |
| **Forbidden** | Marking sufficient without passing gate rules (see `src/lib/clinical/intake.ts`). |

---

## 6. Material gate

| | |
|--|--|
| **Location** | Evaluated on narrative submit (not a single `step` value). |
| **Entry** | User submits clinical description. |
| **Exit** | `narrativeSufficient === true` → continue toward supervision request; `false` → low-data branch. |
| **Allowed next** | Sufficient: toward `detecting_supervision_request` / confirm / `supervision_request`. Insufficient: low-data UX. |
| **Forbidden** | Treating pasted rich text as insufficient due to normalization bugs (regression: ZWSP/BOM word count). |

---

## 7. Supervision request

| | |
|--|--|
| **Code step(s)** | `detecting_supervision_request` → `supervision_request_confirm` or `supervision_request` |
| **Entry** | Narrative sufficient and flow continues. |
| **Exit** | `supervisionRequest` stored; advance to therapist profile. |
| **Allowed next** | `therapist_specialization`. |
| **Forbidden** | Empty request advancing to focus selection. |

---

## 8. Therapist specialization

| | |
|--|--|
| **Code step** | `therapist_specialization` |
| **Exit** | Selection submitted → `therapist_methods`. |
| **Allowed next** | `therapist_methods`. |
| **Forbidden** | Skipping to `focus_selection` without methods step completing per product rules. |

---

## 9. Therapist methods

| | |
|--|--|
| **Code step** | `therapist_methods` |
| **Exit** | Methods submitted → `supervisor_style_selection`. |
| **Allowed next** | `supervisor_style_selection`. |

---

## 10. Supervisor style

| | |
|--|--|
| **Code step** | `supervisor_style_selection` |
| **Exit** | Label chosen → `focus_selection`. |
| **Allowed next** | `focus_selection` or `focus_help_notice` → back to `focus_selection`. |

---

## 11. Focus

| | |
|--|--|
| **Code step** | `focus_selection` |
| **Exit** | `focusLabel` + resolved `focusKey` → `depth_selection`. |
| **Allowed next** | `depth_selection`. |

---

## 12. Depth

| | |
|--|--|
| **Code step** | `depth_selection` |
| **Exit** | Выбрана `sessionDepth`; сброшены `questionModuleIdx`, банк ответов, флаги напряжения; **`tensionCompleted` сбрасывается в `false` для нового банка** → `question_flow`. |
| **Allowed next** | `question_flow`. |
| **Forbidden** | Запуск interrupt-напряжения **до** первого сохранённого ответа в банке (см. §13–§16). |

---

## 13. Банк вопросов (Q1 → Q2 → …)

| | |
|--|--|
| **Code step** | `question_flow` |
| **Вход** | После `depth_selection`. Индекс `questionModuleIdx` указывает на текущий вопрос банка (число вопросов от глубины × банка). |
| **Выход по ответу (без interrupt)** | `SUBMIT_QUESTION_ANSWER`: строка в `supervisionAnswers`, индекс +1; после **последнего** вопроса — прямой переход в `integration_reflection` с загрузкой рефлексии (**без** обязательного `tension_*`). |
| **Interrupt напряжения (опционально)** | После **хотя бы одного** сохранённого ответа в банке, если `tensionCompleted === false` и в тексте ответа сработали маркеры напряжения, вместо `SUBMIT_QUESTION_ANSWER` может уйти **`TENSION_INTERRUPT_START`**: текущий ответ **сначала банкуется**, затем шаги §14–§16. |
| **Разрешено дальше** | После успешной гипотезы — снова `question_flow` на следующий вопрос **или** `integration_reflection`, если вопросы банка исчерпаны. |
| **Запрещено** | Interrupt **на первом** ответе банка (пока `supervisionAnswers.length === 0`). Повторный полный цикл напряжения в том же банке при `tensionCompleted === true`. Пропуск оставшихся вопросов банка без ответа (кроме отката по ошибке/cancel по правилам редьюсера). **Регрессия «после interrupt снова тот же вопрос банка»** (например, застревание на Q2) — запрещена. **Повторный цикл напряжения подряд** (loop) — запрещён. |

---

## 14. Остановка по напряжению (одноразово на банк)

| | |
|--|--|
| **Code steps** | `tension_stop_loading` → `tension_stop` → (уточняющий ответ) → `tension_hypothesis_loading` → успех/ошибка гипотезы |
| **Вход** | Из `question_flow` при условиях §13 (есть ≥1 сохранённый ответ, `tensionCompleted === false`, сработала эвристика сигналов в черновике текущего ответа). |
| **Выход** | `TENSION_STOP_SUCCESS` → текст остановки; затем probe → при успехе **`TENSION_HYPOTHESIS_SUCCESS`**: в банк вносится уточнение, выставляется **`tensionCompleted: true`**, поле **`analysis`** (рабочая гипотеза). |
| **Разрешено дальше** | Возврат в `question_flow` на следующий индекс **или** `integration_reflection`, если банк завершён после этого ответа. |
| **Запрещено** | Второй полный цикл `tension_stop_loading`… для **того же** банка после `tensionCompleted === true`. Переход к интеграции с незаполненными обязательными вопросами банка. |

---

## 15. Ответ на уточнение (probe)

| | |
|--|--|
| **Состояние** | `tensionPending.probeAnswer` на время загрузки; сливается в текст ответа строки банка с меткой `[Уточнение]` (см. schema doc). |
| **Запрещено** | Потерять текст probe до сборки payload интеграции. |

---

## 16. Рабочая гипотеза

| | |
|--|--|
| **Состояние** | `SupervisionAnswer.analysis` после **`TENSION_HYPOTHESIS_SUCCESS`** — только если был пройден цикл напряжения. |
| **Путь без напряжения** | Допустим и **не считается поломкой**: банк завершается без `tension_*`, интеграция вызывается с ответами банка без поля `analysis` по напряжению. |
| **Выход** | Как в §13–§14: следующий вопрос банка или `integration_reflection`. |

---

## 17. Integration reflection

| | |
|--|--|
| **Code step** | `integration_reflection` |
| **Entry** | Все вопросы банка отвечены; запущена загрузка интеграционной рефлексии. |
| **Exit** | `REFLECTION_SUCCESS` / обработка ошибки → шаги **closing**. |
| **Память** | В интеграцию обязаны входить **`fullNarrative`**, запрос супервизии, **все ответы банка** и при наличии — **текст/`analysis` после напряжения** (см. сборку промпта в приложении). |
| **Forbidden** | Generic fallback strings implying “no case material” when session holds narrative + answers (use case-aware local fallback). |

---

## 18. Closing flow

| | |
|--|--|
| **Code steps** | `closing_step1` → `closing_step2` → `closing_step3` → `closing_step4` |
| **Entry** | Успешный текст интеграционной рефлексии (или согласованный fallback при ошибке). |
| **Exit** | Takeaway + персональный интеграционный блок + выбор направления → `post_reflection`. |
| **Память** | Закрытие опирается на **тот же кейс**: нарратив, запрос, **банк ответов** и при наличии — **интеграционная рефлексия** (в т.ч. для LLM шага `closing_step3` — см. код приложения). |

---

## 19. Post-reflection

| | |
|--|--|
| **Code step** | `post_reflection` |
| **Entry** | After `closing_step4` selection. |
| **Exit** | Retention actions / nav / finish → `finished` or parallel modules per product. |
| **Note** | `clinicalSessionBlocksAuth` is false here and at `finished` — persistence / auth surfaces allowed. |

---

## 20. Save / auth

| | |
|--|--|
| **Persistence** | Case row + appends via assistant persistence layer; not every step serializes `step` for resume (see product backlog). |
| **Auth** | Gated by billing and step per `clinicalSessionBlocksAuth` and paywall rules. |
| **Информационная плашка ознакомительного режима** | Может отображаться внутри клинического потока, если **не** блокирует прохождение супервизии, **не** требует входа, **не** требует оплаты и **не** заменяет текущий клинический шаг. **Не считается** auth/paywall gate. |
| **Блокирующие поверхности** | Вход, сохранение кейса и оплата — **запрещены** до завершения основного клинического цикла; допускаются после `post_reflection` и согласованных завершающих шагов. |

---

## Branch flows (non-golden but real)

- **Low data:** `low_data_choice`, `low_data_add_material`, `low_data_ionova`.
- **NAV advanced modules:** `nav_*` steps after post-reflection entry points.
- **Chat analysis:** `chat_analysis_*` from `post_reflection`.

Regression personas and clinical coverage: **`architecture/golden-test-cases.md`** (`CASE-001`…`CASE-013`) and **`architecture/clinical-pattern-library.md`**. **§13–§16** зафиксированы под стабилизированный **опциональный mid-bank interrupt**; при расхождении тестов с этим контрактом приоритет у контракта и кода после выравнивания.

## Appendix — step index (maps to `SupervisionSession.step`)

All values below exist in `SupervisionStep` (`session-state-schema.md`). Sections §1–§20 cover the **golden path** and gates; rows marked **branch** are alternate routes.

| Step | § / note |
|------|-----------|
| `confidentiality`, `confidentiality_more` | §1 |
| `case_reminder` | Between §1 and §2 (billing gate → case name) |
| `case_name` | §2 |
| `therapy_duration` | §3 |
| `narrative_context` | §4 |
| `narrative_clinical` | §5 |
| `detecting_supervision_request`, `supervision_request_confirm`, `supervision_request` | §7 |
| `low_data_choice`, `low_data_add_material`, `low_data_ionova` | §5–§6 / branch |
| `therapist_specialization` | §8 |
| `therapist_methods` | §9 |
| `supervisor_style_selection` | §10 |
| `focus_selection`, `focus_help_notice` | §11 |
| `depth_selection` | §12 |
| `question_flow` | §13 |
| `tension_stop_loading`, `tension_stop`, `tension_hypothesis_loading` | §14–§16 |
| `integration_reflection` | §17 |
| `closing_step1` … `closing_step4` | §18 |
| `post_reflection` | §19 |
| `nav_depth_selection`, `nav_clarifying_loading`, `nav_clarifying`, `nav_final_loading`, `nav_final_result`, `nav_tail_flow` | branch |
| `chat_analysis_focus`, `chat_analysis_compose`, `chat_analysis_loading`, `chat_analysis_result` | branch |
| `finished` | §19–§20 terminal |
