import OpenAI from "openai";

import type { ClientMap, InternalNote } from "@/lib/razbor/config";
import {
  buildUserMessage,
  RAZBOR_SCHEMA_HINT,
  RAZBOR_SYSTEM_PROMPT,
} from "@/lib/razbor/prompt";
import { AiResponseSchema, type RazborRequest } from "@/lib/razbor/schema";

const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 25_000;

export type AiResult =
  | { ok: true; client_map: ClientMap; internal_note: InternalNote }
  | { ok: false; reason: string };

const asText = (v: string | string[]) =>
  (Array.isArray(v) ? v.join("\n") : v).trim();

export async function generateRazbor(req: RazborRequest): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_api_key" };

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RAZBOR_SYSTEM_PROMPT },
        { role: "system", content: RAZBOR_SCHEMA_HINT },
        { role: "user", content: buildUserMessage(req) },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { ok: false, reason: "empty_response" };

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "invalid_json" };
    }
    const parsed = AiResponseSchema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: "invalid_schema" };

    const { client_map, internal_note } = parsed.data;
    return {
      ok: true,
      client_map: {
        short: client_map.short.trim(),
        focus: client_map.focus.map((f) => f.trim()),
        first_session: client_map.first_session.trim(),
        next_step: client_map.next_step.trim(),
      },
      internal_note: {
        hypotheses: asText(internal_note.hypotheses),
        risks: asText(internal_note.risks) || "Явных признаков риска нет",
        questions: internal_note.questions.map((q) => q.trim()),
        plan: asText(internal_note.plan),
      },
    };
  } catch (err) {
    if (err instanceof OpenAI.APIConnectionTimeoutError)
      return { ok: false, reason: "timeout" };
    if (err instanceof OpenAI.APIError)
      return { ok: false, reason: `api_error_${err.status ?? "unknown"}` };
    return { ok: false, reason: "unknown_error" };
  }
}
