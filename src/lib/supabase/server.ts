import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { createSupabaseCookieMethods } from "@/lib/supabase/cookie-methods";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: createSupabaseCookieMethods(cookieStore),
  });
}
