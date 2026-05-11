import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type Part,
} from "@google/generative-ai";

import { getGeminiRuntimeApiKey } from "@/lib/ai/gemini-runtime-key";
import { stripClinicalMarkdown } from "@/lib/clinical/markdown-strip";
import { SUPERVISION_OVERRIDE } from "@/lib/clinical/reflection";
import { emitFounderTelemetry, type FounderGeminiTelemetryOptions } from "@/lib/telemetry/founder";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const GEMINI_FETCH_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.GEMINI_FETCH_TIMEOUT_MS ?? 120_000)
);

function resolveGeminiApiKey(): string {
  return (
    getGeminiRuntimeApiKey() ??
    process.env.AI_INTEGRATIONS_GEMINI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    ""
  ).trim();
}

/** Passed as 2nd arg to `getGenerativeModel` / nested requests (SDK reads `baseUrl`, `timeout`). */
function sdkRootRequestOptions(): { timeout: number; baseUrl?: string } {
  const raw = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL?.trim();
  const opts: { timeout: number; baseUrl?: string } = { timeout: GEMINI_FETCH_TIMEOUT_MS };
  if (raw) opts.baseUrl = raw.replace(/\/$/, "");
  return opts;
}

const AI_NOT_CONFIGURED_BASE =
  "Анализ временно недоступен: служба анализа не подключена. Если вы отвечаете за запуск проекта, проверьте конфигурацию приложения.";

function aiNotConfiguredMessage(): string {
  const devHint =
    process.env.NODE_ENV === "development"
      ? " В режиме разработки см. инструкции для разработчиков в репозитории проекта."
      : "";
  return AI_NOT_CONFIGURED_BASE + devHint;
}

export const SYSTEM_FRONT =
  "Ты — AI-ассистент для практикующих психологов.\n" +
  "Твоя роль — клиническая супервизия специалиста, не консультирование клиентов напрямую.\n\n" +
  "Правила:\n" +
  "- Отвечай ТОЛЬКО на русском языке.\n" +
  "- НИКОГДА не ставь диагнозы клиентам психолога.\n" +
  "- Стиль: клинический, точный, профессиональный.\n" +
  "- Обращайся к терапевту на «вы».\n" +
  "- Соблюдай конфиденциальность: не запрашивай личные данные клиентов.\n";

export type GeminiClinicalFailure =
  | {
      ok: false;
      code:
        | "AI_NOT_CONFIGURED"
        | "MODEL_ERROR"
        | "EMPTY_MODEL_OUTPUT"
        | "NETWORK_ERROR"
        | "TEMPORARY_AI_OVERLOAD";
      message?: string;
      status?: "temporary_ai_overload";
      retryable?: true;
    };

export type GeminiClinicalResult = { ok: true; text: string } | GeminiClinicalFailure;

/** Part for Gemini `contents[].parts`: plain text or inline image (base64, без префикса data:). */
export type GeminiUserPart =
  | { type: "text"; text: string }
  | { type: "inline"; mimeType: string; base64: string };

/** User-visible: never append raw provider error text (may contain sensitive or technical details). */
function userFacingLoadFailure(): string {
  return "Не удалось загрузить данные. Попробуйте обновить страницу.";
}

type TemporaryAiOverload = {
  status: "temporary_ai_overload";
  retryable: true;
  message: string;
};

const TEMPORARY_AI_OVERLOAD: TemporaryAiOverload = {
  status: "temporary_ai_overload",
  retryable: true,
  message:
    "AI сейчас под высокой клинической нагрузкой. Удерживаю ваш кейс. Продолжаем через несколько секунд.",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractHttpStatus(err: unknown): number | null {
  if (err instanceof GoogleGenerativeAIFetchError) return err.status ?? null;
  if (!err || typeof err !== "object") return null;
  const anyErr = err as Record<string, unknown>;

  const direct = anyErr.status ?? anyErr.statusCode ?? anyErr.code;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (typeof direct === "string") {
    const n = Number(direct);
    if (Number.isFinite(n)) return n;
  }

  const response = anyErr.response;
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    const s = r.status ?? r.statusCode;
    if (typeof s === "number" && Number.isFinite(s)) return s;
    if (typeof s === "string") {
      const n = Number(s);
      if (Number.isFinite(n)) return n;
    }
  }

  const cause = anyErr.cause;
  if (cause && typeof cause === "object") return extractHttpStatus(cause);
  return null;
}

function isRetryableGeminiStatus(status: number | null): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function buildModelFallbackOrder(primaryModel: string): string[] {
  const trimmed = primaryModel.trim();
  const order: string[] = [];
  if (trimmed) order.push(trimmed);
  // Always try these fallbacks (if not already attempted).
  if (!order.includes("gemini-2.5-flash")) order.push("gemini-2.5-flash");
  if (!order.includes("gemini-2.0-flash")) order.push("gemini-2.0-flash");
  return order;
}

async function generateContentWithResilience(args: {
  apiKey: string;
  systemInstruction: string;
  userParts: Part[];
  telemetry?: FounderGeminiTelemetryOptions;
}): Promise<
  | { ok: true; text: string }
  | ({ ok: false; code: "MODEL_ERROR" | "NETWORK_ERROR" } & Partial<TemporaryAiOverload> & { message?: string })
> {
  const { apiKey, systemInstruction, userParts, telemetry } = args;
  const rootOpts = sdkRootRequestOptions();
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = buildModelFallbackOrder(GEMINI_MODEL);

  const baseDelayMs = 1500;
  const maxAttempts = 3;

  let lastErr: unknown = null;
  let lastStatus: number | null = null;
  const resilienceStarted = Date.now();

  for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
    const modelName = models[modelIdx]!;
    const model = genAI.getGenerativeModel(
      { model: modelName, systemInstruction },
      rootOpts
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        const delay = baseDelayMs * Math.pow(2, attempt - 2); // 1500, 3000
        await sleep(delay);
      }

      const attemptStart = Date.now();
      try {
        const result = await model.generateContent(
          { contents: [{ role: "user", parts: userParts }] },
          { timeout: rootOpts.timeout }
        );
        let text = "";
        try {
          text = result.response.text().trim();
        } catch {
          text = "";
        }
        return { ok: true, text };
      } catch (e) {
        lastErr = e;
        lastStatus = extractHttpStatus(e);
        const attemptLatencyMs = Date.now() - attemptStart;

        const msg = e instanceof Error ? e.message : String(e);
        if (/abort|AbortError|timeout/i.test(msg)) {
          // Timeouts are retried within the attempt loop only when they manifest as 5xx/429.
          // Most timeout-like errors from fetch abort should surface as a network error.
          if (!isRetryableGeminiStatus(lastStatus)) break;
        }

        const willRetrySameModel =
          isRetryableGeminiStatus(lastStatus) && attempt < maxAttempts;
        if (telemetry && willRetrySameModel) {
          emitFounderTelemetry(telemetry.auth ?? {}, {
            sessionId: telemetry.sessionId,
            caseId: telemetry.caseId,
            phase: telemetry.phase,
            step: telemetry.step,
            event: "gemini_retry",
            status: "retry",
            model: modelName,
            errorCode: lastStatus != null ? `HTTP_${lastStatus}` : "RETRYABLE",
            latencyMs: attemptLatencyMs,
          });
        }

        if (!isRetryableGeminiStatus(lastStatus)) break;
        if (attempt >= maxAttempts) break;
        continue;
      }
    }

    const hasFallbackModel = modelIdx < models.length - 1;
    if (hasFallbackModel && telemetry) {
      const nextModel = models[modelIdx + 1];
      emitFounderTelemetry(telemetry.auth ?? {}, {
        sessionId: telemetry.sessionId,
        caseId: telemetry.caseId,
        phase: telemetry.phase,
        step: telemetry.step,
        event: "gemini_fallback",
        status: "fallback",
        model: nextModel,
        errorCode: lastStatus != null ? `HTTP_${lastStatus}` : undefined,
      });
    }
  }

  if (isRetryableGeminiStatus(lastStatus)) {
    if (telemetry) {
      emitFounderTelemetry(telemetry.auth ?? {}, {
        sessionId: telemetry.sessionId,
        caseId: telemetry.caseId,
        phase: telemetry.phase,
        step: telemetry.step,
        event: "temporary_ai_overload",
        status: "error",
        errorCode: "TEMPORARY_AI_OVERLOAD",
        model: models[models.length - 1],
        latencyMs: Date.now() - resilienceStarted,
      });
    }
    return { ok: false, code: "MODEL_ERROR", ...TEMPORARY_AI_OVERLOAD };
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? "");
  if (/abort|AbortError|timeout/i.test(msg)) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: userFacingLoadFailure(),
    };
  }

  if (lastErr instanceof GoogleGenerativeAIFetchError) {
    return {
      ok: false,
      code: "MODEL_ERROR",
      message: userFacingLoadFailure(),
    };
  }

  return {
    ok: false,
    code: "NETWORK_ERROR",
    message: userFacingLoadFailure(),
  };
}

async function generateWithSdk(
  systemInstruction: string,
  userParts: Part[],
  telemetry?: FounderGeminiTelemetryOptions
): Promise<GeminiClinicalResult> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { ok: false, code: "AI_NOT_CONFIGURED", message: aiNotConfiguredMessage() };
  }

  try {
    const r = await generateContentWithResilience({ apiKey, systemInstruction, userParts, telemetry });
    const text = r.ok ? r.text.trim() : "";

    if (!text) {
      if (!r.ok && r.status === "temporary_ai_overload" && r.retryable) {
        return {
          ok: false,
          code: "TEMPORARY_AI_OVERLOAD",
          status: "temporary_ai_overload",
          retryable: true,
          message: r.message,
        };
      }
      return {
        ok: false,
        code: "EMPTY_MODEL_OUTPUT",
        message: "Не удалось получить ответ. Попробуйте повторить запрос позже.",
      };
    }

    return { ok: true, text: stripClinicalMarkdown(text) };
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: userFacingLoadFailure() };
  }
}

/**
 * Завершение с произвольным system instruction и несколькими parts (текст + скриншоты).
 */
export async function generateClinicalGeminiFromParts(
  fullSystemInstruction: string,
  parts: GeminiUserPart[],
  telemetry?: FounderGeminiTelemetryOptions
): Promise<GeminiClinicalResult> {
  const userParts: Part[] = parts.map((p) =>
    p.type === "text"
      ? ({ text: p.text } satisfies Part)
      : ({
          inlineData: { mimeType: p.mimeType, data: p.base64 },
        } satisfies Part)
  );

  return generateWithSdk(fullSystemInstruction, userParts, telemetry);
}

/** Clinical supervision completion — same contract as /api/assistant. */
export async function generateClinicalGeminiCompletion(
  userPrompt: string,
  telemetry?: FounderGeminiTelemetryOptions
): Promise<GeminiClinicalResult> {
  const systemInstruction = `${SYSTEM_FRONT}\n${SUPERVISION_OVERRIDE}`;
  return generateWithSdk(systemInstruction, [{ text: userPrompt }], telemetry);
}

/** Minimal transport check for ops / debugging (server-only). */
export async function runGeminiTransportHealthCheck(): Promise<{ ok: boolean; detail?: string }> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) return { ok: false, detail: "AI_NOT_CONFIGURED" };

  const rootOpts = sdkRootRequestOptions();
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL }, rootOpts);
    const result = await model.generateContent(
      {
        contents: [{ role: "user" as const, parts: [{ text: "Return only: OK" } satisfies Part] }],
      },
      { timeout: Math.min(30_000, rootOpts.timeout) }
    );
    const text = result.response.text().trim();
    return { ok: /\bOK\b/i.test(text), detail: text.slice(0, 120) };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
