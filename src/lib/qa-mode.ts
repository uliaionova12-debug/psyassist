type SearchParamsLike = { get(name: string): string | null } | null | undefined;

let serverQaFlag = false;

function parseBoolLike(v: string | null): boolean {
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function readQaQueryParam(sp?: SearchParamsLike): boolean {
  const raw =
    sp?.get("qa") ??
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("qa") : null);
  return raw === "true";
}

export function isQaModeClient(searchParams?: SearchParamsLike): boolean {
  if (readQaQueryParam(searchParams)) return true;
  return parseBoolLike(process.env.NEXT_PUBLIC_FOUNDER_MODE ?? null);
}

export function isQaMode(): boolean {
  if (typeof window === "undefined") return false;
  return isQaModeClient() || serverQaFlag;
}

export function setQaModeServerFlag(enabled: boolean): void {
  serverQaFlag = enabled;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("psyassist:qa_mode", { detail: { enabled } }));
  }
}

export function subscribeQaMode(cb: (enabled: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (e: Event) => {
    const enabled = Boolean((e as CustomEvent | undefined)?.detail?.enabled);
    cb(enabled);
  };
  window.addEventListener("psyassist:qa_mode", handler as EventListener);
  return () => window.removeEventListener("psyassist:qa_mode", handler as EventListener);
}

export function isQaModeServer(userEmail: string | null | undefined): boolean {
  const founder = process.env.FOUNDER_EMAIL?.trim();
  if (!founder) return false;
  const email = (userEmail ?? "").trim();
  if (!email) return false;
  return email.toLowerCase() === founder.toLowerCase();
}

/** Server-side gate for founder/internal telemetry (matches client QA: env flag or founder email). */
export function isFounderTelemetryServer(userEmail: string | null | undefined): boolean {
  if (parseBoolLike(process.env.NEXT_PUBLIC_FOUNDER_MODE ?? null)) return true;
  return isQaModeServer(userEmail);
}

