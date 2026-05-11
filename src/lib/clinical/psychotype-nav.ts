/**
 * NAV tail — типологический блок после финального NAV (Telegram main.py: PSYCHOTYPE_WOW_TEXT).
 */

export const PSYCHOTYPE_WOW_TEXT =
  "Если хотите, следующим шагом я помогу подготовить 5 точных вопросов, " +
  "которые можно нативно встроить в следующую сессию — " +
  "чтобы глубже исследовать вероятные гипотезы о динамике клиента.";

export const PSYCHOTYPE_BUTTON_GET_QUESTIONS = "Получить вопросы";

export const PSYCHOTYPE_BUTTON_LATER = "Спасибо, сделаем это позже";

/** После NAV — тот же текст, что send_supervision_check в Telegram. */
export function buildNavSupervisionFollowupQuestion(supervisionRequest: string): string {
  const req = supervisionRequest.trim() || "(не указан)";
  return (
    "Вы получили ответ на ваш супервизорский запрос?\n\n" +
    `Ваш запрос звучал так:\n«${req}»\n\n` +
    "Хотите продолжить супервизию этого случая или завершить разбор на сегодня?"
  );
}

export const NAV_SUPERVISION_TAIL_CONTINUE_LABEL = "Продолжить супервизию";

export const NAV_SUPERVISION_TAIL_FINISH_LABEL = "Завершить разбор";

/** Эквивалент `cid not in psychotype_wow_shown` для веб-сессии. */
export function psychotypeWowEligible(state: {
  remoteCaseId: number | null;
  psychotypeWowConsumedRemoteIds: readonly number[];
  psychotypeWowConsumedWithoutRemote: boolean;
}): boolean {
  if (state.remoteCaseId != null) {
    return !state.psychotypeWowConsumedRemoteIds.includes(state.remoteCaseId);
  }
  return !state.psychotypeWowConsumedWithoutRemote;
}
