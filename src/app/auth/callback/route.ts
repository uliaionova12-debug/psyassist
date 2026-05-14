import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sanitizeInternalNextPath } from "@/lib/auth/redirect-urls";
import { getSiteUrlFromRequest } from "@/lib/auth/site-url";
import { ensureProfileExists } from "@/lib/user/profile";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = getSiteUrlFromRequest(request);
  const requestUrl = new URL(request.url);
  const next = sanitizeInternalNextPath(requestUrl.searchParams.get("next"));

  if (!url || !anonKey) {
    return NextResponse.redirect(`${siteUrl}/login?error=supabase_disabled`);
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  const redirectResponse = NextResponse.redirect(`${siteUrl}${next}`);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        } catch {
          /* cookie mutation can fail in some runtimes */
        }
      },
    },
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
