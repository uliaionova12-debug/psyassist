import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

import { createSupabaseCookieMethods } from "@/lib/supabase/cookie-methods";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const BodySchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

/**
 * Writes the browser Supabase session into server-readable auth cookies.
 * Used after client sign-in or before persistence when API routes see no session.
 */
export async function POST(req: Request) {
  console.info("[auth/sync-session] reached");

  const env = getSupabasePublicEnv();
  if (!env) {
    console.info("[auth/sync-session] result", "SUPABASE_DISABLED");
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" as const }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    console.info("[auth/sync-session] result", "INVALID_BODY");
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" as const }, { status: 400 });
  }

  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true as const });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: createSupabaseCookieMethods(cookieStore, response.cookies),
  });

  const { error: setErr } = await supabase.auth.setSession({
    access_token: parsed.data.access_token,
    refresh_token: parsed.data.refresh_token,
  });

  if (setErr) {
    console.info("[auth/sync-session] result", "SET_SESSION_FAILED", setErr.message);
    return NextResponse.json({ ok: false as const, code: "SET_SESSION_FAILED" as const }, { status: 401 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    console.info("[auth/sync-session] result", "NO_SESSION");
    return NextResponse.json({ ok: false as const, code: "NO_SESSION" as const }, { status: 401 });
  }

  console.info("[auth/sync-session] result", "ok", user.id);
  return response;
}
