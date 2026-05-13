# Beta 0.1 green run

- **Date:** Wed May 13 16:01:31 MSK 2026
- **Commit hash:** 449ab661f092101bb9f56d4a0db98f5b7c2183d4
- **Provider path:** Clinical cloud path: **Google Gemini** primary (`src/lib/ai/gemini-clinical.ts`, `GoogleGenerativeAI` + env key resolution), with **OpenAI** clinical completion fallback via `completionOpenAiClinicalFallback` / `openai-clinical-fallback` when Gemini fails or returns unusable output—consistent with the Gemini layer + fallback behavior described in `architecture/ai-response-contract.md`. **Vercel Preview → Gemini (and/or OpenAI fallback per env).**
- **Environment:** Vercel Preview
- **Scenario:** Alena
- **Focus:** client dynamics
- **Depth:** 3
- **Tension interrupt:** triggered
- **Reflection:** success
