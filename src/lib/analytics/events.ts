/**
 * Клиентский слой продуктовой аналитики → POST /api/analytics/track → Supabase product_events.
 * При недоступности Supabase на сервере событие тихо пропускается (без ошибок в UI).
 */

import type { ProductEventName } from "@/lib/analytics/constants";

const STORAGE_KEY = "psyassist_product_analytics_session_id";

export type TrackEventInput = {
  eventName: ProductEventName | string;
  eventCategory?: string;
  step?: string;
  /** UUID кейса в Postgres (если появится uuid у cases); иначе можно не передавать — см. payload.persistenceCaseId */
  caseId?: string;
  payload?: Record<string, unknown>;
};

function safeSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 8) {
      id = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Отправляет продуктовое событие. Сетевые и серверные ошибки не пробрасывает.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  if (typeof window === "undefined") return;

  const sessionId = safeSessionId();
  const body = {
    eventName: input.eventName,
    eventCategory: input.eventCategory,
    step: input.step,
    caseId: input.caseId,
    payload: input.payload,
    sessionId: sessionId || undefined,
  };

  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* analytics disabled / offline — без шума */
  }
}
