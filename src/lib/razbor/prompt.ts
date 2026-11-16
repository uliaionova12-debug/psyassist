import type { RazborRequest } from "@/lib/razbor/schema";
import { FORMAT_LABELS } from "@/lib/razbor/config";

export const RAZBOR_SYSTEM_PROMPT =
  'Ты — ассистент практикующего психолога Юлии Ионовой. По ответам человека подготовь предварительную карту ситуации и рабочую записку для психолога. Правила: не ставь диагноз, не назначай лечение, не обещай результат и сроки; не используй медицинские термины; карта клиенту — тёплый простой язык, на "вы", 120–180 слов; при признаках риска для жизни — мягко порекомендуй позвонить 112 или на телефон доверия, в записке отметь риск; записка психологу 200–300 слов; без общих фраз; ответ строго JSON';

export const RAZBOR_SCHEMA_HINT = `Формат ответа — один JSON-объект строго такой структуры:
{"client_map":{"short":"строка","focus":["2–4 строки"],"first_session":"строка","next_step":"строка"},"internal_note":{"hypotheses":"строка","risks":"строка","questions":["3–5 строк"],"plan":"строка"}}
client_map — для клиента, всего 120–180 слов: short — 4–6 предложений (60–90 слов) о том, что происходит, своими словами по ответам человека; focus — 2–4 пункта по одному предложению, на чём стоит сосредоточиться; first_session — 2–3 предложения о том, как может пройти первая встреча с Юлией; next_step — один конкретный шаг, 1–2 предложения. internal_note — для психолога, всего 200–300 слов. Если признаков риска нет, в risks напиши «Явных признаков риска нет».`;

const empty = (v: string) => (v.trim() ? v.trim() : "— (пропущено)");

/** Name and contact are intentionally not sent to the model. */
export function buildUserMessage(req: RazborRequest): string {
  return [
    `Формат: ${FORMAT_LABELS[req.format]}`,
    `Тема: ${req.topic}`,
    `1. Что происходит: ${empty(req.answers.what)}`,
    `2. Как давно: ${empty(req.answers.howLong)}`,
    `3. Что уже пробовали: ${empty(req.answers.tried)}`,
    `4. Что хотите получить: ${empty(req.answers.want)}`,
    `5. Почему сейчас: ${empty(req.answers.whyNow)}`,
  ].join("\n");
}
