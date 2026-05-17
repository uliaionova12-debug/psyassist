import { NextResponse } from "next/server";
import { z } from "zod";

import { update_case_initial } from "@/lib/persistence/cases";
import { createSupabasePersistenceClient } from "@/lib/supabase/server-persistence";

const BodySchema = z.object({
  initialCase: z.string(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteParams) {
  const supabase = await createSupabasePersistenceClient();
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
    await update_case_initial(supabase, caseId, user.id, parsed.data.initialCase);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "UPDATE_FAILED", message: msg },
      { status: 500 }
    );
  }
}
