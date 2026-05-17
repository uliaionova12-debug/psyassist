import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { get_user_cases, save_case } from "@/lib/persistence/cases";
import { caseSummaryRowToSupervisionSummary } from "@/lib/persistence/supervision-case";
import { supabaseAuthCookieNames } from "@/lib/supabase/cookie-methods";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

export async function GET() {
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

  try {
    const rows = await get_user_cases(supabase, user.id, 50);
    return NextResponse.json({
      ok: true as const,
      cases: rows.map(caseSummaryRowToSupervisionSummary),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false as const, code: "LIST_FAILED", message: msg },
      { status: 500 }
    );
  }
}

const SaveBodySchema = z.object({
  userName: z.string().nullable().optional(),
  caseTitle: z.string().min(1),
  clientName: z.string().min(1),
  firstSessionDate: z.string(),
  initialCase: z.string(),
});

export async function POST(req: Request) {
  console.info("[cases/save] reached");

  const cookieStore = await cookies();
  const allNames = cookieStore.getAll().map((c) => c.name);
  const authNames = supabaseAuthCookieNames(cookieStore);
  if (authNames.length === 0) {
    console.info("[cases/save] cookie names present, no values", allNames.join(", ") || "(none)");
  }

  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  console.info("[cases/save] user id or NO_SESSION", user?.id ?? "NO_SESSION");

  if (authErr || !user) {
    return NextResponse.json({ ok: false as const, code: "NO_SESSION" });
  }

  const parsed = SaveBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const caseId = await save_case(supabase, user.id, {
      userName: parsed.data.userName ?? null,
      caseTitle: parsed.data.caseTitle,
      clientName: parsed.data.clientName,
      firstSessionDate: parsed.data.firstSessionDate,
      initialCase: parsed.data.initialCase,
    });

    return NextResponse.json({ ok: true as const, caseId });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const msg = err.message ?? (e instanceof Error ? e.message : String(e));
    console.info("[cases/save] insert error code/message", err.code ?? "unknown", msg);
    return NextResponse.json(
      { ok: false as const, code: "SAVE_FAILED", message: msg },
      { status: 500 }
    );
  }
}
