import { NextResponse } from "next/server";
import { z } from "zod";

import { generateClinicalGeminiCompletion } from "@/lib/ai/gemini-clinical";
import {
  emitFounderTelemetry,
  inferAssistantPromptPhase,
  resolveFounderTelemetryAuth,
} from "@/lib/telemetry/founder";

const BodySchema = z.object({
  prompt: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    if (process.env.NODE_ENV === "development") {
      console.info("[API_ASSISTANT_DEV] INVALID_BODY", {
        zodOk: parsed.success,
      });
    }
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  const auth = await resolveFounderTelemetryAuth();
  const sessionId = crypto.randomUUID();
  const phase = inferAssistantPromptPhase(parsed.data.prompt);

  if (process.env.NODE_ENV === "development") {
    console.info("[API_ASSISTANT_DEV] request", {
      phase,
      promptLength: parsed.data.prompt.length,
    });
  }

  emitFounderTelemetry(auth, {
    sessionId,
    phase,
    step: phase === "closing_step3" ? "closing_integration_gemini" : "integration_reflection_gemini",
    event: phase === "closing_step3" ? "closing_integration" : "integration_reflection",
    status: "started",
  });

  const t0 = Date.now();
  const result = await generateClinicalGeminiCompletion(parsed.data.prompt, {
    auth,
    sessionId,
    phase,
    step: "gemini_completion",
  });

  emitFounderTelemetry(auth, {
    sessionId,
    phase,
    step: phase === "closing_step3" ? "closing_integration_gemini" : "integration_reflection_gemini",
    event: phase === "closing_step3" ? "closing_integration" : "integration_reflection",
    status: result.ok ? "success" : "error",
    errorCode: result.ok ? undefined : result.code,
    latencyMs: Date.now() - t0,
  });

  if (process.env.NODE_ENV === "development") {
    if (result.ok) {
      const t = result.text ?? "";
      console.info("[API_ASSISTANT_DEV] response", {
        phase,
        ok: true,
        code: undefined,
        textLength: t.length,
        textEmpty: !t.trim(),
        responseKeys: ["ok", "text"],
        latencyMs: Date.now() - t0,
      });
    } else {
      console.info("[API_ASSISTANT_DEV] response", {
        phase,
        ok: false,
        code: result.code,
        message: result.message,
        status: "status" in result ? result.status : undefined,
        retryable: "retryable" in result ? result.retryable : undefined,
        textEmpty: true,
        responseKeys: ["ok", "code", "message", "status", "retryable"],
        latencyMs: Date.now() - t0,
      });
    }
  }

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

  return NextResponse.json({ ok: true as const, text: result.text });
}
