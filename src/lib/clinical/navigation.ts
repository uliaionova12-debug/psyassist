/**
 * NAV engine (Telegram / Replit): layered supervision after primary integration reflection.
 */

import { CASE_PROMPT } from "@/lib/clinical/prompts";
import { CASE_BASE } from "@/lib/clinical/reflection";

export const NAV_PROMPTS: Record<string, string> = {
  nav_1:
    CASE_BASE +
    "Проанализируй клиентскую динамику с учётом всего материала ниже.\n" +
    "Структура:\n\n" +
    "КЛИЕНТСКАЯ ДИНАМИКА\n\n" +
    "Ключевые паттерны:\n[2–3 предложения]\n\n" +
    "Защитные механизмы (гипотеза):\n[2–3 предложения]\n\n" +
    "Вероятный внутренний конфликт:\n[1–2 предложения]\n\n" +
    "РЕКОМЕНДАЦИЯ ТЕРАПЕВТУ\n\n[2–3 предложения]\n",
  nav_2:
    CASE_BASE +
    "Проанализируй перенос с учётом всего материала ниже.\n" +
    "Структура:\n\n" +
    "ПЕРЕНОС\n\n" +
    "Что переносится (по представленному материалу):\n[2–3 предложения]\n\n" +
    "Вероятная фигура переноса:\n[1–2 предложения]\n\n" +
    "Риски для терапевтического альянса:\n[1–2 предложения]\n\n" +
    "КАК РАБОТАТЬ С ЭТИМ ПЕРЕНОСОМ\n\n" +
    "Шаг 1: [не более 12 слов]\nШаг 2: [не более 12 слов]\nШаг 3: [не более 12 слов]\n",
  nav_3:
    CASE_BASE +
    "Проанализируй контрперенос с учётом всего материала ниже.\n" +
    "Структура:\n\n" +
    "КОНТРПЕРЕНОС\n\n" +
    "Что вероятно активируется в терапевте:\n[2–3 предложения]\n\n" +
    "Возможные источники:\n[1–2 предложения]\n\n" +
    "Риск отыгрывания:\n[1–2 предложения]\n\n" +
    "ЧТО ДЕЛАТЬ ТЕРАПЕВТУ\n\n" +
    "Шаг 1: [не более 12 слов]\nШаг 2: [не более 12 слов]\nШаг 3: [не более 12 слов]\n",
  nav_4:
    CASE_BASE +
    "Определи риски, границы работы и возможные слепые зоны терапевта.\n" +
    "Структура:\n\n" +
    "РИСКИ И ГРАНИЦЫ РАБОТЫ\n\n" +
    "Что требует внимания:\n[2–3 предложения]\n\n" +
    "Возможная слепая зона терапевта:\n[1–2 предложения]\n\n" +
    "Что важно удержать в рамке:\n[1–2 предложения]\n\n" +
    "КАК ДЕЙСТВОВАТЬ\n\n" +
    "Шаг 1: [не более 12 слов]\nШаг 2: [не более 12 слов]\nШаг 3: [не более 12 слов]\n",
  nav_5:
    CASE_BASE +
    "Разработай стратегию следующей сессии с учётом всего материала ниже.\n" +
    "Структура:\n\n" +
    "ФОКУС СЛЕДУЮЩЕЙ СЕССИИ\n\n" +
    "Главная терапевтическая задача (гипотеза):\n[1–2 предложения]\n\n" +
    "Что НЕ делать на сессии:\n[1–2 предложения]\n\n" +
    "ПЛАН СЕССИИ\n\n" +
    "Шаг 1: [не более 12 слов]\nШаг 2: [не более 12 слов]\n" +
    "Шаг 3: [не более 12 слов]\nШаг 4: [не более 12 слов]\nШаг 5: [не более 12 слов]\n\n" +
    "КОНТРОЛЬНЫЙ ВОПРОС ДЛЯ ТЕРАПЕВТА\n\n" +
    "[1 вопрос]\n",
  nav_6:
    CASE_BASE +
    "Сформулируй гипотезы и возможные интервенции по данному случаю.\n" +
    "Структура:\n\n" +
    "РАБОЧИЕ ГИПОТЕЗЫ\n\n" +
    "1. [1 строка]\n2. [1 строка]\n3. [1 строка]\n\n" +
    "ВОЗМОЖНЫЕ ИНТЕРВЕНЦИИ\n\n" +
    "Шаг 1: [не более 12 слов]\n" +
    "Шаг 2: [не более 12 слов]\n" +
    "Шаг 3: [не более 12 слов]\n\n" +
    "ЧТО ПРОВЕРИТЬ НА СЛЕДУЮЩЕЙ СЕССИИ\n\n" +
    "[2–3 предложения]\n",
};

export const NAV_CONTEXT_LABELS: Record<string, string> = {
  nav_1: "Клиентская динамика",
  nav_2: "Перенос",
  nav_3: "Контрперенос",
  nav_4: "Риски и границы работы",
  nav_5: "Стратегия следующей сессии",
  nav_6: "Гипотезы и интервенции",
};

export const NAV_LEVEL_MAP: Record<string, string> = {
  nav_1: "client",
  nav_2: "transference",
  nav_3: "countertransference",
  nav_4: "risks",
  nav_5: "strategy",
  nav_6: "interventions",
};

export const LEVEL_NAV_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(NAV_LEVEL_MAP).map(([k, v]) => [v, k])
);

export const ALL_LEVELS = [
  "client",
  "transference",
  "countertransference",
  "strategy",
  "interventions",
  "risks",
] as const;

export type NavLevelKey = (typeof ALL_LEVELS)[number];

export const LEVEL_LABELS: Record<string, string> = {
  client: "Клиентская динамика",
  transference: "Перенос",
  countertransference: "Контрперенос",
  strategy: "Стратегия следующей сессии",
  interventions: "Гипотезы и интервенции",
  risks: "Риски и границы работы",
};

export function build_final_nav_analysis_prompt(
  caseText: string,
  navKey: string,
  supervisionRequest: string,
  qnaText: string,
  therapistInjection?: string,
  supervisorStyleBlock?: string
): string {
  const focus = NAV_CONTEXT_LABELS[navKey] ?? "Супервизионный разбор";
  const basePrompt = NAV_PROMPTS[navKey] ?? CASE_PROMPT;
  const therapistBlock =
    therapistInjection?.trim() ? `${therapistInjection.trim()}\n\n` : "";
  const supervisorAppend =
    supervisorStyleBlock?.trim() ? `${supervisorStyleBlock.trim()}\n\n` : "";

  return (
    therapistBlock +
    basePrompt +
    `\n\nФокус разбора: ${focus}\n\n` +
    supervisorAppend +
    `Супервизорский запрос терапевта:\n${supervisionRequest}\n\n` +
    `Материал кейса:\n${caseText}\n\n` +
    `Ответы терапевта на уточняющие вопросы:\n${qnaText}\n\n` +
    "Сделай финальный супервизионный анализ с учётом всех данных.\n" +
    "Не повторяй вопросы.\n" +
    "Не пересказывай весь кейс.\n" +
    "Дай клинически полезный вывод и следующие шаги."
  );
}
