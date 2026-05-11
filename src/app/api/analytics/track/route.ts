import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

const MAX_PAYLOAD_BYTES = 24_576;

const BodySchema = z.object({
  eventName: z.string().min(1).max(128),
  eventCategory: z.string().max(128).optional(),
  step: z.string().max(256).optional(),
  caseId: z.string().uuid().optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().min(8).max(128).optional(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({ ok: true as const, skipped: true as const, reason: "SUPABASE_DISABLED" });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  let payloadJson: Record<string, unknown> | null = null;
  if (parsed.data.payload !== undefined) {
    try {
      const s = JSON.stringify(parsed.data.payload);
      if (s.length > MAX_PAYLOAD_BYTES) {
        return NextResponse.json({ ok: false as const, code: "PAYLOAD_TOO_LARGE" }, { status: 400 });
      }
      payloadJson = parsed.data.payload;
    } catch {
      return NextResponse.json({ ok: false as const, code: "INVALID_PAYLOAD" }, { status: 400 });
    }
  }

  const row = {
    event_name: parsed.data.eventName,
    event_category: parsed.data.eventCategory ?? null,
    step: parsed.data.step ?? null,
    case_id: parsed.data.caseId ?? null,
    payload: payloadJson,
    session_id: parsed.data.sessionId?.trim() || null,
    user_id: user && !authErr ? user.id : null,
  };

  if (!row.user_id && (!row.session_id || row.session_id.length < 8)) {
    return NextResponse.json(
      { ok: false as const, code: "SESSION_ID_REQUIRED" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("product_events").insert(row);

  if (error) {
    return NextResponse.json(
      { ok: false as const, code: "INSERT_FAILED", message: error.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true as const });
}
