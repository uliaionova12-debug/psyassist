import type { SupabaseClient } from "@supabase/supabase-js";

import type { SupervisionProgressComputed } from "@/lib/persistence/types";

const TARGET_MINUTES = 600;

export async function ensure_supervision_progress_row(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("supervision_progress")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return;

  const now = new Date().toISOString();
  const { error: insErr } = await supabase.from("supervision_progress").insert({
    user_id: userId,
    total_active_seconds: 0,
    created_at: now,
    updated_at: now,
  });

  if (!insErr) return;
  if (insErr.code === "23505") return;
  throw insErr;
}

export async function increment_supervision_progress_seconds(
  supabase: SupabaseClient,
  userId: string,
  deltaSeconds: number
): Promise<void> {
  if (deltaSeconds <= 0) return;

  await ensure_supervision_progress_row(supabase, userId);

  const { data: row, error: selErr } = await supabase
    .from("supervision_progress")
    .select("total_active_seconds")
    .eq("user_id", userId)
    .single();

  if (selErr) throw selErr;

  const prev = Number(row?.total_active_seconds ?? 0);
  const now = new Date().toISOString();

  const { error: updErr } = await supabase
    .from("supervision_progress")
    .update({
      total_active_seconds: prev + deltaSeconds,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (updErr) throw updErr;
}

export async function get_supervision_progress(
  supabase: SupabaseClient,
  userId: string
): Promise<SupervisionProgressComputed> {
  const { data, error } = await supabase
    .from("supervision_progress")
    .select("total_active_seconds")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const totalSeconds = Number(data?.total_active_seconds ?? 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    total_seconds: totalSeconds,
    total_minutes: totalMinutes,
    hours,
    minutes,
    target_hours: 10,
    target_minutes: TARGET_MINUTES,
    progress_percent: Math.min(Math.round((totalMinutes / TARGET_MINUTES) * 100), 100),
  };
}

export function format_supervision_time(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} мин`;
  }

  if (minutes === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${minutes} мин`;
}
