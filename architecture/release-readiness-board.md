# Release readiness board

Qualitative snapshot for **external beta / production** decisions. Status meanings:


| Status     | Meaning                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| **GREEN**  | Production ready                                                        |
| **YELLOW** | Usable with supervision — ship only with human oversight / known limits |
| **RED**    | Not for external users                                                  |


---

## Current snapshot


| Area                      | Status     | Notes                                                                                                                                                 |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clinical intelligence** | **YELLOW** | Strong prompts + integration architecture; model overload and edge paths still need monitoring.                                                       |
| **State stability**       | **YELLOW** | Core reducer paths stabilized (tension once, material gate); rare race/exhaustive deps risks remain.                                                  |
| **Memory**                | **YELLOW** | Session-backed integration + local fallback; persistence/resume coverage incomplete for all steps.                                                    |
| **Auth**                  | **RED**    | Full prod auth/paywall story still evolving — treat as internal / gated beta.                                                                         |
| **Persistence**           | **YELLOW** | Case save + context append work when authenticated; offline/guest limits documented in code.                                                          |
| **UX**                    | **YELLOW** | Functional clinical UX; polish and accessibility ongoing.                                                                                             |
| **Billing readiness**     | **RED**    | Not production-complete for unrestricted commercial launch.                                                                                           |
| **Beta readiness**        | **YELLOW** | **Limited closed beta** only — disclaimers required; treat as **RED** for open/public beta until Auth and Billing readiness move off RED (see Notes). |


---

## Escalation criteria (examples)

- Move **Memory** toward GREEN: resume/rehydrate verified across reload; integration payload audited end-to-end.
- Move **Auth** toward YELLOW: stable sessions, documented failure modes, no surprise paywalls mid-clinical-block.
- Move **Billing readiness** toward YELLOW: tested upgrade/downgrade, webhook truth, support playbook.

---

*Last updated with architecture freeze documentation pass.*