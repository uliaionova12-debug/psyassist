import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import { isFounderTelemetryServer } from "@/lib/qa-mode";

export type FounderTelemetryStatus = "started" | "success" | "error" | "retry" | "fallback";

export type FounderTelemetryEventPayload = {
  sessionId: string;
  caseId?: string;
  step: string;
  phase: string;
  event: string;
  status: FounderTelemetryStatus;
  model?: string;
  errorCode?: string;
  latencyMs?: number;
  timestamp: string;
};

export type FounderTelemetryEmitInput = Omit<FounderTelemetryEventPayload, "timestamp"> & {
  timestamp?: string;
};

export type FounderGeminiTelemetryOptions = {
  auth?: { userId?: string | null; userEmail?: string | null };
  sessionId: string;
  caseId?: string;
  phase: string;
  step: string;
};

function sanitizePayloadForDevLog(p: FounderTelemetryEventPayload): Record<string, unknown> {
  return {
    sessionId: p.sessionId.slice(0, 36),
    caseId: p.caseId ? String(p.caseId).slice(0, 64) : undefined,
    step: p.step,
    phase: p.phase,
    event: p.event,
    status: p.status,
    model: p.model,
    errorCode: p.errorCode,
    latencyMs: p.latencyMs,
    timestamp: p.timestamp,
  };
}

export async function resolveFounderTelemetryAuth(): Promise<{
  userId: string | null;
  userEmail: string | null;
}> {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) return { userId: null, userEmail: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { userId: user?.id ?? null, userEmail: user?.email ?? null };
}

/** Disambiguate two callers of POST /api/assistant (same JSON shape). */
export function inferAssistantPromptPhase(prompt: string): "reflection" | "closing_step3" {
  if (prompt.includes("Сформируй персональный интеграционный блок")) return "closing_step3";
  return "reflection";
}

export async function insertFounderEventRow(args: {
  userId: string | null;
  payload: FounderTelemetryEventPayload;
}): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return;
  const { error } = await supabase.from("founder_events").insert({
    user_id: args.userId,
    session_id: args.payload.sessionId,
    payload: args.payload as unknown as Record<string, unknown>,
  });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.info("[founder-telemetry] insert skipped/failed", error.message);
    }
  }
}

/**
 * Metadata-only founder telemetry. Persists only when founder/QA mode is enabled server-side.
 * Fire-and-forget safe: swallow errors.
 */
export function emitFounderTelemetry(
  auth: { userId?: string | null; userEmail?: string | null },
  input: FounderTelemetryEmitInput
): void {
  if (!isFounderTelemetryServer(auth.userEmail ?? null)) return;

  const payload: FounderTelemetryEventPayload = {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    console.info("[founder-telemetry]", sanitizePayloadForDevLog(payload));
  }

  void insertFounderEventRow({ userId: auth.userId ?? null, payload }).catch(() => undefined);
}
