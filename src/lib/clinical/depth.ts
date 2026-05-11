/**
 * Depth selection for clarifying-question nav flow (DEPTH_LABELS / depth_* callbacks)
 * and session depth for supervision modules (sdepth_* callbacks), from main.py.
 */

/** Callback keys → number of clarifying questions before nav analysis (depth_keyboard). */
export const DEPTH_LABELS = {
  depth_3: 3,
  depth_5: 5,
  depth_deep: 8,
} as const;

export type DepthLabelCallbackKey = keyof typeof DEPTH_LABELS;

/** Session module flow: callback_data from session_depth_keyboard(). */
export const SESSION_DEPTH_CALLBACK = {
  THREE: "sdepth_3",
  FIVE: "sdepth_5",
  AI: "sdepth_ai",
} as const;

export type SessionDepthCallbackKey =
  (typeof SESSION_DEPTH_CALLBACK)[keyof typeof SESSION_DEPTH_CALLBACK];

/** Matches handler: depth_map = {"sdepth_3": 3, "sdepth_5": 5, "sdepth_ai": "ai"} */
export const SESSION_DEPTH_QUESTION_COUNT: Record<
  SessionDepthCallbackKey,
  number | "ai"
> = {
  sdepth_3: 3,
  sdepth_5: 5,
  sdepth_ai: "ai",
};

/** Labels on session_depth_keyboard() (full button text). */
export const SESSION_DEPTH_KEYBOARD_LABELS: Record<SessionDepthCallbackKey, string> = {
  sdepth_3: "⚡ 3 вопроса — быстрый фокус",
  sdepth_5: "🌿 5 вопросов — глубокий разбор",
  sdepth_ai: "🧭 На ваше клиническое усмотрение",
};

/** Short labels used in reply after selection (handler depth_labels). */
export const SESSION_DEPTH_CONFIRM_LABELS: Record<SessionDepthCallbackKey, string> = {
  sdepth_3: "⚡ 3 вопроса",
  sdepth_5: "🌿 5 вопросов",
  sdepth_ai: "🧭 На усмотрение",
};

export const SESSION_DEPTH_ORDER: SessionDepthCallbackKey[] = [
  SESSION_DEPTH_CALLBACK.THREE,
  SESSION_DEPTH_CALLBACK.FIVE,
  SESSION_DEPTH_CALLBACK.AI,
];
