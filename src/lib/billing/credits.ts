import type { PlanType, UserBillingProfile } from "@/lib/billing/billing-types";
import { PLAN_MONTHLY_LIMIT } from "@/lib/billing/plans";
import { isQaMode } from "@/lib/qa-mode";

/** Текущий календарный месяц YYYY-MM (UTC). */
export function currentBillingMonth(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Сброс месячного счётчика при смене месяца. */
export function rolloverMonthlyUsageIfNeeded(profile: UserBillingProfile): UserBillingProfile {
  const cur = currentBillingMonth();
  if (profile.billingPeriodMonth === cur) return profile;
  return {
    ...profile,
    billingPeriodMonth: cur,
    monthlyCaseUsed: 0,
  };
}

/**
 * Списывает один «старт кейса» для платных тарифов.
 * Для free intro кейса списание не выполняется (слот фиксируется завершением рефлексии).
 */
export function consumeCaseCredit(profile: UserBillingProfile): UserBillingProfile | null {
  if (isQaMode()) return rolloverMonthlyUsageIfNeeded(profile);
  const p = rolloverMonthlyUsageIfNeeded(profile);

  if (p.planType === "free") {
    return null;
  }

  if (p.planType === "single_case") {
    if (p.singleCaseCredits <= 0) return null;
    return { ...p, singleCaseCredits: p.singleCaseCredits - 1 };
  }

  if (p.planType === "start") {
    const lim = PLAN_MONTHLY_LIMIT.start;
    if (p.monthlyCaseUsed >= lim) return null;
    return { ...p, monthlyCaseUsed: p.monthlyCaseUsed + 1 };
  }

  if (p.planType === "practice") {
    return { ...p, monthlyCaseUsed: p.monthlyCaseUsed + 1 };
  }

  return null;
}

/** Применить тип плана после успешной оплаты (заглушка до ЮKassa). */
/**
 * Проверка и списание слота при старте нового разборного цикла (CASE_REMINDER_CONTINUE).
 * Бесплатный intro не списывает слот до завершения рефлексии (freeIntroUsed остаётся false).
 */
export function tryConsumeCaseStart(
  profile: UserBillingProfile
):
  | { ok: true; profile: UserBillingProfile; consumed: boolean }
  | { ok: false } {
  if (isQaMode()) {
    return { ok: true, profile: rolloverMonthlyUsageIfNeeded(profile), consumed: false };
  }
  const p = rolloverMonthlyUsageIfNeeded(profile);

  if (p.planType === "free" && !p.freeIntroUsed) {
    return { ok: true, profile: p, consumed: false };
  }

  if (p.planType === "free" && p.freeIntroUsed) {
    return { ok: false };
  }

  const next = consumeCaseCredit(p);
  if (!next) return { ok: false };
  return { ok: true, profile: next, consumed: true };
}

export function applyPlanPurchase(
  profile: UserBillingProfile,
  plan: Exclude<PlanType, "free">
): UserBillingProfile {
  const p = rolloverMonthlyUsageIfNeeded(profile);
  const month = currentBillingMonth();

  if (plan === "single_case") {
    return {
      ...p,
      planType: "single_case",
      singleCaseCredits: p.singleCaseCredits + 1,
      billingPeriodMonth: month,
    };
  }

  if (plan === "start") {
    return {
      ...p,
      planType: "start",
      subscriptionKind: "start",
      billingPeriodMonth: month,
      monthlyCaseUsed: 0,
    };
  }

  return {
    ...p,
    planType: "practice",
    subscriptionKind: "practice",
    billingPeriodMonth: month,
    monthlyCaseUsed: 0,
  };
}
