import type { InternalNote } from "@/lib/razbor/config";
import { FORMAT_LABELS } from "@/lib/razbor/config";
import type { RazborRequest } from "@/lib/razbor/schema";

const TG_LIMIT = 4000;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const orDash = (s: string) => (s.trim() ? esc(s.trim()) : "—");

export function buildTelegramText(input: {
  req: RazborRequest;
  note: InternalNote | null;
  aiStatus: string;
  risk: boolean;
  saved: boolean;
}): string {
  const { req, note, aiStatus, risk, saved } = input;
  const lines = [
    `<b>Новая заявка: разбор ситуации</b>${risk ? "\n⚠️ <b>Есть признаки риска — проверьте ответы</b>" : ""}`,
    "",
    `<b>Имя:</b> ${orDash(req.name)}`,
    `<b>Контакт:</b> ${orDash(req.contact)}`,
    `<b>Формат:</b> ${FORMAT_LABELS[req.format]}`,
    `<b>Тема:</b> ${orDash(req.topic)}`,
    "",
    `<b>1. Что происходит:</b>\n${orDash(req.answers.what)}`,
    `<b>2. Как давно:</b> ${orDash(req.answers.howLong)}`,
    `<b>3. Что уже пробовали:</b>\n${orDash(req.answers.tried)}`,
    `<b>4. Что хотят получить:</b>\n${orDash(req.answers.want)}`,
    `<b>5. Почему сейчас:</b>\n${orDash(req.answers.whyNow)}`,
    "",
  ];
  if (note) {
    lines.push(
      "<b>Рабочая записка (AI)</b>",
      `<b>Гипотезы:</b>\n${esc(note.hypotheses)}`,
      `<b>Риски:</b>\n${esc(note.risks)}`,
      `<b>Вопросы:</b>\n${note.questions.map((q, i) => `${i + 1}. ${esc(q)}`).join("\n")}`,
      `<b>План:</b>\n${esc(note.plan)}`,
    );
  } else {
    lines.push(
      `<i>AI-записка не сформирована (${esc(aiStatus)}). Клиент получил резервный текст.</i>`,
    );
  }
  if (!saved)
    lines.push(
      "",
      "<i>Заявка не сохранилась в базе — сохраните это сообщение.</i>",
    );
  return lines.join("\n");
}

function splitMessage(text: string): string[] {
  if (text.length <= TG_LIMIT) return [text];
  const parts: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > TG_LIMIT && current) {
      parts.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line.slice(0, TG_LIMIT);
  }
  if (current) parts.push(current);
  return parts;
}

export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;
  let ok = true;
  for (const part of splitMessage(text)) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: part,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) ok = false;
    } catch {
      ok = false;
    }
  }
  return ok;
}
