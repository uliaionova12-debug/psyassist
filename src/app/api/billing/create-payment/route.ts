import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import type { CheckoutPlanType } from "@/lib/billing/yookassa";
import {
  createYooKassaRedirectPayment,
  isYooKassaFullyConfigured,
  resolveBillingPublicBaseUrl,
} from "@/lib/billing/yookassa";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import { ensureProfileExists } from "@/lib/user/profile";

const BodySchema = z.object({
  plan: z.enum(["single_case", "start", "practice"]),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, message: "Некорректное тело запроса." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false as const,
        code: "INVALID_PLAN" as const,
        message: "Укажите plan: single_case, start или practice.",
      },
      { status: 400 }
    );
  }

  if (!isYooKassaFullyConfigured()) {
    return NextResponse.json(
      {
        ok: false as const,
        code: "BILLING_NOT_CONFIGURED" as const,
        message: "Оплата на сервере не настроена.",
      },
      { status: 503 }
    );
  }

  let metadataExtra: Record<string, string> | undefined;
  const supabase = await createSupabaseServerClientOptional();
  if (supabase) {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (!authErr && user) {
      await ensureProfileExists(supabase, user.id, user.email ?? null);
      metadataExtra = { user_id: user.id };
    }
  }

  const base = resolveBillingPublicBaseUrl();
  const returnUrl = `${base}/payment/success?billing_checkout=1`;

  try {
    const { paymentId, confirmationUrl } = await createYooKassaRedirectPayment({
      planType: parsed.data.plan as CheckoutPlanType,
      returnUrl,
      idempotenceKey: randomUUID(),
      metadataExtra,
    });

    return NextResponse.json({
      ok: true as const,
      confirmation_url: confirmationUrl,
      payment_id: paymentId,
    });
  } catch (e) {
    console.error("[billing/create-payment]", e);
    return NextResponse.json(
      {
        ok: false as const,
        code: "PAYMENT_CREATE_FAILED" as const,
        message: "Не удалось создать платёж в ЮKassa.",
      },
      { status: 502 }
    );
  }
}
