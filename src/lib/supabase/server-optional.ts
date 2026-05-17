import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { createSupabaseCookieMethods } from "@/lib/supabase/cookie-methods";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Server Supabase client without throwing when env is unset (persistence soft-disable).
 */
export async function createSupabaseServerClientOptional() {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: createSupabaseCookieMethods(cookieStore),
  });
}
