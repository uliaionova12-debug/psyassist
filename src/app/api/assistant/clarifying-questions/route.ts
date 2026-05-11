import { NextResponse } from "next/server";
import { z } from "zod";

import { generateClinicalGeminiCompletion } from "@/lib/ai/gemini-clinical";
import { emitFounderTelemetry, resolveFounderTelemetryAuth } from "@/lib/telemetry/founder";
import {
  CLARIFYING_FALLBACK_QUESTIONS,
  build_clarifying_questions_prompt,
  parse_questions,
} from "@/lib/clinical/clarifying";
import { supervisorStylePromptAppend } from "@/lib/clinical/supervisor-style";
import { therapistPromptInjectionFromArrays } from "@/lib/clinical/therapist-profile";

const BodySchema = z.object({
  caseText: z.string(),
  supervisionRequest: z.string(),
  navKey: z.string().min(1),
  questionsCount: z.number().int().min(1).max(20),
  therapistSpecializations: z.array(z.string()).optional(),
  therapistMethods: z.array(z.string()).optional(),
  therapistOtherSpecialization: z.string().optional(),
  therapistOtherMethods: z.string().optional(),
  supervisorStyle: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  const b = parsed.data;
  const therapistInjection = therapistPromptInjectionFromArrays(b);
  const supervisorStyleBlock = supervisorStylePromptAppend(b.supervisorStyle);

  const prompt = build_clarifying_questions_prompt(
    b.caseText,
    b.navKey,
    b.supervisionRequest,
    b.questionsCount,
    therapistInjection,
    supervisorStyleBlock || undefined
  );

  const auth = await resolveFounderTelemetryAuth();
  const sessionId = crypto.randomUUID();
  emitFounderTelemetry(auth, {
    sessionId,
    phase: "clarifying_questions",
    step: "clarifying_questions_gemini",
    event: "clarifying_questions",
    status: "started",
  });

  const t0 = Date.now();
  const result = await generateClinicalGeminiCompletion(prompt, {
    auth,
    sessionId,
    phase: "clarifying_questions",
    step: "gemini_completion",
  });

  emitFounderTelemetry(auth, {
    sessionId,
    phase: "clarifying_questions",
    step: "clarifying_questions_gemini",
    event: "clarifying_questions",
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

  let questions = parse_questions(result.text, b.questionsCount);

  if (!questions.length) {
    questions = CLARIFYING_FALLBACK_QUESTIONS.slice(0, b.questionsCount);
    return NextResponse.json({
      ok: true as const,
      questions,
      usedFallbackQuestions: true as const,
    });
  }

  return NextResponse.json({ ok: true as const, questions, usedFallbackQuestions: false as const });
}
