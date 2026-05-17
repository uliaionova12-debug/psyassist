import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { createSupabaseCookieMethods } from "@/lib/supabase/cookie-methods";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const redirectResponse = NextResponse.redirect(`${origin}/`, { status: 302 });

  const env = getSupabasePublicEnv();
  if (!env) {
    return redirectResponse;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: createSupabaseCookieMethods(cookieStore, redirectResponse.cookies),
  });

  await supabase.auth.signOut();

  return redirectResponse;
}
