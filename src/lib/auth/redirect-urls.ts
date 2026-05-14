/**
 * Internal path-only redirects (open-redirect safe).
 * Accepts `/path` or `/path?query=1`; rejects protocol-relative and external URLs.
 */
export function sanitizeInternalNextPath(raw: string | null | undefined, fallback = "/assistant"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t;
}

/** Absolute URL for Supabase `emailRedirectTo` / `redirectTo` (must be allowlisted in Supabase). */
export function buildAuthCallbackAbsoluteUrl(nextPath: string): string {
  const next = sanitizeInternalNextPath(nextPath);
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) {
    return `/auth/callback?next=${encodeURIComponent(next)}`;
  }
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
