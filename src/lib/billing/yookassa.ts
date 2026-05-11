import { PLAN_PRICES_RUB } from "@/lib/billing/plans";

const YOOKASSA_API = "https://api.yookassa.ru/v3";

export type CheckoutPlanType = "single_case" | "start" | "practice";

export function getPaymentsDisabledMessage(): string {
  return "Оплата пока не подключена";
}

/** Публичный base URL для return_url (сервер): приоритет YOOKASSA_RETURN_URL, иначе NEXT_PUBLIC_APP_URL. */
export function resolveBillingPublicBaseUrl(): string {
  const explicit = process.env.YOOKASSA_RETURN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) throw new Error("billing_public_base_missing");
  return appUrl.replace(/\/$/, "");
}

/** Shop id + secret + база для return_url (любой из двух env). */
export function isYooKassaFullyConfigured(): boolean {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
  const base =
    process.env.YOOKASSA_RETURN_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  return Boolean(shopId && secretKey && base);
}

function basicAuthHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID!.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY!.trim();
  const token = Buffer.from(`${shopId}:${secretKey}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function formatRub(amountRub: number): string {
  return amountRub.toFixed(2);
}

function amountForPlan(planType: CheckoutPlanType): number {
  switch (planType) {
    case "single_case":
      return PLAN_PRICES_RUB.single_case;
    case "start":
      return PLAN_PRICES_RUB.start_monthly;
    case "practice":
      return PLAN_PRICES_RUB.practice_monthly;
    default: {
      const _: never = planType;
      return _;
    }
  }
}

function descriptionForPlan(planType: CheckoutPlanType): string {
  switch (planType) {
    case "single_case":
      return "PsyAssist — Разобрать один кейс";
    case "start":
      return "PsyAssist — START — 5 кейсов в месяц";
    case "practice":
      return "PsyAssist — PRACTICE — без ограничений";
    default: {
      const _: never = planType;
      return _;
    }
  }
}

export async function createYooKassaRedirectPayment(input: {
  planType: CheckoutPlanType;
  returnUrl: string;
  idempotenceKey: string;
  /** Доп. строковые поля metadata (например user_id). */
  metadataExtra?: Record<string, string>;
}): Promise<{ paymentId: string; confirmationUrl: string }> {
  const value = formatRub(amountForPlan(input.planType));
  const body = {
    amount: { value, currency: "RUB" },
    confirmation: { type: "redirect", return_url: input.returnUrl },
    capture: true,
    description: descriptionForPlan(input.planType),
    metadata: {
      plan: input.planType,
      plan_type: input.planType,
      amount: value,
      source: "psyassist",
      ...input.metadataExtra,
    },
  };

  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": input.idempotenceKey,
      Authorization: basicAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`yookassa_create_failed:${res.status}:${rawText}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("yookassa_create_invalid_json");
  }

  const paymentId =
    typeof data === "object" && data !== null && "id" in data && typeof (data as { id: unknown }).id === "string"
      ? (data as { id: string }).id
      : null;

  let confirmationUrl: string | null = null;
  if (typeof data === "object" && data !== null && "confirmation" in data) {
    const c = (data as { confirmation?: { confirmation_url?: unknown } }).confirmation;
    if (c && typeof c.confirmation_url === "string") confirmationUrl = c.confirmation_url;
  }

  if (!paymentId || !confirmationUrl) {
    throw new Error("yookassa_create_missing_fields");
  }

  return { paymentId, confirmationUrl };
}

export async function fetchYooKassaPaymentStatus(paymentId: string): Promise<{ status: string }> {
  const res = await fetch(`${YOOKASSA_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: basicAuthHeader() },
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`yookassa_get_failed:${res.status}:${rawText}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("yookassa_get_invalid_json");
  }

  const status =
    typeof data === "object" && data !== null && "status" in data && typeof (data as { status: unknown }).status === "string"
      ? (data as { status: string }).status
      : "unknown";

  return { status };
}
