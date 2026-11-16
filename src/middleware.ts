import { NextResponse, type NextRequest } from "next/server";

import {
  isRazborHost,
  isRazborPath,
  razborHostResponse,
} from "@/lib/razbor/host";
import { updateSession } from "@/lib/supabase/update-session";

export async function middleware(request: NextRequest) {
  if (isRazborHost(request)) return razborHostResponse(request);
  // Public client landing: no Supabase auth session needed.
  if (isRazborPath(request.nextUrl.pathname)) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Refresh Supabase auth cookies before Server Components and Route Handlers run.
     * Explicitly includes /cases and /api/persistence; also covers the rest of the app.
     */
    "/cases",
    "/cases/:path*",
    "/api/persistence/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
