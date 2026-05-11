import Link from "next/link";
import { redirect } from "next/navigation";

import { SupervisionTrustBlock } from "@/components/billing/SupervisionTrustBlock";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { deriveEntitlements } from "@/lib/billing/entitlements";
import { PLAN_MONTHLY_LIMIT } from "@/lib/billing/plans";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import {
  ensureProfileExists,
  fetchProfileRowForUser,
  profileRowToBilling,
  rowToUserProfile,
} from "@/lib/user/profile";

function formatSeconds(total: number): string {
  if (total <= 0) return "0 мин";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

function planLabel(planType: string): string {
  switch (planType) {
    case "free":
      return "Free";
    case "single_case":
      return "Один кейс";
    case "start":
      return "START";
    case "practice":
      return "PRACTICE";
    default:
      return planType;
  }
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  await ensureProfileExists(supabase, user.id, user.email ?? null);

  const loaded = await fetchProfileRowForUser(supabase, user.id);
  const profileRow = loaded.ok ? loaded.row : null;
  const profile = profileRow ? rowToUserProfile(profileRow) : null;
  const billing = profileRow ? profileRowToBilling(profileRow) : null;
  const entitlements = billing ? deriveEntitlements(billing) : null;

  const { data: progressRow } = await supabase
    .from("supervision_progress")
    .select("total_active_seconds")
    .eq("user_id", user.id)
    .maybeSingle();

  const totalSeconds = Number(progressRow?.total_active_seconds ?? 0);

  const { data: recentCases } = await supabase
    .from("cases")
    .select("id, case_title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  let availableLabel = "—";
  let usedLabel = "—";

  if (entitlements && billing) {
    if (billing.planType === "practice") {
      availableLabel = "Без лимита";
      usedLabel = String(entitlements.monthly_case_used);
    } else if (billing.planType === "start" && entitlements.monthly_case_limit != null) {
      const left = Math.max(0, entitlements.monthly_case_limit - entitlements.monthly_case_used);
      availableLabel = `${left} из ${entitlements.monthly_case_limit} в этом месяце`;
      usedLabel = String(entitlements.monthly_case_used);
    } else if (billing.planType === "single_case") {
      availableLabel = `${entitlements.single_case_credits} разбор(ов)`;
      usedLabel = "—";
    } else if (billing.planType === "free") {
      availableLabel = billing.freeIntroUsed ? "0 (ознакомление завершено)" : "1 ознакомительный";
      usedLabel = billing.freeIntroUsed ? "1" : "0";
    }
  }

  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Дашборд</h1>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Тариф, лимиты разборов и недавние кейсы (данные из Supabase).
              </p>
            </div>
            <ButtonLink href="/assistant" tone="primary">
              К ассистенту
            </ButtonLink>
          </header>

          <SupervisionTrustBlock variant="card" />

          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Разбор переписки</p>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted)]">
                  Отдельный модуль: текст или скриншоты — клинический разбор динамики переписки (полный доступ на
                  тарифе Practice).
                </p>
              </div>
              <ButtonLink href="/chat-analysis" tone="secondary" className="w-full shrink-0 sm:w-auto">
                Открыть модуль
              </ButtonLink>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                Текущий тариф
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                {profile ? planLabel(profile.planType) : "—"}
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Биллинг: {profile?.billingStatus ?? "—"}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                Супервизионное время
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">
                {formatSeconds(totalSeconds)}
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Накоплено по учёту активности</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                Доступные разборы
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">{availableLabel}</p>
              {billing?.planType === "start" && (
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Лимит тарифа START: {PLAN_MONTHLY_LIMIT.start} в месяц
                </p>
              )}
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
                Использовано кейсов (период)
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--text)]">{usedLabel}</p>
              {billing && (
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Учётный месяц: {billing.billingPeriodMonth}
                </p>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Последние кейсы</h2>
            {!recentCases?.length ? (
              <p className="mt-4 text-sm text-[color:var(--muted)]">
                Пока нет сохранённых кейсов. Войдите в ассистенте под аккаунтом — тогда история будет
                сохраняться.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[color:var(--border)]">
                {recentCases.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="block font-medium text-[color:var(--text)]">
                        {c.case_title?.trim() || `Кейс #${c.id}`}
                      </span>
                      <span className="block text-xs text-[color:var(--muted)]">
                        {c.updated_at ? new Date(c.updated_at).toLocaleString("ru-RU") : ""}
                      </span>
                    </div>
                    <ButtonLink
                      href={`/chat-analysis?case=${c.id}`}
                      tone="secondary"
                      className="w-full shrink-0 sm:mt-0.5 sm:w-auto"
                    >
                      Разбор переписки
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-sm">
              <Link href="/cases" className="font-medium text-[color:var(--text)] underline underline-offset-2">
                Все кейсы
              </Link>
            </p>
          </Card>
        </div>
      </Container>
    </main>
  );
}
