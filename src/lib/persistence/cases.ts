import type { SupabaseClient } from "@supabase/supabase-js";

import type { CaseRow, CaseSummaryRow } from "@/lib/persistence/types";

export type SaveCaseInput = {
  userName: string | null;
  caseTitle: string;
  clientName: string;
  firstSessionDate: string;
  initialCase: string;
};

export async function save_case(
  supabase: SupabaseClient,
  userId: string,
  input: SaveCaseInput
): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("cases")
    .insert({
      user_id: userId,
      user_name: input.userName,
      case_title: input.caseTitle,
      client_name: input.clientName,
      first_session_date: input.firstSessionDate,
      initial_case: input.initialCase,
      case_context: "",
      created_at: now,
      updated_at: now,
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("save_case: missing id");
  return Number(data.id);
}

export async function append_case_context(
  supabase: SupabaseClient,
  caseId: number,
  addition: string
): Promise<void> {
  const now = new Date().toISOString();

  const { data: row, error: selErr } = await supabase
    .from("cases")
    .select("case_context")
    .eq("id", caseId)
    .single();

  if (selErr) throw selErr;

  const prev = (row?.case_context as string | null) ?? "";
  const next = prev ? `${prev}\n\n${addition}` : addition;

  const { error: updErr } = await supabase
    .from("cases")
    .update({ case_context: next, updated_at: now })
    .eq("id", caseId);

  if (updErr) throw updErr;
}

export async function update_case_initial(
  supabase: SupabaseClient,
  caseId: number,
  initialCase: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("cases")
    .update({ initial_case: initialCase, updated_at: now })
    .eq("id", caseId);

  if (error) throw error;
}

export async function get_user_cases(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<CaseSummaryRow[]> {
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, case_title, client_name, first_session_date, created_at, updated_at, status, focus, current_step, current_layer, duration_minutes, last_insight, resume_available"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CaseSummaryRow[];
}

export type CaseStructuredPatch = {
  focus: string | null;
  current_step: string | null;
  current_layer: string | null;
  current_question: string | null;
  duration_minutes: number | null;
  last_insight: string | null;
  session_snapshot: unknown;
  /** Optional refresh from intake when completing. */
  case_title?: string | null;
};

export async function complete_case_session(
  supabase: SupabaseClient,
  caseId: number,
  userId: string,
  patch: CaseStructuredPatch
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("cases")
    .update({
      focus: patch.focus,
      current_step: patch.current_step,
      current_layer: patch.current_layer,
      current_question: patch.current_question,
      duration_minutes: patch.duration_minutes,
      last_insight: patch.last_insight,
      session_snapshot: patch.session_snapshot,
      status: "completed",
      updated_at: now,
      ...(patch.case_title != null && patch.case_title.trim()
        ? { case_title: patch.case_title.trim(), client_name: patch.case_title.trim() }
        : {}),
    })
    .eq("id", caseId)
    .eq("user_id", userId);

  if (error) throw error;
}

export type CaseProgressPatch = {
  focus?: string | null;
  current_step?: string | null;
  current_layer?: string | null;
  current_question?: string | null;
  duration_minutes?: number | null;
};

export async function patch_case_progress(
  supabase: SupabaseClient,
  caseId: number,
  userId: string,
  fields: CaseProgressPatch
): Promise<void> {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("cases")
    .update({ ...fields, updated_at: now })
    .eq("id", caseId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function patch_case_status(
  supabase: SupabaseClient,
  caseId: number,
  userId: string,
  status: "active" | "completed" | "archived"
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("cases")
    .update({ status, updated_at: now })
    .eq("id", caseId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function get_case_session_snapshot_json(
  supabase: SupabaseClient,
  caseId: number,
  userId: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from("cases")
    .select("session_snapshot")
    .eq("id", caseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.session_snapshot as unknown) ?? null;
}

export async function get_case_by_id(
  supabase: SupabaseClient,
  caseId: number
): Promise<CaseRow | null> {
  const { data, error } = await supabase.from("cases").select("*").eq("id", caseId).maybeSingle();

  if (error) throw error;
  return data as CaseRow | null;
}
