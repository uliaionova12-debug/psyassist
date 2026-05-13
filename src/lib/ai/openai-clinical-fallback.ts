import type { Part } from "@google/generative-ai";
import OpenAI from "openai";

const OPENAI_FALLBACK_MODEL = "gpt-5.5";

function countUserTextChars(parts: Part[]): number {
  let n = 0;
  for (const p of parts) {
    if ("text" in p && typeof p.text === "string") n += p.text.length;
  }
  return n;
}

function partsToOpenAiUserContent(
  userParts: Part[]
): string | OpenAI.Chat.ChatCompletionContentPart[] {
  const hasImage = userParts.some((p) => "inlineData" in p && p.inlineData?.data);
  if (!hasImage && userParts.length === 1) {
    const only = userParts[0];
    if (only && "text" in only && typeof only.text === "string") return only.text;
  }
  const out: OpenAI.Chat.ChatCompletionContentPart[] = [];
  for (const p of userParts) {
    if ("text" in p && typeof p.text === "string" && p.text.length > 0) {
      out.push({ type: "text", text: p.text });
    }
    if ("inlineData" in p && p.inlineData?.mimeType && p.inlineData?.data) {
      out.push({
        type: "image_url",
        image_url: {
          url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
        },
      });
    }
  }
  return out.length > 0 ? out : "";
}

function extractOpenAiHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const anyErr = err as Record<string, unknown>;
  const status = anyErr.status;
  if (typeof status === "number" && Number.isFinite(status)) return status;
  return undefined;
}

/**
 * One-shot OpenAI completion mirroring Gemini user/system split (transport only).
 */
export async function completionOpenAiClinicalFallback(args: {
  apiKey: string;
  systemInstruction: string;
  userParts: Part[];
  phase?: string;
  step?: string;
}): Promise<
  { ok: true; text: string } | { ok: false; code: "MODEL_ERROR" | "NETWORK_ERROR"; message?: string }
> {
  const { apiKey, systemInstruction, userParts, phase, step } = args;

  if (process.env.NODE_ENV === "development") {
    console.log("[OPENAI_FALLBACK_DEV] request", {
      model: OPENAI_FALLBACK_MODEL,
      systemInstructionLength: systemInstruction.length,
      userTextChars: countUserTextChars(userParts),
      partCount: userParts.length,
      hasInlineImage: userParts.some((p) => "inlineData" in p && !!p.inlineData?.data),
      phase,
      step,
    });
  }

  const openai = new OpenAI({ apiKey });
  const userContent = partsToOpenAiUserContent(userParts);

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_FALLBACK_MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userContent },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    const text = typeof raw === "string" ? raw.trim() : "";

    if (process.env.NODE_ENV === "development") {
      console.log("[OPENAI_FALLBACK_DEV] response", {
        ok: true as const,
        textLength: text.length,
        finishReason: completion.choices[0]?.finish_reason,
      });
    }

    if (!text) {
      return { ok: false, code: "MODEL_ERROR", message: "empty_openai_output" };
    }
    return { ok: true, text };
  } catch (e) {
    const status = extractOpenAiHttpStatus(e);
    const msg = e instanceof Error ? e.message : String(e);
    const code: "MODEL_ERROR" | "NETWORK_ERROR" =
      /abort|AbortError|timeout|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg) || status === 408
        ? "NETWORK_ERROR"
        : "MODEL_ERROR";

    if (process.env.NODE_ENV === "development") {
      console.log("[OPENAI_FALLBACK_DEV] response", {
        ok: false as const,
        textLength: 0,
        code,
        httpStatus: status,
        messageSnippet: msg.slice(0, 200),
      });
    }

    return { ok: false, code, message: msg };
  }
}
