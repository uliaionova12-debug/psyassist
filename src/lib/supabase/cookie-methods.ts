import type { CookieOptions } from "@supabase/ssr";
import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export type RequestCookieStore = Pick<ReadonlyRequestCookies, "getAll" | "set">;

/**
 * Supabase SSR cookie adapter for Next.js App Router.
 * When `responseCookies` is set (Route Handlers), session cookies are written on the HTTP response.
 */
export function createSupabaseCookieMethods(
  cookieStore: RequestCookieStore,
  responseCookies?: ResponseCookies
) {
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          /* Server Components cannot mutate cookies; middleware refreshes session. */
        }
        responseCookies?.set(name, value, options);
      });
    },
  };
}

/** Names only — safe for logs (never log cookie values). */
export function supabaseAuthCookieNames(cookieStore: Pick<ReadonlyRequestCookies, "getAll">): string[] {
  return cookieStore
    .getAll()
    .map((c) => c.name)
    .filter((name) => name.startsWith("sb-") || name.includes("auth-token"));
}
