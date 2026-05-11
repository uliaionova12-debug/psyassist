/**
 * Продуктовые имена событий PsyAssist — единый справочник для серверных логов и клиента.
 */

export const PRODUCT_EVENTS = {
  free_intro_started: "free_intro_started",
  free_intro_completed: "free_intro_completed",
  session_start: "session_start",
  confidentiality_accepted: "confidentiality_accepted",
  case_started: "case_started",
  case_saved: "case_saved",
  supervision_request_detected: "supervision_request_detected",
  supervision_request_confirmed: "supervision_request_confirmed",
  focus_selected: "focus_selected",
  depth_selected: "depth_selected",
  question_started: "question_started",
  question_answered: "question_answered",
  integration_reflection_started: "integration_reflection_started",
  integration_reflection_completed: "integration_reflection_completed",
  nav_started: "nav_started",
  nav_question_answered: "nav_question_answered",
  nav_completed: "nav_completed",
  tension_detected: "tension_detected",
  tension_probe_answered: "tension_probe_answered",
  chat_analysis_started: "chat_analysis_started",
  chat_analysis_completed: "chat_analysis_completed",
  paywall_seen: "paywall_seen",
  single_case_selected: "single_case_selected",
  start_plan_selected: "start_plan_selected",
  practice_plan_selected: "practice_plan_selected",
  checkout_started: "checkout_started",
  checkout_success: "checkout_success",
  checkout_failed: "checkout_failed",
  session_finished: "session_finished",
  therapist_specialization_selected: "therapist_specialization_selected",
  therapist_methods_selected: "therapist_methods_selected",
  free_intro_analysis_started: "free_intro_analysis_started",
  free_intro_analysis_completed: "free_intro_analysis_completed",
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];
