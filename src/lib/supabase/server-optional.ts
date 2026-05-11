import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

/**
 * Server Supabase client without throwing when env is unset (persistence soft-disable).
 */
export async function createSupabaseServerClientOptional() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Next.js App Router: cookie mutation can throw outside Server Actions; middleware refreshes session. */
        }
      },
    },
  });
}
