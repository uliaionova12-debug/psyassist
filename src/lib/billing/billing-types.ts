/**
 * PsyAssist billing domain types + заготовка полей профиля для Supabase (без оплаты в этом коммите).
 */

export type PlanType = "free" | "single_case" | "start" | "practice";

/** Текущее сохранённое состояние биллинга в браузере (до синка с profiles). */
export interface UserBillingProfile {
  planType: PlanType;
  /** После первого завершённого интеграционного цикла на free */
  freeIntroUsed: boolean;
  /** Купленные разовые слоты (490 ₽) */
  singleCaseCredits: number;
  /** Активная подписка по тарифу START или PRACTICE */
  subscriptionKind: null | "start" | "practice";
  /** Использовано кейсов в текущем биллинговом месяце (START / PRACTICE) */
  monthlyCaseUsed: number;
  /** Год-месяц вида YYYY-MM для сброса monthlyCaseUsed */
  billingPeriodMonth: string;
}

/** Вычисляемые права доступа к функциям продукта (v1). */
export interface UserEntitlements {
  free_intro_used: boolean;
  single_case_credits: number;
  monthly_case_limit: number | null;
  monthly_case_used: number;
  has_nav_access: boolean;
  has_chat_access: boolean;
  has_history_access: boolean;
}

/**
 * Будущие колонки в `public.profiles` (или отдельной таблице подписок).
 * Миграция оплаты не включена — только контракт для следующего шага.
 */
export interface ProfilesBillingColumns {
  plan_type: PlanType;
  free_intro_used: boolean;
  single_case_credits: number;
  subscription_kind: null | "start" | "practice";
  monthly_case_used: number;
  billing_period_month: string;
  updated_at: string;
}
