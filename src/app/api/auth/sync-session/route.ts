import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

const BodySchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

/**
 * Writes the browser Supabase session into server-readable auth cookies.
 * Used before persistence saves when client memory has a session but API routes see none.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" as const }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" as const }, { status: 400 });
  }

  const { error: setErr } = await supabase.auth.setSession({
    access_token: parsed.data.access_token,
    refresh_token: parsed.data.refresh_token,
  });

  if (setErr) {
    return NextResponse.json({ ok: false as const, code: "SET_SESSION_FAILED" as const }, { status: 401 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false as const, code: "NO_SESSION" as const }, { status: 401 });
  }

  return NextResponse.json({ ok: true as const });
}
