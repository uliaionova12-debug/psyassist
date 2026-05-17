import { cookies } from "next/headers";
import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseCookieMethods } from "@/lib/supabase/cookie-methods";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Supabase client for persistence Route Handlers.
 * Pass `response.cookies` so session refresh during writes is persisted on the response.
 */
export async function createSupabasePersistenceClient(
  responseCookies?: ResponseCookies
): Promise<SupabaseClient | null> {
  const env = getSupabasePublicEnv();
  if (!env) return null;

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: createSupabaseCookieMethods(cookieStore, responseCookies),
  });
}
