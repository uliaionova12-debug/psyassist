import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import {
  type UserProfileRow,
  ensureProfileExists,
  fetchProfileRowForUser,
  profileRowToBilling,
  rowToUserProfile,
} from "@/lib/user/profile";

function notConfigured() {
  return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
}

function configuredResetSecret(): string | null {
  const primary = process.env.FOUNDER_QA_RESET_SECRET?.trim();
  const fallback = process.env.DEV_FOUNDER_RESET_SECRET?.trim();
  return primary || fallback || null;
}

function readRequestSecret(req: Request): string | null {
  const headerSecret = req.headers.get("x-founder-reset-secret")?.trim();
  if (headerSecret) return headerSecret;
  const auth = req.headers.get("authorization")?.trim();
  if (!auth) return null;
  const lower = auth.toLowerCase();
  if (!lower.startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

function secretsEqual(a: string, b: string): boolean {
  try {
    const ha = createHash("sha256").update(a, "utf8").digest();
    const hb = createHash("sha256").update(b, "utf8").digest();
    return timingSafeEqual(ha, hb);
  } catch {
    return false;
  }
}

function normalizeEmail(v: string | undefined | null): string | null {
  if (!v) return null;
  const t = v.trim().toLowerCase();
  return t.length ? t : null;
}

/**
 * Dev/ops-only: clears `free_intro_used` for the founder account.
 * Active only when `FOUNDER_QA_RESET_SECRET` or `DEV_FOUNDER_RESET_SECRET` is set.
 * Auth: `Authorization: Bearer <secret>` or `x-founder-reset-secret: <secret>`.
 *
 * With `SUPABASE_SERVICE_ROLE_KEY`: resolves target via `FOUNDER_USER_ID` and/or `FOUNDER_EMAIL`
 * (if both set, both must match the same profile row).
 * Without service role: caller must be signed in; session user must match `FOUNDER_USER_ID` or `FOUNDER_EMAIL`.
 */
export async function POST(req: Request) {
  const expected = configuredResetSecret();
  if (!expected) return notConfigured();

  const provided = readRequestSecret(req);
  if (!provided || !secretsEqual(provided, expected)) {
    return NextResponse.json({ ok: false as const, error: "Unauthorized" }, { status: 401 });
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim() || null;
  const founderEmail = normalizeEmail(process.env.FOUNDER_EMAIL);

  if (!founderId && !founderEmail) {
    return NextResponse.json(
      { ok: false as const, error: "Set FOUNDER_USER_ID and/or FOUNDER_EMAIL" },
      { status: 400 }
    );
  }

  const admin = createSupabaseServiceRoleClient();

  if (admin) {
    let targetUserId: string | null = founderId;

    if (targetUserId) {
      const { data: row, error } = await admin.from("profiles").select("id,email").eq("id", targetUserId).maybeSingle();
      if (error) {
        return NextResponse.json({ ok: false as const, error: "Lookup failed" }, { status: 500 });
      }
      if (!row) {
        return NextResponse.json({ ok: false as const, error: "Profile not found" }, { status: 404 });
      }
      if (founderEmail && normalizeEmail(row.email) !== founderEmail) {
        return NextResponse.json(
          { ok: false as const, error: "FOUNDER_USER_ID profile email does not match FOUNDER_EMAIL" },
          { status: 400 }
        );
      }
    } else if (founderEmail) {
      const { data: row, error } = await admin.from("profiles").select("id").ilike("email", founderEmail).maybeSingle();
      if (error) {
        return NextResponse.json({ ok: false as const, error: "Lookup failed" }, { status: 500 });
      }
      if (!row?.id) {
        return NextResponse.json({ ok: false as const, error: "Profile not found for email" }, { status: 404 });
      }
      targetUserId = row.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ ok: false as const, error: "Could not resolve user" }, { status: 400 });
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ free_intro_used: false, updated_at: new Date().toISOString() })
      .eq("id", targetUserId);

    if (upErr) {
      return NextResponse.json({ ok: false as const, error: "Update failed" }, { status: 500 });
    }

    const { data: fresh, error: loadErr } = await admin.from("profiles").select("*").eq("id", targetUserId).maybeSingle();
    if (loadErr || !fresh) {
      return NextResponse.json({ ok: true as const, userId: targetUserId, note: "Updated; reload profile to verify." });
    }

    const row = fresh as UserProfileRow;
    return NextResponse.json({
      ok: true as const,
      userId: targetUserId,
      billing: profileRowToBilling(row),
      profile: rowToUserProfile(row),
      note: "After reload, billing cache is psyassist_billing_profile_v2 (v2 envelope); clear it only if an old client left inconsistent data.",
    });
  }

  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({ ok: false as const, error: "SUPABASE_DISABLED" }, { status: 503 });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false as const, error: "Unauthorized" }, { status: 401 });
  }

  const sessionEmail = normalizeEmail(user.email);
  const idOk = founderId ? user.id === founderId : false;
  const emailOk = founderEmail && sessionEmail ? sessionEmail === founderEmail : false;
  if (!idOk && !emailOk) {
    return NextResponse.json({ ok: false as const, error: "Forbidden" }, { status: 403 });
  }

  await ensureProfileExists(supabase, user.id, user.email ?? null);

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ free_intro_used: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (upErr) {
    return NextResponse.json({ ok: false as const, error: "Update failed" }, { status: 500 });
  }

  const loaded = await fetchProfileRowForUser(supabase, user.id);
  if (!loaded.ok) {
    return NextResponse.json({
      ok: true as const,
      userId: user.id,
      note: "After reload, billing cache is psyassist_billing_profile_v2; clear it only if an old client left inconsistent data.",
    });
  }

  return NextResponse.json({
    ok: true as const,
    userId: user.id,
    billing: profileRowToBilling(loaded.row),
    profile: rowToUserProfile(loaded.row),
    note: "After reload, billing cache is psyassist_billing_profile_v2 (v2 envelope); clear it only if an old client left inconsistent data.",
  });
}
