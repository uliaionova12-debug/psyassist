import { NextResponse } from "next/server";
import { z } from "zod";

import { get_supervision_progress } from "@/lib/persistence/supervision-progress";
import {
  finish_supervision_session,
  start_supervision_session,
  track_supervision_activity,
} from "@/lib/persistence/supervision-sessions";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

const PostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("track") }),
  z.object({ action: z.literal("finish") }),
]);

async function requireUserSupabase() {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return { supabase: null, user: null, code: "SUPABASE_DISABLED" as const };
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase: null, user: null, code: "NO_SESSION" as const };
  }
  return { supabase, user, code: null };
}

export async function GET() {
  const ctx = await requireUserSupabase();
  if (!ctx.supabase || !ctx.user) {
    return NextResponse.json({ ok: false as const, code: ctx.code ?? "NO_SESSION" });
  }

  try {
    const progress = await get_supervision_progress(ctx.supabase, ctx.user.id);
    return NextResponse.json({ ok: true as const, progress });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "PROGRESS_FAILED", message: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const ctx = await requireUserSupabase();
  if (!ctx.supabase || !ctx.user) {
    return NextResponse.json({ ok: false as const, code: ctx.code ?? "NO_SESSION" });
  }

  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "start") {
      await start_supervision_session(ctx.supabase, ctx.user.id);
      return NextResponse.json({ ok: true as const });
    }
    if (parsed.data.action === "track") {
      const added = await track_supervision_activity(ctx.supabase, ctx.user.id);
      return NextResponse.json({ ok: true as const, addedSeconds: added });
    }
    await finish_supervision_session(ctx.supabase, ctx.user.id);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "SUPERVISION_SESSION_FAILED", message: msg },
      { status: 500 }
    );
  }
}
