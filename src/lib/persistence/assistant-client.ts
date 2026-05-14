/**
 * Browser helpers for PsyAssist persistence API routes (cookie session → Supabase).
 */

import type { AssistantSessionSnapshotV1 } from "@/lib/persistence/assistant-session-snapshot";
import type { SupervisionCase, SupervisionCaseSummary } from "@/lib/persistence/types";

export type PersistenceFailureCode =
  | "SUPABASE_DISABLED"
  | "NO_SESSION"
  | "INVALID_BODY"
  | "INVALID_ID"
  | "SAVE_FAILED"
  | "APPEND_FAILED"
  | "UPDATE_FAILED"
  | "SUPERVISION_SESSION_FAILED"
  | "PROGRESS_FAILED"
  | string;

export type SaveCaseBody = {
  userName?: string | null;
  caseTitle: string;
  clientName: string;
  firstSessionDate: string;
  initialCase: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  return (await res.json()) as T;
}

export async function persistence_list_cases(): Promise<
  | { ok: true; cases: SupervisionCaseSummary[] }
  | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const data = await getJson<{
    ok?: boolean;
    cases?: SupervisionCaseSummary[];
    code?: PersistenceFailureCode;
    message?: string;
  }>("/api/persistence/cases");
  if (data.ok && Array.isArray(data.cases)) return { ok: true, cases: data.cases };
  return { ok: false, code: data.code ?? "LIST_FAILED", message: data.message };
}

export async function persistence_get_supervision_case(caseId: number): Promise<
  | { ok: true; case: SupervisionCase }
  | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const data = await getJson<{
    ok?: boolean;
    case?: SupervisionCase;
    code?: PersistenceFailureCode;
    message?: string;
  }>(`/api/persistence/cases/${caseId}`);
  if (data.ok && data.case) return { ok: true, case: data.case };
  return { ok: false, code: data.code ?? "FETCH_FAILED", message: data.message };
}

export function isPersistenceUnavailableCode(code: PersistenceFailureCode | undefined): boolean {
  return code === "SUPABASE_DISABLED" || code === "NO_SESSION";
}

export async function persistence_supervision_start(): Promise<
  { ok: true } | { ok: false; code: PersistenceFailureCode }
> {
  const data = await postJson<{ ok?: boolean; code?: PersistenceFailureCode }>(
    "/api/persistence/supervision",
    { action: "start" }
  );
  if (data.ok) return { ok: true };
  return { ok: false, code: data.code ?? "SUPERVISION_SESSION_FAILED" };
}

export async function persistence_supervision_track(): Promise<
  { ok: true; addedSeconds?: number } | { ok: false; code: PersistenceFailureCode }
> {
  const data = await postJson<{
    ok?: boolean;
    addedSeconds?: number;
    code?: PersistenceFailureCode;
  }>("/api/persistence/supervision", { action: "track" });
  if (data.ok) return { ok: true, addedSeconds: data.addedSeconds };
  return { ok: false, code: data.code ?? "SUPERVISION_SESSION_FAILED" };
}

export async function persistence_supervision_finish(): Promise<
  { ok: true } | { ok: false; code: PersistenceFailureCode }
> {
  const data = await postJson<{ ok?: boolean; code?: PersistenceFailureCode }>(
    "/api/persistence/supervision",
    { action: "finish" }
  );
  if (data.ok) return { ok: true };
  return { ok: false, code: data.code ?? "SUPERVISION_SESSION_FAILED" };
}

export async function persistence_save_case(body: SaveCaseBody): Promise<
  { ok: true; caseId: number } | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const data = await postJson<{
    ok?: boolean;
    caseId?: number;
    code?: PersistenceFailureCode;
    message?: string;
  }>("/api/persistence/cases", body);
  if (data.ok && data.caseId != null) return { ok: true, caseId: Number(data.caseId) };
  return {
    ok: false,
    code: data.code ?? "SAVE_FAILED",
    message: data.message,
  };
}

export async function persistence_append_case_context(
  caseId: number,
  addition: string
): Promise<{ ok: true } | { ok: false; code: PersistenceFailureCode; message?: string }> {
  const data = await postJson<{
    ok?: boolean;
    code?: PersistenceFailureCode;
    message?: string;
  }>(`/api/persistence/cases/${caseId}/context`, { addition });
  if (data.ok) return { ok: true };
  return {
    ok: false,
    code: data.code ?? "APPEND_FAILED",
    message: data.message,
  };
}

export async function persistence_update_case_initial(
  caseId: number,
  initialCase: string
): Promise<{ ok: true } | { ok: false; code: PersistenceFailureCode; message?: string }> {
  const data = await patchJson<{
    ok?: boolean;
    code?: PersistenceFailureCode;
    message?: string;
  }>(`/api/persistence/cases/${caseId}/initial`, { initialCase });
  if (data.ok) return { ok: true };
  return {
    ok: false,
    code: data.code ?? "UPDATE_FAILED",
    message: data.message,
  };
}

export type CompleteCaseSessionBody = {
  snapshot: { v: 1; savedAt?: number; session: unknown; pendingAppends?: string[] };
  focus: string | null;
  current_step: string | null;
  current_layer: string | null;
  current_question: string | null;
  duration_minutes: number | null;
  last_insight: string | null;
  case_title?: string | null;
};

export async function persistence_complete_case_session(
  caseId: number,
  body: CompleteCaseSessionBody
): Promise<{ ok: true } | { ok: false; code: PersistenceFailureCode; message?: string }> {
  const data = await postJson<{
    ok?: boolean;
    code?: PersistenceFailureCode;
    message?: string;
  }>(`/api/persistence/cases/${caseId}/complete`, body);
  if (data.ok) return { ok: true };
  return {
    ok: false,
    code: data.code ?? "COMPLETE_FAILED",
    message: data.message,
  };
}

export async function persistence_patch_case_status(
  caseId: number,
  status: "active" | "completed" | "archived"
): Promise<{ ok: true } | { ok: false; code: PersistenceFailureCode; message?: string }> {
  const data = await patchJson<{
    ok?: boolean;
    code?: PersistenceFailureCode;
    message?: string;
  }>(`/api/persistence/cases/${caseId}`, { status });
  if (data.ok) return { ok: true };
  return {
    ok: false,
    code: data.code ?? "PATCH_FAILED",
    message: data.message,
  };
}

export async function persistence_get_case_resume(caseId: number): Promise<
  | { ok: true; snapshot: AssistantSessionSnapshotV1 }
  | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const data = await getJson<{
    ok?: boolean;
    snapshot?: AssistantSessionSnapshotV1;
    code?: PersistenceFailureCode;
    message?: string;
  }>(`/api/persistence/cases/${caseId}/resume`);
  if (data.ok && data.snapshot?.v === 1) return { ok: true, snapshot: data.snapshot };
  return {
    ok: false,
    code: data.code ?? "RESUME_FAILED",
    message: data.message,
  };
}
