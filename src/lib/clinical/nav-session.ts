/**
 * Web NAV session helpers: level ordering, clarifying depth (depth_*), typing.
 */

import { DEPTH_LABELS, type DepthLabelCallbackKey } from "@/lib/clinical/depth";
import { ALL_LEVELS, LEVEL_LABELS, LEVEL_NAV_MAP, type NavLevelKey } from "@/lib/clinical/navigation";

/** Уровни навигации для UI (порядок как в Replit ALL_LEVELS). */
export const NAV_LEVEL_UI_ORDER: readonly NavLevelKey[] = ALL_LEVELS;

export function navKeyForLevel(level: string): string | undefined {
  return LEVEL_NAV_MAP[level];
}

export function navLevelLabel(level: string): string {
  return LEVEL_LABELS[level] ?? level;
}

export const NAV_CLARIFYING_DEPTH_ORDER: readonly DepthLabelCallbackKey[] = [
  "depth_3",
  "depth_5",
  "depth_deep",
];

export const NAV_CLARIFYING_DEPTH_LABELS: Record<DepthLabelCallbackKey, string> = {
  depth_3: "⚡ 3 уточняющих вопроса — быстрый фокус",
  depth_5: "🌿 5 уточняющих вопросов — глубокий разбор",
  depth_deep: "🧭 8 уточняющих вопросов — глубокий слой",
};

export function clarifyingQuestionCountForDepth(depth: DepthLabelCallbackKey): number {
  return DEPTH_LABELS[depth];
}

export const NAV_CLARIFYING_INTRO =
  "Сейчас задам уточняющие вопросы по одному. " +
  "После ваших ответов соберу финальный супервизионный анализ.";
