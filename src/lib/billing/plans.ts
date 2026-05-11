import type { PlanType } from "@/lib/billing/billing-types";

/** Цены PsyAssist v1 (отображение в UI; проведение оплаты — позже). */
export const PLAN_PRICES_RUB = {
  single_case: 490,
  start_monthly: 1490,
  practice_monthly: 3990,
} as const;

/** Лимиты кейсов в месяц по подпискам (practice — без потолка в продуктовой логике). */
export const PLAN_MONTHLY_LIMIT: {
  start: number;
  practice: null;
} = {
  start: 5,
  practice: null,
};

export function isPaidSubscription(planType: PlanType): boolean {
  return planType === "start" || planType === "practice";
}
