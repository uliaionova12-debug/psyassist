import type { MutableRefObject } from "react";

import { _CHAT_FOCUS_PROMPTS } from "@/lib/clinical/chat-analysis";
import {
  POST_REFLECTION_WEB_ACTIONS,
  supervisionReducer,
  type SupervisionAction,
  type SupervisionSession,
} from "@/lib/clinical/session";
import { buildTherapistProfilePersistenceAddition } from "@/lib/clinical/therapist-profile";

import type { PersistenceFailureCode } from "@/lib/persistence/assistant-client";
import {
  isPersistenceUnavailableCode,
  persistence_append_case_context,
  persistence_save_case,
  persistence_supervision_start,
  persistence_supervision_track,
  persistence_update_case_initial,
} from "@/lib/persistence/assistant-client";

export type PersistenceNoteFn = (code?: PersistenceFailureCode) => void;

export type AssistantPersistenceCtx = {
  notePersistenceUnavailable: PersistenceNoteFn;
  pendingAppendsRef: MutableRefObject<string[]>;
};

function noteIfUnavailable(result: { ok: false; code: PersistenceFailureCode }, note: PersistenceNoteFn) {
  if (isPersistenceUnavailableCode(result.code)) note(result.code);
}

async function appendWithQueue(
  caseId: number | null,
  text: string,
  queueRef: MutableRefObject<string[]>,
  note: PersistenceNoteFn
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (caseId == null) {
    queueRef.current.push(trimmed);
    return;
  }
  const r = await persistence_append_case_context(caseId, trimmed);
  if (!r.ok) noteIfUnavailable(r, note);
}

const TRACK_AFTER_ACTION = new Set<SupervisionAction["type"]>([
  "SUBMIT_NARRATIVE_CONTEXT",
  "SUBMIT_NARRATIVE_CLINICAL",
  "LOW_DATA_CONTINUE_ANYWAY",
  "SUBMIT_EXTRA_MATERIAL",
  "SUBMIT_IONOVA_ANSWER",
  "DETECTION_RESULT",
  "SUP_REQUEST_CONFIRM",
  "SUP_REQUEST_REFINE",
  "SUBMIT_SUPERVISION_REQUEST",
  "SUBMIT_THERAPIST_SPECIALIZATION",
  "SUBMIT_THERAPIST_METHODS",
  "SELECT_SUPERVISOR_STYLE",
  "SELECT_FOCUS",
  "SELECT_DEPTH",
  "SUBMIT_QUESTION_ANSWER",
  "TENSION_INTERRUPT_START",
  "TENSION_HYPOTHESIS_SUCCESS",
  "CHAT_ANALYSIS_SUCCESS",
  "POST_REFLECTION_ACTION",
  "CLOSING_STEP1_SELECT",
  "CLOSING_STEP2_SUBMIT",
  "CLOSING_STEP4_SELECT",
  "NAV_BEGIN_LEVEL",
  "NAV_SELECT_CLARIFYING_DEPTH",
  "NAV_SUBMIT_CLARIFYING_ANSWER",
  "NAV_SUPERVISION_TAIL_CONTINUE",
]);

async function runPersistenceAfterReduce(
  _prev: SupervisionSession,
  next: SupervisionSession,
  action: SupervisionAction,
  ctx: AssistantPersistenceCtx
) {
  const { notePersistenceUnavailable: note, pendingAppendsRef } = ctx;

  if (action.type === "CASE_REMINDER_CONTINUE") {
    const r = await persistence_supervision_start();
    if (!r.ok) noteIfUnavailable(r, note);
    return;
  }

  if (TRACK_AFTER_ACTION.has(action.type)) {
    const tr = await persistence_supervision_track();
    if (!tr.ok) noteIfUnavailable(tr, note);
  }

  const cid = next.remoteCaseId;

  switch (action.type) {
    case "SUP_REQUEST_CONFIRM":
      await appendWithQueue(
        cid,
        `Запрос на супервизию (подтверждено):\n${next.supervisionRequest}`,
        pendingAppendsRef,
        note
      );
      break;
    case "SUBMIT_SUPERVISION_REQUEST":
      await appendWithQueue(
        cid,
        `Запрос на супервизию:\n${next.supervisionRequest}`,
        pendingAppendsRef,
        note
      );
      break;
    case "SUBMIT_THERAPIST_METHODS":
      await appendWithQueue(
        cid,
        buildTherapistProfilePersistenceAddition({
          therapistSpecializations: next.therapistSpecializations,
          therapistMethods: next.therapistMethods,
          therapistOtherSpecialization: next.therapistOtherSpecialization,
          therapistOtherMethods: next.therapistOtherMethods,
        }),
        pendingAppendsRef,
        note
      );
      break;
    case "SELECT_SUPERVISOR_STYLE":
      if (next.supervisorStyle?.trim()) {
        await appendWithQueue(
          cid,
          `Стиль супервизора: ${next.supervisorStyle.trim()}`,
          pendingAppendsRef,
          note
        );
      }
      break;
    case "SELECT_FOCUS":
      if (next.focusLabel && next.step !== "focus_help_notice") {
        await appendWithQueue(cid, `Фокус разбора: ${next.focusLabel}`, pendingAppendsRef, note);
      }
      break;
    case "SELECT_DEPTH":
      if (next.sessionDepth) {
        await appendWithQueue(cid, `Глубина разбора: ${next.sessionDepth}`, pendingAppendsRef, note);
      }
      break;
    case "SUBMIT_QUESTION_ANSWER": {
      const last = next.supervisionAnswers[next.supervisionAnswers.length - 1];
      if (last) {
        await appendWithQueue(
          cid,
          `${last.module}. ${last.question}\nОтвет: ${last.answer}`,
          pendingAppendsRef,
          note
        );
      }
      break;
    }
    case "TENSION_HYPOTHESIS_SUCCESS": {
      const last = next.supervisionAnswers[next.supervisionAnswers.length - 1];
      if (last?.analysis) {
        const ord = next.supervisionAnswers.length;
        await appendWithQueue(
          cid,
          `[Вопрос ${ord} — уточнение]\nВопрос: ${last.question}\nОтвет: ${last.answer}\nАнализ: ${last.analysis}`,
          pendingAppendsRef,
          note
        );
      }
      break;
    }
    case "CHAT_ANALYSIS_SUCCESS": {
      const focusKey = next.chatAnalysisFocusKey;
      const title = focusKey ? _CHAT_FOCUS_PROMPTS[focusKey][0] : "переписка";
      await appendWithQueue(
        cid,
        `[Анализ переписки — ${title}]\n${action.text}`,
        pendingAppendsRef,
        note
      );
      break;
    }
    case "REFLECTION_SUCCESS":
      await appendWithQueue(
        cid,
        `Интеграционная рефлексия:\n${next.reflectionText}`,
        pendingAppendsRef,
        note
      );
      break;
    case "CLOSING_STEP1_SELECT":
      await appendWithQueue(
        cid,
        `Закрытие после рефлексии — ответ (приблизиться к ответу): ${next.closingStep1Answer ?? action.value}`,
        pendingAppendsRef,
        note
      );
      break;
    case "CLOSING_STEP2_SUBMIT":
      await appendWithQueue(
        cid,
        `Закрытие после рефлексии — что забираю в практику:\n${next.closingTherapistTakeaway}`,
        pendingAppendsRef,
        note
      );
      break;
    case "CLOSING_STEP4_SELECT":
      await appendWithQueue(
        cid,
        `Дальнейшее направление (выбор): ${next.closingNextModuleChoice ?? action.value}`,
        pendingAppendsRef,
        note
      );
      break;
    case "REFLECTION_ERROR":
      await appendWithQueue(
        cid,
        `Статус интеграционной рефлексии (ошибка):\n${next.reflectionError}`,
        pendingAppendsRef,
        note
      );
      break;
    case "POST_REFLECTION_ACTION":
      if (action.id !== "finish_after_reflection") {
        const item = POST_REFLECTION_WEB_ACTIONS.find((x) => x.id === action.id);
        if (item) {
          await appendWithQueue(cid, `Продолжение разбора: ${item.label}`, pendingAppendsRef, note);
        }
      }
      break;
    default:
      break;
  }
}

export function createAssistantPersistenceReducer(ctx: AssistantPersistenceCtx) {
  return (state: SupervisionSession, action: SupervisionAction): SupervisionSession => {
    const next = supervisionReducer(state, action);
    queueMicrotask(() => {
      void runPersistenceAfterReduce(state, next, action, ctx);
    });
    return next;
  };
}

export async function flushPendingCaseAppends(
  caseId: number,
  queueRef: MutableRefObject<string[]>,
  note: PersistenceNoteFn
): Promise<void> {
  const batch = queueRef.current.splice(0);
  for (const addition of batch) {
    const r = await persistence_append_case_context(caseId, addition);
    if (!r.ok) noteIfUnavailable(r, note);
  }
}

export async function syncAssistantCaseInitialState(args: {
  session: SupervisionSession;
  lastSyncedSigRef: MutableRefObject<string>;
  inFlightSigRef: MutableRefObject<string | null>;
  notePersistenceUnavailable: PersistenceNoteFn;
  dispatch: (action: SupervisionAction) => void;
}): Promise<void> {
  const { session, lastSyncedSigRef, inFlightSigRef, notePersistenceUnavailable: note, dispatch } = args;

  const alias = session.intake.client_alias?.trim();
  const dur = session.intake.therapy_duration?.trim();
  const narrative = session.fullNarrative.trim();

  if (!narrative || !alias || !dur) return;

  const sig = `${alias}|${dur}|${narrative}`;
  if (lastSyncedSigRef.current === sig) return;
  if (inFlightSigRef.current === sig) return;

  inFlightSigRef.current = sig;

  try {
    if (session.remoteCaseId != null) {
      const r = await persistence_update_case_initial(session.remoteCaseId, narrative);
      if (!r.ok) {
        noteIfUnavailable(r, note);
      } else {
        lastSyncedSigRef.current = sig;
      }
    } else {
      const r = await persistence_save_case({
        userName: null,
        caseTitle: alias,
        clientName: alias,
        firstSessionDate: dur,
        initialCase: narrative,
      });
      if (!r.ok) {
        noteIfUnavailable(r, note);
      } else {
        dispatch({ type: "SET_REMOTE_CASE_ID", caseId: r.caseId });
        lastSyncedSigRef.current = sig;
      }
    }
  } finally {
    if (inFlightSigRef.current === sig) inFlightSigRef.current = null;
  }
}
