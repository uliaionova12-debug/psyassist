/**
 * Supervision focus labels and UI→bank key map from main.py.
 */

import type { QuestionBankKey } from "@/lib/clinical/question-bank";

export const SUPERVISION_FOCUS_LABELS = {
  focus_client: "👤 Уровень клиента",
  focus_clinical: "🧠 Клинические гипотезы",
  focus_transference: "❤️ Перенос и контрперенос",
  focus_resistance: "🔄 Сопротивления и тупики",
  focus_intervention: "🛠 Интервенции и тактика",
  focus_dynamics: "📈 Динамика терапии",
  focus_deep: "🌳 Глубинный конфликт / структура личности",
} as const;

export type SupervisionFocusCallbackKey = keyof typeof SUPERVISION_FOCUS_LABELS;

/** Maps displayed label (as used in Telegram inline buttons) to QUESTION_BANK entry key. */
export const FOCUS_KEY_MAP: Record<string, QuestionBankKey> = {
  "👤 Уровень клиента": "client_level",
  "🧠 Клинические гипотезы": "clinical_hypothesis",
  "❤️ Перенос и контрперенос": "transference",
  "🔄 Сопротивления и тупики": "resistance",
  "🛠 Интервенции и тактика": "interventions",
  "📈 Динамика терапии": "therapy_dynamics",
  "🌳 Глубинный конфликт / структура личности": "deep_conflict",
};

/** Telegram main.py detect_focus_key_from_text */
export function detect_focus_key_from_text(text: string): QuestionBankKey {
  const t = text.toLowerCase();
  if (t.includes("клиент") && !t.includes("гипотез") && t.includes("уровень")) {
    return "client_level";
  }
  if (t.includes("клинич") || t.includes("гипотез")) {
    return "clinical_hypothesis";
  }
  if (t.includes("перенос") || t.includes("контрперенос")) {
    return "transference";
  }
  if (t.includes("сопротивл") || t.includes("тупик")) {
    return "resistance";
  }
  if (t.includes("интервенц") || t.includes("тактик")) {
    return "interventions";
  }
  if (t.includes("динамик")) {
    return "therapy_dynamics";
  }
  if (t.includes("глубинн") || t.includes("структур") || t.includes("конфликт")) {
    return "deep_conflict";
  }
  return "clinical_hypothesis";
}
