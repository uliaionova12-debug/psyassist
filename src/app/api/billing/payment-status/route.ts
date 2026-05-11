import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchYooKassaPaymentStatus, getPaymentsDisabledMessage, isYooKassaFullyConfigured } from "@/lib/billing/yookassa";

export async function GET(req: Request) {
  if (!isYooKassaFullyConfigured()) {
    return NextResponse.json({ ok: false as const, message: getPaymentsDisabledMessage() });
  }

  const url = new URL(req.url);
  const idParse = z.string().min(8).max(128).safeParse(url.searchParams.get("id"));
  if (!idParse.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_ID" as const }, { status: 400 });
  }

  try {
    const { status } = await fetchYooKassaPaymentStatus(idParse.data);
    return NextResponse.json({
      ok: true as const,
      status,
      paid: status === "succeeded",
    });
  } catch (e) {
    console.error("[billing/payment-status]", e);
    return NextResponse.json(
      { ok: false as const, code: "LOOKUP_FAILED" as const, message: "Не удалось проверить платёж" },
      { status: 502 }
    );
  }
}
