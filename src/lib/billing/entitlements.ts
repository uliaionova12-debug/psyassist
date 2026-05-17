import type { UserBillingProfile, UserEntitlements } from "@/lib/billing/billing-types";
import { PLAN_MONTHLY_LIMIT } from "@/lib/billing/plans";
import { currentBillingMonth, rolloverMonthlyUsageIfNeeded } from "@/lib/billing/credits";
import { isQaMode } from "@/lib/qa-mode";

/** Legacy flat JSON (no schema version). Removed on successful v2 writes and on auth invalidation when stale. */
export const BILLING_PROFILE_LEGACY_STORAGE_KEY = "psyassist_billing_profile_v1";

/** Current localStorage key for `{ v, ...UserBillingProfile }` envelopes. */
export const BILLING_PROFILE_STORAGE_KEY_V2 = "psyassist_billing_profile_v2";

/** Bump when the persisted JSON shape or merge rules change (triggers purge of mismatched v2 + legacy keys on sign-in). */
export const BILLING_PROFILE_CACHE_VERSION = 2;

export const DEFAULT_BILLING_PROFILE: UserBillingProfile = {
  planType: "free",
  freeIntroUsed: false,
  singleCaseCredits: 0,
  subscriptionKind: null,
  monthlyCaseUsed: 0,
  billingPeriodMonth: currentBillingMonth(),
};

function normalizePartialProfile(o: Partial<UserBillingProfile>): UserBillingProfile {
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
}

function tryParseV2Envelope(raw: string): UserBillingProfile | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    if (o.v !== BILLING_PROFILE_CACHE_VERSION) return null;
    const { v: _v, ...rest } = o;
    return normalizePartialProfile(rest as Partial<UserBillingProfile>);
  } catch {
    return null;
  }
}

/** Try legacy flat `UserBillingProfile` JSON (no `v` field). */
function tryParseLegacyFlat(raw: string): UserBillingProfile | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    if ("v" in o) return null;
    return normalizePartialProfile(o as Partial<UserBillingProfile>);
  } catch {
    return null;
  }
}

/**
 * On SIGNED_IN / getSession before applying any cached billing to React: drop legacy v1 and any v2
 * envelope whose schema version does not match the running app (stale shape).
 */
export function invalidateLocalBillingStorageBeforeSignedInHydrate(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BILLING_PROFILE_LEGACY_STORAGE_KEY);
    const rawV2 = localStorage.getItem(BILLING_PROFILE_STORAGE_KEY_V2);
    if (!rawV2) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawV2) as Record<string, unknown>;
    } catch {
      localStorage.removeItem(BILLING_PROFILE_STORAGE_KEY_V2);
      return;
    }
    if (parsed?.v !== BILLING_PROFILE_CACHE_VERSION) {
      localStorage.removeItem(BILLING_PROFILE_STORAGE_KEY_V2);
    }
  } catch {
    /* quota / private mode */
  }
}

/** Guest / signed-out reads: v2 envelope, else migrate flat v1, else default. */
export function loadBillingProfile(): UserBillingProfile {
  if (typeof window === "undefined") return DEFAULT_BILLING_PROFILE;
  try {
    const rawV2 = localStorage.getItem(BILLING_PROFILE_STORAGE_KEY_V2);
    if (rawV2) {
      const fromV2 = tryParseV2Envelope(rawV2);
      if (fromV2) return fromV2;
      localStorage.removeItem(BILLING_PROFILE_STORAGE_KEY_V2);
    }
    const rawLegacy = localStorage.getItem(BILLING_PROFILE_LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const migrated = tryParseLegacyFlat(rawLegacy);
      if (migrated) return migrated;
    }
    return DEFAULT_BILLING_PROFILE;
  } catch {
    return DEFAULT_BILLING_PROFILE;
  }
}

export function saveBillingProfile(profile: UserBillingProfile): void {
  if (typeof window === "undefined") return;
  try {
    const rolled = rolloverMonthlyUsageIfNeeded(profile);
    const payload = {
      v: BILLING_PROFILE_CACHE_VERSION,
      planType: rolled.planType,
      freeIntroUsed: rolled.freeIntroUsed,
      singleCaseCredits: rolled.singleCaseCredits,
      subscriptionKind: rolled.subscriptionKind,
      monthlyCaseUsed: rolled.monthlyCaseUsed,
      billingPeriodMonth: rolled.billingPeriodMonth,
    };
    localStorage.setItem(BILLING_PROFILE_STORAGE_KEY_V2, JSON.stringify(payload));
    localStorage.removeItem(BILLING_PROFILE_LEGACY_STORAGE_KEY);
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
