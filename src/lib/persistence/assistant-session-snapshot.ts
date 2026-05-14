import type { SupervisionSession } from "@/lib/clinical/session";
import { INITIAL_SUPERVISION_SESSION } from "@/lib/clinical/session";

const STORAGE_KEY = "psyassist_assistant_session_v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 72; // 72h

export type AssistantSessionSnapshotV1 = {
  v: 1;
  savedAt: number;
  session: SupervisionSession;
  pendingAppends: string[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function mergeRestoredSession(raw: unknown): SupervisionSession | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.step !== "string") return null;
  return { ...INITIAL_SUPERVISION_SESSION, ...raw } as SupervisionSession;
}

/** Validate JSON stored in `cases.session_snapshot` (no TTL; used for «Продолжить»). */
export function parseAssistantSnapshotJsonFromServer(raw: unknown): AssistantSessionSnapshotV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.v !== 1) return null;
  const session = mergeRestoredSession(raw.session);
  if (!session) return null;
  const pending = raw.pendingAppends;
  const pendingAppends =
    Array.isArray(pending) && pending.every((x) => typeof x === "string") ? pending.slice() : [];
  return {
    v: 1,
    savedAt: typeof raw.savedAt === "number" ? raw.savedAt : Date.now(),
    session,
    pendingAppends,
  };
}

export function readAssistantSessionSnapshotForInit(targetRef: { current: string[] }): SupervisionSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const json = sessionStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    if (!isRecord(parsed)) return null;
    if (parsed.v !== 1 || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const session = mergeRestoredSession(parsed.session);
    if (!session) return null;
    const pending = parsed.pendingAppends;
    if (Array.isArray(pending) && pending.every((x) => typeof x === "string")) {
      targetRef.current = pending.slice();
    } else {
      targetRef.current = [];
    }
    return session;
  } catch {
    return null;
  }
}

export function saveAssistantSessionSnapshot(session: SupervisionSession, pendingAppends: string[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: AssistantSessionSnapshotV1 = {
      v: 1,
      savedAt: Date.now(),
      session,
      pendingAppends: pendingAppends.slice(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearAssistantSessionSnapshot(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
