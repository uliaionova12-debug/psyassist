/**
 * Browser helpers for PsyAssist persistence API routes (cookie session → Supabase).
 */

import { syncBrowserSessionToServer } from "@/lib/auth/sync-browser-session";
import type { AssistantSessionSnapshotV1 } from "@/lib/persistence/assistant-session-snapshot";
import {
  normalizeSupervisionCaseSummary,
  persistenceDisplayString,
} from "@/lib/persistence/supervision-case";
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

type PersistenceJson = Record<string, unknown>;

async function readJsonBody(res: Response): Promise<PersistenceJson | null> {
  try {
    const text = await res.text();
    if (!text.trim()) return null;
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as PersistenceJson) : null;
  } catch {
    return null;
  }
}

function persistenceBodyOk(data: PersistenceJson | null): boolean {
  if (!data) return false;
  if (data.ok === true || data.success === true) return true;
  return false;
}

function persistenceBodyFailed(data: PersistenceJson | null): boolean {
  if (!data) return false;
  if (data.ok === false || data.success === false) return true;
  return typeof data.code === "string" && data.code.length > 0;
}

/** Treat 2xx with a JSON body and no explicit failure as success (legacy/alternate API shapes). */
function persistenceHttpSucceeded(res: Response, data: PersistenceJson | null): boolean {
  if (persistenceBodyOk(data)) return true;
  if (!res.ok || !data) return false;
  return !persistenceBodyFailed(data);
}

function persistenceReadCaseId(data: PersistenceJson | null): number | null {
  if (!data) return null;
  const raw = data.caseId ?? data.case_id ?? data.id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function postJson(url: string, body: unknown): Promise<{ res: Response; data: PersistenceJson | null }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return { res, data: await readJsonBody(res) };
}

async function patchJson(url: string, body: unknown): Promise<{ res: Response; data: PersistenceJson | null }> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return { res, data: await readJsonBody(res) };
}

async function getJson(url: string): Promise<{ res: Response; data: PersistenceJson | null }> {
  const res = await fetch(url, { credentials: "include" });
  return { res, data: await readJsonBody(res) };
}

export async function persistence_list_cases(): Promise<
  | { ok: true; cases: SupervisionCaseSummary[] }
  | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const { res, data } = await getJson("/api/persistence/cases");
  if (persistenceHttpSucceeded(res, data) && Array.isArray(data?.cases)) {
    const cases = data!.cases
      .map((row) => normalizeSupervisionCaseSummary(row))
      .filter((c): c is SupervisionCaseSummary => c != null);
    return { ok: true, cases };
  }
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "LIST_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
  };
}

export async function persistence_get_supervision_case(caseId: number): Promise<
  | { ok: true; case: SupervisionCase }
  | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const { res, data } = await getJson(`/api/persistence/cases/${caseId}`);
  const summary = data?.case != null ? normalizeSupervisionCaseSummary(data.case) : null;
  if (persistenceHttpSucceeded(res, data) && summary) {
    return { ok: true, case: { ...(data!.case as SupervisionCase), ...summary } };
  }
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "FETCH_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
  };
}

export function isPersistenceUnavailableCode(code: PersistenceFailureCode | undefined): boolean {
  return code === "SUPABASE_DISABLED" || code === "NO_SESSION";
}

async function persistence_probe_server_auth(): Promise<boolean> {
  try {
    const res = await fetch("/api/user/profile", { credentials: "include", cache: "no-store" });
    const data = (await res.json()) as { ok?: boolean };
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

/** Sync browser session → server cookies, then verify API routes see the user (finish save/complete). */
export async function persistence_ensure_server_auth(): Promise<boolean> {
  if (await persistence_probe_server_auth()) return true;
  const synced = await syncBrowserSessionToServer();
  return synced.ok;
}

export async function persistence_supervision_start(): Promise<
  { ok: true } | { ok: false; code: PersistenceFailureCode }
> {
  const { res, data } = await postJson("/api/persistence/supervision", { action: "start" });
  if (persistenceHttpSucceeded(res, data)) return { ok: true };
  return { ok: false, code: (data?.code as PersistenceFailureCode | undefined) ?? "SUPERVISION_SESSION_FAILED" };
}

export async function persistence_supervision_track(): Promise<
  { ok: true; addedSeconds?: number } | { ok: false; code: PersistenceFailureCode }
> {
  const { res, data } = await postJson("/api/persistence/supervision", { action: "track" });
  if (persistenceHttpSucceeded(res, data)) {
    const added =
      typeof data?.addedSeconds === "number"
        ? data.addedSeconds
        : typeof data?.added_seconds === "number"
          ? data.added_seconds
          : undefined;
    return { ok: true, addedSeconds: added };
  }
  return { ok: false, code: (data?.code as PersistenceFailureCode | undefined) ?? "SUPERVISION_SESSION_FAILED" };
}

export async function persistence_supervision_finish(): Promise<
  { ok: true } | { ok: false; code: PersistenceFailureCode }
> {
  const { res, data } = await postJson("/api/persistence/supervision", { action: "finish" });
  if (persistenceHttpSucceeded(res, data)) return { ok: true };
  return { ok: false, code: (data?.code as PersistenceFailureCode | undefined) ?? "SUPERVISION_SESSION_FAILED" };
}

export async function persistence_save_case(body: SaveCaseBody): Promise<
  { ok: true; caseId: number } | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const { res, data } = await postJson("/api/persistence/cases", body);
  const caseId = persistenceReadCaseId(data);
  if (caseId != null && (persistenceHttpSucceeded(res, data) || res.ok)) return { ok: true, caseId };
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "SAVE_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
  };
}

export async function persistence_append_case_context(
  caseId: number,
  addition: string
): Promise<{ ok: true } | { ok: false; code: PersistenceFailureCode; message?: string }> {
  const { res, data } = await postJson(`/api/persistence/cases/${caseId}/context`, { addition });
  if (persistenceHttpSucceeded(res, data)) return { ok: true };
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "APPEND_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
  };
}

export async function persistence_update_case_initial(
  caseId: number,
  initialCase: string
): Promise<{ ok: true } | { ok: false; code: PersistenceFailureCode; message?: string }> {
  const { res, data } = await patchJson(`/api/persistence/cases/${caseId}/initial`, { initialCase });
  if (persistenceHttpSucceeded(res, data)) return { ok: true };
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "UPDATE_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
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
  const { res, data } = await postJson(`/api/persistence/cases/${caseId}/complete`, body);
  if (persistenceHttpSucceeded(res, data)) return { ok: true };
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "COMPLETE_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
  };
}

export async function persistence_patch_case_status(
  caseId: number,
  status: "active" | "completed" | "archived"
): Promise<{ ok: true } | { ok: false; code: PersistenceFailureCode; message?: string }> {
  const { res, data } = await patchJson(`/api/persistence/cases/${caseId}`, { status });
  if (persistenceHttpSucceeded(res, data)) return { ok: true };
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "PATCH_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
  };
}

export async function persistence_get_case_resume(caseId: number): Promise<
  | { ok: true; snapshot: AssistantSessionSnapshotV1 }
  | { ok: false; code: PersistenceFailureCode; message?: string }
> {
  const { res, data } = await getJson(`/api/persistence/cases/${caseId}/resume`);
  const snapshot = data?.snapshot as AssistantSessionSnapshotV1 | undefined;
  if (persistenceHttpSucceeded(res, data) && snapshot?.v === 1) return { ok: true, snapshot };
  return {
    ok: false,
    code: (data?.code as PersistenceFailureCode | undefined) ?? "RESUME_FAILED",
    message: persistenceDisplayString(data?.message) ?? undefined,
  };
}
