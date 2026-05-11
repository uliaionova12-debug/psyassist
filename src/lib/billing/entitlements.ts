import type { UserBillingProfile, UserEntitlements } from "@/lib/billing/billing-types";
import { PLAN_MONTHLY_LIMIT } from "@/lib/billing/plans";
import { currentBillingMonth, rolloverMonthlyUsageIfNeeded } from "@/lib/billing/credits";
import { isQaMode } from "@/lib/qa-mode";

const STORAGE_KEY = "psyassist_billing_profile_v1";

export const DEFAULT_BILLING_PROFILE: UserBillingProfile = {
  planType: "free",
  freeIntroUsed: false,
  singleCaseCredits: 0,
  subscriptionKind: null,
  monthlyCaseUsed: 0,
  billingPeriodMonth: currentBillingMonth(),
};

export function loadBillingProfile(): UserBillingProfile {
  if (typeof window === "undefined") return DEFAULT_BILLING_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BILLING_PROFILE;
    const o = JSON.parse(raw) as Partial<UserBillingProfile>;
    return rolloverMonthlyUsageIfNeeded({
      planType: o.planType === "practice" || o.planType === "start" || o.planType === "single_case" ? o.planType : "free",
      freeIntroUsed: Boolean(o.freeIntroUsed),
      singleCaseCredits: typeof o.singleCaseCredits === "number" ? Math.max(0, o.singleCaseCredits) : 0,
      subscriptionKind:
        o.subscriptionKind === "start" || o.subscriptionKind === "practice" ? o.subscriptionKind : null,
      monthlyCaseUsed: typeof o.monthlyCaseUsed === "number" ? Math.max(0, o.monthlyCaseUsed) : 0,
      billingPeriodMonth:
        typeof o.billingPeriodMonth === "string" ? o.billingPeriodMonth : currentBillingMonth(),
    });
  } catch {
    return DEFAULT_BILLING_PROFILE;
  }
}

export function saveBillingProfile(profile: UserBillingProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* quota / private mode */
  }
}

/** Доступен ли один бесплатный ознакомительный цикл. */
export function isFreeIntroAvailable(profile: UserBillingProfile): boolean {
  const p = rolloverMonthlyUsageIfNeeded(profile);
  return p.planType === "free" && !p.freeIntroUsed;
}

/** Вычисление прав по профилю и этапу ознакомления. */
export function deriveEntitlements(profile: UserBillingProfile): UserEntitlements {
  const p = rolloverMonthlyUsageIfNeeded(profile);

  const freeIntroUsed = p.freeIntroUsed;

  let monthly_case_limit: number | null = null;
  let monthly_case_used = p.monthlyCaseUsed;

  if (p.planType === "start") {
    monthly_case_limit = PLAN_MONTHLY_LIMIT.start;
  } else if (p.planType === "practice") {
    monthly_case_limit = PLAN_MONTHLY_LIMIT.practice;
  }

  let has_nav_access = false;
  let has_chat_access = false;
  let has_history_access = false;

  if (p.planType === "practice") {
    has_nav_access = true;
    has_chat_access = true;
    has_history_access = true;
  } else if (p.planType === "start") {
    has_nav_access = true;
    has_chat_access = false;
    has_history_access = true;
  } else if (p.planType === "single_case") {
    has_nav_access = true;
    has_chat_access = false;
    has_history_access = false;
  } else if (p.planType === "free") {
    /* Ознакомление и free после него — без NAV / chat / history по спецификации v1 */
    has_nav_access = false;
    has_chat_access = false;
    has_history_access = false;
  }

  return {
    free_intro_used: freeIntroUsed,
    single_case_credits: p.singleCaseCredits,
    monthly_case_limit,
    monthly_case_used,
    has_nav_access,
    has_chat_access,
    has_history_access,
  };
}

export function canStartCase(profile: UserBillingProfile): boolean {
  if (isQaMode()) return true;
  const p = rolloverMonthlyUsageIfNeeded(profile);

  if (p.planType === "free") {
    return !p.freeIntroUsed;
  }

  if (p.planType === "single_case") {
    return p.singleCaseCredits > 0;
  }

  if (p.planType === "start") {
    return p.monthlyCaseUsed < PLAN_MONTHLY_LIMIT.start;
  }

  if (p.planType === "practice") {
    return true;
  }

  return false;
}

export function canUseNav(profile: UserBillingProfile): boolean {
  if (isQaMode()) return true;
  return deriveEntitlements(profile).has_nav_access;
}

export function canUseChatAnalysis(profile: UserBillingProfile): boolean {
  if (isQaMode()) return true;
  return deriveEntitlements(profile).has_chat_access;
}
