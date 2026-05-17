import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase auth session on the request/response cookie jar.
 * Must run in middleware before Server Components and Route Handlers read cookies().
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = getSupabasePublicEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // getSession hydrates storage from request cookies; getUser validates and may refresh tokens.
  await supabase.auth.getSession();
  await supabase.auth.getUser();

  return supabaseResponse;
}
