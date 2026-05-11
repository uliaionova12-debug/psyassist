import { NextResponse } from "next/server";
import { z } from "zod";

import {
  insertFounderEventRow,
  resolveFounderTelemetryAuth,
  type FounderTelemetryEventPayload,
} from "@/lib/telemetry/founder";
import { isFounderTelemetryServer } from "@/lib/qa-mode";

const BodySchema = z.object({
  sessionId: z.string().min(1),
  caseId: z.string().optional(),
  step: z.string().min(1),
  phase: z.string().min(1),
  event: z.string().min(1),
  status: z.enum(["started", "success", "error", "retry", "fallback"]),
  model: z.string().max(160).optional(),
  errorCode: z.string().max(160).optional(),
  latencyMs: z.number().nonnegative().optional(),
});

export async function POST(req: Request) {
  const auth = await resolveFounderTelemetryAuth();
  if (!isFounderTelemetryServer(auth.userEmail)) {
    return NextResponse.json({ ok: false as const, code: "FORBIDDEN" as const }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" as const }, { status: 400 });
  }

  const b = parsed.data;
  const payload: FounderTelemetryEventPayload = {
    sessionId: b.sessionId,
    caseId: b.caseId,
    step: b.step,
    phase: b.phase,
    event: b.event,
    status: b.status,
    model: b.model,
    errorCode: b.errorCode,
    latencyMs: b.latencyMs,
    timestamp: new Date().toISOString(),
  };

  await insertFounderEventRow({ userId: auth.userId, payload });

  return NextResponse.json({ ok: true as const });
}
