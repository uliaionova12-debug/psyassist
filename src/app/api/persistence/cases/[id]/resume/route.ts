import { NextResponse } from "next/server";

import { get_case_session_snapshot_json } from "@/lib/persistence/cases";
import { parseAssistantSnapshotJsonFromServer } from "@/lib/persistence/assistant-session-snapshot";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false as const, code: "NO_SESSION" });
  }

  const { id } = await ctx.params;
  const caseId = Number(id);
  if (!Number.isFinite(caseId)) {
    return NextResponse.json({ ok: false as const, code: "INVALID_ID" }, { status: 400 });
  }

  try {
    const raw = await get_case_session_snapshot_json(supabase, caseId, user.id);
    const snapshot = parseAssistantSnapshotJsonFromServer(raw);
    if (!snapshot) {
      return NextResponse.json({ ok: false as const, code: "NO_SNAPSHOT" }, { status: 404 });
    }
    return NextResponse.json({ ok: true as const, snapshot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "RESUME_FAILED", message: msg },
      { status: 500 }
    );
  }
}
