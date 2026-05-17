import { createSupabaseBrowserClientOptional } from "@/lib/supabase/browser-optional";

export type SyncBrowserSessionResult =
  | { ok: true }
  | { ok: false; code: "SUPABASE_DISABLED" | "NO_BROWSER_SESSION" | "SYNC_FAILED" | "VERIFY_FAILED" };

/** Push browser Supabase session tokens into server httpOnly cookies via /api/auth/sync-session. */
export async function syncBrowserSessionToServer(): Promise<SyncBrowserSessionResult> {
  const client = createSupabaseBrowserClientOptional();
  if (!client) return { ok: false, code: "SUPABASE_DISABLED" };

  let session = (await client.auth.getSession()).data.session;
  if (!session?.access_token || !session.refresh_token) {
    const refreshed = await client.auth.refreshSession();
    session = refreshed.data.session;
  }
  if (!session?.access_token || !session.refresh_token) {
    return { ok: false, code: "NO_BROWSER_SESSION" };
  }

  const tokens = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };

  await client.auth.setSession(tokens).catch(() => {});

  try {
    const syncRes = await fetch("/api/auth/sync-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(tokens),
    });
    const syncData = (await syncRes.json()) as { ok?: boolean };
    if (!syncData.ok) return { ok: false, code: "SYNC_FAILED" };
  } catch {
    return { ok: false, code: "SYNC_FAILED" };
  }

  try {
    const res = await fetch("/api/user/profile", { credentials: "include", cache: "no-store" });
    const data = (await res.json()) as { ok?: boolean };
    if (!data.ok) return { ok: false, code: "VERIFY_FAILED" };
  } catch {
    return { ok: false, code: "VERIFY_FAILED" };
  }

  return { ok: true };
}
