import { NextResponse } from "next/server";
import { z } from "zod";

import { complete_case_session } from "@/lib/persistence/cases";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

type RouteParams = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  snapshot: z.object({
    v: z.literal(1),
    savedAt: z.number().optional(),
    session: z.unknown(),
    pendingAppends: z.array(z.string()).optional(),
  }),
  focus: z.string().nullable(),
  current_step: z.string().nullable(),
  current_layer: z.string().nullable(),
  current_question: z.string().nullable(),
  duration_minutes: z.number().int().nullable(),
  last_insight: z.string().nullable(),
  case_title: z.string().nullable().optional(),
});

export async function POST(req: Request, ctx: RouteParams) {
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

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  try {
    await complete_case_session(supabase, caseId, user.id, {
      focus: parsed.data.focus,
      current_step: parsed.data.current_step,
      current_layer: parsed.data.current_layer,
      current_question: parsed.data.current_question,
      duration_minutes: parsed.data.duration_minutes,
      last_insight: parsed.data.last_insight,
      session_snapshot: parsed.data.snapshot,
      case_title: parsed.data.case_title,
    });
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "COMPLETE_FAILED", message: msg },
      { status: 500 }
    );
  }
}
