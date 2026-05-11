import { NextResponse } from "next/server";
import { z } from "zod";

import { generateClinicalGeminiFromParts, SYSTEM_FRONT } from "@/lib/ai/gemini-clinical";
import { emitFounderTelemetry, resolveFounderTelemetryAuth } from "@/lib/telemetry/founder";
import { SUPERVISION_OVERRIDE } from "@/lib/clinical/reflection";
import {
  _CHAT_FOCUS_PROMPTS,
  _CHAT_STYLE_SYSTEM,
  build_chat_analysis_user_prompt,
  clean_chat_analysis,
  type ChatFocusPromptKey,
} from "@/lib/clinical/chat-analysis";

const CHAT_FOCUS_KEYS = Object.keys(_CHAT_FOCUS_PROMPTS) as [
  ChatFocusPromptKey,
  ...ChatFocusPromptKey[],
];

const ImageSchema = z.object({
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  base64: z.string().min(1),
});

const BodySchema = z
  .object({
    focusKey: z.enum(CHAT_FOCUS_KEYS),
    transcriptText: z.string().optional(),
    images: z.array(ImageSchema).max(8).optional(),
  })
  .refine(
    (d) =>
      Boolean(d.transcriptText?.trim()) ||
      Boolean(d.images?.length),
    { message: "Нужен текст переписки или хотя бы одно изображение." }
  );

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  const { focusKey, transcriptText, images } = parsed.data;

  const userPrompt = build_chat_analysis_user_prompt(focusKey, transcriptText ?? "");

  const parts: import("@/lib/ai/gemini-clinical").GeminiUserPart[] = [{ type: "text", text: userPrompt }];
  if (images?.length) {
    for (const img of images) {
      parts.push({ type: "inline", mimeType: img.mimeType, base64: img.base64 });
    }
  }

  const fullSystem = `${SYSTEM_FRONT}\n${SUPERVISION_OVERRIDE}\n\n${_CHAT_STYLE_SYSTEM}`;

  const auth = await resolveFounderTelemetryAuth();
  const sessionId = crypto.randomUUID();
  emitFounderTelemetry(auth, {
    sessionId,
    phase: "intro",
    step: "chat_analysis_gemini",
    event: "chat_analysis",
    status: "started",
  });

  const t0 = Date.now();
  const result = await generateClinicalGeminiFromParts(fullSystem, parts, {
    auth,
    sessionId,
    phase: "intro",
    step: "gemini_completion",
  });

  emitFounderTelemetry(auth, {
    sessionId,
    phase: "intro",
    step: "chat_analysis_gemini",
    event: "chat_analysis",
    status: result.ok ? "success" : "error",
    errorCode: result.ok ? undefined : result.code,
    latencyMs: Date.now() - t0,
  });

  if (!result.ok) {
    const status =
      result.code === "AI_NOT_CONFIGURED" || result.code === "TEMPORARY_AI_OVERLOAD" ? 200 : 502;
    return NextResponse.json(
      {
        ok: false as const,
        code: result.code,
        message: result.message,
        status: result.status,
        retryable: result.retryable,
      },
      { status }
    );
  }

  const cleaned = clean_chat_analysis(result.text);

  return NextResponse.json({ ok: true as const, text: cleaned });
}
