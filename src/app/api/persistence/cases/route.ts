import { NextResponse } from "next/server";
import { z } from "zod";

import {
  build_save_case_payload,
  get_user_cases,
  save_case,
} from "@/lib/persistence/cases";
import { caseSummaryRowToSupervisionSummary } from "@/lib/persistence/supervision-case";
import { createSupabasePersistenceClient } from "@/lib/supabase/server-persistence";

export async function GET() {
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
  const response = NextResponse.json({ ok: true as const, caseId: 0 });
  const supabase = await createSupabasePersistenceClient(response.cookies);
  if (!supabase) {
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  console.info("[persist/create] user.id", user?.id ?? "NO_SESSION");

  if (authErr || !user) {
    return NextResponse.json({ ok: false as const, code: "NO_SESSION" });
  }

  const parsed = SaveBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" }, { status: 400 });
  }

  const input = {
    userName: parsed.data.userName ?? null,
    caseTitle: parsed.data.caseTitle,
    clientName: parsed.data.clientName,
    firstSessionDate: parsed.data.firstSessionDate,
    initialCase: parsed.data.initialCase,
  };
  console.info("[persist/create] payload", build_save_case_payload(user.id, input));

  try {
    const caseId = await save_case(supabase, user.id, input);
    return NextResponse.json({ ok: true as const, caseId }, { headers: response.headers });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const msg = err.message ?? (e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { ok: false as const, code: "SAVE_FAILED", message: msg },
      { status: 500, headers: response.headers }
    );
  }
}
