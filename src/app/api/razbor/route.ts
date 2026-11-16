import { after, NextResponse } from "next/server";

import { generateRazbor } from "@/lib/razbor/ai";
import type {
  ClientMap,
  InternalNote,
  RazborApiError,
  RazborApiSuccess,
} from "@/lib/razbor/config";
import { fallbackClientMap } from "@/lib/razbor/fallback";
import {
  clientIp,
  DB_RATE_MAX,
  DB_RATE_WINDOW_MINUTES,
  hashIp,
  takeRateLimit,
} from "@/lib/razbor/rate-limit";
import { hasRiskSignals, RISK_CLIENT_TEXT } from "@/lib/razbor/risk";
import { RazborRequestSchema } from "@/lib/razbor/schema";
import { buildTelegramText, sendTelegram } from "@/lib/razbor/telegram";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 40;

const MAX_BODY_BYTES = 20_000;

function fail(status: number, code: RazborApiError["code"], message: string) {
  return NextResponse.json<RazborApiError>(
    { ok: false, code, message },
    { status },
  );
}

export async function POST(req: Request) {
  const rawBody = await req.text().catch(() => "");
  if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
    return fail(400, "INVALID_BODY", "Проверьте ответы и попробуйте ещё раз.");
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return fail(400, "INVALID_BODY", "Проверьте ответы и попробуйте ещё раз.");
  }
  const parsed = RazborRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "INVALID_BODY", "Проверьте ответы и попробуйте ещё раз.");
  }
  const data = parsed.data;

  const ipHash = hashIp(clientIp(req));
  if (!takeRateLimit(ipHash)) {
    return fail(
      429,
      "RATE_LIMITED",
      "Слишком много попыток. Попробуйте позже или напишите Юлии напрямую.",
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  if (supabase) {
    const since = new Date(
      Date.now() - DB_RATE_WINDOW_MINUTES * 60_000,
    ).toISOString();
    const { count } = await supabase
      .from("razbor_leads")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= DB_RATE_MAX) {
      return fail(
        429,
        "RATE_LIMITED",
        "Слишком много попыток. Попробуйте позже или напишите Юлии напрямую.",
      );
    }
  }

  const answersText = Object.values(data.answers).join("\n");
  const keywordRisk = hasRiskSignals(answersText);

  const ai = await generateRazbor(data);
  const aiStatus = ai.ok ? "ok" : `error:${ai.reason}`;
  const clientMap = ai.ok
    ? withRiskNotice(ai.client_map, keywordRisk)
    : fallbackClientMap(data.format, keywordRisk);
  const internalNote: InternalNote | null = ai.ok ? ai.internal_note : null;

  let saved = false;
  if (supabase) {
    const { error } = await supabase.from("razbor_leads").insert({
      format: data.format,
      topic: data.topic,
      name: data.name,
      contact: data.contact,
      answers: data.answers,
      client_map: clientMap,
      internal_note: internalNote,
      ai_status: aiStatus,
      ip_hash: ipHash,
    });
    saved = !error;
    if (error) console.error("[razbor] lead insert failed:", error.message);
  } else {
    console.error(
      "[razbor] Supabase service role is not configured; lead not saved",
    );
  }

  const telegramText = buildTelegramText({
    req: data,
    note: internalNote,
    aiStatus,
    risk: keywordRisk,
    saved,
  });
  after(async () => {
    const sent = await sendTelegram(telegramText);
    if (!sent)
      console.error("[razbor] telegram notification failed or not configured");
  });

  return NextResponse.json<RazborApiSuccess>({
    ok: true,
    client_map: clientMap,
    ai_status: ai.ok ? "ok" : "error",
    saved,
  });
}

function withRiskNotice(map: ClientMap, risk: boolean): ClientMap {
  if (!risk || JSON.stringify(map).includes("112")) return map;
  return { ...map, next_step: `${map.next_step} ${RISK_CLIENT_TEXT}`.trim() };
}
