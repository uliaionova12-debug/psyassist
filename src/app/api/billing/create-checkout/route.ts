import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  CHECKOUT_RETURN_PATHS,
  buildCheckoutReturnUrl,
  resolveCheckoutReturnPath,
} from "@/lib/billing/checkout-return-paths";
import type { CheckoutPlanType } from "@/lib/billing/yookassa";
import {
  createYooKassaRedirectPayment,
  getPaymentsDisabledMessage,
  isYooKassaFullyConfigured,
  resolveBillingPublicBaseUrl,
} from "@/lib/billing/yookassa";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import { ensureProfileExists } from "@/lib/user/profile";

const BodySchema = z.object({
  planType: z.enum(["single_case", "start", "practice"]),
  /** Where to send the user after YooKassa (allowlisted pathname only). */
  returnPath: z.enum(CHECKOUT_RETURN_PATHS).optional(),
});

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

  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({
      ok: false as const,
      message: getPaymentsDisabledMessage(),
    });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json(
      {
        ok: false as const,
        code: "UNAUTHORIZED" as const,
        message: "Чтобы оплатить тариф, войдите в аккаунт.",
      },
      { status: 401 }
    );
  }

  await ensureProfileExists(supabase, user.id, user.email ?? null);

  if (!isYooKassaFullyConfigured()) {
    return NextResponse.json({
      ok: false as const,
      message: getPaymentsDisabledMessage(),
    });
  }

  const base = resolveBillingPublicBaseUrl();
  const path = resolveCheckoutReturnPath(parsed.data.returnPath);
  const returnUrl = buildCheckoutReturnUrl(base, path);

  try {
    const { paymentId, confirmationUrl } = await createYooKassaRedirectPayment({
      planType: parsed.data.planType as CheckoutPlanType,
      returnUrl,
      idempotenceKey: randomUUID(),
      metadataExtra: { user_id: user.id },
    });

    return NextResponse.json({
      ok: true as const,
      paymentId,
      confirmationUrl,
    });
  } catch (e) {
    console.error("[billing/create-checkout]", e);
    return NextResponse.json(
      {
        ok: false as const,
        code: "PROVIDER_ERROR" as const,
        message: "Не удалось создать платёж",
      },
      { status: 502 }
    );
  }
}
