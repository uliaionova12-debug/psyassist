import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

import {
  createSupabaseCookieMethods,
  supabaseAuthCookieNames,
} from "@/lib/supabase/cookie-methods";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

function authHeaderMeta(req: Request): {
  present: boolean;
  bearerPrefix: boolean;
  tokenLength: number | null;
} {
  const raw = req.headers.get("authorization");
  if (!raw) return { present: false, bearerPrefix: false, tokenLength: null };
  const bearerPrefix = raw.startsWith("Bearer ");
  const token = bearerPrefix ? raw.slice(7).trim() : raw.trim();
  return { present: true, bearerPrefix, tokenLength: token.length || null };
}

const BodySchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

/**
 * Writes the browser Supabase session into server-readable auth cookies.
 * Used after client sign-in or before persistence when API routes see no session.
 */
export async function POST(req: Request) {
  const authHeader = authHeaderMeta(req);
  console.info("[sync-session] request", {
    method: req.method,
    url: req.url,
    contentType: req.headers.get("content-type") ?? null,
    cookieNames: supabaseAuthCookieNames(await cookies()),
  });
  console.info("[sync-session] authHeader", authHeader);

  const env = getSupabasePublicEnv();
  if (!env) {
    console.info("[sync-session] failure reason", { status: 503, code: "SUPABASE_DISABLED" });
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" as const }, { status: 503 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const bodyKeys =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? Object.keys(rawBody as Record<string, unknown>)
        : [];
    console.info("[sync-session] token", {
      bodyKeys,
      accessTokenLength:
        typeof (rawBody as { access_token?: unknown } | null)?.access_token === "string"
          ? (rawBody as { access_token: string }).access_token.length
          : null,
      refreshTokenLength:
        typeof (rawBody as { refresh_token?: unknown } | null)?.refresh_token === "string"
          ? (rawBody as { refresh_token: string }).refresh_token.length
          : null,
    });
    console.info("[sync-session] failure reason", {
      status: 400,
      code: "INVALID_BODY",
      zodIssues: parsed.error.issues.map((i) => ({ path: i.path, code: i.code })),
    });
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" as const }, { status: 400 });
  }

  console.info("[sync-session] token", {
    accessTokenLength: parsed.data.access_token.length,
    refreshTokenLength: parsed.data.refresh_token.length,
    accessTokenPrefix: parsed.data.access_token.slice(0, 12),
  });

  const cookieStore = await cookies();
  console.info("[sync-session] request cookies (before setSession)", {
    cookieNames: supabaseAuthCookieNames(cookieStore),
  });

  const response = NextResponse.json({ ok: true as const });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: createSupabaseCookieMethods(cookieStore, response.cookies),
  });

  const { error: setErr } = await supabase.auth.setSession({
    access_token: parsed.data.access_token,
    refresh_token: parsed.data.refresh_token,
  });

  if (setErr) {
    console.info("[sync-session] getUser result", { skipped: true, reason: "setSession failed before getUser" });
    console.info("[sync-session] failure reason", {
      status: 401,
      code: "SET_SESSION_FAILED",
      message: setErr.message,
      name: setErr.name,
    });
    return NextResponse.json({ ok: false as const, code: "SET_SESSION_FAILED" as const }, { status: 401 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  console.info("[sync-session] getUser result", {
    userId: user?.id ?? null,
    error: userErr ? { message: userErr.message, name: userErr.name, status: userErr.status } : null,
  });

  if (userErr || !user) {
    console.info("[sync-session] failure reason", {
      status: 401,
      code: "NO_SESSION",
      getUserMessage: userErr?.message ?? "no user returned",
    });
    return NextResponse.json({ ok: false as const, code: "NO_SESSION" as const }, { status: 401 });
  }

  console.info("[sync-session] success", { userId: user.id });
  return response;
}
