import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sanitizeInternalNextPath } from "@/lib/auth/redirect-urls";
import { getSiteUrlFromRequest } from "@/lib/auth/site-url";
import { createSupabaseCookieMethods } from "@/lib/supabase/cookie-methods";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { ensureProfileExists } from "@/lib/user/profile";

export async function GET(request: Request) {
  const env = getSupabasePublicEnv();
  const siteUrl = getSiteUrlFromRequest(request);
  const requestUrl = new URL(request.url);
  const next = sanitizeInternalNextPath(requestUrl.searchParams.get("next"));

  if (!env) {
    return NextResponse.redirect(`${siteUrl}/login?error=supabase_disabled`);
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  const redirectResponse = NextResponse.redirect(`${siteUrl}${next}`);

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: createSupabaseCookieMethods(cookieStore, redirectResponse.cookies),
  });

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${siteUrl}/login?error=auth_exchange`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await ensureProfileExists(supabase, user.id, user.email ?? null);
    }

    return redirectResponse;
  } catch {
    return NextResponse.redirect(`${siteUrl}/login?error=server`);
  }
}
