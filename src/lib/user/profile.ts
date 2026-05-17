import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanType, UserBillingProfile } from "@/lib/billing/billing-types";
import { currentBillingMonth, rolloverMonthlyUsageIfNeeded } from "@/lib/billing/credits";
import { PLAN_MONTHLY_LIMIT } from "@/lib/billing/plans";

/** Статус биллинга в интерфейсе и для будущей синхронизации с ЮKassa. */
export type BillingStatus = "none" | "active" | "past_due" | "canceled";

/** Строка `public.profiles` (snake_case как в Postgres). */
export interface UserProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  plan_type: PlanType;
  billing_status: BillingStatus;
  free_intro_used: boolean;
  single_case_credits: number;
  monthly_case_limit: number | null;
  monthly_case_used: number;
  subscription_kind: "start" | "practice" | null;
  billing_period_month: string;
  /** После миграции вебхука; до применения миграции может отсутствовать в ответе PostgREST. */
  unlimited_cases?: boolean;
  paid_until?: string | null;
  created_at: string;
  updated_at: string;
}

/** Профиль для UI / клиента (camelCase). */
export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  planType: PlanType;
  billingStatus: BillingStatus;
  freeIntroUsed: boolean;
  singleCaseCredits: number;
  monthlyCaseLimit: number | null;
  monthlyCaseUsed: number;
  subscriptionKind: "start" | "practice" | null;
  billingPeriodMonth: string;
  unlimitedCases: boolean;
  paidUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Имя для UI: `name` или локальная часть email. */
export function profileDisplayName(name: string | null | undefined, email: string | null): string | null {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  if (!email) return null;
  const at = email.indexOf("@");
  const local = (at > 0 ? email.slice(0, at) : email).trim();
  return local || null;
}

export function rowToUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    planType: row.plan_type,
    billingStatus: row.billing_status,
    freeIntroUsed: row.free_intro_used,
    singleCaseCredits: row.single_case_credits,
    monthlyCaseLimit: row.monthly_case_limit,
    monthlyCaseUsed: row.monthly_case_used,
    subscriptionKind: row.subscription_kind,
    billingPeriodMonth: row.billing_period_month,
    unlimitedCases: row.unlimited_cases ?? false,
    paidUntil: row.paid_until ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function monthlyLimitForPlanType(planType: PlanType): number | null {
  if (planType === "start") return PLAN_MONTHLY_LIMIT.start;
  if (planType === "practice") return PLAN_MONTHLY_LIMIT.practice;
  return null;
}

/** Карта строки профиля → биллинг-состояние ассистента. */
export function profileRowToBilling(row: UserProfileRow): UserBillingProfile {
  return rolloverMonthlyUsageIfNeeded({
    planType: row.plan_type,
    freeIntroUsed: row.free_intro_used,
    singleCaseCredits: row.single_case_credits,
    subscriptionKind: row.subscription_kind,
    monthlyCaseUsed: row.monthly_case_used,
    billingPeriodMonth: row.billing_period_month,
  });
}

/** Обновление биллинга в профиле (PATCH). */
export function billingProfileToProfilePatch(bp: UserBillingProfile): Partial<UserProfileRow> {
  const rolled = rolloverMonthlyUsageIfNeeded(bp);
  return {
    plan_type: rolled.planType,
    free_intro_used: rolled.freeIntroUsed,
    single_case_credits: rolled.singleCaseCredits,
    subscription_kind: rolled.subscriptionKind,
    monthly_case_used: rolled.monthlyCaseUsed,
    billing_period_month: rolled.billingPeriodMonth,
    monthly_case_limit: monthlyLimitForPlanType(rolled.planType),
  };
}

/** Гарантирует строку в `profiles` (после логина / колбэка OAuth). */
export async function ensureProfileExists(
  supabase: SupabaseClient,
  userId: string,
  email: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function fetchProfileRowForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true; row: UserProfileRow } | { ok: false; code: "NOT_FOUND" | "ERROR"; message?: string }> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    return { ok: false, code: "ERROR", message: error.message };
  }
  if (!data) {
    return { ok: false, code: "NOT_FOUND" };
  }
  return { ok: true, row: data as UserProfileRow };
}
