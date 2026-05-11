import { NextResponse } from "next/server";
import { z } from "zod";

import { append_case_context } from "@/lib/persistence/cases";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

const BodySchema = z.object({
  addition: z.string().min(1),
});

type RouteParams = { params: Promise<{ id: string }> };

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
    await append_case_context(supabase, caseId, parsed.data.addition);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "APPEND_FAILED", message: msg },
      { status: 500 }
    );
  }
}
