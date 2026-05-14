import { SESSION_DEPTH_KEYBOARD_LABELS } from "@/lib/clinical/depth";
import { getQuestionsForFocus, getTotalQuestionCount } from "@/lib/clinical/session";
import type { SupervisionSession } from "@/lib/clinical/session";

/** Parse first integer from free-text duration (e.g. «45 мин», «1 час» → null for hour-only MVP). */
export function parseTherapyDurationMinutes(raw: string | undefined): number | null {
  const s = raw?.trim();
  if (!s) return null;
  const m = s.match(/(\d+)\s*(?:мин|минут|min)/i);
  if (m) return Math.min(24 * 60, Math.max(1, parseInt(m[1]!, 10)));
  const h = s.match(/(\d+)\s*(?:час|часа|часов|h)\b/i);
  if (h) return Math.min(24 * 60, Math.max(1, parseInt(h[1]!, 10) * 60));
  const bare = s.match(/^(\d{1,3})$/);
  if (bare) return Math.min(24 * 60, Math.max(1, parseInt(bare[1]!, 10)));
  return null;
}

export type CaseCardMeta = {
  focus: string | null;
  current_step: string | null;
  current_layer: string | null;
  duration_minutes: number | null;
  last_insight: string | null;
  current_question: string | null;
};

export function deriveCaseCardMeta(session: SupervisionSession): CaseCardMeta {
  const focus =
    session.focusLabel?.trim() ||
    (session.supervisionRequest?.trim() ? session.supervisionRequest.trim().slice(0, 200) : null);

  const current_step = session.step;

  let current_layer: string | null = null;
  if (session.navKey?.trim()) {
    current_layer = `Навигация: ${session.navKey.trim()}`;
  } else if (session.sessionDepth) {
    current_layer = SESSION_DEPTH_KEYBOARD_LABELS[session.sessionDepth] ?? session.sessionDepth;
  }

  const duration_minutes = parseTherapyDurationMinutes(session.intake.therapy_duration);

  let last_insight: string | null = null;
  if (session.reflectionStatus === "success" && session.reflectionText.trim()) {
    last_insight = session.reflectionText.trim().slice(0, 800);
  } else if (session.closingTherapistTakeaway.trim()) {
    last_insight = session.closingTherapistTakeaway.trim().slice(0, 800);
  } else if (session.closingNextModuleChoice?.trim()) {
    last_insight = session.closingNextModuleChoice.trim().slice(0, 400);
  }

  let current_question: string | null = null;
  if (session.focusKey && session.sessionDepth) {
    const bank = getQuestionsForFocus(session.focusKey);
    const total = getTotalQuestionCount(session.focusKey, session.sessionDepth);
    const idx = session.questionModuleIdx;
    if (bank && idx >= 0 && idx < total && idx < bank.length) {
      const q = bank[idx];
      current_question = typeof q === "string" ? q : null;
    }
  }

  return {
    focus,
    current_step,
    current_layer,
    duration_minutes,
    last_insight,
    current_question,
  };
}
