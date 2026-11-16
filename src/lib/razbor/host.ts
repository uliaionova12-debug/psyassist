import { NextResponse, type NextRequest } from "next/server";

import { RAZBOR_HOST } from "@/lib/razbor/config";

const PASSTHROUGH = [
  "/razbor/",
  "/api/razbor",
  "/_next/",
  "/manifest.webmanifest",
  "/robots.txt",
];

export function isRazborHost(request: NextRequest): boolean {
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  ).split(":")[0];
  return host?.toLowerCase() === RAZBOR_HOST;
}

export function isRazborPath(pathname: string): boolean {
  return (
    pathname === "/razbor" ||
    pathname.startsWith("/razbor/") ||
    pathname.startsWith("/api/razbor")
  );
}

/** On razbor.psyassist.pro only the landing is served: `/` shows /razbor, other site paths go back to `/`. */
export function razborHostResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/razbor", request.url));
  }
  if (PASSTHROUGH.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", request.url), 308);
}
