/**
 * Tension interrupt engine (Telegram main.py): detection + stop / hypothesis prompts.
 */

import { isTensionInterruptEnabled } from "@/lib/clinical/tension-feature-flag";

export interface TensionModuleSlice {
  num: number;
  name: string;
  question: string;
}

/** Маркеры из detect_tension_signals — без сокращений. */
export const TENSION_SIGNAL_MARKERS: readonly string[] = [
  "напряжен",
  "тревог",
  "раздражен",
  "злост",
  "бессил",
  "устал",
  "не понима",
  "теряю",
  "потерял",
  "цепляет",
  "зацепил",
  "задел",
  "вина",
  "виноват",
  "стараюсь",
  "пытаюсь",
  "переживаю",
  "не могу",
  "сложно мне",
  "сам не знаю",
  "уже не понимаю",
  "контрперенос",
  "поле",
  "слияни",
  "размыва",
  "рамк",
  "запутал",
  "застрял",
  "нет контакта",
  "потерял контакт",
  "жалею",
  "жаль",
  "обидно",
  "обид",
  "хочется помочь",
  "очень хочу",
  "спасти",
  "спасаю",
  "не даю себе",
  "начал стараться",
];

/** Заголовок блока в build_tension_stop_prompt. */
export const TENSION_DETECTION_HEADER = "TENSION DETECTION — Шаги 1–3.\n\n";

/** Описание поля терапевта — как в промпте остановки. */
export const TENSION_THERAPIST_FIELD_NOTE =
  "Терапевт описывает своё состояние в этом кейсе. " +
  "В его словах — поле, напряжение или контрперенос.\n\n";

/** Короткие фразы-ориентиры для шага остановки (показ пользователю). */
export const TENSION_STOP_STEP_ONE_OPTIONS =
  "«Стоп», «Не спешим», «Сейчас важнее не клиент», «Сейчас про вас»";

/** Лимит ответа модели для остановки — как в промпте. */
export const TENSION_STOP_MAX_RESPONSE_CHARS = 400;

export function detect_tension_signals(text: string): boolean {
  const t = text.toLowerCase();
  return TENSION_SIGNAL_MARKERS.some((m) => t.includes(m));
}

/** Gate detection behind beta tension flag (always false in production beta). */
export function should_trigger_tension_interrupt(text: string): boolean {
  if (!isTensionInterruptEnabled()) return false;
  return detect_tension_signals(text);
}

export function build_tension_stop_prompt(
  module: TensionModuleSlice,
  caseText: string,
  answer: string,
  clinicalBrain: string
): string {
  return (
    `${clinicalBrain}\n\n===\n\n` +
    TENSION_DETECTION_HEADER +
    TENSION_THERAPIST_FIELD_NOTE +
    `Кейс:\n${caseText}\n\n` +
    `Модуль ${module.num}: ${module.name}\n` +
    `Вопрос: ${module.question}\n` +
    `Ответ терапевта:\n${answer}\n\n` +
    "Выполни три шага:\n" +
    "Шаг 1 — Остановить. Одна короткая фраза — одна из: «Стоп.» / «Не спешим.» / «Сейчас важнее не клиент.» / «Сейчас про вас.»\n" +
    "Шаг 2 — Сфокусировать. 1–2 предложения: назови конкретный момент в ответе терапевта, где появилось напряжение.\n" +
    "Шаг 3 — Задай ровно 1 уточняющий вопрос. Напрямую, без вводных.\n\n" +
    "ЗАПРЕЩЕНО: выдавать гипотезу, объяснять, давать советы.\n" +
    "ЗАПРЕЩЕНО: «по представленному материалу», «вероятно сигнализирует».\n" +
    "ФОРМАТ: три коротких блока без заголовков, без markdown.\n" +
    `Весь ответ — не более ${TENSION_STOP_MAX_RESPONSE_CHARS} символов.`
  );
}

export function build_tension_hypothesis_prompt(
  module: TensionModuleSlice,
  caseText: string,
  originalAnswer: string,
  probeAnswer: string,
  previousContext: string,
  supervisionRequest: string,
  clinicalBrain: string
): string {
  const prevSection = previousContext
    ? `\nКонтекст предыдущих модулей:\n${previousContext}\n`
    : "";

  return (
    `${clinicalBrain}\n\n===\n\n` +
    `Клиническая супервизия — Модуль ${module.num}: ${module.name}.\n` +
    "Терапевт описал напряжение. Был задан уточняющий вопрос. Получен ответ.\n\n" +
    `Кейс:\n${caseText}\n\n` +
    `Запрос на супервизию:\n${supervisionRequest || "Не уточнён"}\n` +
    `${prevSection}\n` +
    `Вопрос модуля:\n${module.question}\n` +
    `Первый ответ терапевта:\n${originalAnswer}\n\n` +
    `Уточняющий ответ:\n${probeAnswer}\n\n` +
    "Теперь дай рабочую гипотезу.\n" +
    "Стиль IONOVA CLINICAL BRAIN:\n" +
    "— сразу по существу, без вступлений\n" +
    "— ЗАПРЕЩЕНО: «по представленному материалу», «вероятно сигнализирует»\n" +
    "— 1–2 гипотезы максимум\n" +
    "— в конце — одно точное наблюдение или вопрос, удерживающий поле\n" +
    "— без markdown"
  );
}
