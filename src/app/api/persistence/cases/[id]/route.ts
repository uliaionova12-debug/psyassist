import { NextResponse } from "next/server";
import { z } from "zod";

import { case_owned_by_user, get_case_by_id, patch_case_status } from "@/lib/persistence/cases";
import { caseRowToSupervisionCase } from "@/lib/persistence/supervision-case";
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
    const row = await get_case_by_id(supabase, caseId);
    if (!row || !case_owned_by_user(row, user.id)) {
      return NextResponse.json({ ok: false as const, code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true as const, case: caseRowToSupervisionCase(row) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "FETCH_FAILED", message: msg },
      { status: 500 }
    );
  }
}

const PatchBodySchema = z.object({
  status: z.enum(["active", "completed", "archived"]),
});

export async function PATCH(req: Request, ctx: RouteParams) {
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

  const parsed = PatchBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const row = await get_case_by_id(supabase, caseId);
    if (!row || !case_owned_by_user(row, user.id)) {
      return NextResponse.json({ ok: false as const, code: "NOT_FOUND" }, { status: 404 });
    }
    await patch_case_status(supabase, caseId, user.id, parsed.data.status);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "PATCH_FAILED", message: msg },
      { status: 500 }
    );
  }
}
