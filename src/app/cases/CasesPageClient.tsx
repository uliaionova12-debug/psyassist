"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { stripClinicalMarkdown } from "@/lib/clinical/markdown-strip";
import {
  persistence_ensure_server_auth,
  persistence_get_supervision_case,
  persistence_list_cases,
  persistence_patch_case_status,
} from "@/lib/persistence/assistant-client";
import { createSupabaseBrowserClientOptional } from "@/lib/supabase/browser-optional";
import {
  persistenceDisplayString,
  supervisionCaseDisplayTitle,
} from "@/lib/persistence/supervision-case";
import type { SupervisionCase, SupervisionCaseSummary } from "@/lib/persistence/types";

function formatRuDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function statusRu(s: string | null): string {
  if (s === "completed") return "Завершён";
  if (s === "archived") return "Архив";
  return "Активен";
}

function CasesListSkeleton() {
  const pulse = "animate-pulse rounded-md bg-[color:var(--border)]";
  return (
    <ul
      className="mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2"
      aria-busy="true"
      aria-label="Загрузка списка кейсов"
    >
      {[0, 1].map((i) => (
        <li key={i}>
          <Card className="flex h-full flex-col gap-4 p-5 sm:p-6">
            <div className={`h-6 w-2/3 ${pulse}`} />
            <div className={`h-4 w-1/3 ${pulse}`} />
            <div className={`h-16 w-full ${pulse}`} />
            <div className="mt-auto flex gap-2">
              <div className={`h-10 w-28 ${pulse}`} />
              <div className={`h-10 w-24 ${pulse}`} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function CasesPageClient() {
  const [authReady, setAuthReady] = useState(false);
  const [browserHasUser, setBrowserHasUser] = useState(false);
  const [cases, setCases] = useState<SupervisionCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [detail, setDetail] = useState<SupervisionCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const client = createSupabaseBrowserClientOptional();
    if (!client) {
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    void client.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setBrowserHasUser(Boolean(session?.user));
      setAuthReady(true);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setBrowserHasUser(Boolean(session?.user));
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const load = useCallback(async () => {
    if (!authReady) return;

    if (!browserHasUser) {
      setError("Войдите в аккаунт, чтобы увидеть сохранённые кейсы.");
      setCases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const ensured = await persistence_ensure_server_auth();
    if (!ensured) {
      setError(
        "Вход выполнен в браузере, но сессия не синхронизирована с сервером. Обновите страницу и попробуйте снова."
      );
      setCases([]);
      setLoading(false);
      return;
    }

    const r = await persistence_list_cases();
    if (!r.ok) {
      setError(
        r.code === "NO_SESSION"
          ? "Войдите в аккаунт, чтобы увидеть сохранённые кейсы."
          : r.code === "SUPABASE_DISABLED"
            ? "Серверное хранение отключено в этой среде."
            : r.message ?? "Не удалось загрузить список."
      );
      setCases([]);
      setLoading(false);
      return;
    }
    setCases(r.cases);
    setLoading(false);
  }, [authReady, browserHasUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = showArchived
    ? cases.filter((c) => c.status === "archived")
    : cases.filter((c) => c.status !== "archived");

  const showSkeleton = !authReady || loading;

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    const r = await persistence_get_supervision_case(Number(id));
    setDetailLoading(false);
    if (r.ok) setDetail(r.case);
  };

  const archive = async (id: string) => {
    setBusyId(id);
    const r = await persistence_patch_case_status(Number(id), "archived");
    setBusyId(null);
    if (r.ok) void load();
  };

  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Мои случаи</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
              Сохранённые супервизии: можно продолжить с того же места или открыть текст кейса.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/assistant" tone="primary" className="w-full sm:w-auto">
              Новая супервизия
            </ButtonLink>
            <Button
              type="button"
              tone="secondary"
              className="w-full sm:w-auto"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? "Активные и завершённые" : "Архив"}
            </Button>
          </div>
        </div>

        {showSkeleton && <CasesListSkeleton />}

        {authReady && !loading && error && (
          <Card className="mt-8 p-6">
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">{error}</p>
            {error.includes("Войдите") ? (
              <div className="mt-4">
                <ButtonLink href="/assistant" tone="primary" className="w-full sm:w-auto">
                  Перейти к супервизии
                </ButtonLink>
              </div>
            ) : (
              <div className="mt-4">
                <Button type="button" tone="secondary" onClick={() => void load()}>
                  Повторить
                </Button>
              </div>
            )}
          </Card>
        )}

        {authReady && browserHasUser && !loading && !error && visible.length === 0 && (
          <Card className="mt-8 p-6">
            <p className="text-sm text-[color:var(--muted)]">
              {showArchived
                ? "В архиве пока пусто."
                : "Пока нет сохранённых кейсов. Завершите супервизию в ассистенте — кейс появится здесь."}
            </p>
            {!showArchived ? (
              <div className="mt-4">
                <ButtonLink href="/assistant" tone="primary" className="w-full sm:w-auto">
                  Открыть супервизию
                </ButtonLink>
              </div>
            ) : null}
          </Card>
        )}

        {authReady && browserHasUser && !loading && !error && visible.length > 0 && (
          <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
            {visible.map((c) => (
              <li key={c.id}>
                <Card className="flex h-full flex-col gap-4 p-5 sm:p-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold tracking-[-0.02em]">
                        {supervisionCaseDisplayTitle(c)}
                      </span>
                      <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-xs text-[color:var(--muted)]">
                        {statusRu(c.status)}
                      </span>
                    </div>
                    <p className="text-xs text-[color:var(--muted)]">
                      Обновлён {formatRuDate(c.updated_at)}
                      {c.created_at !== c.updated_at ? ` · Создан ${formatRuDate(c.created_at)}` : null}
                    </p>
                  </div>
                  <dl className="grid grid-cols-1 gap-2 text-sm text-[color:var(--muted)]">
                    {persistenceDisplayString(c.focus) ? (
                      <div>
                        <dt className="font-medium text-[color:var(--text)]">Фокус</dt>
                        <dd className="mt-0.5 leading-relaxed">{persistenceDisplayString(c.focus)}</dd>
                      </div>
                    ) : null}
                    {persistenceDisplayString(c.current_layer) ? (
                      <div>
                        <dt className="font-medium text-[color:var(--text)]">Слой</dt>
                        <dd className="mt-0.5 leading-relaxed">{persistenceDisplayString(c.current_layer)}</dd>
                      </div>
                    ) : null}
                    {c.duration_minutes != null ? (
                      <div>
                        <dt className="font-medium text-[color:var(--text)]">Длительность (мин.)</dt>
                        <dd className="mt-0.5">{c.duration_minutes}</dd>
                      </div>
                    ) : c.first_session_date?.trim() ? (
                      <div>
                        <dt className="font-medium text-[color:var(--text)]">Сессия / длительность</dt>
                        <dd className="mt-0.5 leading-relaxed">{c.first_session_date.trim()}</dd>
                      </div>
                    ) : null}
                    {c.last_insight?.trim() ? (
                      <div>
                        <dt className="font-medium text-[color:var(--text)]">Последний инсайт</dt>
                        <dd className="mt-0.5 line-clamp-4 whitespace-pre-line leading-relaxed">
                          {stripClinicalMarkdown(c.last_insight)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {c.resume_available ? (
                      <ButtonLink
                        href={`/assistant?resume=${encodeURIComponent(c.id)}`}
                        tone="primary"
                        className="w-full sm:w-auto"
                      >
                        Продолжить
                      </ButtonLink>
                    ) : (
                      <Button
                        type="button"
                        tone="primary"
                        className="w-full cursor-not-allowed opacity-45 sm:w-auto"
                        disabled
                        title="Нет сохранённого состояния сессии для этого кейса."
                      >
                        Продолжить
                      </Button>
                    )}
                    <Button
                      type="button"
                      tone="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void openDetail(c.id)}
                    >
                      Открыть
                    </Button>
                    {!showArchived ? (
                      <Button
                        type="button"
                        tone="ghost"
                        className="w-full sm:w-auto"
                        disabled={busyId === c.id}
                        onClick={() => void archive(c.id)}
                      >
                        Архивировать
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        tone="ghost"
                        className="w-full sm:w-auto"
                        disabled={busyId === c.id}
                        onClick={async () => {
                          setBusyId(c.id);
                          const r = await persistence_patch_case_status(Number(c.id), "active");
                          setBusyId(null);
                          if (r.ok) void load();
                        }}
                      >
                        Вернуть из архива
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {detailLoading && (
          <p className="mt-6 text-sm text-[color:var(--muted)]" aria-live="polite">
            Загружаем кейс…
          </p>
        )}

        {detail && !detailLoading && (
          <Card className="mt-8 space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                {supervisionCaseDisplayTitle(detail)}
              </h2>
              <Button type="button" tone="ghost" className="self-start sm:self-auto" onClick={() => setDetail(null)}>
                Закрыть
              </Button>
            </div>
            {detail.initial_case?.trim() ? (
              <div>
                <p className="text-sm font-medium text-[color:var(--text)]">История и запрос</p>
                <div className="mt-2 max-h-[min(40vh,22rem)] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                  {stripClinicalMarkdown(detail.initial_case.trim())}
                </div>
              </div>
            ) : null}
            {detail.integrationReflection?.trim() ? (
              <div>
                <p className="text-sm font-medium text-[color:var(--text)]">Интеграционная рефлексия</p>
                <div className="mt-2 max-h-[min(36vh,20rem)] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                  {stripClinicalMarkdown(detail.integrationReflection.trim())}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {detail.resume_available ? (
                <ButtonLink
                  href={`/assistant?resume=${encodeURIComponent(detail.id)}`}
                  tone="primary"
                  className="w-full sm:w-auto"
                >
                  Продолжить в ассистенте
                </ButtonLink>
              ) : (
                <Button
                  type="button"
                  tone="primary"
                  className="w-full cursor-not-allowed opacity-45 sm:w-auto"
                  disabled
                  title="Нет сохранённого состояния сессии для этого кейса."
                >
                  Продолжить в ассистенте
                </Button>
              )}
            </div>
          </Card>
        )}
      </Container>
    </main>
  );
}
