/**
 * Frontend supervision state machine (mirrors Telegram supervision branch).
 */

import {
  IONOVA_INTAKE_QUESTIONS,
  LOW_DATA_QUESTIONS_LIMIT,
  pickSupervisionTransition,
  type CaseIntakeStepKey,
} from "@/lib/clinical/intake";
import { SESSION_DEPTH_QUESTION_COUNT, type SessionDepthCallbackKey } from "@/lib/clinical/depth";
import {
  detect_focus_key_from_text,
  FOCUS_KEY_MAP,
  SUPERVISION_FOCUS_LABELS,
} from "@/lib/clinical/focuses";
import { QUESTION_BANK, type QuestionBankKey } from "@/lib/clinical/question-bank";
import { psychotypeWowEligible } from "@/lib/clinical/psychotype-nav";
import type { ChatFocusPromptKey } from "@/lib/clinical/chat-analysis";
import {
  THERAPIST_METHOD_OTHER,
  THERAPIST_SPECIALIZATION_OTHER,
} from "@/lib/clinical/therapist-profile";
import { isSupervisorStyleLabel } from "@/lib/clinical/supervisor-style";
import { isTensionInterruptEnabled } from "@/lib/clinical/tension-feature-flag";

export type NavTailPhase = "psychotype" | "supervision_followup";

export type SupervisionStep =
  | "confidentiality"
  | "confidentiality_more"
  | "case_reminder"
  | "case_name"
  | "therapy_duration"
  | "narrative_context"
  | "narrative_clinical"
  | "detecting_supervision_request"
  | "low_data_choice"
  | "low_data_add_material"
  | "low_data_ionova"
  | "supervision_request_confirm"
  | "supervision_request"
  | "therapist_specialization"
  | "therapist_methods"
  | "supervisor_style_selection"
  | "focus_selection"
  | "focus_help_notice"
  | "depth_selection"
  | "question_flow"
  | "integration_reflection"
  | "closing_step1"
  | "closing_step2"
  | "closing_step3"
  | "closing_step4"
  | "post_reflection"
  | "nav_depth_selection"
  | "nav_clarifying_loading"
  | "nav_clarifying"
  | "nav_final_loading"
  | "nav_final_result"
  | "nav_tail_flow"
  | "tension_stop_loading"
  | "tension_stop"
  | "tension_hypothesis_loading"
  | "chat_analysis_focus"
  | "chat_analysis_compose"
  | "chat_analysis_loading"
  | "chat_analysis_result"
  | "finished";

/** When true, suppress auth/persistence banners until post-reflection or finished. */
export function clinicalSessionBlocksAuth(step: SupervisionStep): boolean {
  return step !== "post_reflection" && step !== "finished";
}

export type SessionDepth = SessionDepthCallbackKey;

/** Контекст interrupt напряжения — после probe даём гипотезу и только затем двигаем модуль. */
export interface TensionPendingState {
  moduleIdx: number;
  moduleNum: number;
  moduleName: string;
  moduleQuestion: string;
  originalAnswer: string;
  probeAnswer?: string;
}

/** Display label as in Telegram keyboard (emoji allowed). */
export type SupervisionFocus = string;

export interface SupervisionAnswer {
  module: string;
  question: string;
  answer: string;
  /** Рабочая гипотеза после tension probe (если был interrupt). */
  analysis?: string;
}

export interface CaseIntakeState {
  client_alias: string;
  therapy_duration: string;
}

export type ReflectionStatus = "idle" | "loading" | "success" | "error";

export type ClosingIntegrationStatus = "idle" | "loading" | "success" | "error";

export interface NavClarifyingAnswer {
  question: string;
  answer: string;
}

export interface SupervisionSession {
  step: SupervisionStep;
  draftInput: string;
  intake: Partial<CaseIntakeState>;
  narrativeContext: string;
  narrativeClinical: string;
  fullNarrative: string;
  narrativeSufficient: boolean | null;
  pendingDetectedRequest: string;
  pendingDetectionConfidence: number;
  supervisionRequest: string;
  focusLabel: SupervisionFocus | null;
  focusKey: QuestionBankKey | null;
  sessionDepth: SessionDepth | null;
  questionModuleIdx: number;
  supervisionAnswers: SupervisionAnswer[];
  transitionLine: string | null;
  ionovaIndex: number;
  ionovaAnswers: string[];
  reflectionStatus: ReflectionStatus;
  reflectionText: string;
  reflectionError: string;

  /** Post-synthesis mandatory closing flow (after integration reflection, before paywall). */
  closingStep1Answer: string | null;
  closingTherapistTakeaway: string;
  closingIntegrationStatus: ClosingIntegrationStatus;
  closingIntegrationText: string;
  closingIntegrationError: string;
  closingNextModuleChoice: string | null;
  /** Сохранённый кейс в Supabase (после первого сохранения нарратива) */
  remoteCaseId: number | null;
  navKey: string | null;
  navQuestionsTargetCount: number | null;
  navQuestions: string[];
  navAnswers: NavClarifyingAnswer[];
  navQuestionIndex: number;
  navClarifyingError: string;
  navFinalAnalysis: string;
  navFinalError: string;
  /** NAV-хвост после успешного анализа: типология → продолжение / завершение */
  navTailPhase: NavTailPhase | null;
  /** mark_level_done: пройденные nav_key */
  navLevelsCompletedNavKeys: string[];
  /** psychotype_wow_shown по remoteCaseId */
  psychotypeWowConsumedRemoteIds: number[];
  /** WOW без сохранённого кейса — один показ за сессию */
  psychotypeWowConsumedWithoutRemote: boolean;

  tensionPending: TensionPendingState | null;
  tensionStopText: string;
  tensionFlowError: string;
  /** After first full tension interrupt (hypothesis saved), do not enter tension again this session. */
  tensionCompleted: boolean;

  chatAnalysisFocusKey: ChatFocusPromptKey | null;
  chatAnalysisResult: string;
  chatAnalysisError: string;

  therapistSpecializations: string[];
  therapistMethods: string[];
  therapistOtherSpecialization: string;
  therapistOtherMethods: string;
  /** Выбранная позиция супервизора (RU label из SUPERVISOR_STYLE_OPTIONS). */
  supervisorStyle: string | null;
}

export const INITIAL_NAV_CYCLE_SLICE: Pick<
  SupervisionSession,
  | "navKey"
  | "navQuestionsTargetCount"
  | "navQuestions"
  | "navAnswers"
  | "navQuestionIndex"
  | "navClarifyingError"
  | "navFinalAnalysis"
  | "navFinalError"
> = {
  navKey: null,
  navQuestionsTargetCount: null,
  navQuestions: [],
  navAnswers: [],
  navQuestionIndex: 0,
  navClarifyingError: "",
  navFinalAnalysis: "",
  navFinalError: "",
};

export const INITIAL_NAV_TAIL_SLICE: Pick<SupervisionSession, "navTailPhase"> = {
  navTailPhase: null,
};

export const INITIAL_NAV_META_SLICE: Pick<
  SupervisionSession,
  "navLevelsCompletedNavKeys" | "psychotypeWowConsumedRemoteIds" | "psychotypeWowConsumedWithoutRemote"
> = {
  navLevelsCompletedNavKeys: [],
  psychotypeWowConsumedRemoteIds: [],
  psychotypeWowConsumedWithoutRemote: false,
};

export const INITIAL_NAV_FULL_RESET = {
  ...INITIAL_NAV_CYCLE_SLICE,
  ...INITIAL_NAV_TAIL_SLICE,
  ...INITIAL_NAV_META_SLICE,
};

export const FOCUS_HELP_LABEL = "🎯 Не уверен(а), помоги определить";

export const FOCUS_HELP_NOTICE =
  "Автоматический выбор фокуса по тексту кейса станет доступен позже. " +
  "Сейчас выберите фокус вручную — так вы сохраняете клиническую точность и полный контроль над разбором.";

/** Telegram retention_action_keyboard → web */
export type PostReflectionActionId =
  | "retain_countertransference"
  | "retain_intervention"
  | "retain_blind_spots"
  | "retain_dynamics"
  | "finish_after_reflection";

export const POST_REFLECTION_WEB_ACTIONS: {
  id: PostReflectionActionId;
  label: string;
  focusLabel: string;
  focusKey: QuestionBankKey;
  request: string;
}[] = [
  {
    id: "retain_countertransference",
    label: "🔥 Проверить мой контрперенос глубже",
    focusLabel: "❤️ Перенос и контрперенос",
    focusKey: "transference",
    request: "Проверить мой контрперенос глубже",
  },
  {
    id: "retain_intervention",
    label: "🎭 Смоделировать следующую интервенцию",
    focusLabel: "🛠 Интервенции и тактика",
    focusKey: "interventions",
    request: "Смоделировать следующую интервенцию",
  },
  {
    id: "retain_blind_spots",
    label: "🧠 Найти мои слепые зоны",
    focusLabel: "🔄 Сопротивления и тупики",
    focusKey: "resistance",
    request: "Найти мои слепые зоны",
  },
  {
    id: "retain_dynamics",
    label: "📈 Посмотреть динамику терапии",
    focusLabel: "📈 Динамика терапии",
    focusKey: "therapy_dynamics",
    request: "Посмотреть динамику терапии",
  },
];

export const POST_REFLECTION_FINISH_LABEL = "📒 Зафиксировать инсайт и завершить";

export const FOCUS_SELECTION_LABELS_ORDERED: string[] = [
  SUPERVISION_FOCUS_LABELS.focus_client,
  SUPERVISION_FOCUS_LABELS.focus_clinical,
  SUPERVISION_FOCUS_LABELS.focus_transference,
  SUPERVISION_FOCUS_LABELS.focus_resistance,
  SUPERVISION_FOCUS_LABELS.focus_intervention,
  SUPERVISION_FOCUS_LABELS.focus_dynamics,
  SUPERVISION_FOCUS_LABELS.focus_deep,
  FOCUS_HELP_LABEL,
];

export const INITIAL_SUPERVISION_SESSION: SupervisionSession = {
  step: "confidentiality",
  draftInput: "",
  intake: {},
  narrativeContext: "",
  narrativeClinical: "",
  fullNarrative: "",
  narrativeSufficient: null,
  pendingDetectedRequest: "",
  pendingDetectionConfidence: 0,
  supervisionRequest: "",
  focusLabel: null,
  focusKey: null,
  sessionDepth: null,
  questionModuleIdx: 0,
  supervisionAnswers: [],
  transitionLine: null,
  ionovaIndex: 0,
  ionovaAnswers: [],
  reflectionStatus: "idle",
  reflectionText: "",
  reflectionError: "",

  closingStep1Answer: null,
  closingTherapistTakeaway: "",
  closingIntegrationStatus: "idle",
  closingIntegrationText: "",
  closingIntegrationError: "",
  closingNextModuleChoice: null,
  remoteCaseId: null,
  ...INITIAL_NAV_FULL_RESET,

  tensionPending: null,
  tensionStopText: "",
  tensionFlowError: "",
  tensionCompleted: false,

  chatAnalysisFocusKey: null,
  chatAnalysisResult: "",
  chatAnalysisError: "",

  therapistSpecializations: [],
  therapistMethods: [],
  therapistOtherSpecialization: "",
  therapistOtherMethods: "",
  supervisorStyle: null,
};

export function getQuestionsForFocus(focusKey: QuestionBankKey): readonly string[] {
  const bank = QUESTION_BANK[focusKey];
  return bank ?? QUESTION_BANK.clinical_hypothesis;
}

export function getTotalQuestionCount(focusKey: QuestionBankKey, depth: SessionDepth): number {
  const bank = getQuestionsForFocus(focusKey);
  const sq = SESSION_DEPTH_QUESTION_COUNT[depth];
  if (sq === "ai") return bank.length;
  return Math.min(sq, bank.length);
}

export function resolveFocusKey(label: string): QuestionBankKey {
  return FOCUS_KEY_MAP[label] ?? detect_focus_key_from_text(label);
}

export function buildFullNarrative(context: string, clinical: string): string {
  const c = context.trim();
  const cl = clinical.trim();
  if (!c) return cl;
  if (!cl) return c;
  return `${c}\n\n${cl}`.trim();
}

export type SupervisionAction =
  | { type: "RESET" }
  | { type: "SET_REMOTE_CASE_ID"; caseId: number | null }
  | { type: "SET_DRAFT"; value: string }
  | { type: "CONFIDENTIALITY_CONTINUE" }
  | { type: "CONFIDENTIALITY_MORE" }
  | { type: "CONFIDENTIALITY_BACK" }
  | { type: "CASE_REMINDER_CONTINUE" }
  | { type: "SUBMIT_CASE_NAME" }
  | { type: "SUBMIT_THERAPY_DURATION" }
  | { type: "SUBMIT_NARRATIVE_CONTEXT" }
  | { type: "SUBMIT_NARRATIVE_CLINICAL"; sufficient: boolean }
  | { type: "LOW_DATA_ADD_MATERIAL" }
  | { type: "LOW_DATA_IONOVA" }
  | { type: "LOW_DATA_CONTINUE_ANYWAY" }
  | { type: "SUBMIT_EXTRA_MATERIAL" }
  | { type: "SUBMIT_IONOVA_ANSWER" }
  | { type: "DETECTION_RESULT"; detected: boolean; extracted: string; confidence: number }
  | { type: "SUP_REQUEST_CONFIRM" }
  | { type: "SUP_REQUEST_REFINE" }
  | { type: "SUBMIT_SUPERVISION_REQUEST" }
  | { type: "TOGGLE_THERAPIST_SPECIALIZATION"; option: string }
  | { type: "TOGGLE_THERAPIST_METHOD"; option: string }
  | { type: "SUBMIT_THERAPIST_SPECIALIZATION" }
  | { type: "SUBMIT_THERAPIST_METHODS" }
  | { type: "SELECT_SUPERVISOR_STYLE"; label: string }
  | { type: "SELECT_FOCUS"; label: string }
  | { type: "FOCUS_HELP_CONTINUE" }
  | { type: "SELECT_DEPTH"; depth: SessionDepth }
  | { type: "SUBMIT_QUESTION_ANSWER" }
  | { type: "TENSION_INTERRUPT_START" }
  | { type: "TENSION_STOP_SUCCESS"; text: string }
  | { type: "TENSION_STOP_FAILURE"; message: string }
  | { type: "TENSION_SUBMIT_PROBE" }
  | { type: "TENSION_HYPOTHESIS_SUCCESS"; analysis: string }
  | { type: "TENSION_HYPOTHESIS_FAILURE"; message: string }
  | { type: "TENSION_FLOW_CANCEL" }
  | { type: "OPEN_CHAT_ANALYSIS" }
  | { type: "CHAT_ANALYSIS_SELECT_FOCUS"; key: ChatFocusPromptKey }
  | { type: "CHAT_ANALYSIS_SUBMIT" }
  | { type: "CHAT_ANALYSIS_SUCCESS"; text: string }
  | { type: "CHAT_ANALYSIS_FAILURE"; message: string }
  | { type: "CHAT_ANALYSIS_BACK" }
  | { type: "REFLECTION_LOADING" }
  | { type: "REFLECTION_SUCCESS"; text: string }
  | { type: "REFLECTION_ERROR"; message: string }
  | { type: "CLOSING_STEP1_SELECT"; value: string }
  | { type: "CLOSING_STEP2_SUBMIT" }
  | { type: "CLOSING_INTEGRATION_LOADING" }
  | { type: "CLOSING_INTEGRATION_SUCCESS"; text: string }
  | { type: "CLOSING_INTEGRATION_ERROR"; message: string }
  | { type: "CLOSING_STEP3_CONTINUE" }
  | { type: "CLOSING_STEP4_SELECT"; value: string }
  | { type: "POST_REFLECTION_ACTION"; id: PostReflectionActionId }
  | { type: "FINISHED_ACK" }
  | { type: "NAV_BEGIN_LEVEL"; navKey: string }
  | { type: "NAV_SELECT_CLARIFYING_DEPTH"; count: number }
  | { type: "NAV_CLARIFYING_QUESTIONS_READY"; questions: string[] }
  | { type: "NAV_ABORT_TO_POST_REFLECTION" }
  | { type: "NAV_SUBMIT_CLARIFYING_ANSWER" }
  | { type: "NAV_FINAL_ANALYSIS_READY"; text: string }
  | { type: "NAV_FINAL_ANALYSIS_FAILED"; message: string }
  | { type: "NAV_BACK_TO_POST_REFLECTION" }
  | { type: "NAV_PSYCHOTYPE_ACK" }
  | { type: "NAV_SUPERVISION_TAIL_CONTINUE" }
  | { type: "NAV_SUPERVISION_TAIL_FINISH" };

export function supervisionReducer(
  state: SupervisionSession,
  action: SupervisionAction
): SupervisionSession {
  switch (action.type) {
    case "RESET":
      return { ...INITIAL_SUPERVISION_SESSION };

    case "SET_REMOTE_CASE_ID":
      return { ...state, remoteCaseId: action.caseId };

    case "SET_DRAFT":
      return { ...state, draftInput: action.value };

    case "CONFIDENTIALITY_CONTINUE":
      return { ...state, step: "case_reminder", draftInput: "" };

    case "CONFIDENTIALITY_MORE":
      return { ...state, step: "confidentiality_more" };

    case "CONFIDENTIALITY_BACK":
      return { ...state, step: "confidentiality" };

    case "CASE_REMINDER_CONTINUE":
      return { ...state, step: "case_name", draftInput: "" };

    case "SUBMIT_CASE_NAME": {
      const v = state.draftInput.trim();
      if (!v) return state;
      return {
        ...state,
        intake: { ...state.intake, client_alias: v },
        draftInput: "",
        step: "therapy_duration",
      };
    }

    case "SUBMIT_THERAPY_DURATION": {
      const v = state.draftInput.trim();
      if (!v) return state;
      return {
        ...state,
        intake: { ...state.intake, therapy_duration: v },
        draftInput: "",
        step: "narrative_context",
      };
    }

    case "SUBMIT_NARRATIVE_CONTEXT": {
      const v = state.draftInput.trim();
      if (!v) return state;
      return {
        ...state,
        narrativeContext: v,
        draftInput: "",
        step: "narrative_clinical",
      };
    }

    case "SUBMIT_NARRATIVE_CLINICAL": {
      const v = state.draftInput.trim();
      if (!v) return state;
      const full = buildFullNarrative(state.narrativeContext, v);
      if (!action.sufficient) {
        return {
          ...state,
          narrativeClinical: v,
          fullNarrative: full,
          narrativeSufficient: false,
          draftInput: "",
          step: "low_data_choice",
        };
      }
      return {
        ...state,
        narrativeClinical: v,
        fullNarrative: full,
        narrativeSufficient: true,
        draftInput: "",
        pendingDetectedRequest: "",
        step: "detecting_supervision_request",
      };
    }

    case "LOW_DATA_ADD_MATERIAL":
      return { ...state, step: "low_data_add_material", draftInput: "" };

    case "LOW_DATA_IONOVA":
      return {
        ...state,
        step: "low_data_ionova",
        ionovaIndex: 0,
        ionovaAnswers: [],
        draftInput: "",
      };

    case "LOW_DATA_CONTINUE_ANYWAY":
      return {
        ...state,
        draftInput: "",
        narrativeSufficient: false,
        pendingDetectedRequest: "",
        step: "detecting_supervision_request",
      };

    case "SUBMIT_EXTRA_MATERIAL": {
      const v = state.draftInput.trim();
      if (!v) return state;
      const merged = `${state.fullNarrative.trim()}\n\n${v.trim()}`.trim();
      return {
        ...state,
        fullNarrative: merged,
        draftInput: "",
        step: "supervision_request",
        pendingDetectedRequest: "",
      };
    }

    case "SUBMIT_IONOVA_ANSWER": {
      const v = state.draftInput.trim();
      if (!v) return state;
      const q = IONOVA_INTAKE_QUESTIONS[state.ionovaIndex];
      if (!q) return state;
      const nextAnswers = [...state.ionovaAnswers, v];
      const nextIdx = state.ionovaIndex + 1;
      if (nextIdx < LOW_DATA_QUESTIONS_LIMIT) {
        return {
          ...state,
          ionovaIndex: nextIdx,
          ionovaAnswers: nextAnswers,
          draftInput: "",
        };
      }
      let block = state.fullNarrative.trim();
      for (let i = 0; i < nextAnswers.length; i++) {
        const qq = IONOVA_INTAKE_QUESTIONS[i];
        const aa = nextAnswers[i];
        if (!qq || aa === undefined) continue;
        block += `\n\n[Уточнение ${i + 1}]\nВопрос: ${qq}\nОтвет: ${aa}`;
      }
      return {
        ...state,
        fullNarrative: block.trim(),
        ionovaAnswers: nextAnswers,
        ionovaIndex: nextIdx,
        draftInput: "",
        pendingDetectedRequest: "",
        step: "detecting_supervision_request",
      };
    }

    case "DETECTION_RESULT":
      if (action.detected && action.extracted.trim()) {
        return {
          ...state,
          pendingDetectedRequest: action.extracted.trim(),
          pendingDetectionConfidence: action.confidence,
          draftInput: "",
          step: "supervision_request_confirm",
        };
      }
      return {
        ...state,
        pendingDetectedRequest: "",
        draftInput: "",
        step: "supervision_request",
      };

    case "SUP_REQUEST_CONFIRM":
      return {
        ...state,
        supervisionRequest: state.pendingDetectedRequest.trim(),
        pendingDetectedRequest: "",
        draftInput: "",
        step: "therapist_specialization",
      };

    case "SUP_REQUEST_REFINE":
      return {
        ...state,
        pendingDetectedRequest: "",
        draftInput: "",
        step: "supervision_request",
      };

    case "SUBMIT_SUPERVISION_REQUEST": {
      const v = state.draftInput.trim();
      if (!v) return state;
      return {
        ...state,
        supervisionRequest: v,
        draftInput: "",
        step: "therapist_specialization",
      };
    }

    case "TOGGLE_THERAPIST_SPECIALIZATION": {
      const opt = action.option;
      const set = new Set(state.therapistSpecializations);
      if (set.has(opt)) {
        set.delete(opt);
        if (opt === THERAPIST_SPECIALIZATION_OTHER) {
          return {
            ...state,
            therapistSpecializations: [...set],
            therapistOtherSpecialization: "",
            draftInput: "",
          };
        }
        return { ...state, therapistSpecializations: [...set] };
      }
      set.add(opt);
      return { ...state, therapistSpecializations: [...set] };
    }

    case "TOGGLE_THERAPIST_METHOD": {
      const opt = action.option;
      const set = new Set(state.therapistMethods);
      if (set.has(opt)) {
        set.delete(opt);
        if (opt === THERAPIST_METHOD_OTHER) {
          return {
            ...state,
            therapistMethods: [...set],
            therapistOtherMethods: "",
            draftInput: "",
          };
        }
        return { ...state, therapistMethods: [...set] };
      }
      set.add(opt);
      return { ...state, therapistMethods: [...set] };
    }

    case "SUBMIT_THERAPIST_SPECIALIZATION": {
      const specs = state.therapistSpecializations;
      if (specs.length === 0) return state;
      if (specs.includes(THERAPIST_SPECIALIZATION_OTHER) && !state.draftInput.trim()) return state;
      return {
        ...state,
        therapistOtherSpecialization: specs.includes(THERAPIST_SPECIALIZATION_OTHER)
          ? state.draftInput.trim()
          : "",
        draftInput: "",
        step: "therapist_methods",
      };
    }

    case "SUBMIT_THERAPIST_METHODS": {
      const methods = state.therapistMethods;
      if (methods.length === 0) return state;
      if (methods.includes(THERAPIST_METHOD_OTHER) && !state.draftInput.trim()) return state;
      return {
        ...state,
        therapistOtherMethods: methods.includes(THERAPIST_METHOD_OTHER)
          ? state.draftInput.trim()
          : "",
        draftInput: "",
        step: "supervisor_style_selection",
      };
    }

    case "SELECT_SUPERVISOR_STYLE": {
      const label = action.label.trim();
      if (!isSupervisorStyleLabel(label)) return state;
      return {
        ...state,
        supervisorStyle: label,
        draftInput: "",
        step: "focus_selection",
      };
    }

    case "SELECT_FOCUS":
      if (action.label === FOCUS_HELP_LABEL) {
        return { ...state, step: "focus_help_notice" };
      }
      return {
        ...state,
        focusLabel: action.label,
        focusKey: resolveFocusKey(action.label),
        draftInput: "",
        step: "depth_selection",
      };

    case "FOCUS_HELP_CONTINUE":
      return { ...state, step: "focus_selection" };

    case "SELECT_DEPTH":
      if (!state.focusKey) return state;
      return {
        ...state,
        sessionDepth: action.depth,
        questionModuleIdx: 0,
        supervisionAnswers: [],
        transitionLine: null,
        draftInput: "",
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        tensionCompleted: false,
        step: "question_flow",
      };

    case "TENSION_INTERRUPT_START": {
      if (!isTensionInterruptEnabled()) return state;
      if (state.tensionCompleted) return state;
      if (!state.focusKey || !state.sessionDepth) return state;
      const bank = getQuestionsForFocus(state.focusKey);
      const total = getTotalQuestionCount(state.focusKey, state.sessionDepth);
      const idx = state.questionModuleIdx;
      if (idx >= total || idx >= bank.length) return state;
      if (state.supervisionAnswers.length !== idx) return state;
      const questionText = bank[idx];
      if (!questionText) return state;
      const answerText = state.draftInput.trim();
      if (!answerText) return state;
      const bankedAnswers: SupervisionAnswer[] = [
        ...state.supervisionAnswers,
        {
          module: `Вопрос ${idx + 1}`,
          question: questionText,
          answer: answerText,
        },
      ];
      return {
        ...state,
        supervisionAnswers: bankedAnswers,
        questionModuleIdx: idx,
        tensionPending: {
          moduleIdx: idx,
          moduleNum: idx + 1,
          moduleName: state.focusLabel ?? "Модуль супервизии",
          moduleQuestion: questionText,
          originalAnswer: answerText,
        },
        tensionStopText: "",
        tensionFlowError: "",
        draftInput: "",
        step: "tension_stop_loading",
      };
    }

    case "TENSION_STOP_SUCCESS":
      return {
        ...state,
        tensionStopText: action.text.trim(),
        tensionFlowError: "",
        step: "tension_stop",
      };

    case "TENSION_STOP_FAILURE": {
      const pending = state.tensionPending;
      const restoreDraft = pending?.originalAnswer ?? "";
      if (!pending) {
        const idx = state.questionModuleIdx;
        const rolledBackAnswers =
          state.supervisionAnswers.length > idx
            ? state.supervisionAnswers.filter((_, i) => i !== idx)
            : state.supervisionAnswers;
        return {
          ...state,
          supervisionAnswers: rolledBackAnswers,
          tensionPending: null,
          tensionStopText: "",
          draftInput: restoreDraft,
          tensionFlowError: action.message,
          step: "question_flow",
        };
      }
      const patchIdx = pending.moduleIdx;
      const rolledBackAnswers = state.supervisionAnswers.filter((_, i) => i !== patchIdx);
      return {
        ...state,
        supervisionAnswers: rolledBackAnswers,
        questionModuleIdx: patchIdx,
        tensionPending: null,
        tensionStopText: "",
        draftInput: restoreDraft,
        tensionFlowError: action.message,
        step: "question_flow",
      };
    }

    case "TENSION_SUBMIT_PROBE": {
      const pending = state.tensionPending;
      if (!pending) return state;
      const probe = state.draftInput.trim();
      if (!probe) return state;
      return {
        ...state,
        tensionPending: { ...pending, probeAnswer: probe },
        draftInput: "",
        tensionFlowError: "",
        step: "tension_hypothesis_loading",
      };
    }

    case "TENSION_HYPOTHESIS_SUCCESS": {
      const pending = state.tensionPending;
      if (!pending || !pending.probeAnswer) return state;
      if (!state.focusKey || !state.sessionDepth) return state;

      const combinedAnswer = `${pending.originalAnswer}\n\n[Уточнение]\n${pending.probeAnswer}`;
      const patchIdx = pending.moduleIdx;
      const existing = state.supervisionAnswers[patchIdx];
      if (!existing) return state;

      const nextAnswers: SupervisionAnswer[] = [...state.supervisionAnswers];
      nextAnswers[patchIdx] = {
        ...existing,
        module: `Вопрос ${pending.moduleNum}`,
        question: pending.moduleQuestion,
        answer: combinedAnswer,
        analysis: action.analysis.trim(),
      };

      const nextIdx = pending.moduleIdx + 1;
      const total = getTotalQuestionCount(state.focusKey, state.sessionDepth);

      const clearedTension = {
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
      };

      if (nextIdx >= total && nextAnswers.length >= total) {
        return {
          ...state,
          ...clearedTension,
          tensionCompleted: true,
          supervisionAnswers: nextAnswers,
          questionModuleIdx: nextIdx,
          draftInput: "",
          transitionLine: null,
          step: "integration_reflection",
          reflectionStatus: "loading",
          reflectionText: "",
          reflectionError: "",
        };
      }

      return {
        ...state,
        ...clearedTension,
        tensionCompleted: true,
        supervisionAnswers: nextAnswers,
        questionModuleIdx: nextIdx,
        draftInput: "",
        transitionLine: pickSupervisionTransition(),
        step: "question_flow",
      };
    }

    case "TENSION_HYPOTHESIS_FAILURE":
      return {
        ...state,
        tensionFlowError: action.message,
        draftInput: state.tensionPending?.probeAnswer ?? state.draftInput,
        step: "tension_stop",
      };

    case "TENSION_FLOW_CANCEL": {
      const pending = state.tensionPending;
      const restore = pending?.originalAnswer ?? "";
      if (!pending) {
        const idx = state.questionModuleIdx;
        const rolledBackAnswers =
          state.supervisionAnswers.length > idx
            ? state.supervisionAnswers.filter((_, i) => i !== idx)
            : state.supervisionAnswers;
        return {
          ...state,
          supervisionAnswers: rolledBackAnswers,
          tensionPending: null,
          tensionStopText: "",
          tensionFlowError: "",
          draftInput: restore,
          step: "question_flow",
        };
      }
      const patchIdx = pending.moduleIdx;
      const rolledBackAnswers = state.supervisionAnswers.filter((_, i) => i !== patchIdx);
      return {
        ...state,
        supervisionAnswers: rolledBackAnswers,
        questionModuleIdx: patchIdx,
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        draftInput: restore,
        step: "question_flow",
      };
    }

    case "OPEN_CHAT_ANALYSIS":
      return {
        ...state,
        step: "chat_analysis_focus",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        draftInput: "",
      };

    case "CHAT_ANALYSIS_SELECT_FOCUS":
      return {
        ...state,
        chatAnalysisFocusKey: action.key,
        chatAnalysisError: "",
        draftInput: "",
        step: "chat_analysis_compose",
      };

    case "CHAT_ANALYSIS_SUBMIT":
      return {
        ...state,
        chatAnalysisError: "",
        step: "chat_analysis_loading",
      };

    case "CHAT_ANALYSIS_SUCCESS":
      return {
        ...state,
        chatAnalysisResult: action.text.trim(),
        chatAnalysisError: "",
        draftInput: "",
        step: "chat_analysis_result",
      };

    case "CHAT_ANALYSIS_FAILURE":
      return {
        ...state,
        chatAnalysisError: action.message,
        step: "chat_analysis_compose",
      };

    case "CHAT_ANALYSIS_BACK":
      return {
        ...state,
        step: "post_reflection",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        draftInput: "",
      };

    case "SUBMIT_QUESTION_ANSWER": {
      if (!state.focusKey || !state.sessionDepth) return state;
      const bank = getQuestionsForFocus(state.focusKey);
      const total = getTotalQuestionCount(state.focusKey, state.sessionDepth);
      const idx = state.questionModuleIdx;
      if (idx >= total || idx >= bank.length) return state;
      const questionText = bank[idx];
      if (!questionText) return state;
      const answerText = state.draftInput.trim();
      if (!answerText) return state;
      const nextAnswers = [
        ...state.supervisionAnswers,
        {
          module: `Вопрос ${idx + 1}`,
          question: questionText,
          answer: answerText,
        },
      ];
      const nextIdx = idx + 1;
      if (nextIdx >= total) {
        return {
          ...state,
          supervisionAnswers: nextAnswers,
          questionModuleIdx: nextIdx,
          draftInput: "",
          transitionLine: null,
          step: "integration_reflection",
          reflectionStatus: "loading",
          reflectionText: "",
          reflectionError: "",
        };
      }
      return {
        ...state,
        supervisionAnswers: nextAnswers,
        questionModuleIdx: nextIdx,
        draftInput: "",
        transitionLine: pickSupervisionTransition(),
      };
    }

    case "REFLECTION_LOADING": {
      const restartFromClosingFlow =
        state.step === "closing_step1" ||
        state.step === "closing_step2" ||
        state.step === "closing_step3" ||
        state.step === "closing_step4" ||
        state.step === "post_reflection";
      return {
        ...state,
        reflectionStatus: "loading",
        reflectionError: "",
        ...(restartFromClosingFlow
          ? {
              step: "integration_reflection" as const,
              closingStep1Answer: null,
              closingTherapistTakeaway: "",
              closingIntegrationStatus: "idle" as const,
              closingIntegrationText: "",
              closingIntegrationError: "",
              closingNextModuleChoice: null,
            }
          : {}),
      };
    }

    case "REFLECTION_SUCCESS":
      if (state.step !== "integration_reflection") return state;
      return {
        ...state,
        reflectionStatus: "success",
        reflectionText: action.text,
        reflectionError: "",
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        ...INITIAL_NAV_FULL_RESET,
        closingStep1Answer: null,
        closingTherapistTakeaway: "",
        closingIntegrationStatus: "idle",
        closingIntegrationText: "",
        closingIntegrationError: "",
        closingNextModuleChoice: null,
        step: "closing_step1",
      };

    case "REFLECTION_ERROR":
      if (state.step !== "integration_reflection") return state;
      return {
        ...state,
        reflectionStatus: "error",
        reflectionError: action.message,
        reflectionText: "",
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        ...INITIAL_NAV_FULL_RESET,
        closingStep1Answer: null,
        closingTherapistTakeaway: "",
        closingIntegrationStatus: "idle",
        closingIntegrationText: "",
        closingIntegrationError: "",
        closingNextModuleChoice: null,
        step: "closing_step1",
      };

    case "CLOSING_STEP1_SELECT": {
      if (state.step !== "closing_step1") return state;
      const v = action.value.trim();
      if (!v) return state;
      return {
        ...state,
        closingStep1Answer: v,
        draftInput: "",
        step: "closing_step2",
      };
    }

    case "CLOSING_STEP2_SUBMIT": {
      if (state.step !== "closing_step2") return state;
      const v = state.draftInput.trim();
      if (!v) return state;
      return {
        ...state,
        closingTherapistTakeaway: v,
        draftInput: "",
        closingIntegrationStatus: "loading",
        closingIntegrationText: "",
        closingIntegrationError: "",
        step: "closing_step3",
      };
    }

    case "CLOSING_INTEGRATION_LOADING":
      if (state.step !== "closing_step3") return state;
      return {
        ...state,
        closingIntegrationStatus: "loading",
        closingIntegrationText: "",
        closingIntegrationError: "",
      };

    case "CLOSING_INTEGRATION_SUCCESS":
      if (state.step !== "closing_step3") return state;
      return {
        ...state,
        closingIntegrationStatus: "success",
        closingIntegrationText: action.text.trim(),
        closingIntegrationError: "",
      };

    case "CLOSING_INTEGRATION_ERROR":
      if (state.step !== "closing_step3") return state;
      return {
        ...state,
        closingIntegrationStatus: "error",
        closingIntegrationError: action.message,
        closingIntegrationText: "",
      };

    case "CLOSING_STEP3_CONTINUE":
      if (state.step !== "closing_step3") return state;
      if (state.closingIntegrationStatus !== "success" || !state.closingIntegrationText.trim()) return state;
      return { ...state, draftInput: "", step: "closing_step4" };

    case "CLOSING_STEP4_SELECT": {
      if (state.step !== "closing_step4") return state;
      const v = action.value.trim();
      if (!v) return state;
      return {
        ...state,
        closingNextModuleChoice: v,
        draftInput: "",
        step: "post_reflection",
      };
    }

    case "POST_REFLECTION_ACTION":
      if (action.id === "finish_after_reflection") {
        return {
          ...state,
          ...INITIAL_NAV_FULL_RESET,
          tensionPending: null,
          tensionStopText: "",
          tensionFlowError: "",
          chatAnalysisFocusKey: null,
          chatAnalysisResult: "",
          chatAnalysisError: "",
          step: "finished",
        };
      }
      const item = POST_REFLECTION_WEB_ACTIONS.find((x) => x.id === action.id);
      if (!item) return state;
      return {
        ...state,
        supervisionRequest: item.request,
        focusLabel: item.focusLabel,
        focusKey: item.focusKey,
        sessionDepth: null,
        questionModuleIdx: 0,
        supervisionAnswers: [],
        transitionLine: null,
        draftInput: "",
        reflectionStatus: "idle",
        reflectionText: "",
        reflectionError: "",
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        tensionCompleted: false,
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        ...INITIAL_NAV_CYCLE_SLICE,
        ...INITIAL_NAV_TAIL_SLICE,
        step: "depth_selection",
      };

    case "NAV_BEGIN_LEVEL":
      return {
        ...state,
        ...INITIAL_NAV_CYCLE_SLICE,
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        navKey: action.navKey,
        draftInput: "",
        step: "nav_depth_selection",
      };

    case "NAV_SELECT_CLARIFYING_DEPTH":
      return {
        ...state,
        navQuestionsTargetCount: action.count,
        navQuestions: [],
        navAnswers: [],
        navQuestionIndex: 0,
        draftInput: "",
        navClarifyingError: "",
        navFinalAnalysis: "",
        navFinalError: "",
        step: "nav_clarifying_loading",
      };

    case "NAV_CLARIFYING_QUESTIONS_READY":
      return {
        ...state,
        navQuestions: action.questions,
        navQuestionIndex: 0,
        navAnswers: [],
        draftInput: "",
        step: "nav_clarifying",
      };

    case "NAV_ABORT_TO_POST_REFLECTION":
      return {
        ...state,
        ...INITIAL_NAV_CYCLE_SLICE,
        ...INITIAL_NAV_TAIL_SLICE,
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        draftInput: "",
        step: "post_reflection",
      };

    case "NAV_SUBMIT_CLARIFYING_ANSWER": {
      const answerText = state.draftInput.trim();
      if (!answerText) return state;
      const q = state.navQuestions[state.navQuestionIndex];
      if (!q) return state;
      const nextAnswers: NavClarifyingAnswer[] = [
        ...state.navAnswers,
        { question: q, answer: answerText },
      ];
      const nextIdx = state.navQuestionIndex + 1;
      if (nextIdx >= state.navQuestions.length) {
        return {
          ...state,
          navAnswers: nextAnswers,
          navQuestionIndex: nextIdx,
          draftInput: "",
          step: "nav_final_loading",
        };
      }
      return {
        ...state,
        navAnswers: nextAnswers,
        navQuestionIndex: nextIdx,
        draftInput: "",
      };
    }

    case "NAV_FINAL_ANALYSIS_READY": {
      const navLevelsCompletedNavKeys =
        state.navKey && !state.navLevelsCompletedNavKeys.includes(state.navKey)
          ? [...state.navLevelsCompletedNavKeys, state.navKey]
          : state.navLevelsCompletedNavKeys;

      const merged = {
        ...state,
        navFinalAnalysis: action.text,
        navFinalError: "",
        draftInput: "",
        navLevelsCompletedNavKeys,
      };

      const navTailPhase: NavTailPhase | null = psychotypeWowEligible(merged)
        ? "psychotype"
        : "supervision_followup";

      return {
        ...merged,
        navTailPhase,
        step: "nav_tail_flow",
      };
    }

    case "NAV_FINAL_ANALYSIS_FAILED":
      return {
        ...state,
        navFinalAnalysis: "",
        navFinalError: action.message,
        draftInput: "",
        navTailPhase: null,
        step: "nav_final_result",
      };

    case "NAV_PSYCHOTYPE_ACK": {
      const rid = state.remoteCaseId;
      return {
        ...state,
        psychotypeWowConsumedRemoteIds:
          rid != null && !state.psychotypeWowConsumedRemoteIds.includes(rid)
            ? [...state.psychotypeWowConsumedRemoteIds, rid]
            : state.psychotypeWowConsumedRemoteIds,
        psychotypeWowConsumedWithoutRemote:
          rid == null ? true : state.psychotypeWowConsumedWithoutRemote,
        navTailPhase: "supervision_followup",
      };
    }

    case "NAV_SUPERVISION_TAIL_CONTINUE":
      return {
        ...state,
        ...INITIAL_NAV_CYCLE_SLICE,
        ...INITIAL_NAV_TAIL_SLICE,
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        draftInput: "",
        step: "post_reflection",
      };

    case "NAV_SUPERVISION_TAIL_FINISH":
      return {
        ...state,
        ...INITIAL_NAV_FULL_RESET,
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        draftInput: "",
        step: "finished",
      };

    case "NAV_BACK_TO_POST_REFLECTION":
      return {
        ...state,
        ...INITIAL_NAV_CYCLE_SLICE,
        ...INITIAL_NAV_TAIL_SLICE,
        tensionPending: null,
        tensionStopText: "",
        tensionFlowError: "",
        chatAnalysisFocusKey: null,
        chatAnalysisResult: "",
        chatAnalysisError: "",
        draftInput: "",
        step: "post_reflection",
      };

    case "FINISHED_ACK":
      return { ...INITIAL_SUPERVISION_SESSION };

    default:
      return state;
  }
}

export function getCurrentIntakeQuestionKey(step: SupervisionStep): CaseIntakeStepKey | null {
  if (step === "case_name") return "client_alias";
  if (step === "therapy_duration") return "therapy_duration";
  return null;
}
