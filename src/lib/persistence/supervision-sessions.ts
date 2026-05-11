import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ensure_supervision_progress_row,
  increment_supervision_progress_seconds,
} from "@/lib/persistence/supervision-progress";

/** Mirrors db.py ACTIVE_GAP_LIMIT_SECONDS */
export const ACTIVE_GAP_LIMIT_SECONDS = 5 * 60;

export async function start_supervision_session(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const nowIso = new Date().toISOString();

  await ensure_supervision_progress_row(supabase, userId);

  const { error: closeErr } = await supabase
    .from("supervision_sessions")
    .update({ is_open: false, closed_at: nowIso })
    .eq("user_id", userId)
    .eq("is_open", true);

  if (closeErr) throw closeErr;

  const { error: insErr } = await supabase.from("supervision_sessions").insert({
    user_id: userId,
    started_at: nowIso,
    last_activity_at: nowIso,
    active_seconds: 0,
    is_open: true,
  });

  if (insErr) throw insErr;
}

export async function track_supervision_activity(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const nowDt = new Date();
  const nowIso = nowDt.toISOString();

  await ensure_supervision_progress_row(supabase, userId);

  const { data: row, error: selErr } = await supabase
    .from("supervision_sessions")
    .select("id, last_activity_at")
    .eq("user_id", userId)
    .eq("is_open", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) throw selErr;

  if (!row) {
    await start_supervision_session(supabase, userId);
    return 0;
  }

  const sessionId = Number(row.id);
  let lastDt = nowDt;
  try {
    lastDt = new Date(String(row.last_activity_at));
  } catch {
    lastDt = nowDt;
  }

  const gapSeconds = Math.floor((nowDt.getTime() - lastDt.getTime()) / 1000);
  let addedSeconds = 0;

  if (gapSeconds > 0 && gapSeconds <= ACTIVE_GAP_LIMIT_SECONDS) {
    addedSeconds = gapSeconds;

    const { data: sess, error: sErr } = await supabase
      .from("supervision_sessions")
      .select("active_seconds")
      .eq("id", sessionId)
      .single();

    if (sErr) throw sErr;

    const prevActive = Number(sess?.active_seconds ?? 0);

    const { error: uSess } = await supabase
      .from("supervision_sessions")
      .update({
        active_seconds: prevActive + addedSeconds,
        last_activity_at: nowIso,
      })
      .eq("id", sessionId);

    if (uSess) throw uSess;

    await increment_supervision_progress_seconds(supabase, userId, addedSeconds);
  } else {
    const { error: touchErr } = await supabase
      .from("supervision_sessions")
      .update({ last_activity_at: nowIso })
      .eq("id", sessionId);

    if (touchErr) throw touchErr;
  }

  return addedSeconds;
}

export async function finish_supervision_session(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const nowIso = new Date().toISOString();

  await track_supervision_activity(supabase, userId);

  const { error } = await supabase
    .from("supervision_sessions")
    .update({ is_open: false, closed_at: nowIso })
    .eq("user_id", userId)
    .eq("is_open", true);

  if (error) throw error;
}
