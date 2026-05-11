import { NextResponse } from "next/server";
import { z } from "zod";

import { generateClinicalGeminiCompletion } from "@/lib/ai/gemini-clinical";
import { emitFounderTelemetry, resolveFounderTelemetryAuth } from "@/lib/telemetry/founder";
import { build_final_nav_analysis_prompt } from "@/lib/clinical/navigation";
import { supervisorStylePromptAppend } from "@/lib/clinical/supervisor-style";
import { therapistPromptInjectionFromArrays } from "@/lib/clinical/therapist-profile";

const QnaPairSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const BodySchema = z.object({
  caseText: z.string(),
  supervisionRequest: z.string(),
  navKey: z.string().min(1),
  qnaPairs: z.array(QnaPairSchema).min(1),
  therapistSpecializations: z.array(z.string()).optional(),
  therapistMethods: z.array(z.string()).optional(),
  therapistOtherSpecialization: z.string().optional(),
  therapistOtherMethods: z.string().optional(),
  supervisorStyle: z.string().optional(),
});

function formatQnaText(pairs: { question: string; answer: string }[]): string {
  return pairs.map((item) => `Вопрос: ${item.question}\nОтвет: ${item.answer}`).join("\n\n");
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  const b = parsed.data;
  const qnaText = formatQnaText(b.qnaPairs);
  const therapistInjection = therapistPromptInjectionFromArrays(b);
  const supervisorStyleBlock = supervisorStylePromptAppend(b.supervisorStyle);

  const prompt = build_final_nav_analysis_prompt(
    b.caseText,
    b.navKey,
    b.supervisionRequest,
    qnaText,
    therapistInjection,
    supervisorStyleBlock || undefined
  );

  const auth = await resolveFounderTelemetryAuth();
  const sessionId = crypto.randomUUID();
  emitFounderTelemetry(auth, {
    sessionId,
    phase: "final_synthesis",
    step: "final_nav_analysis_gemini",
    event: "final_nav_analysis",
    status: "started",
  });

  const t0 = Date.now();
  const result = await generateClinicalGeminiCompletion(prompt, {
    auth,
    sessionId,
    phase: "final_synthesis",
    step: "gemini_completion",
  });

  emitFounderTelemetry(auth, {
    sessionId,
    phase: "final_synthesis",
    step: "final_nav_analysis_gemini",
    event: "final_nav_analysis",
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

  return NextResponse.json({ ok: true as const, text: result.text });
}
