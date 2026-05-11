"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CasePurchasePaywall } from "@/components/billing/CasePurchasePaywall";
import { GuestPaywallHint } from "@/components/billing/GuestPaywallHint";
import { SubscriptionPaywall } from "@/components/billing/SubscriptionPaywall";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PRODUCT_EVENTS } from "@/lib/analytics/constants";
import { trackEvent } from "@/lib/analytics/events";
import type { ChatFocusPromptKey } from "@/lib/clinical/chat-analysis";
import type { PlanType, UserBillingProfile } from "@/lib/billing/billing-types";
import {
  DEFAULT_BILLING_PROFILE,
  canUseChatAnalysis,
  loadBillingProfile,
  saveBillingProfile,
} from "@/lib/billing/entitlements";
import { isQaMode, setQaModeServerFlag } from "@/lib/qa-mode";
import {
  persistence_get_supervision_case,
  persistence_list_cases,
} from "@/lib/persistence/assistant-client";
import type { SupervisionCase, SupervisionCaseSummary } from "@/lib/persistence/types";
import { createSupabaseBrowserClientOptional } from "@/lib/supabase/browser-optional";

import { CasePicker } from "@/components/cases/CasePicker";

/** UI-лейблы модуля → существующие ключи промптов (клинические строки в chat-analysis.ts не меняются). */
const FOCUS_OPTIONS: { key: ChatFocusPromptKey; label: string }[] = [
  { key: "chat_focus_state", label: "Что происходит с клиентом" },
  { key: "chat_focus_transference", label: "Что происходит со мной" },
  { key: "chat_focus_contract", label: "Где риски границ" },
  { key: "chat_focus_pressure", label: "Как экологично ответить" },
  { key: "chat_focus_defenses", label: "Что я сейчас не замечаю" },
];

type Step = "welcome" | "focus" | "compose" | "loading" | "result";
type InputKind = "text" | "screenshots";

function fileToInlineBase64(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("read_failed"));
        return;
      }
      const comma = r.indexOf(",");
      const base64 = comma >= 0 ? r.slice(comma + 1) : r;
      const mimeType = file.type || "image/png";
      resolve({ mimeType, base64 });
    };
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

const textareaClass =
  "mt-2 w-full min-h-[140px] resize-y rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 85%, transparent)] px-4 py-3 text-sm leading-relaxed text-[color:var(--text)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)]";

export function ChatAnalysisClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseQuery = searchParams.get("case");

  const [billingProfile, setBillingProfile] = useState<UserBillingProfile>(DEFAULT_BILLING_PROFILE);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);

  const [casePhase, setCasePhase] = useState<"pick" | "ready">("pick");
  const [caseSummaries, setCaseSummaries] = useState<SupervisionCaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesFetchError, setCasesFetchError] = useState<string | null>(null);
  const [loadedCase, setLoadedCase] = useState<SupervisionCase | null>(null);
  const [caseLoadError, setCaseLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("welcome");
  const [inputKind, setInputKind] = useState<InputKind>("text");
  const [focusKey, setFocusKey] = useState<ChatFocusPromptKey | null>(null);
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState<Array<{ mimeType: string; base64: string }>>([]);
  const [resultText, setResultText] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [overloadRetry, setOverloadRetry] = useState(false);
  const [showFreeTeaser, setShowFreeTeaser] = useState(false);
  const [showPaywallGate, setShowPaywallGate] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);

  useEffect(() => {
    const client = createSupabaseBrowserClientOptional();
    if (!client) {
      setBillingProfile(loadBillingProfile());
      setAuthReady(true);
      return;
    }

    let sub: { unsubscribe: () => void } | undefined;

    void client.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id } : null);
      if (u) {
        void fetch("/api/user/profile", { credentials: "include" })
          .then((r) => r.json())
          .then((body: { ok?: boolean; billing?: UserBillingProfile; qaMode?: boolean }) => {
            if (body?.ok && body.billing) {
              saveBillingProfile(body.billing);
              setBillingProfile(body.billing);
            }
            if (body?.ok) setQaModeServerFlag(Boolean(body.qaMode));
          })
          .catch(() => {});
      } else {
        setBillingProfile(loadBillingProfile());
        setQaModeServerFlag(false);
      }
      setAuthReady(true);
    });

    const { data } = client.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id } : null);
      if (u) {
        void fetch("/api/user/profile", { credentials: "include" })
          .then((r) => r.json())
          .then((body: { ok?: boolean; billing?: UserBillingProfile; qaMode?: boolean }) => {
            if (body?.ok && body.billing) {
              saveBillingProfile(body.billing);
              setBillingProfile(body.billing);
            }
            if (body?.ok) setQaModeServerFlag(Boolean(body.qaMode));
          })
          .catch(() => {});
      } else {
        setBillingProfile(loadBillingProfile());
        setQaModeServerFlag(false);
      }
    });
    sub = data.subscription;

    return () => sub?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !authUser) {
      setCaseSummaries([]);
      setCasesLoading(false);
      return;
    }
    setCasesLoading(true);
    setCasesFetchError(null);
    void persistence_list_cases().then((r) => {
      setCasesLoading(false);
      if (!r.ok) {
        setCasesFetchError(
          r.code === "NO_SESSION" || r.code === "SUPABASE_DISABLED"
            ? null
            : "Не удалось загрузить список кейсов."
        );
        setCaseSummaries([]);
        return;
      }
      setCaseSummaries(r.cases);
    });
  }, [authReady, authUser]);

  useEffect(() => {
    if (!authReady || !authUser || !caseQuery) return;
    const n = Number(caseQuery);
    if (!Number.isFinite(n)) return;
    let cancelled = false;
    setCaseLoadError(null);
    void persistence_get_supervision_case(n).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setCaseLoadError(
          r.code === "NOT_FOUND"
            ? "Кейс не найден или недоступен."
            : "Не удалось загрузить кейс."
        );
        setLoadedCase(null);
        setCasePhase("pick");
        return;
      }
      setLoadedCase(r.case);
      setCasePhase("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, authUser, caseQuery]);

  const selectedCaseTitle = useMemo(() => {
    if (!loadedCase) return "";
    const t = loadedCase.case_title?.trim();
    if (t) return t;
    const cl = loadedCase.client_name?.trim();
    if (cl) return cl;
    return `Кейс #${loadedCase.id}`;
  }, [loadedCase]);

  const handleCaseSelected = useCallback(
    async (caseId: string) => {
      setCaseLoadError(null);
      const n = Number(caseId);
      if (!Number.isFinite(n)) return;
      const r = await persistence_get_supervision_case(n);
      if (!r.ok) {
        setCaseLoadError(
          r.code === "NOT_FOUND"
            ? "Кейс не найден или недоступен."
            : "Не удалось загрузить кейс."
        );
        return;
      }
      setLoadedCase(r.case);
      setCasePhase("ready");
      router.replace(`/chat-analysis?case=${caseId}`, { scroll: false });
    },
    [router]
  );

  const handleNewCase = useCallback(() => {
    router.push("/assistant");
  }, [router]);

  const handleChangeCase = useCallback(() => {
    setLoadedCase(null);
    setCasePhase("pick");
    setCaseLoadError(null);
    router.replace("/chat-analysis", { scroll: false });
  }, [router]);

  const handleCheckoutPlan = useCallback(async (plan: Exclude<PlanType, "free">) => {
    setBillingNotice(null);
    if (!authReady) return;
    if (plan === "single_case") void trackEvent({ eventName: PRODUCT_EVENTS.single_case_selected });
    else if (plan === "start") void trackEvent({ eventName: PRODUCT_EVENTS.start_plan_selected });
    else void trackEvent({ eventName: PRODUCT_EVENTS.practice_plan_selected });
    void trackEvent({ eventName: PRODUCT_EVENTS.checkout_started, payload: { plan, source: "chat_analysis_module" } });

    setCheckoutBusy(true);
    try {
      const res = await fetch("/api/billing/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        code?: string;
        confirmation_url?: string;
        confirmationUrl?: string;
        payment_id?: string;
        paymentId?: string;
      } | null;

      if (!data?.ok) {
        void trackEvent({
          eventName: PRODUCT_EVENTS.checkout_failed,
          payload: { plan, reason: data?.message ?? data?.code ?? "checkout_rejected" },
        });
        setBillingNotice(
          data?.message ??
            (data?.code === "BILLING_NOT_CONFIGURED"
              ? "Оплата на сервере не настроена."
              : data?.code === "INVALID_PLAN"
                ? "Некорректный тариф."
                : data?.code === "PAYMENT_CREATE_FAILED"
                  ? "Не удалось создать платёж."
                  : "Не удалось начать оплату")
        );
        return;
      }
      const confirmationUrl = data.confirmation_url ?? data.confirmationUrl;
      const paymentId = data.payment_id ?? data.paymentId;
      if (!confirmationUrl || !paymentId) {
        void trackEvent({
          eventName: PRODUCT_EVENTS.checkout_failed,
          payload: { plan, reason: "missing_confirmation" },
        });
        setBillingNotice("Не удалось начать оплату");
        return;
      }
      try {
        sessionStorage.setItem("psyassist_checkout_payment_id", paymentId);
      } catch {
        /* noop */
      }
      window.location.assign(confirmationUrl);
    } catch {
      void trackEvent({
        eventName: PRODUCT_EVENTS.checkout_failed,
        payload: { plan, reason: "network" },
      });
      setBillingNotice("Не удалось связаться с сервером оплаты");
    } finally {
      setCheckoutBusy(false);
    }
  }, [authReady]);

  async function onChatFiles(files: FileList | null) {
    if (!files?.length) return;
    const accepted = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
    const next: Array<{ mimeType: string; base64: string }> = [];
    for (const f of Array.from(files)) {
      const mt = f.type || "image/png";
      if (!accepted.has(mt)) continue;
      try {
        next.push(await fileToInlineBase64(f));
      } catch {
        /* skip */
      }
      if (next.length + images.length >= 8) break;
    }
    setImages((prev) => [...prev, ...next].slice(0, 8));
  }

  async function runAnalysis() {
    setComposeError(null);
    setOverloadRetry(false);
    setShowFreeTeaser(false);
    setShowPaywallGate(false);

    if (!focusKey) {
      setComposeError("Выберите фокус разбора.");
      return;
    }

    const transcriptText = draft.trim();
    if (!transcriptText && images.length === 0) {
      setComposeError("Нужен текст переписки или хотя бы один скриншот.");
      return;
    }

    const allowed = canUseChatAnalysis(billingProfile);

    if (isQaMode()) {
      // QA: allow all modules; do not show paywalls/teasers.
      // Entitlements/credits are already bypassed centrally.
    } else {
    if (!allowed && billingProfile.planType === "free") {
      setShowFreeTeaser(true);
      void trackEvent({
        eventName: PRODUCT_EVENTS.paywall_seen,
        payload: { placement: "chat_analysis_free_teaser" },
      });
      return;
    }

    if (!allowed && (billingProfile.planType === "start" || billingProfile.planType === "single_case")) {
      setShowPaywallGate(true);
      void trackEvent({
        eventName: PRODUCT_EVENTS.paywall_seen,
        payload: { placement: "chat_analysis_upgrade" },
      });
      return;
    }

    if (!allowed) {
      setShowPaywallGate(true);
      return;
    }
    }

    void trackEvent({
      eventName: PRODUCT_EVENTS.chat_analysis_started,
      payload: { source: "module_chat_analysis", focusKey },
    });

    setStep("loading");

    try {
      const res = await fetch("/api/assistant/chat-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusKey,
          transcriptText: transcriptText || undefined,
          images: images.length ? images : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        text?: string;
        code?: string;
        message?: string;
        status?: string;
        retryable?: boolean;
      } | null;

      if (!data?.ok || !data.text?.trim()) {
        setOverloadRetry(data?.status === "temporary_ai_overload" && Boolean(data?.retryable));
        setComposeError(data?.message ?? data?.code ?? "Не удалось выполнить разбор.");
        setStep("compose");
        return;
      }

      setResultText(data.text.trim());
      setStep("result");
      void trackEvent({
        eventName: PRODUCT_EVENTS.chat_analysis_completed,
        payload: { source: "module_chat_analysis", focusKey },
      });
    } catch {
      setOverloadRetry(false);
      setComposeError("Сеть или сервер недоступны. Попробуйте позже.");
      setStep("compose");
    }
  }

  function resetFlow() {
    setStep("welcome");
    setFocusKey(null);
    setDraft("");
    setImages([]);
    setResultText("");
    setComposeError(null);
    setShowFreeTeaser(false);
    setShowPaywallGate(false);
  }

  const practiceFull = canUseChatAnalysis(billingProfile);

  const pickCaseBlock =
    casePhase === "pick" ? (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          Выберите кейс для продолжения разбора
        </h2>

        {caseLoadError ? (
          <p className="text-sm text-[color:color-mix(in srgb,var(--accent-sand) 70%,var(--text))]">{caseLoadError}</p>
        ) : null}

        {casesFetchError ? (
          <p className="text-sm text-[color:color-mix(in srgb,var(--accent-sand) 70%,var(--text))]">{casesFetchError}</p>
        ) : null}

        {!authReady ? (
          <p className="text-sm text-[color:var(--muted)]">Проверяем вход…</p>
        ) : null}

        {authReady && authUser && casesLoading ? (
          <p className="text-sm text-[color:var(--muted)]">Загрузка сохранённых кейсов…</p>
        ) : null}

        {authReady && authUser && !casesLoading && caseSummaries.length === 0 ? (
          <Card className="space-y-4 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">
              Пока нет сохраненных кейсов. Начните с базовой супервизии.
            </p>
            <Button type="button" className="w-full sm:w-auto" onClick={handleNewCase}>
              Начать новый кейс
            </Button>
          </Card>
        ) : null}

        {authReady && authUser && !casesLoading && caseSummaries.length > 0 ? (
          <CasePicker cases={caseSummaries} onSelect={(id) => void handleCaseSelected(id)} onNewCase={handleNewCase} />
        ) : null}

        {authReady && !authUser ? (
          <Card className="space-y-4 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">
              Пока нет сохраненных кейсов. Начните с базовой супервизии.
            </p>
            <Button type="button" className="w-full sm:w-auto" onClick={handleNewCase}>
              Начать новый кейс
            </Button>
          </Card>
        ) : null}
      </div>
    ) : null;

  const caseContextBanner =
    casePhase === "ready" && loadedCase ? (
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Текущий кейс</p>
          <p className="text-sm font-semibold text-[color:var(--text)]">{selectedCaseTitle}</p>
          {loadedCase.supervisionRequest?.trim() ? (
            <p className="line-clamp-2 text-xs text-[color:var(--muted)]">{loadedCase.supervisionRequest.trim()}</p>
          ) : null}
        </div>
        <Button type="button" tone="ghost" className="shrink-0 sm:w-auto w-full" onClick={handleChangeCase}>
          Сменить кейс
        </Button>
      </Card>
    ) : null;

  return (
    <main className="flex w-full flex-1 flex-col">
      <Container className="max-w-2xl py-10 sm:py-14">
        <div className="space-y-8">
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
              Модуль PsyAssist
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
              Разбор переписки с клиентом
            </h1>
            {!practiceFull && (
              <p className="rounded-xl border border-[color:color-mix(in srgb,var(--accent-sand) 35%,var(--border))] bg-[color:color-mix(in srgb,var(--accent-sand) 6%,white)] px-4 py-3 text-xs leading-relaxed text-[color:var(--muted)]">
                Полный разбор переписки и скриншотов доступен на тарифе{" "}
                <strong className="text-[color:var(--text)]">Practice</strong>. На тарифах Free и START вы можете
                ознакомиться с модулем и перейти к оплате при необходимости.
              </p>
            )}
          </header>

          {billingNotice && (
            <p className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb,white 92%,transparent)] px-4 py-3 text-sm text-[color:var(--muted)]">
              {billingNotice}
            </p>
          )}

          {casePhase === "pick" ? pickCaseBlock : null}

          {casePhase === "ready" ? caseContextBanner : null}

          {casePhase === "ready" && step === "welcome" && (
            <Card className="space-y-6 p-6 sm:p-8">
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Загрузите скриншоты переписки или вставьте текст сообщений. PsyAssist поможет увидеть скрытую динамику,
                риски границ, перенос и возможные ответы.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" className="w-full sm:flex-1" onClick={() => {
                  setInputKind("text");
                  setStep("focus");
                }}>
                  Вставить текст
                </Button>
                <Button
                  type="button"
                  tone="secondary"
                  className="w-full sm:flex-1"
                  onClick={() => {
                    setInputKind("screenshots");
                    setStep("focus");
                  }}
                >
                  Загрузить скриншоты
                </Button>
              </div>
            </Card>
          )}

          {casePhase === "ready" && step === "focus" && (
            <Card className="space-y-5 p-6 sm:p-8">
              <p className="text-sm font-medium text-[color:var(--text)]">Выберите фокус разбора</p>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Фокус разбора переписки">
                {FOCUS_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`flex w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      focusKey === key
                        ? "border-[color:color-mix(in srgb,var(--accent-green) 45%,var(--border))] bg-[color:color-mix(in srgb,var(--accent-green) 10%,white)]"
                        : "border-[color:var(--border)] bg-[color:color-mix(in srgb,white 88%,transparent)] hover:border-[color:color-mix(in srgb,var(--accent-sand) 35%,var(--border))]"
                    }`}
                    onClick={() => setFocusKey(key)}
                  >
                    <span className="text-[color:var(--text)]">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" tone="ghost" onClick={() => setStep("welcome")}>
                  Назад
                </Button>
                <Button
                  type="button"
                  disabled={!focusKey}
                  onClick={() => setStep("compose")}
                >
                  Далее
                </Button>
              </div>
            </Card>
          )}

          {casePhase === "ready" && step === "compose" && focusKey && (
            <Card className="space-y-5 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[color:var(--text)]">
                {FOCUS_OPTIONS.find((o) => o.key === focusKey)?.label ?? "Разбор"}
              </h2>

              {inputKind === "text" ? (
                <>
                  <label className="block text-sm font-medium text-[color:var(--text)]">
                    Текст переписки
                    <textarea
                      className={textareaClass}
                      placeholder="Вставьте сообщения (обез персональных данных клиента, только обезличенный контекст)…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </label>
                  <div className="space-y-2">
                    <label htmlFor="chat-mod-files" className="text-sm font-medium text-[color:var(--text)]">
                      Дополнительно: скриншоты
                    </label>
                    <input
                      id="chat-mod-files"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      className="block w-full text-sm text-[color:var(--muted)]"
                      onChange={(e) => void onChatFiles(e.target.files)}
                    />
                    {images.length > 0 ? (
                      <p className="text-xs text-[color:var(--muted)]">Загружено изображений: {images.length}</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="chat-mod-files-main" className="text-sm font-medium text-[color:var(--text)]">
                      Скриншоты переписки
                    </label>
                    <input
                      id="chat-mod-files-main"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      className="block w-full text-sm text-[color:var(--muted)]"
                      onChange={(e) => void onChatFiles(e.target.files)}
                    />
                    {images.length > 0 ? (
                      <p className="text-xs text-[color:var(--muted)]">Загружено изображений: {images.length}</p>
                    ) : null}
                  </div>
                  <label className="block text-sm font-medium text-[color:var(--text)]">
                    Дополнительно: пояснение текстом
                    <textarea
                      className={textareaClass}
                      placeholder="Краткий контекст к скриншотам…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </label>
                </>
              )}

              {composeError && (
                <div className="space-y-3">
                  <p className="text-sm text-[color:color-mix(in srgb,var(--accent-sand) 70%,var(--text))]">{composeError}</p>
                  {overloadRetry && (
                    <Button type="button" tone="secondary" className="w-full sm:w-auto" onClick={() => void runAnalysis()}>
                      Продолжить супервизию
                    </Button>
                  )}
                </div>
              )}

              {showFreeTeaser && (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb,white 94%,transparent)] px-4 py-4 text-sm leading-relaxed text-[color:var(--muted)]">
                  <p className="font-medium text-[color:var(--text)]">Ознакомительный режим</p>
                  <p className="mt-2">
                    Полный анализ переписки и скриншотов с клиническим разбором доступен на тарифе{" "}
                    <strong className="text-[color:var(--text)]">Practice</strong>. В ознакомительном режиме здесь
                    можно пройти шаги модуля без запуска модели.
                  </p>
                  <p className="mt-3 text-xs">
                    Основная супервизия случая — в ассистенте по вашему тарифу; этот модуль полностью открывается после
                    перехода на Practice.
                  </p>
                </div>
              )}

              {showPaywallGate && (
                <div className="space-y-5 border-t border-[color:var(--border)] pt-6">
                  <p className="text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                    Чтобы запускать разбор переписки и скриншотов в этом модуле, нужен тариф Practice с полным доступом к
                    коммуникационному разбору.
                  </p>
                  <CasePurchasePaywall
                    disabled={checkoutBusy || !authReady}
                    onSelect={() => void handleCheckoutPlan("single_case")}
                  />
                  <SubscriptionPaywall
                    disabled={checkoutBusy || !authReady}
                    onSelectStart={() => void handleCheckoutPlan("start")}
                    onSelectPractice={() => void handleCheckoutPlan("practice")}
                  />
                  {authReady && !authUser && <GuestPaywallHint />}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" tone="ghost" onClick={() => setStep("focus")}>
                  Назад
                </Button>
                <Button type="button" onClick={() => void runAnalysis()}>
                  Запустить анализ
                </Button>
              </div>
            </Card>
          )}

          {casePhase === "ready" && step === "loading" && (
            <Card className="p-8">
              <p className="text-lg font-semibold text-[color:var(--text)]">Анализ переписки</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">Модель читает материал и формулирует разбор…</p>
            </Card>
          )}

          {casePhase === "ready" && step === "result" && (
            <Card className="space-y-5 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[color:var(--text)]">Разбор переписки</h2>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb,white 88%,transparent)] px-4 py-4">
                <div className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">{resultText}</div>
              </div>
              <Button type="button" tone="secondary" onClick={resetFlow}>
                Новый разбор
              </Button>
            </Card>
          )}
        </div>
      </Container>
    </main>
  );
}
