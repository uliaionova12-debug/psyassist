import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

/**
 * ЮKassa HTTP notifications: https://yookassa.ru/developers/using-api/webhooks
 *
 * Security:
 * - Strict payload checks (event, status, paid, metadata.source/plan).
 * - Optional `YOOKASSA_WEBHOOK_SECRET`: when set, requires `Authorization: Basic`
 *   with username = YOOKASSA_SHOP_ID and password = that secret (ЮKassa-style Basic).
 * - Full HMAC/IP verification can be added later; until then rely on the checks above + HTTPS.
 *
 * `paid`: API документирует boolean; на всякий случай принимаем и строку `"true"` (регистронезависимо).
 */

const PLAN_VALUES = ["single_case", "start", "practice"] as const;
type WebhookPlan = (typeof PLAN_VALUES)[number];

const WebhookObjectSchema = z
  .object({
    id: z.string().min(1),
    status: z.string(),
    paid: z.union([z.boolean(), z.string()]),
    metadata: z.record(z.string(), z.unknown()).optional(),
    amount: z
      .object({
        value: z.union([z.string(), z.number()]),
        currency: z.string(),
      })
      .optional(),
  })
  .passthrough();

const WebhookBodySchema = z.object({
  type: z.string().optional(),
  event: z.string(),
  object: WebhookObjectSchema,
});

function isPaidTrue(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string" && v.toLowerCase() === "true") return true;
  return false;
}

function safeTimingEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function verifyOptionalWebhookBasicAuth(req: Request): boolean {
  const secret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  if (!shopId) return false;

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(auth.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }

  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);

  return safeTimingEqual(user, shopId) && safeTimingEqual(pass, secret);
}

function resolvePlan(metadata: Record<string, unknown> | undefined): WebhookPlan | null {
  if (!metadata) return null;
  const raw = metadata.plan ?? metadata.plan_type;
  if (typeof raw !== "string") return null;
  return (PLAN_VALUES as readonly string[]).includes(raw) ? (raw as WebhookPlan) : null;
}

function resolveMetadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!metadata) return undefined;
  const v = metadata[key];
  return typeof v === "string" ? v : undefined;
}

function parseAmount(object: z.infer<typeof WebhookObjectSchema>): {
  amount_value: number | null;
  amount_currency: string | null;
} {
  const amt = object.amount;
  if (!amt) return { amount_value: null, amount_currency: null };
  const currency = typeof amt.currency === "string" ? amt.currency : null;
  const raw = amt.value;
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  return {
    amount_value: Number.isFinite(n) ? n : null,
    amount_currency: currency,
  };
}

type RpcCode =
  | "PAYMENT_ALREADY_PROCESSED"
  | "PAYMENT_RECORDED_UNCLAIMED"
  | "PAYMENT_GRANTED";

export async function POST(req: Request) {
  if (!verifyOptionalWebhookBasicAuth(req)) {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  const parsed = WebhookBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  const { event, object } = parsed.data;

  if (event !== "payment.succeeded") {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  if (object.status !== "succeeded") {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  if (!isPaidTrue(object.paid)) {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  const metadata = object.metadata;
  if (resolveMetadataString(metadata, "source") !== "psyassist") {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  const plan = resolvePlan(metadata);
  if (!plan) {
    return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
  }

  const userIdRaw = resolveMetadataString(metadata, "user_id");
  let userId: string | null = null;
  if (userIdRaw !== undefined && userIdRaw.trim() !== "") {
    const uuidParsed = z.string().uuid().safeParse(userIdRaw.trim());
    if (!uuidParsed.success) {
      return NextResponse.json({ ok: false as const, code: "INVALID_WEBHOOK" as const }, { status: 400 });
    }
    userId = uuidParsed.data;
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    console.error("[billing/yookassa-webhook] SUPABASE_SERVICE_ROLE_KEY or URL missing");
    return NextResponse.json({ ok: false as const, message: "server_misconfigured" as const }, { status: 503 });
  }

  const yookassaPaymentId = object.id;
  const { amount_value, amount_currency } = parseAmount(object);

  const { data: rpcData, error: rpcErr } = await supabase.rpc("process_yookassa_webhook_payment", {
    p_yookassa_payment_id: yookassaPaymentId,
    p_user_id: userId,
    p_plan: plan,
    p_amount_value: amount_value,
    p_amount_currency: amount_currency,
    p_raw: rawBody as Record<string, unknown>,
  });

  if (rpcErr) {
    console.error("[billing/yookassa-webhook] rpc", rpcErr);
    return NextResponse.json({ ok: false as const, message: "payment_processing_failed" as const }, { status: 500 });
  }

  const rawCode =
    rpcData &&
    typeof rpcData === "object" &&
    rpcData !== null &&
    "code" in rpcData &&
    typeof (rpcData as { code: unknown }).code === "string"
      ? (rpcData as { code: string }).code
      : null;

  const code = rawCode as RpcCode | null;
  if (
    code === "PAYMENT_ALREADY_PROCESSED" ||
    code === "PAYMENT_RECORDED_UNCLAIMED" ||
    code === "PAYMENT_GRANTED"
  ) {
    return NextResponse.json({ ok: true as const, code }, { status: 200 });
  }

  console.error("[billing/yookassa-webhook] unexpected rpc payload", rpcData);
  return NextResponse.json({ ok: false as const, message: "unexpected_rpc_response" as const }, { status: 500 });
}
