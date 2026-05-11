import { NextResponse } from "next/server";
import { z } from "zod";

import { generateClinicalGeminiCompletion } from "@/lib/ai/gemini-clinical";
import { emitFounderTelemetry, resolveFounderTelemetryAuth } from "@/lib/telemetry/founder";
import {
  build_tension_hypothesis_prompt,
  build_tension_stop_prompt,
  type TensionModuleSlice,
} from "@/lib/clinical/tension";

const ModuleSchema = z.object({
  num: z.number().int().min(1),
  name: z.string().min(1),
  question: z.string().min(1),
});

const StopBodySchema = z.object({
  phase: z.literal("stop"),
  module: ModuleSchema,
  caseText: z.string(),
  answer: z.string().min(1),
  clinicalBrain: z.string(),
});

const HypothesisBodySchema = z.object({
  phase: z.literal("hypothesis"),
  module: ModuleSchema,
  caseText: z.string(),
  originalAnswer: z.string().min(1),
  probeAnswer: z.string().min(1),
  previousContext: z.string(),
  supervisionRequest: z.string(),
  clinicalBrain: z.string(),
});

const BodySchema = z.discriminatedUnion("phase", [StopBodySchema, HypothesisBodySchema]);

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    console.info("[TENSION] route POST invalid body");
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  const body = parsed.data;
  console.info(`[TENSION] route POST phase=${body.phase} started`);
  const tensionModule: TensionModuleSlice = body.module;

  const prompt =
    body.phase === "stop"
      ? build_tension_stop_prompt(tensionModule, body.caseText, body.answer, body.clinicalBrain)
      : build_tension_hypothesis_prompt(
          tensionModule,
          body.caseText,
          body.originalAnswer,
          body.probeAnswer,
          body.previousContext,
          body.supervisionRequest,
          body.clinicalBrain
        );

  const telemetryPhase = body.phase === "stop" ? "tension" : "interrupt";
  const telemetryStep =
    body.phase === "stop" ? "tension_stop_gemini" : "tension_hypothesis_gemini";
  const telemetryEvent = body.phase === "stop" ? "tension_stop" : "tension_hypothesis";

  const auth = await resolveFounderTelemetryAuth();
  const sessionId = crypto.randomUUID();
  emitFounderTelemetry(auth, {
    sessionId,
    phase: telemetryPhase,
    step: telemetryStep,
    event: telemetryEvent,
    status: "started",
  });

  const t0 = Date.now();
  let result: Awaited<ReturnType<typeof generateClinicalGeminiCompletion>>;
  try {
    result = await generateClinicalGeminiCompletion(prompt, {
      auth,
      sessionId,
      phase: telemetryPhase,
      step: "gemini_completion",
    });
  } finally {
    console.info(
      `[TENSION] route POST phase=${body.phase} gemini await finished latencyMs=${Date.now() - t0}`
    );
  }

  emitFounderTelemetry(auth, {
    sessionId,
    phase: telemetryPhase,
    step: telemetryStep,
    event: telemetryEvent,
    status: result.ok ? "success" : "error",
    errorCode: result.ok ? undefined : result.code,
    latencyMs: Date.now() - t0,
  });

  if (!result.ok) {
    console.info(`[TENSION] route POST phase=${body.phase} result=error code=${result.code}`);
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

  console.info(`[TENSION] route POST phase=${body.phase} result=ok`);
  return NextResponse.json({ ok: true as const, text: result.text });
}
