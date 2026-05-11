import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Заявки на личную online-супервизию.
 * Заглушка: без сохранения в БД и без email — всегда успешный ответ с текстом для пользователя.
 * TODO: сохранение в Supabase / отправка на почту при появлении конфигурации.
 */

const BodySchema = z.object({
  preferredDay: z.string().min(1).max(200),
  preferredTime: z.string().min(1).max(200),
  timezone: z.string().min(1).max(200),
  requestBrief: z.string().min(10).max(4000),
});

const SUCCESS_MESSAGE =
  "Заявка принята. Мы свяжемся с вами для согласования времени.";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, code: "INVALID_JSON" as const }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" as const }, { status: 400 });
  }

  console.info("[supervision-request] placeholder", {
    preferredDay: parsed.data.preferredDay,
    preferredTime: parsed.data.preferredTime,
    timezone: parsed.data.timezone,
    requestBriefLength: parsed.data.requestBrief.length,
  });

  return NextResponse.json({
    ok: true as const,
    message: SUCCESS_MESSAGE,
  });
}
