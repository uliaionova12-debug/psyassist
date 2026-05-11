/**
 * Clarifying-question engine before layered NAV analysis (Telegram / Replit).
 */

import { NAV_CONTEXT_LABELS } from "@/lib/clinical/navigation";
import { CASE_BASE } from "@/lib/clinical/reflection";

export function build_clarifying_questions_prompt(
  caseText: string,
  navKey: string,
  supervisionRequest: string,
  questionsCount: number,
  therapistInjection?: string,
  supervisorStyleBlock?: string
): string {
  const focus = NAV_CONTEXT_LABELS[navKey] ?? "Супервизионный разбор";
  const therapistBlock =
    therapistInjection?.trim() ? `\n${therapistInjection.trim()}\n` : "";
  const supervisorAppend =
    supervisorStyleBlock?.trim() ? `${supervisorStyleBlock.trim()}\n\n` : "";

  return (
    CASE_BASE +
    therapistBlock +
    `Сформулируй ${questionsCount} уточняющих супервизионных вопросов перед разбором.\n\n` +
    `Фокус разбора: ${focus}\n\n` +
    supervisorAppend +
    `Супервизорский запрос терапевта:\n${supervisionRequest}\n\n` +
    `Материал кейса:\n${caseText}\n\n` +
    "Требования к вопросам:\n" +
    "— вопросы должны быть клинически точными\n" +
    "— не общими\n" +
    "— не повторять уже собранную информацию\n" +
    "— учитывать подход терапевта\n" +
    "— учитывать уже применённые интервенции\n" +
    "— помогать углубить именно выбранный фокус\n" +
    "— каждый вопрос должен быть коротким и понятным\n" +
    "— без markdown, без нумерации сложными списками\n\n" +
    "Верни только список вопросов.\n" +
    "Каждый вопрос с новой строки.\n" +
    "Без вступления и без пояснений."
  );
}

/** Mirrors Telegram parse_questions(raw, limit). */
export function parse_questions(raw: string, limit: number): string[] {
  const lines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    let cleaned = line.trim();
    cleaned = cleaned.replace(/^\d+[\).\s-]+/, "").trim();
    cleaned = cleaned.replace(/^[\u2014\-•]\s*/, "").trim();

    if (cleaned) {
      lines.push(cleaned);
    }
  }

  if (!lines.length && raw.trim()) {
    const parts = raw.trim().split(/\n+|(?<=\?)\s+/);
    for (const p of parts) {
      const s = p.trim();
      if (s) lines.push(s);
    }
  }

  return lines.slice(0, limit);
}

export const CLARIFYING_FALLBACK_QUESTIONS = [
  "Что в этом фокусе сейчас кажется вам самым неясным?",
  "Что вы уже пробовали делать в этой точке?",
  "Какая реакция клиента на ваши интервенции повторяется?",
] as const;
