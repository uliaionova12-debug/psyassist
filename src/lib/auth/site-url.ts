/**
 * Canonical public site URL for redirects (email links, auth callback).
 * Prefer `x-forwarded-*` behind reverse proxies so redirects match the public host.
 */
export function getSiteUrlFromRequest(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      const rawProto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
      const proto = rawProto === "http" || rawProto === "https" ? rawProto : "https";
      return `${proto}://${host}`;
    }
  }
  return url.origin;
}
