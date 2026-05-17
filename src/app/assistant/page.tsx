"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { _CHAT_FOCUS_PROMPTS, type ChatFocusPromptKey } from "@/lib/clinical/chat-analysis";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import {
  CASE_CONFIDENTIALITY_REMINDER,
  CASE_INTAKE_QUESTIONS,
  CASE_NARRATIVE_PROMPT_1,
  CASE_NARRATIVE_PROMPT_2,
  CONFIDENTIALITY_MORE_TEXT,
  CONFIDENTIALITY_TEXT,
  IONOVA_INTAKE_QUESTIONS,
  LOW_DATA_CONTINUE_WARNING,
  LOW_DATA_PROMPT_TEXT,
  is_narrative_sufficient,
} from "@/lib/clinical/intake";
import {
  SESSION_DEPTH_CALLBACK,
  SESSION_DEPTH_KEYBOARD_LABELS,
  SESSION_DEPTH_ORDER,
  type DepthLabelCallbackKey,
} from "@/lib/clinical/depth";
import { NAV_CONTEXT_LABELS } from "@/lib/clinical/navigation";
import {
  NAV_CLARIFYING_DEPTH_LABELS,
  NAV_CLARIFYING_DEPTH_ORDER,
  NAV_CLARIFYING_INTRO,
  NAV_LEVEL_UI_ORDER,
  clarifyingQuestionCountForDepth,
  navKeyForLevel,
  navLevelLabel,
} from "@/lib/clinical/nav-session";
import {
  NAV_SUPERVISION_TAIL_CONTINUE_LABEL,
  NAV_SUPERVISION_TAIL_FINISH_LABEL,
  PSYCHOTYPE_BUTTON_GET_QUESTIONS,
  PSYCHOTYPE_BUTTON_LATER,
  PSYCHOTYPE_WOW_TEXT,
  buildNavSupervisionFollowupQuestion,
} from "@/lib/clinical/psychotype-nav";
import {
  FOCUS_HELP_NOTICE,
  FOCUS_SELECTION_LABELS_ORDERED,
  INITIAL_SUPERVISION_SESSION,
  POST_REFLECTION_FINISH_LABEL,
  POST_REFLECTION_WEB_ACTIONS,
  buildFullNarrative,
  clinicalSessionBlocksAuth,
  getCurrentIntakeQuestionKey,
  getQuestionsForFocus,
  getTotalQuestionCount,
  type SupervisionAction,
  type SupervisionAnswer,
  type SupervisionSession,
} from "@/lib/clinical/session";
import {
  SUPERVISOR_STYLE_OPTIONS,
  buildOrderedSupervisionContextAppend,
} from "@/lib/clinical/supervisor-style";
import { detectSupervisionInNarrative } from "@/lib/clinical/supervision-request";
import { copyClinicalPlainText } from "@/lib/clinical/clipboard-text";
import { stripClinicalMarkdown } from "@/lib/clinical/markdown-strip";
import {
  CASE_BASE,
  build_integration_reflection_prompt,
  type IntegrationReflectionAnswerItem,
} from "@/lib/clinical/reflection";
import { buildPremiumSessionPlainExport } from "@/lib/clinical/session-plain-export";
import { detect_tension_signals, TENSION_STOP_STEP_ONE_OPTIONS } from "@/lib/clinical/tension";
import {
  classifyAssistantPromptResponse,
  type AssistantApiPayload,
} from "@/lib/ai/assistant-response";
import {
  type PersistenceFailureCode,
  isPersistenceUnavailableCode,
  persistence_append_case_context,
  persistence_complete_case_session,
  persistence_ensure_server_auth,
  persistence_get_case_resume,
  persistence_save_case,
  persistence_supervision_finish,
} from "@/lib/persistence/assistant-client";
import {
  createAssistantPersistenceReducer,
  flushPendingCaseAppends,
  syncAssistantCaseInitialState,
} from "@/lib/persistence/assistant-reducer";
import { deriveCaseCardMeta } from "@/lib/persistence/case-card-meta";
import {
  clearAssistantSessionSnapshot,
  readAssistantSessionSnapshotForInit,
  saveAssistantSessionSnapshot,
} from "@/lib/persistence/assistant-session-snapshot";
import {
  CASE_PERSISTENCE_AUTH_MODAL_TEXT,
  CASE_PERSISTENCE_BANNER_FREE_ACCOUNT_TEXT,
} from "@/lib/auth/case-persistence-modal-copy";
import { useCasePersistenceAuth } from "@/components/auth/CasePersistenceAuthProvider";
import { CaseMemoryPremiumCard } from "@/components/billing/CaseMemoryPremiumCard";
import { CasePurchasePaywall } from "@/components/billing/CasePurchasePaywall";
import { FreeIntroPaywall } from "@/components/billing/FreeIntroPaywall";
import { GuestPaywallHint } from "@/components/billing/GuestPaywallHint";
import { SubscriptionPaywall } from "@/components/billing/SubscriptionPaywall";
import { SupervisionTrustBlock } from "@/components/billing/SupervisionTrustBlock";
import { PRODUCT_EVENTS } from "@/lib/analytics/constants";
import { trackEvent } from "@/lib/analytics/events";
import type { AuthChangeEvent } from "@supabase/supabase-js";

import type { PlanType, UserBillingProfile } from "@/lib/billing/billing-types";
import { tryConsumeCaseStart } from "@/lib/billing/credits";
import {
  DEFAULT_BILLING_PROFILE,
  canStartCase,
  canUseChatAnalysis,
  canUseNav,
  invalidateLocalBillingStorageBeforeSignedInHydrate,
  loadBillingProfile,
  saveBillingProfile,
} from "@/lib/billing/entitlements";
import { isQaMode, setQaModeServerFlag } from "@/lib/qa-mode";
import { createSupabaseBrowserClientOptional } from "@/lib/supabase/browser-optional";
import { PREMIUM_PAYWALL_LEAD, PREMIUM_PAYWALL_TITLE } from "@/lib/billing/paywall";
import { MultiSelectClinicalOptions } from "@/components/clinical/MultiSelectClinicalOptions";
import {
  THERAPIST_METHOD_OPTIONS,
  THERAPIST_METHOD_OTHER,
  THERAPIST_SPECIALIZATION_OPTIONS,
  THERAPIST_SPECIALIZATION_OTHER,
} from "@/lib/clinical/therapist-profile";

/** Draft fields: bounded height with internal scroll so the sticky composer stays on-screen. */
const draftTextareaClass =
  "w-full min-h-[120px] max-h-[min(30dvh,220px)] shrink-0 resize-none overflow-y-auto overflow-x-hidden rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 85%, transparent)] px-4 py-3 text-sm leading-relaxed text-[color:var(--text)] placeholder:text-[color:color-mix(in srgb, var(--muted) 85%, transparent)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] sm:max-h-[min(26dvh,200px)]";

const therapistOtherTextareaClass =
  "mt-0 w-full min-h-[96px] max-h-[min(30vh,220px)] resize-none overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 85%, transparent)] px-4 py-3 text-sm leading-relaxed text-[color:var(--text)] placeholder:text-[color:color-mix(in srgb, var(--muted) 85%, transparent)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]";

/** Bottom composer: draft + actions stay pinned to the card scrollport; step copy scrolls above. */
const assistantStickyBar =
  "sticky bottom-0 z-[5] -mx-5 mt-3 flex shrink-0 flex-col gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] px-5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-18px_rgba(0,0,0,0.08)] sm:-mx-7 sm:px-7";

const choiceRow =
  "flex w-full cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-3 text-left text-sm leading-snug transition hover:border-[color:color-mix(in srgb, var(--accent-sand) 35%, var(--border))]";

const choiceRowSelected =
  "border-[color:color-mix(in srgb, var(--accent-green) 45%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-green) 10%, white)]";

type SnapshotRestoreAction = { type: "__PSYASSIST_RESTORE__"; payload: SupervisionSession };

function withSnapshotRestore(
  inner: (state: SupervisionSession, action: SupervisionAction) => SupervisionSession
) {
  return (state: SupervisionSession, action: SupervisionAction | SnapshotRestoreAction): SupervisionSession => {
    if (action.type === "__PSYASSIST_RESTORE__") return action.payload;
    return inner(state, action);
  };
}

function buildPreviousModulesContext(answers: SupervisionAnswer[]): string {
  if (!answers.length) return "";
  return answers
    .map(
      (a, i) =>
        `[Вопрос ${i + 1}]\nВопрос: ${a.question}\nОтвет: ${a.answer}${
          a.analysis ? `\nРазбор: ${a.analysis}` : ""
        }`
    )
    .join("\n\n");
}

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

function therapistApiFields(s: SupervisionSession) {
  return {
    therapistSpecializations: s.therapistSpecializations,
    therapistMethods: s.therapistMethods,
    therapistOtherSpecialization: s.therapistOtherSpecialization,
    therapistOtherMethods: s.therapistOtherMethods,
  };
}

const TENSION_CLIENT_TIMEOUT_MS = 12_000;

const ASSISTANT_AUTO_OVERLOAD_ATTEMPTS = 3;
const ASSISTANT_AUTO_OVERLOAD_BASE_MS = 2_000;

function isTensionRetriableFetchFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name === "AbortError" || name === "TimeoutError") return true;
  if (err instanceof TypeError) return true;
  const msg = String((err as Error).message ?? err);
  return /network|failed to fetch|load failed|aborted|timed out|timeout/i.test(msg);
}

/** Single fetch with parent abort + client timeout; caller handles retry. */
async function fetchTensionOnce(
  body: Record<string, unknown>,
  signal: AbortSignal,
  logSuffix: string
): Promise<Response> {
  const combined = new AbortController();
  const onParentAbort = () => combined.abort();
  signal.addEventListener("abort", onParentAbort);
  const tid = setTimeout(() => {
    console.info(
      `[TENSION] client timeout after ${TENSION_CLIENT_TIMEOUT_MS}ms (${logSuffix})`
    );
    combined.abort();
  }, TENSION_CLIENT_TIMEOUT_MS);
  try {
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    return await fetch("/api/assistant/tension", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: combined.signal,
    });
  } finally {
    clearTimeout(tid);
    signal.removeEventListener("abort", onParentAbort);
  }
}

async function fetchTensionWithOptionalRetry(
  body: Record<string, unknown>,
  signal: AbortSignal,
  logSuffix: string
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    try {
      console.info(`[TENSION] request started ${logSuffix} attempt=${attempt}`);
      const res = await fetchTensionOnce(body, signal, `${logSuffix} attempt=${attempt}`);
      console.info(
        `[TENSION] request resolved ${logSuffix} attempt=${attempt} status=${res.status}`
      );
      return res;
    } catch (err) {
      lastErr = err;
      console.info(`[TENSION] request failed ${logSuffix} attempt=${attempt}`, err);
      if (signal.aborted) throw err;
      if (attempt < 2 && isTensionRetriableFetchFailure(err)) {
        console.info(`[TENSION] retrying once ${logSuffix}`);
        continue;
      }
      throw err;
    } finally {
      console.info(`[TENSION] request attempt settled ${logSuffix} attempt=${attempt}`);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function buildCaseTextForNav(session: SupervisionSession): string {
  let t = session.fullNarrative.trim();
  if (session.reflectionText.trim()) {
    t += `\n\n=== Интеграционная рефлексия ===\n${session.reflectionText.trim()}`;
  }
  if (session.supervisionAnswers.length) {
    const lines = session.supervisionAnswers.map((a) => {
      const tail = a.analysis?.trim() ? `\nРазбор: ${a.analysis.trim()}` : "";
      return `[${a.module}]\nВопрос: ${a.question}\nОтвет: ${a.answer}${tail}`;
    });
    t += `\n\n=== Вопросы и ответы первичной супервизии ===\n${lines.join("\n\n")}`;
  }
  return t.trim();
}

export default function AssistantPage() {
  const { openCasePersistenceAuthModal } = useCasePersistenceAuth();
  const persistenceNotedRef = useRef(false);
  const pendingAppendsRef = useRef<string[]>([]);
  const lastSyncedNarrativeSigRef = useRef("");
  const narrativePersistInFlightRef = useRef<string | null>(null);
  const setBannerRef = useRef<(msg: string) => void>(() => {});

  const [persistenceBanner, setPersistenceBanner] = useState<string | null>(null);
  const [billingSoftNotice, setBillingSoftNotice] = useState<string | null>(null);
  const [finishSaveStatus, setFinishSaveStatus] = useState<
    "idle" | "saving" | "success" | "error" | "skipped"
  >("idle");
  const [finishSaveRetryTick, setFinishSaveRetryTick] = useState(0);
  const preFinishSessionRef = useRef<SupervisionSession | null>(null);
  const persistFinishOnceRef = useRef<string | null>(null);
  const finishSaveInFlightRef = useRef(false);
  const resumeProcessedKeyRef = useRef<string | null>(null);
  const router = useRouter();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [navFlowError, setNavFlowError] = useState<string | null>(null);
  const [reflectionOverloadRetry, setReflectionOverloadRetry] = useState(false);
  const [closingIntegrationOverloadRetry, setClosingIntegrationOverloadRetry] = useState(false);
  const [integrationAiRetryTick, setIntegrationAiRetryTick] = useState(0);
  const [closingAiRetryTick, setClosingAiRetryTick] = useState(0);
  const integrationOverloadAttemptsRef = useRef(0);
  const closingOverloadAttemptsRef = useRef(0);
  const integrationOverloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingOverloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionCopiedNotice, setSessionCopiedNotice] = useState(false);
  const sessionCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  setBannerRef.current = (msg: string) => setPersistenceBanner(msg);

  useEffect(() => {
    return () => {
      if (sessionCopiedTimerRef.current) clearTimeout(sessionCopiedTimerRef.current);
    };
  }, []);

  const navClarifyingLoadSigRef = useRef<string | null>(null);
  const navFinalLoadSigRef = useRef<string | null>(null);
  const navPersistedSigRef = useRef<string | null>(null);
  const chatAnalysisLoadSigRef = useRef<string | null>(null);

  const [chatAnalysisImages, setChatAnalysisImages] = useState<Array<{ mimeType: string; base64: string }>>([]);

  const [billingProfile, setBillingProfile] = useState<UserBillingProfile>(DEFAULT_BILLING_PROFILE);
  /** Authed users: false until GET /api/user/profile completes (avoids paywall from stale cache before server truth). */
  const [billingHydrated, setBillingHydrated] = useState(false);
  const lastHandledAuthUserIdRef = useRef<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);

  const billingForProductGates = useMemo(() => {
    if (!authUser || billingHydrated) return billingProfile;
    return DEFAULT_BILLING_PROFILE;
  }, [authUser, billingHydrated, billingProfile]);

  const billingGatesRef = useRef(billingForProductGates);
  billingGatesRef.current = billingForProductGates;

  const loggedInPersistenceRef = useRef(false);
  loggedInPersistenceRef.current = Boolean(authUser);
  const authReadyRef = useRef(false);
  authReadyRef.current = authReady;

  useEffect(() => {
    const client = createSupabaseBrowserClientOptional();
    if (!client) {
      setBillingHydrated(true);
      setBillingProfile(loadBillingProfile());
      setAuthReady(true);
      return;
    }

    const applyProfileBody = (body: { ok?: boolean; billing?: UserBillingProfile; qaMode?: boolean }) => {
      if (body?.ok && body.billing) {
        saveBillingProfile(body.billing);
        setBillingProfile(body.billing);
      } else {
        setBillingProfile(DEFAULT_BILLING_PROFILE);
      }
      if (body?.ok) setQaModeServerFlag(Boolean(body.qaMode));
      setBillingHydrated(true);
    };

    const fetchProfileAndHydrate = () => {
      setBillingHydrated(false);
      void fetch("/api/user/profile", { credentials: "include" })
        .then((r) => r.json())
        .then((body: { ok?: boolean; billing?: UserBillingProfile; qaMode?: boolean }) => {
          applyProfileBody(body);
        })
        .catch(() => {
          setBillingProfile(DEFAULT_BILLING_PROFILE);
          setBillingHydrated(true);
        });
    };

    let subscription: { unsubscribe: () => void } | undefined;

    void client.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id } : null);
      if (u) {
        invalidateLocalBillingStorageBeforeSignedInHydrate();
        const prev = lastHandledAuthUserIdRef.current;
        const isNewIdentity = prev !== u.id;
        lastHandledAuthUserIdRef.current = u.id;
        if (isNewIdentity) {
          setBillingHydrated(false);
          setBillingProfile(DEFAULT_BILLING_PROFILE);
        }
        fetchProfileAndHydrate();
      } else {
        lastHandledAuthUserIdRef.current = null;
        setBillingHydrated(true);
        setBillingProfile(loadBillingProfile());
        setQaModeServerFlag(false);
      }
      setAuthReady(true);
    });

    const { data } = client.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id } : null);
      if (u) {
        invalidateLocalBillingStorageBeforeSignedInHydrate();
        const prev = lastHandledAuthUserIdRef.current;
        const isNewIdentity = prev !== u.id;
        lastHandledAuthUserIdRef.current = u.id;
        if (isNewIdentity) {
          setBillingHydrated(false);
          setBillingProfile(DEFAULT_BILLING_PROFILE);
        }
        // TOKEN_REFRESHED must not reset billingHydrated or refetch profile mid-clinical flow.
        if (isNewIdentity || event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          fetchProfileAndHydrate();
        }
      } else if (event === "SIGNED_OUT") {
        lastHandledAuthUserIdRef.current = null;
        setBillingHydrated(true);
        setBillingProfile(loadBillingProfile());
        setQaModeServerFlag(false);
      }
    });
    subscription = data.subscription;

    return () => subscription?.unsubscribe();
  }, []);

  const billingProfileRef = useRef(billingProfile);
  billingProfileRef.current = billingProfile;

  const paywallSeenIntroRef = useRef(false);
  const freeIntroCompleteTrackedRef = useRef(false);

  /** Must stay in sync with reducer session for persistence callbacks (async-safe). */
  const sessionRef = useRef<SupervisionSession>(INITIAL_SUPERVISION_SESSION);

  const persistBilling = useCallback((next: UserBillingProfile) => {
    saveBillingProfile(next);
    setBillingProfile(next);
    if (loggedInPersistenceRef.current) {
      void fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing: next }),
      }).catch(() => {});
    }
  }, []);

  const depthOrderForBilling = useMemo(() => {
    if (billingForProductGates.planType === "free" && !billingForProductGates.freeIntroUsed) {
      return SESSION_DEPTH_ORDER.filter((d) => d === SESSION_DEPTH_CALLBACK.THREE);
    }
    return SESSION_DEPTH_ORDER;
  }, [billingForProductGates.planType, billingForProductGates.freeIntroUsed]);

  const handleCheckoutPlan = useCallback(async (plan: Exclude<PlanType, "free">) => {
    setBillingSoftNotice(null);
    if (!authReady) return;
    if (plan === "single_case") {
      void trackEvent({ eventName: PRODUCT_EVENTS.single_case_selected });
    } else if (plan === "start") {
      void trackEvent({ eventName: PRODUCT_EVENTS.start_plan_selected });
    } else {
      void trackEvent({ eventName: PRODUCT_EVENTS.practice_plan_selected });
    }
    void trackEvent({ eventName: PRODUCT_EVENTS.checkout_started, payload: { plan } });

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
        setBillingSoftNotice(
          data?.message ??
            (data?.code === "BILLING_NOT_CONFIGURED"
              ? "Оплата временно недоступна. Обратитесь в поддержку."
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
        setBillingSoftNotice("Не удалось начать оплату");
        return;
      }

      try {
        sessionStorage.setItem("psyassist_checkout_payment_id", paymentId);
      } catch {
        /* private mode / quota */
      }
      window.location.assign(confirmationUrl);
    } catch {
      void trackEvent({
        eventName: PRODUCT_EVENTS.checkout_failed,
        payload: { plan, reason: "network" },
      });
      setBillingSoftNotice("Не удалось связаться с платёжной службой. Попробуйте позже.");
    } finally {
      setCheckoutBusy(false);
    }
  }, [authReady]);

  const persistenceCtx = useMemo(
    () => ({
      notePersistenceUnavailable: (code?: PersistenceFailureCode) => {
        const step = sessionRef.current.step;
        if (code === "NO_SESSION") {
          // Before Supabase session hydrates, `authUser` is still null; do not treat as anonymous.
          if (!authReadyRef.current) {
            return;
          }
          if (loggedInPersistenceRef.current) {
            if (billingProfileRef.current.planType !== "free") {
              return;
            }
            if (clinicalSessionBlocksAuth(step)) {
              return;
            }
            if (persistenceNotedRef.current) return;
            persistenceNotedRef.current = true;
            setBannerRef.current(CASE_PERSISTENCE_BANNER_FREE_ACCOUNT_TEXT);
            return;
          }
          if (clinicalSessionBlocksAuth(step)) {
            return;
          }
          if (persistenceNotedRef.current) return;
          persistenceNotedRef.current = true;
          setBannerRef.current(CASE_PERSISTENCE_AUTH_MODAL_TEXT);
          return;
        }
        if (persistenceNotedRef.current) return;
        persistenceNotedRef.current = true;
        setBannerRef.current("");
      },
      pendingAppendsRef,
    }),
    []
  );

  const instrumentedReducer = useMemo(
    () => createAssistantPersistenceReducer(persistenceCtx),
    [persistenceCtx]
  );

  const reducerWithSnapshot = useMemo(
    () => withSnapshotRestore(instrumentedReducer),
    [instrumentedReducer]
  );

  const [session, rawDispatch] = useReducer(reducerWithSnapshot, INITIAL_SUPERVISION_SESSION);

  sessionRef.current = session;

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const resume = new URLSearchParams(window.location.search).get("resume");
      if (resume) return;
    }
    const restored = readAssistantSessionSnapshotForInit(pendingAppendsRef);
    if (!restored) return;
    rawDispatch({ type: "__PSYASSIST_RESTORE__", payload: restored });
  }, [rawDispatch]);

  useEffect(() => {
    if (!authReady || !authUser?.id) return;
    const ridRaw =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("resume") : null;
    if (!ridRaw || !/^\d+$/.test(ridRaw)) return;
    const caseId = Number(ridRaw);
    const key = `${authUser.id}:${ridRaw}`;
    if (resumeProcessedKeyRef.current === key) return;
    resumeProcessedKeyRef.current = key;

    void persistence_get_case_resume(caseId).then((r) => {
      if (!r.ok) {
        setBillingSoftNotice(
          r.code === "NO_SNAPSHOT"
            ? "Для этого кейса нет сохранённой сессии на сервере."
            : "Не удалось восстановить кейс с сервера."
        );
        router.replace("/assistant", { scroll: false });
        resumeProcessedKeyRef.current = null;
        return;
      }
      rawDispatch({ type: "__PSYASSIST_RESTORE__", payload: r.snapshot.session });
      pendingAppendsRef.current = r.snapshot.pendingAppends.slice();
      void flushPendingCaseAppends(caseId, pendingAppendsRef, persistenceCtx.notePersistenceUnavailable);
      saveAssistantSessionSnapshot(r.snapshot.session, pendingAppendsRef.current);
      router.replace("/assistant", { scroll: false });
    });
  }, [authReady, authUser?.id, rawDispatch, router, persistenceCtx.notePersistenceUnavailable]);

  useEffect(() => {
    if (session.step !== "finished" || !authReady || !authUser?.id) return;
    const onceKey = `finished-auth:${authUser.id}`;
    if (persistFinishOnceRef.current === onceKey || finishSaveInFlightRef.current) return;

    let snapshotSession: SupervisionSession | null = preFinishSessionRef.current;
    if (snapshotSession == null) {
      try {
        snapshotSession = JSON.parse(JSON.stringify(sessionRef.current)) as SupervisionSession;
      } catch {
        snapshotSession = null;
      }
    }
    if (snapshotSession == null) {
      setFinishSaveStatus("skipped");
      return;
    }

    finishSaveInFlightRef.current = true;
    setFinishSaveStatus("saving");
    const meta = deriveCaseCardMeta(snapshotSession);

    void (async () => {
      try {
        if (!(await persistence_ensure_server_auth())) {
          setFinishSaveStatus("error");
          return;
        }

        let caseId = sessionRef.current.remoteCaseId;
        if (caseId == null) {
          const alias = snapshotSession!.intake.client_alias?.trim();
          const dur = snapshotSession!.intake.therapy_duration?.trim();
          const narrative = snapshotSession!.fullNarrative.trim();
          if (!narrative || !alias || !dur) {
            setFinishSaveStatus("skipped");
            return;
          }
          const saved = await persistence_save_case({
            userName: null,
            caseTitle: alias,
            clientName: alias,
            firstSessionDate: dur,
            initialCase: narrative,
          });
          if (!saved.ok) {
            setFinishSaveStatus("error");
            return;
          }
          caseId = saved.caseId;
          rawDispatch({ type: "SET_REMOTE_CASE_ID", caseId });
          await flushPendingCaseAppends(
            caseId,
            pendingAppendsRef,
            persistenceCtx.notePersistenceUnavailable
          );
        }

        const r = await persistence_complete_case_session(caseId, {
          snapshot: {
            v: 1,
            savedAt: Date.now(),
            session: snapshotSession!,
            pendingAppends: pendingAppendsRef.current.slice(),
          },
          focus: meta.focus,
          current_step: meta.current_step,
          current_layer: meta.current_layer,
          current_question: meta.current_question,
          duration_minutes: meta.duration_minutes,
          last_insight: meta.last_insight,
          case_title: snapshotSession!.intake.client_alias?.trim() ?? null,
        });
        if (r.ok) {
          persistFinishOnceRef.current = onceKey;
          setFinishSaveStatus("success");
          preFinishSessionRef.current = null;
          const bp = billingProfileRef.current;
          if (bp.planType === "free" && !bp.freeIntroUsed) {
            freeIntroCompleteTrackedRef.current = true;
            persistBilling({ ...bp, freeIntroUsed: true });
            void trackEvent({ eventName: PRODUCT_EVENTS.free_intro_completed });
          }
        } else {
          setFinishSaveStatus("error");
        }
      } finally {
        finishSaveInFlightRef.current = false;
      }
    })();
  }, [
    session.step,
    authReady,
    authUser?.id,
    finishSaveRetryTick,
    persistBilling,
    rawDispatch,
    persistenceCtx.notePersistenceUnavailable,
  ]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveAssistantSessionSnapshot(sessionRef.current, pendingAppendsRef.current);
    }, 400);
    return () => window.clearTimeout(id);
  }, [session]);

  useEffect(() => {
    const onPageHide = () => {
      saveAssistantSessionSnapshot(sessionRef.current, pendingAppendsRef.current);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => {
    const step = session.step;
    const blocks = clinicalSessionBlocksAuth(step);
    const authBlockAllowed = !blocks;
    console.info(`[FLOW] current_step=${step}`);
    console.info(`[FLOW] auth_block_allowed=${authBlockAllowed}`);
    console.info(
      `[FLOW] clinical_render_priority=${blocks ? "clinical" : "paywall"}`
    );
  }, [session.step]);

  const prevStepRef = useRef<string | null>(null);
  const prevAnswersLenRef = useRef(0);
  const prevNavAnswersLenRef = useRef(0);
  const prevQuestionIdxRef = useRef(-1);
  const prevRemoteCaseRef = useRef<number | null>(null);
  const reflectionStartedGuardRef = useRef(false);
  const reflectionCompletedGuardRef = useRef(false);
  const chatAnalysisCompletedGuardRef = useRef(false);
  const freeIntroAnalysisStartedSigRef = useRef<string | null>(null);
  const freeIntroAnalysisCompletedTrackedRef = useRef(false);

  const dispatch = useCallback(
    (action: SupervisionAction) => {
      const s = sessionRef.current;

      if (action.type === "CASE_REMINDER_CONTINUE") {
        const attempt = tryConsumeCaseStart(billingProfileRef.current);
        if (!attempt.ok) {
          void trackEvent({
            eventName: PRODUCT_EVENTS.paywall_seen,
            payload: { placement: "case_reminder_blocked" },
          });
          return;
        }
        if (!attempt.consumed && attempt.profile.planType === "free" && !attempt.profile.freeIntroUsed) {
          void trackEvent({ eventName: PRODUCT_EVENTS.free_intro_started });
        }
        if (attempt.consumed) {
          persistBilling(attempt.profile);
        }
      }

      if (action.type === "OPEN_CHAT_ANALYSIS") {
        if (!canUseChatAnalysis(billingGatesRef.current) && !isQaMode()) {
          void trackEvent({
            eventName: PRODUCT_EVENTS.paywall_seen,
            payload: { placement: "chat_blocked" },
          });
          return;
        }
      }

      if (action.type === "NAV_BEGIN_LEVEL") {
        if (!canUseNav(billingGatesRef.current) && !isQaMode()) {
          void trackEvent({
            eventName: PRODUCT_EVENTS.paywall_seen,
            payload: { placement: "nav_blocked" },
          });
          return;
        }
      }

      if (action.type === "POST_REFLECTION_ACTION" && action.id !== "finish_after_reflection") {
        const bp = billingGatesRef.current;
        if (bp.planType === "free" && bp.freeIntroUsed && !isQaMode()) {
          void trackEvent({
            eventName: PRODUCT_EVENTS.paywall_seen,
            payload: { placement: "retention_blocked" },
          });
          return;
        }
      }

      if (action.type === "TENSION_INTERRUPT_START" && s.tensionCompleted) {
        return;
      }
      if (action.type === "TENSION_INTERRUPT_START") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.tension_detected,
          step: String(s.questionModuleIdx + 1),
          payload: { persistenceCaseId: s.remoteCaseId ?? undefined },
        });
      }
      if (action.type === "TENSION_SUBMIT_PROBE") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.tension_probe_answered,
          step: String((s.tensionPending?.moduleIdx ?? s.questionModuleIdx) + 1),
          payload: { persistenceCaseId: s.remoteCaseId ?? undefined },
        });
      }
      if (action.type === "OPEN_CHAT_ANALYSIS") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.chat_analysis_started,
          payload: { persistenceCaseId: s.remoteCaseId ?? undefined },
        });
      }

      if (action.type === "SUBMIT_THERAPIST_SPECIALIZATION") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.therapist_specialization_selected,
          payload: {
            count: s.therapistSpecializations.length,
            persistenceCaseId: s.remoteCaseId ?? undefined,
          },
        });
      }
      if (action.type === "SUBMIT_THERAPIST_METHODS") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.therapist_methods_selected,
          payload: {
            count: s.therapistMethods.length,
            persistenceCaseId: s.remoteCaseId ?? undefined,
          },
        });
      }

      if (
        (action.type === "POST_REFLECTION_ACTION" && action.id === "finish_after_reflection") ||
        action.type === "NAV_SUPERVISION_TAIL_FINISH"
      ) {
        if (loggedInPersistenceRef.current) {
          try {
            preFinishSessionRef.current = JSON.parse(JSON.stringify(s)) as SupervisionSession;
          } catch {
            preFinishSessionRef.current = null;
          }
        } else {
          preFinishSessionRef.current = null;
        }
      }

      if (action.type === "RESET") {
        if (!canStartCase(billingGatesRef.current) && !isQaMode()) {
          void trackEvent({
            eventName: PRODUCT_EVENTS.paywall_seen,
            payload: { placement: "new_case_blocked" },
          });
          return;
        }
        clearAssistantSessionSnapshot();
        lastSyncedNarrativeSigRef.current = "";
        narrativePersistInFlightRef.current = null;
        pendingAppendsRef.current = [];
        persistenceNotedRef.current = false;
        setPersistenceBanner(null);
        preFinishSessionRef.current = null;
        persistFinishOnceRef.current = null;
        finishSaveInFlightRef.current = false;
        setFinishSaveStatus("idle");
        setFinishSaveRetryTick(0);
        resumeProcessedKeyRef.current = null;
        navClarifyingLoadSigRef.current = null;
        navFinalLoadSigRef.current = null;
        navPersistedSigRef.current = null;
        chatAnalysisLoadSigRef.current = null;
        setChatAnalysisImages([]);
        setNavFlowError(null);
        prevStepRef.current = INITIAL_SUPERVISION_SESSION.step;
        prevAnswersLenRef.current = 0;
        prevNavAnswersLenRef.current = 0;
        prevQuestionIdxRef.current = -1;
        prevRemoteCaseRef.current = null;
        reflectionStartedGuardRef.current = false;
        reflectionCompletedGuardRef.current = false;
        chatAnalysisCompletedGuardRef.current = false;
        freeIntroAnalysisStartedSigRef.current = null;
        freeIntroAnalysisCompletedTrackedRef.current = false;
        void trackEvent({ eventName: PRODUCT_EVENTS.session_start });
      }

      if (
        action.type === "RESET" ||
        (action.type === "POST_REFLECTION_ACTION" && action.id === "finish_after_reflection") ||
        action.type === "NAV_SUPERVISION_TAIL_FINISH"
      ) {
        void persistence_supervision_finish().then((r) => {
          if (!r.ok && isPersistenceUnavailableCode(r.code)) {
            persistenceCtx.notePersistenceUnavailable();
          }
        });
      }
      rawDispatch(action);
    },
    [rawDispatch, persistenceCtx, persistBilling]
  );

  useEffect(() => {
    if (
      session.step !== "post_reflection" ||
      session.reflectionStatus !== "success" ||
      !session.reflectionText.trim()
    ) {
      return;
    }
    const bp = billingProfileRef.current;
    if (bp.planType !== "free" || bp.freeIntroUsed || freeIntroCompleteTrackedRef.current) return;
    /* Logged-in users: mark intro consumed only after case is saved to «Мои случаи» (see finished
     * effect + persistence_complete_case_session). Setting freeIntroUsed here persisted to the
     * server before POST /complete, so canStartCase became false and case_reminder showed pricing. */
    if (authUser) return;
    freeIntroCompleteTrackedRef.current = true;
    const next = { ...bp, freeIntroUsed: true };
    persistBilling(next);
    void trackEvent({ eventName: PRODUCT_EVENTS.free_intro_completed });
  }, [session.step, session.reflectionStatus, session.reflectionText, persistBilling, authUser]);

  useEffect(() => {
    if (session.step !== "post_reflection" || session.reflectionStatus !== "success") return;
    if (
      billingForProductGates.planType !== "free" ||
      !billingForProductGates.freeIntroUsed ||
      paywallSeenIntroRef.current
    ) {
      return;
    }
    paywallSeenIntroRef.current = true;
    void trackEvent({
      eventName: PRODUCT_EVENTS.paywall_seen,
      payload: { placement: "post_intro" },
    });
  }, [
    session.step,
    session.reflectionStatus,
    billingForProductGates.planType,
    billingForProductGates.freeIntroUsed,
  ]);

  useEffect(() => {
    void trackEvent({ eventName: PRODUCT_EVENTS.session_start });
  }, []);

  useEffect(() => {
    const prev = prevStepRef.current;
    const cur = session.step;

    if (prev !== null) {
      if ((prev === "confidentiality" || prev === "confidentiality_more") && cur === "case_reminder") {
        void trackEvent({ eventName: PRODUCT_EVENTS.confidentiality_accepted, step: cur });
      }
      if (prev === "case_reminder" && cur === "case_name") {
        void trackEvent({ eventName: PRODUCT_EVENTS.case_started, step: cur });
      }
      if (prev === "detecting_supervision_request" && cur === "supervision_request_confirm") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.supervision_request_detected,
          payload: { persistenceCaseId: session.remoteCaseId ?? undefined },
        });
      }
      if (
        (prev === "supervision_request_confirm" || prev === "supervision_request") &&
        cur === "therapist_specialization"
      ) {
        void trackEvent({
          eventName: PRODUCT_EVENTS.supervision_request_confirmed,
          payload: {
            source: prev === "supervision_request_confirm" ? "detected_confirm" : "manual_entry",
            persistenceCaseId: session.remoteCaseId ?? undefined,
          },
        });
      }
      if (prev === "focus_selection" && cur === "depth_selection") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.focus_selected,
          payload: {
            focusKey: session.focusKey ?? undefined,
            persistenceCaseId: session.remoteCaseId ?? undefined,
          },
        });
      }
      if (prev === "depth_selection" && cur === "question_flow") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.depth_selected,
          payload: {
            sessionDepth: session.sessionDepth ?? undefined,
            persistenceCaseId: session.remoteCaseId ?? undefined,
          },
        });
      }
      if (prev !== "question_flow" && cur === "question_flow") {
        const total =
          session.focusKey && session.sessionDepth
            ? getTotalQuestionCount(session.focusKey, session.sessionDepth)
            : undefined;
        void trackEvent({
          eventName: PRODUCT_EVENTS.question_started,
          step: String(session.questionModuleIdx + 1),
          payload: {
            questionIndex: session.questionModuleIdx,
            totalQuestions: total,
            persistenceCaseId: session.remoteCaseId ?? undefined,
          },
        });
      }
      if (prev !== "nav_depth_selection" && cur === "nav_depth_selection") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.nav_started,
          payload: {
            navKey: session.navKey ?? undefined,
            persistenceCaseId: session.remoteCaseId ?? undefined,
          },
        });
      }
      if (prev === "nav_final_loading" && cur === "nav_tail_flow") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.nav_completed,
          payload: {
            navKey: session.navKey ?? undefined,
            persistenceCaseId: session.remoteCaseId ?? undefined,
          },
        });
      }
      if (prev !== "finished" && cur === "finished") {
        void trackEvent({
          eventName: PRODUCT_EVENTS.session_finished,
          payload: { persistenceCaseId: session.remoteCaseId ?? undefined },
        });
      }
    }

    prevStepRef.current = cur;
  }, [
    session.step,
    session.questionModuleIdx,
    session.focusKey,
    session.sessionDepth,
    session.navKey,
    session.remoteCaseId,
  ]);

  useEffect(() => {
    const id = session.remoteCaseId;
    if (id != null) {
      if (prevRemoteCaseRef.current === null) {
        void trackEvent({
          eventName: PRODUCT_EVENTS.case_saved,
          payload: { persistenceCaseId: id },
        });
      }
      prevRemoteCaseRef.current = id;
    } else {
      prevRemoteCaseRef.current = null;
    }
  }, [session.remoteCaseId]);

  useEffect(() => {
    if (session.step !== "question_flow") {
      prevQuestionIdxRef.current = session.questionModuleIdx;
      return;
    }
    const idx = session.questionModuleIdx;
    const prevIdx = prevQuestionIdxRef.current;
    if (prevIdx !== -1 && prevIdx !== idx) {
      const total =
        session.focusKey && session.sessionDepth
          ? getTotalQuestionCount(session.focusKey, session.sessionDepth)
          : undefined;
      void trackEvent({
        eventName: PRODUCT_EVENTS.question_started,
        step: String(idx + 1),
        payload: {
          questionIndex: idx,
          totalQuestions: total,
          persistenceCaseId: session.remoteCaseId ?? undefined,
        },
      });
    }
    prevQuestionIdxRef.current = idx;
  }, [
    session.step,
    session.questionModuleIdx,
    session.focusKey,
    session.sessionDepth,
    session.remoteCaseId,
  ]);

  useEffect(() => {
    const n = session.supervisionAnswers.length;
    if (n > prevAnswersLenRef.current) {
      const last = session.supervisionAnswers[n - 1];
      void trackEvent({
        eventName: PRODUCT_EVENTS.question_answered,
        step: String(n),
        payload: {
          hasTensionAnalysis: Boolean(last?.analysis?.trim()),
          persistenceCaseId: session.remoteCaseId ?? undefined,
        },
      });
    }
    prevAnswersLenRef.current = n;
  }, [session.supervisionAnswers, session.remoteCaseId]);

  useEffect(() => {
    const n = session.navAnswers.length;
    if (n > prevNavAnswersLenRef.current) {
      void trackEvent({
        eventName: PRODUCT_EVENTS.nav_question_answered,
        step: String(n),
        payload: {
          navKey: session.navKey ?? undefined,
          persistenceCaseId: session.remoteCaseId ?? undefined,
        },
      });
    }
    prevNavAnswersLenRef.current = n;
  }, [session.navAnswers, session.navKey, session.remoteCaseId]);

  useEffect(() => {
    if (session.step !== "integration_reflection") {
      reflectionStartedGuardRef.current = false;
      return;
    }
    if (session.reflectionStatus === "loading" && !reflectionStartedGuardRef.current) {
      reflectionStartedGuardRef.current = true;
      void trackEvent({
        eventName: PRODUCT_EVENTS.integration_reflection_started,
        payload: { persistenceCaseId: session.remoteCaseId ?? undefined },
      });
    }
  }, [session.step, session.reflectionStatus, session.remoteCaseId]);

  useEffect(() => {
    if (
      (session.step === "closing_step1" || session.step === "post_reflection") &&
      session.reflectionStatus === "success" &&
      session.reflectionText.trim()
    ) {
      if (!reflectionCompletedGuardRef.current) {
        reflectionCompletedGuardRef.current = true;
        void trackEvent({
          eventName: PRODUCT_EVENTS.integration_reflection_completed,
          payload: { persistenceCaseId: session.remoteCaseId ?? undefined },
        });
      }
    }
    if (session.step !== "closing_step1" && session.step !== "post_reflection") {
      reflectionCompletedGuardRef.current = false;
    }
  }, [
    session.step,
    session.reflectionStatus,
    session.reflectionText,
    session.remoteCaseId,
  ]);

  useEffect(() => {
    if (session.step === "chat_analysis_result" && session.chatAnalysisResult.trim()) {
      if (!chatAnalysisCompletedGuardRef.current) {
        chatAnalysisCompletedGuardRef.current = true;
        void trackEvent({
          eventName: PRODUCT_EVENTS.chat_analysis_completed,
          payload: {
            focusKey: session.chatAnalysisFocusKey ?? undefined,
            persistenceCaseId: session.remoteCaseId ?? undefined,
          },
        });
      }
    }
    if (session.step !== "chat_analysis_result") {
      chatAnalysisCompletedGuardRef.current = false;
    }
  }, [session.step, session.chatAnalysisResult, session.chatAnalysisFocusKey, session.remoteCaseId]);

  useEffect(() => {
    if (!authReady) return;
    if (session.step === "finished" || finishSaveInFlightRef.current) return;
    void syncAssistantCaseInitialState({
      session,
      lastSyncedSigRef: lastSyncedNarrativeSigRef,
      inFlightSigRef: narrativePersistInFlightRef,
      notePersistenceUnavailable: persistenceCtx.notePersistenceUnavailable,
      dispatch: rawDispatch,
    });
  }, [
    authReady,
    authUser?.id,
    session,
    persistenceCtx.notePersistenceUnavailable,
    rawDispatch,
  ]);

  useEffect(() => {
    if (session.remoteCaseId == null) return;
    setPersistenceBanner(null);
  }, [session.remoteCaseId]);

  useEffect(() => {
    if (!session.remoteCaseId) return;
    void flushPendingCaseAppends(
      session.remoteCaseId,
      pendingAppendsRef,
      persistenceCtx.notePersistenceUnavailable
    );
  }, [session.remoteCaseId, persistenceCtx.notePersistenceUnavailable]);

  useEffect(() => {
    if (session.step !== "nav_clarifying_loading") {
      navClarifyingLoadSigRef.current = null;
      return;
    }
    const navKey = session.navKey;
    const count = session.navQuestionsTargetCount;
    if (!navKey || count == null || count < 1) return;

    const sig = `${navKey}:${count}:${session.supervisorStyle ?? ""}`;
    if (navClarifyingLoadSigRef.current === sig) return;
    navClarifyingLoadSigRef.current = sig;

    void (async () => {
      const caseText = buildCaseTextForNav(session);
      try {
        const res = await fetch("/api/assistant/clarifying-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseText,
            supervisionRequest: session.supervisionRequest,
            navKey,
            questionsCount: count,
            ...therapistApiFields(session),
            supervisorStyle: session.supervisorStyle ?? undefined,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          questions?: string[];
          message?: string;
        };

        if (data.ok && Array.isArray(data.questions) && data.questions.length > 0) {
          rawDispatch({
            type: "NAV_CLARIFYING_QUESTIONS_READY",
            questions: data.questions.map((q) => stripClinicalMarkdown(String(q))),
          });
          return;
        }

        setNavFlowError("Не удалось загрузить данные. Попробуйте обновить страницу.");
        rawDispatch({ type: "NAV_ABORT_TO_POST_REFLECTION" });
      } catch {
        setNavFlowError("Не удалось загрузить данные. Попробуйте обновить страницу.");
        rawDispatch({ type: "NAV_ABORT_TO_POST_REFLECTION" });
      }
    })();
  }, [
    session.step,
    session.navKey,
    session.navQuestionsTargetCount,
    session.supervisionRequest,
    session.fullNarrative,
    session.reflectionText,
    session.supervisionAnswers,
    rawDispatch,
    session.supervisorStyle,
    session,
  ]);

  useEffect(() => {
    if (session.step !== "nav_final_loading") {
      navFinalLoadSigRef.current = null;
      return;
    }
    const navKey = session.navKey;
    if (!navKey || session.navAnswers.length === 0) return;

    const sig = `${navKey}:${session.navAnswers.map((x) => x.answer).join("\u0001")}`;
    if (navFinalLoadSigRef.current === sig) return;
    navFinalLoadSigRef.current = sig;

    void (async () => {
      const caseText = buildCaseTextForNav(session);
      try {
        const res = await fetch("/api/assistant/final-nav-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseText,
            supervisionRequest: session.supervisionRequest,
            navKey,
            qnaPairs: session.navAnswers,
            ...therapistApiFields(session),
            supervisorStyle: session.supervisorStyle ?? undefined,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          text?: string;
          message?: string;
        };

        if (data.ok && data.text?.trim()) {
          rawDispatch({
            type: "NAV_FINAL_ANALYSIS_READY",
            text: stripClinicalMarkdown(data.text.trim()),
          });
          return;
        }

        rawDispatch({
          type: "NAV_FINAL_ANALYSIS_FAILED",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      } catch {
        rawDispatch({
          type: "NAV_FINAL_ANALYSIS_FAILED",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      }
    })();
  }, [
    session.step,
    session.navKey,
    session.navAnswers,
    session.supervisionRequest,
    session.fullNarrative,
    session.reflectionText,
    session.supervisionAnswers,
    rawDispatch,
    session.supervisorStyle,
    session,
  ]);

  useEffect(() => {
    if (
      session.step !== "nav_tail_flow" ||
      !session.navFinalAnalysis.trim() ||
      session.navFinalError.trim()
    ) {
      return;
    }
    const navKey = session.navKey;
    if (!navKey) return;

    const sig = `${navKey}:${session.navFinalAnalysis.slice(0, 320)}:${session.navAnswers.length}`;
    if (navPersistedSigRef.current === sig) return;
    navPersistedSigRef.current = sig;

    const label = NAV_CONTEXT_LABELS[navKey] ?? navKey;
    const qnaText = session.navAnswers
      .map((x) => `Вопрос: ${x.question}\nОтвет: ${x.answer}`)
      .join("\n\n");
    const bundle =
      `[${label}]\n` +
      `Уточняющие вопросы и ответы:\n${qnaText}\n\n` +
      `Разбор:\n${session.navFinalAnalysis}`;
    const levelLine = `[Уровень пройден: ${label}]`;

    const cid = session.remoteCaseId;
    const note = persistenceCtx.notePersistenceUnavailable;

    if (cid != null) {
      void (async () => {
        const r1 = await persistence_append_case_context(cid, bundle);
        if (!r1.ok && isPersistenceUnavailableCode(r1.code)) note();
        const r2 = await persistence_append_case_context(cid, levelLine);
        if (!r2.ok && isPersistenceUnavailableCode(r2.code)) note();
      })();
    } else {
      pendingAppendsRef.current.push(bundle);
      pendingAppendsRef.current.push(levelLine);
    }
  }, [
    session.step,
    session.navFinalAnalysis,
    session.navFinalError,
    session.navKey,
    session.navAnswers,
    session.remoteCaseId,
    persistenceCtx.notePersistenceUnavailable,
  ]);

  const detectionKeyRef = useRef<string | null>(null);
  const reflectionKeyRef = useRef<string | null>(null);
  /** Bumps when a new integration reflection fetch starts; stale completions must not dispatch. */
  const integrationReflectionFetchGenRef = useRef(0);
  /** Stale tension_stop_loading / tension_hypothesis_loading completions must not dispatch. */
  const tensionStopFetchGenRef = useRef(0);
  const tensionHypothesisFetchGenRef = useRef(0);
  const closingIntegrationKeyRef = useRef<string | null>(null);
  const closingIntegrationFetchGenRef = useRef(0);

  const clearIntegrationOverloadTimer = useCallback(() => {
    if (integrationOverloadTimerRef.current) {
      clearTimeout(integrationOverloadTimerRef.current);
      integrationOverloadTimerRef.current = null;
    }
  }, []);

  const clearClosingOverloadTimer = useCallback(() => {
    if (closingOverloadTimerRef.current) {
      clearTimeout(closingOverloadTimerRef.current);
      closingOverloadTimerRef.current = null;
    }
  }, []);

  const retryIntegrationReflectionFetch = useCallback(() => {
    setReflectionOverloadRetry(false);
    integrationOverloadAttemptsRef.current = 0;
    reflectionKeyRef.current = null;
    clearIntegrationOverloadTimer();
    setIntegrationAiRetryTick((t) => t + 1);
  }, [clearIntegrationOverloadTimer]);

  const retryClosingIntegrationFetch = useCallback(() => {
    setClosingIntegrationOverloadRetry(false);
    closingOverloadAttemptsRef.current = 0;
    closingIntegrationKeyRef.current = null;
    clearClosingOverloadTimer();
    setClosingAiRetryTick((t) => t + 1);
  }, [clearClosingOverloadTimer]);

  const runDetection = useCallback(async () => {
    const narrative = session.fullNarrative.trim();
    if (!narrative) {
      dispatch({
        type: "DETECTION_RESULT",
        detected: false,
        extracted: "",
        confidence: 0,
      });
      return;
    }
    const result = await detectSupervisionInNarrative(narrative);
    dispatch({
      type: "DETECTION_RESULT",
      detected: result.detected,
      extracted: result.extracted_request,
      confidence: result.confidence,
    });
  }, [session.fullNarrative, dispatch]);

  useEffect(() => {
    if (session.step !== "detecting_supervision_request") {
      detectionKeyRef.current = null;
      return;
    }
    const key = session.fullNarrative;
    if (detectionKeyRef.current === key) return;
    detectionKeyRef.current = key;
    void runDetection();
  }, [session.step, session.fullNarrative, runDetection]);

  /* Перечень зависимостей намеренно узкий: полный `session` даёт лишние перезапросы к модели. */
  useEffect(() => {
    if (session.step !== "integration_reflection" || session.reflectionStatus !== "loading") {
      reflectionKeyRef.current = null;
      integrationOverloadAttemptsRef.current = 0;
      clearIntegrationOverloadTimer();
      return;
    }
    if (!session.focusKey || !session.sessionDepth) {
      dispatch({
        type: "REFLECTION_ERROR",
        message: "Не удалось подготовить разбор: уточните фокус и глубину сессии.",
      });
      return;
    }

    const answers: IntegrationReflectionAnswerItem[] = session.supervisionAnswers.map((a) => ({
      module: a.module,
      question: a.question,
      answer: a.analysis?.trim()
        ? `${a.answer}\n\n[Рабочая гипотеза после уточнения напряжения]\n${a.analysis.trim()}`
        : a.answer,
    }));
    const toneAppend = buildOrderedSupervisionContextAppend(
      therapistApiFields(session),
      session.focusLabel,
      session.supervisorStyle
    );
    const clinicalBrain = toneAppend.trim()
      ? `${CASE_BASE}\n${toneAppend.trim()}`
      : CASE_BASE;
    const prompt = build_integration_reflection_prompt(
      session.fullNarrative,
      session.supervisionRequest,
      answers,
      clinicalBrain,
      session.supervisorStyle
    );

    const sig = `${prompt.length}:${answers.length}:${session.supervisionRequest}:${session.therapistSpecializations.join("|")}:${session.therapistMethods.join("|")}:${session.therapistOtherSpecialization}:${session.therapistOtherMethods}:${session.supervisorStyle ?? ""}:${session.focusLabel ?? ""}`;
    if (reflectionKeyRef.current === sig) return;
    reflectionKeyRef.current = sig;

    const fetchGen = ++integrationReflectionFetchGenRef.current;
    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: ac.signal,
        });
        if (ac.signal.aborted || fetchGen !== integrationReflectionFetchGenRef.current) return;

        const data = (await res.json()) as AssistantApiPayload;

        if (process.env.NODE_ENV === "development") {
          console.info("[INTEGRATION_REFLECTION_DEV] response parsed (browser console)", {
            path: "/api/assistant",
            httpStatus: res.status,
            ok: data.ok,
            code: data.code,
            message: data.message,
            dataStatus: data.status,
            retryable: data.retryable,
            textLength: data.text?.length ?? 0,
          });
        }

        if (ac.signal.aborted || fetchGen !== integrationReflectionFetchGenRef.current) return;
        const live = sessionRef.current;
        if (live.step !== "integration_reflection" || live.reflectionStatus !== "loading") return;

        const outcome = classifyAssistantPromptResponse(data);

        if (outcome.kind === "success") {
          clearIntegrationOverloadTimer();
          integrationOverloadAttemptsRef.current = 0;
          setReflectionOverloadRetry(false);
          dispatch({ type: "REFLECTION_SUCCESS", text: stripClinicalMarkdown(outcome.text) });
          return;
        }

        if (outcome.kind === "overload") {
          if (process.env.NODE_ENV === "development") {
            console.info("[INTEGRATION_REFLECTION_DEV] overload hold — no REFLECTION_ERROR", {
              code: data.code,
              status: data.status,
              retryable: data.retryable,
              attempt: integrationOverloadAttemptsRef.current,
            });
          }
          reflectionKeyRef.current = null;

          if (integrationOverloadAttemptsRef.current < ASSISTANT_AUTO_OVERLOAD_ATTEMPTS) {
            setReflectionOverloadRetry(false);
            integrationOverloadAttemptsRef.current += 1;
            clearIntegrationOverloadTimer();
            const delay =
              ASSISTANT_AUTO_OVERLOAD_BASE_MS * integrationOverloadAttemptsRef.current;
            integrationOverloadTimerRef.current = setTimeout(() => {
              integrationOverloadTimerRef.current = null;
              reflectionKeyRef.current = null;
              setIntegrationAiRetryTick((t) => t + 1);
            }, delay);
          } else {
            setReflectionOverloadRetry(true);
          }
          return;
        }

        clearIntegrationOverloadTimer();
        integrationOverloadAttemptsRef.current = 0;
        setReflectionOverloadRetry(false);
        dispatch({
          type: "REFLECTION_ERROR",
          message:
            "Не удалось загрузить данные. Ответы сохранены — попробуйте обновить страницу или повторить позже.",
        });
      } catch (e: unknown) {
        if (ac.signal.aborted || fetchGen !== integrationReflectionFetchGenRef.current) return;
        if (sessionRef.current.step !== "integration_reflection") return;

        if (process.env.NODE_ENV === "development") {
          console.info("[INTEGRATION_REFLECTION_DEV] request failed", e);
        }
        clearIntegrationOverloadTimer();
        integrationOverloadAttemptsRef.current = 0;
        setReflectionOverloadRetry(false);
        dispatch({
          type: "REFLECTION_ERROR",
          message:
            "Не удалось загрузить данные. Ответы сохранены — попробуйте обновить страницу или повторить позже.",
        });
      }
    })();

    return () => {
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- integrationAiRetryTick: bounded auto-retry after overload without toggling reflectionStatus
  }, [
    session.step,
    session.reflectionStatus,
    session.focusKey,
    session.sessionDepth,
    session.fullNarrative,
    session.supervisionRequest,
    session.supervisionAnswers,
    session.therapistSpecializations,
    session.therapistMethods,
    session.therapistOtherSpecialization,
    session.therapistOtherMethods,
    session.supervisorStyle,
    session.focusLabel,
    integrationAiRetryTick,
    clearIntegrationOverloadTimer,
    dispatch,
  ]);

  /* Resumed snapshot may land on step 3 with idle status — kick fetch instead of empty UI. */
  useEffect(() => {
    if (session.step !== "closing_step3" || session.closingIntegrationStatus !== "idle") return;
    const req = session.supervisionRequest.trim();
    const s1 = session.closingStep1Answer?.trim() ?? "";
    const takeaway = session.closingTherapistTakeaway.trim();
    if (!req || !s1 || !takeaway) return;
    dispatch({ type: "CLOSING_INTEGRATION_LOADING" });
  }, [
    session.step,
    session.closingIntegrationStatus,
    session.supervisionRequest,
    session.closingStep1Answer,
    session.closingTherapistTakeaway,
    dispatch,
  ]);

  /* Step 3: personal integration block after synthesis, before paywall. */
  useEffect(() => {
    if (session.step !== "closing_step3" || session.closingIntegrationStatus !== "loading") {
      closingIntegrationKeyRef.current = null;
      closingOverloadAttemptsRef.current = 0;
      clearClosingOverloadTimer();
      return;
    }

    const req = session.supervisionRequest.trim();
    const s1 = session.closingStep1Answer?.trim() ?? "";
    const takeaway = session.closingTherapistTakeaway.trim();
    if (!req || !s1 || !takeaway) {
      dispatch({
        type: "CLOSING_INTEGRATION_ERROR",
        message: "Не удалось подготовить разбор: проверьте ответы на шагах 1 и 2.",
      });
      return;
    }

    const narrative = session.fullNarrative.trim();
    const reflection = session.reflectionText.trim();
    const bankBlock = session.supervisionAnswers
      .map((a) => {
        const body = a.analysis?.trim()
          ? `${a.answer}\n\n[Рабочая гипотеза после уточнения напряжения]\n${a.analysis.trim()}`
          : a.answer;
        return `${a.module}. ${a.question}\nОтвет: ${body}`;
      })
      .join("\n\n");

    const grounding =
      (narrative ? `Контекст кейса (материал сессии):\n${narrative}\n\n` : "") +
      (reflection ? `Интеграционная рефлексия по разбору:\n${reflection}\n\n` : "") +
      (bankBlock ? `Вопросы модуля и ответы терапевта:\n${bankBlock}\n\n` : "");

    const prompt =
      "Сформируй персональный интеграционный блок для терапевта.\n\n" +
      "Формат строго:\n" +
      "- Ровно 2–4 предложения.\n" +
      "- Русский язык, обращение на «вы».\n" +
      "- Эмоционально интеллигентно, клинически корректно.\n" +
      "- Упомяни: исходный запрос терапевта, слепые зоны, поле терапевта, ближайшее направление.\n" +
      "- Без списков, без заголовков, без кавычек, без эмодзи.\n\n" +
      grounding +
      `Исходный запрос в супервизию:\n${req}\n\n` +
      `Удалось ли приблизиться к ответу:\n${s1}\n\n` +
      `Что терапевт забирает в практику:\n${takeaway}\n`;

    const sig = `${prompt.length}:${req}:${s1}:${takeaway}:${narrative.length}:${reflection.length}:${session.supervisionAnswers.length}:${bankBlock.length}:${session.therapistSpecializations.join("|")}:${session.therapistMethods.join("|")}:${session.therapistOtherSpecialization}:${session.therapistOtherMethods}:${session.supervisorStyle ?? ""}:${session.focusLabel ?? ""}`;
    if (closingIntegrationKeyRef.current === sig) return;
    closingIntegrationKeyRef.current = sig;

    const fetchGen = ++closingIntegrationFetchGenRef.current;
    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: ac.signal,
        });
        if (ac.signal.aborted || fetchGen !== closingIntegrationFetchGenRef.current) return;

        const data = (await res.json().catch(() => null)) as AssistantApiPayload | null;

        if (ac.signal.aborted || fetchGen !== closingIntegrationFetchGenRef.current) return;
        const live = sessionRef.current;
        if (live.step !== "closing_step3" || live.closingIntegrationStatus !== "loading") return;

        const outcome = classifyAssistantPromptResponse(data);

        if (outcome.kind === "success") {
          clearClosingOverloadTimer();
          closingOverloadAttemptsRef.current = 0;
          setClosingIntegrationOverloadRetry(false);
          dispatch({
            type: "CLOSING_INTEGRATION_SUCCESS",
            text: stripClinicalMarkdown(outcome.text),
          });
          return;
        }

        if (outcome.kind === "overload") {
          closingIntegrationKeyRef.current = null;

          if (closingOverloadAttemptsRef.current < ASSISTANT_AUTO_OVERLOAD_ATTEMPTS) {
            setClosingIntegrationOverloadRetry(false);
            closingOverloadAttemptsRef.current += 1;
            clearClosingOverloadTimer();
            const delay = ASSISTANT_AUTO_OVERLOAD_BASE_MS * closingOverloadAttemptsRef.current;
            closingOverloadTimerRef.current = setTimeout(() => {
              closingOverloadTimerRef.current = null;
              closingIntegrationKeyRef.current = null;
              setClosingAiRetryTick((t) => t + 1);
            }, delay);
          } else {
            setClosingIntegrationOverloadRetry(true);
          }
          return;
        }

        clearClosingOverloadTimer();
        closingOverloadAttemptsRef.current = 0;
        setClosingIntegrationOverloadRetry(false);
        dispatch({
          type: "CLOSING_INTEGRATION_ERROR",
          message:
            "Не удалось загрузить данные. Ваши ответы сохранены — попробуйте обновить страницу или повторить позже.",
        });
      } catch {
        if (ac.signal.aborted || fetchGen !== closingIntegrationFetchGenRef.current) return;
        if (sessionRef.current.step !== "closing_step3") return;

        clearClosingOverloadTimer();
        closingOverloadAttemptsRef.current = 0;
        setClosingIntegrationOverloadRetry(false);
        dispatch({
          type: "CLOSING_INTEGRATION_ERROR",
          message:
            "Не удалось загрузить данные. Ваши ответы сохранены — попробуйте обновить страницу или повторить позже.",
        });
      }
    })();

    return () => {
      ac.abort();
    };
  }, [
    session.step,
    session.closingIntegrationStatus,
    session.supervisionRequest,
    session.closingStep1Answer,
    session.closingTherapistTakeaway,
    session.fullNarrative,
    session.reflectionText,
    session.supervisionAnswers,
    session.therapistSpecializations,
    session.therapistMethods,
    session.therapistOtherSpecialization,
    session.therapistOtherMethods,
    session.supervisorStyle,
    session.focusLabel,
    closingAiRetryTick,
    clearClosingOverloadTimer,
    dispatch,
  ]);

  useEffect(() => {
    if (authUser && !billingHydrated) return;
    if (session.step !== "integration_reflection" || session.reflectionStatus !== "loading") {
      return;
    }
    const bp = billingProfileRef.current;
    if (bp.planType !== "free" || bp.freeIntroUsed) return;
    const sig = `${session.supervisionAnswers.length}:${session.fullNarrative.length}:${session.supervisionRequest.length}`;
    if (freeIntroAnalysisStartedSigRef.current === sig) return;
    freeIntroAnalysisStartedSigRef.current = sig;
    void trackEvent({
      eventName: PRODUCT_EVENTS.free_intro_analysis_started,
      payload: { persistenceCaseId: session.remoteCaseId ?? undefined },
    });
  }, [
    session.step,
    session.reflectionStatus,
    session.supervisionAnswers.length,
    session.fullNarrative.length,
    session.supervisionRequest.length,
    session.remoteCaseId,
    authUser,
    billingHydrated,
  ]);

  useEffect(() => {
    if (authUser && !billingHydrated) return;
    if (
      session.step !== "post_reflection" ||
      session.reflectionStatus !== "success" ||
      !session.reflectionText.trim()
    ) {
      return;
    }
    const bp = billingProfileRef.current;
    if (bp.planType !== "free" || freeIntroAnalysisCompletedTrackedRef.current) return;
    freeIntroAnalysisCompletedTrackedRef.current = true;
    void trackEvent({
      eventName: PRODUCT_EVENTS.free_intro_analysis_completed,
      payload: { persistenceCaseId: session.remoteCaseId ?? undefined },
    });
  }, [
    session.step,
    session.reflectionStatus,
    session.reflectionText,
    session.remoteCaseId,
    authUser,
    billingHydrated,
  ]);

  useEffect(() => {
    if (session.step === "chat_analysis_focus") setChatAnalysisImages([]);
  }, [session.step]);

  useEffect(() => {
    if (session.step === "chat_analysis_compose") chatAnalysisLoadSigRef.current = null;
  }, [session.step]);

  useEffect(() => {
    if (session.step !== "tension_stop_loading") return;
    const pending = session.tensionPending;
    if (!pending) return;

    console.info("[TENSION] step entered tension_stop_loading effect");
    const ac = new AbortController();
    const fetchGen = ++tensionStopFetchGenRef.current;
    const body = {
      phase: "stop" as const,
      module: {
        num: pending.moduleNum,
        name: pending.moduleName,
        question: pending.moduleQuestion,
      },
      caseText: session.fullNarrative,
      answer: pending.originalAnswer,
      clinicalBrain: buildOrderedSupervisionContextAppend(
        therapistApiFields(session),
        session.focusLabel,
        session.supervisorStyle
      ),
    };

    void (async () => {
      try {
        const res = await fetchTensionWithOptionalRetry(body, ac.signal, "phase=stop");
        if (ac.signal.aborted) return;
        if (fetchGen !== tensionStopFetchGenRef.current) return;
        const data = (await res.json()) as { ok?: boolean; text?: string; message?: string };
        if (ac.signal.aborted) return;
        if (fetchGen !== tensionStopFetchGenRef.current) return;
        if (sessionRef.current.step !== "tension_stop_loading") return;
        if (data.ok && data.text?.trim()) {
          console.info("[TENSION] reducer advance TENSION_STOP_SUCCESS");
          dispatch({
            type: "TENSION_STOP_SUCCESS",
            text: stripClinicalMarkdown(data.text.trim()),
          });
          return;
        }
        if (ac.signal.aborted) return;
        if (fetchGen !== tensionStopFetchGenRef.current) return;
        if (sessionRef.current.step !== "tension_stop_loading") return;
        console.info("[TENSION] reducer advance TENSION_STOP_FAILURE (response)");
        dispatch({
          type: "TENSION_STOP_FAILURE",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      } catch (err) {
        if (ac.signal.aborted) {
          console.info("[TENSION] tension_stop_loading aborted (cleanup), no dispatch");
          return;
        }
        if (fetchGen !== tensionStopFetchGenRef.current) return;
        if (sessionRef.current.step !== "tension_stop_loading") return;
        console.info("[TENSION] reducer advance TENSION_STOP_FAILURE (exception)", err);
        dispatch({
          type: "TENSION_STOP_FAILURE",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      } finally {
        console.info("[TENSION] tension_stop_loading async handler finished");
      }
    })();

    return () => {
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tension stop: explicit session slice only; full `session` would refetch on unrelated fields (e.g. draftInput)
  }, [
    session.step,
    session.tensionPending,
    session.fullNarrative,
    session.therapistSpecializations,
    session.therapistMethods,
    session.therapistOtherSpecialization,
    session.therapistOtherMethods,
    session.supervisorStyle,
    session.focusLabel,
    session.focusKey,
    dispatch,
  ]);

  useEffect(() => {
    if (session.step !== "tension_hypothesis_loading") return;
    const pending = session.tensionPending;
    if (!pending?.probeAnswer) return;

    console.info("[TENSION] step entered tension_hypothesis_loading effect");
    const ac = new AbortController();
    const fetchGen = ++tensionHypothesisFetchGenRef.current;
    const body = {
      phase: "hypothesis" as const,
      module: {
        num: pending.moduleNum,
        name: pending.moduleName,
        question: pending.moduleQuestion,
      },
      caseText: session.fullNarrative,
      originalAnswer: pending.originalAnswer,
      probeAnswer: pending.probeAnswer,
      previousContext: buildPreviousModulesContext(session.supervisionAnswers),
      supervisionRequest: session.supervisionRequest,
      clinicalBrain: buildOrderedSupervisionContextAppend(
        therapistApiFields(session),
        session.focusLabel,
        session.supervisorStyle
      ),
    };

    void (async () => {
      try {
        const res = await fetchTensionWithOptionalRetry(body, ac.signal, "phase=hypothesis");
        if (ac.signal.aborted) return;
        if (fetchGen !== tensionHypothesisFetchGenRef.current) return;
        const data = (await res.json()) as { ok?: boolean; text?: string; message?: string };
        if (ac.signal.aborted) return;
        if (fetchGen !== tensionHypothesisFetchGenRef.current) return;
        if (sessionRef.current.step !== "tension_hypothesis_loading") return;
        if (data.ok && data.text?.trim()) {
          console.info("[TENSION] reducer advance TENSION_HYPOTHESIS_SUCCESS");
          dispatch({
            type: "TENSION_HYPOTHESIS_SUCCESS",
            analysis: stripClinicalMarkdown(data.text.trim()),
          });
          return;
        }
        if (ac.signal.aborted) return;
        if (fetchGen !== tensionHypothesisFetchGenRef.current) return;
        if (sessionRef.current.step !== "tension_hypothesis_loading") return;
        console.info("[TENSION] reducer advance TENSION_HYPOTHESIS_FAILURE (response)");
        dispatch({
          type: "TENSION_HYPOTHESIS_FAILURE",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      } catch (err) {
        if (ac.signal.aborted) {
          console.info("[TENSION] tension_hypothesis_loading aborted (cleanup), no dispatch");
          return;
        }
        if (fetchGen !== tensionHypothesisFetchGenRef.current) return;
        if (sessionRef.current.step !== "tension_hypothesis_loading") return;
        console.info("[TENSION] reducer advance TENSION_HYPOTHESIS_FAILURE (exception)", err);
        dispatch({
          type: "TENSION_HYPOTHESIS_FAILURE",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      } finally {
        console.info("[TENSION] tension_hypothesis_loading async handler finished");
      }
    })();

    return () => {
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tension hypothesis: explicit session slice only; full `session` would refetch on unrelated fields
  }, [
    session.step,
    session.tensionPending,
    session.fullNarrative,
    session.supervisionRequest,
    session.supervisionAnswers,
    session.therapistSpecializations,
    session.therapistMethods,
    session.therapistOtherSpecialization,
    session.therapistOtherMethods,
    session.supervisorStyle,
    session.focusLabel,
    session.focusKey,
    dispatch,
  ]);

  useEffect(() => {
    if (session.step !== "chat_analysis_loading") {
      chatAnalysisLoadSigRef.current = null;
      return;
    }
    const focusKey = session.chatAnalysisFocusKey;
    if (!focusKey) return;

    const transcript = session.draftInput.trim();
    const images = chatAnalysisImages;
    const sig = `${focusKey}:${transcript}:${images.map((x) => `${x.mimeType}:${x.base64.length}`).join(";")}`;
    if (chatAnalysisLoadSigRef.current === sig) return;
    chatAnalysisLoadSigRef.current = sig;

    void (async () => {
      try {
        const res = await fetch("/api/assistant/chat-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            focusKey,
            transcriptText: transcript || undefined,
            images: images.length ? images : undefined,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; text?: string; message?: string };
        if (data.ok && data.text?.trim()) {
          dispatch({
            type: "CHAT_ANALYSIS_SUCCESS",
            text: stripClinicalMarkdown(data.text.trim()),
          });
          return;
        }
        dispatch({
          type: "CHAT_ANALYSIS_FAILURE",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      } catch {
        dispatch({
          type: "CHAT_ANALYSIS_FAILURE",
          message: "Не удалось загрузить данные. Попробуйте обновить страницу.",
        });
      }
    })();
  }, [
    session.step,
    session.chatAnalysisFocusKey,
    session.draftInput,
    chatAnalysisImages,
    dispatch,
  ]);

  const submitNarrativeClinical = () => {
    const full = buildFullNarrative(session.narrativeContext, session.draftInput.trim());
    dispatch({
      type: "SUBMIT_NARRATIVE_CLINICAL",
      sufficient: is_narrative_sufficient(full),
    });
  };

  const copySession = useCallback(async () => {
    const payload = buildPremiumSessionPlainExport(session);
    const { ok } = await copyClinicalPlainText(payload);
    if (!ok) return;
    setSessionCopiedNotice(true);
    if (sessionCopiedTimerRef.current) clearTimeout(sessionCopiedTimerRef.current);
    sessionCopiedTimerRef.current = setTimeout(() => setSessionCopiedNotice(false), 2600);
  }, [session]);

  const submitQuestionBankAnswer = () => {
    const text = session.draftInput.trim();
    if (!text || !session.focusKey || !session.sessionDepth) return;
    const bankTotal = getTotalQuestionCount(session.focusKey, session.sessionDepth);
    const hasNextBankQuestion = session.questionModuleIdx + 1 < bankTotal;
    if (
      session.supervisionAnswers.length > 0 &&
      !session.tensionCompleted &&
      hasNextBankQuestion &&
      detect_tension_signals(text)
    ) {
      dispatch({ type: "TENSION_INTERRUPT_START" });
      return;
    }
    dispatch({ type: "SUBMIT_QUESTION_ANSWER" });
  };

  const onChatAnalysisFiles = (files: FileList | null) => {
    if (!files?.length) return;
    void (async () => {
      const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
      const next: Array<{ mimeType: string; base64: string }> = [];
      for (const file of Array.from(files)) {
        const mime = file.type || "image/png";
        if (!allowed.has(mime)) continue;
        try {
          next.push(await fileToInlineBase64(file));
        } catch {
          continue;
        }
      }
      if (!next.length) return;
      setChatAnalysisImages((prev) => [...prev, ...next].slice(0, 8));
    })();
  };

  const chatFocusEntries = Object.entries(_CHAT_FOCUS_PROMPTS) as [
    ChatFocusPromptKey,
    readonly [string, string],
  ][];

  const intakeKey = getCurrentIntakeQuestionKey(session.step);
  const intakeQuestion =
    intakeKey && CASE_INTAKE_QUESTIONS[intakeKey] ? CASE_INTAKE_QUESTIONS[intakeKey] : null;

  const questionBank =
    session.focusKey && session.sessionDepth
      ? getQuestionsForFocus(session.focusKey)
      : null;
  const totalQs =
    session.focusKey && session.sessionDepth
      ? getTotalQuestionCount(session.focusKey, session.sessionDepth)
      : 0;
  const currentQ =
    questionBank && session.focusKey && session.sessionDepth
      ? questionBank[session.questionModuleIdx]
      : undefined;

  const hideIntroBannerSteps = new Set<SupervisionSession["step"]>([
    "confidentiality",
    "confidentiality_more",
    "finished",
  ]);
  const showIntroBanner =
    billingForProductGates.planType === "free" &&
    !billingForProductGates.freeIntroUsed &&
    !hideIntroBannerSteps.has(session.step);

  const showPremiumPostIntroPaywall =
    session.step === "post_reflection" &&
    session.reflectionStatus === "success" &&
    Boolean(session.reflectionText.trim()) &&
    billingForProductGates.planType === "free" &&
    billingForProductGates.freeIntroUsed;

  const gateFreeRetention =
    billingForProductGates.planType === "free" && billingForProductGates.freeIntroUsed;

  const caseStartBlocked =
    Boolean(authUser) && (!authReady || !billingHydrated)
      ? false
      : !canStartCase(billingForProductGates);

  const showFinishedPaywall =
    caseStartBlocked &&
    (!authUser ||
      finishSaveStatus === "success" ||
      finishSaveStatus === "error" ||
      finishSaveStatus === "skipped");

  const showPersistenceAuthBanner =
    billingForProductGates.planType === "free" &&
    Boolean(persistenceBanner) &&
    !clinicalSessionBlocksAuth(session.step);

  const lowDataBanner =
    session.narrativeSufficient === false &&
    session.step !== "low_data_choice" &&
    session.step !== "low_data_add_material" &&
    session.step !== "low_data_ionova" &&
    session.step !== "confidentiality" &&
    session.step !== "confidentiality_more";

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <Container className="flex min-h-0 flex-1 flex-col justify-center pb-5 pt-1.5 sm:pb-7 sm:pt-2.5">
        <Card className="mx-auto flex max-h-[min(90dvh,880px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden shadow-[var(--shadow)] sm:max-h-[min(92dvh,900px)]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] px-5 py-3 max-md:scroll-pb-[max(7rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:px-7 sm:py-4">
          {showPersistenceAuthBanner && (
            <p className="mb-5 rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 8%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)]">
              {persistenceBanner}
            </p>
          )}

          {billingSoftNotice && (
            <p className="mb-5 rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 8%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
              {billingSoftNotice}
            </p>
          )}

          {showIntroBanner && <FreeIntroPaywall />}

          {lowDataBanner && (
            <p className="mb-5 rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 45%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 10%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)]">
              {LOW_DATA_CONTINUE_WARNING}
            </p>
          )}

          {session.step === "confidentiality" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Перед началом супервизии
              </h1>
              <div className="space-y-4 whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                {CONFIDENTIALITY_TEXT}
              </div>
              <div className={assistantStickyBar}>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "CONFIDENTIALITY_CONTINUE" })}
                  >
                    Понятно, продолжаем
                  </Button>
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "CONFIDENTIALITY_MORE" })}
                  >
                    Подробнее о конфиденциальности
                  </Button>
                </div>
              </div>
            </div>
          )}

          {session.step === "confidentiality_more" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Конфиденциальность подробнее
              </h1>
              <div className="space-y-4 whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                {CONFIDENTIALITY_MORE_TEXT}
              </div>
              <div className={assistantStickyBar}>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => dispatch({ type: "CONFIDENTIALITY_CONTINUE" })}
                >
                  Понятно, продолжаем
                </Button>
              </div>
            </div>
          )}

          {session.step === "case_reminder" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Новый кейс</h1>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                {CASE_CONFIDENTIALITY_REMINDER}
              </p>
              {authReady && (
                <CaseMemoryPremiumCard isAuthenticated={Boolean(authUser)} />
              )}
              {caseStartBlocked ? (
                <div className="space-y-5">
                  <p className="text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                    {PREMIUM_PAYWALL_LEAD}
                  </p>
                  <SupervisionTrustBlock />
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
              ) : (
                <div className={assistantStickyBar}>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "CASE_REMINDER_CONTINUE" })}
                  >
                    Понятно, перейти к кейсу
                  </Button>
                </div>
              )}
            </div>
          )}

          {(session.step === "case_name" || session.step === "therapy_duration") &&
            intakeQuestion && (
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                  {intakeQuestion}
                </h1>
                <label htmlFor="intake-draft" className="sr-only">
                  Ответ
                </label>
                <div className={assistantStickyBar}>
                  <textarea
                    id="intake-draft"
                    className={draftTextareaClass}
                    value={session.draftInput}
                    onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                  />
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={session.draftInput.trim().length === 0}
                    onClick={() =>
                      dispatch({
                        type:
                          session.step === "case_name"
                            ? "SUBMIT_CASE_NAME"
                            : "SUBMIT_THERAPY_DURATION",
                      })
                    }
                  >
                    Продолжить
                  </Button>
                </div>
              </div>
            )}

          {session.step === "narrative_context" && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                Базовый контекст
              </h1>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                {CASE_NARRATIVE_PROMPT_1}
              </p>
              <div className={assistantStickyBar}>
                <textarea
                  id="narrative-context"
                  className={draftTextareaClass}
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={session.draftInput.trim().length === 0}
                  onClick={() => dispatch({ type: "SUBMIT_NARRATIVE_CONTEXT" })}
                >
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "narrative_clinical" && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                Клиническая часть
              </h1>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                {CASE_NARRATIVE_PROMPT_2}
              </p>
              <div className={assistantStickyBar}>
                <textarea
                  id="narrative-clinical"
                  className={draftTextareaClass}
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={session.draftInput.trim().length === 0}
                  onClick={submitNarrativeClinical}
                >
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "low_data_choice" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Нужно чуть больше материала
              </h1>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                {LOW_DATA_PROMPT_TEXT}
              </p>
              <div className={assistantStickyBar}>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "LOW_DATA_ADD_MATERIAL" })}
                  >
                    Да, добавлю материал
                  </Button>
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "LOW_DATA_IONOVA" })}
                  >
                    Ответить на уточняющие вопросы
                  </Button>
                  <Button
                    type="button"
                    tone="ghost"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "LOW_DATA_CONTINUE_ANYWAY" })}
                  >
                    Продолжить с тем, что есть
                  </Button>
                </div>
              </div>
            </div>
          )}

          {session.step === "low_data_add_material" && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Дополнительный материал
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Добавьте описание кейса — что важно, чтобы я услышала поле.
              </p>
              <div className={assistantStickyBar}>
                <textarea
                  id="extra-material"
                  className={draftTextareaClass}
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={session.draftInput.trim().length === 0}
                  onClick={() => dispatch({ type: "SUBMIT_EXTRA_MATERIAL" })}
                >
                  Сохранить и продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "low_data_ionova" && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Уточняющий вопрос {Math.min(session.ionovaIndex + 1, IONOVA_INTAKE_QUESTIONS.length)}{" "}
                из {Math.min(IONOVA_INTAKE_QUESTIONS.length, 2)}
              </h1>
              <p className="text-lg font-medium leading-snug tracking-[-0.02em] text-[color:var(--text)] sm:text-xl sm:leading-snug whitespace-pre-line">
                {IONOVA_INTAKE_QUESTIONS[session.ionovaIndex] ?? ""}
              </p>
              <div className={assistantStickyBar}>
                <textarea
                  id="ionova-answer"
                  className={draftTextareaClass}
                  placeholder="Ваш ответ как терапевта..."
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={session.draftInput.trim().length === 0}
                  onClick={() => dispatch({ type: "SUBMIT_IONOVA_ANSWER" })}
                >
                  Сохранить ответ и продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "detecting_supervision_request" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Проверяю супервизионный запрос
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Сопоставляю ваш нарратив с явными и неявными формулировками запроса — это займёт
                несколько секунд.
              </p>
            </div>
          )}

          {session.step === "supervision_request_confirm" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Уточним запрос на супервизию
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                В вашем описании я уже слышу супервизионный запрос.
                {"\n\n"}
                Если я правильно вас понял, сейчас для вас важно:
                {"\n\n"}
                <span className="text-[color:var(--text)]">{session.pendingDetectedRequest}</span>
                {"\n\n"}
                Верно?
              </p>
              <div className={assistantStickyBar}>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "SUP_REQUEST_CONFIRM" })}
                  >
                    Да, всё верно
                  </Button>
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "SUP_REQUEST_REFINE" })}
                  >
                    Есть уточнения
                  </Button>
                </div>
              </div>
            </div>
          )}

          {session.step === "supervision_request" && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                Запрос на супервизию
              </h1>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                Прежде чем идти глубже.
                {"\n\n"}
                Каков ваш главный запрос на эту супервизию?
                {"\n\n"}
                Ответ можно отправить текстом или голосовым сообщением 🎤
              </p>
              <div className={assistantStickyBar}>
                <textarea
                  id="supervision-request"
                  className={draftTextareaClass}
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={session.draftInput.trim().length === 0}
                  onClick={() => dispatch({ type: "SUBMIT_SUPERVISION_REQUEST" })}
                >
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "therapist_specialization" && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-2xl">
                Уточните вашу профессиональную специализацию
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Можно выбрать несколько вариантов — так супервизия лучше попадает в ваш профессиональный контекст и язык.
              </p>
              <MultiSelectClinicalOptions
                options={THERAPIST_SPECIALIZATION_OPTIONS}
                selected={session.therapistSpecializations}
                onToggle={(option) => dispatch({ type: "TOGGLE_THERAPIST_SPECIALIZATION", option })}
                otherSelected={session.therapistSpecializations.includes(THERAPIST_SPECIALIZATION_OTHER)}
                otherLabel="Если отметили «Другое», кратко уточните формулировку"
                otherPlaceholder="Например: телесно-ориентированный консультант по зависимостям…"
                otherValue={session.draftInput}
                onOtherChange={(value) => dispatch({ type: "SET_DRAFT", value })}
                otherInputClassName={therapistOtherTextareaClass}
              />
              <div className={assistantStickyBar}>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={
                    session.therapistSpecializations.length === 0 ||
                    (session.therapistSpecializations.includes(THERAPIST_SPECIALIZATION_OTHER) &&
                      !session.draftInput.trim())
                  }
                  onClick={() => dispatch({ type: "SUBMIT_THERAPIST_SPECIALIZATION" })}
                >
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "therapist_methods" && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-2xl">
                В каких подходах или методах вы работаете?
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Отметьте всё актуальное для вашей практики. Дальнейшие гипотезы и интервенции будут строиться в совместимости с этим полем.
              </p>
              <MultiSelectClinicalOptions
                options={THERAPIST_METHOD_OPTIONS}
                selected={session.therapistMethods}
                onToggle={(option) => dispatch({ type: "TOGGLE_THERAPIST_METHOD", option })}
                otherSelected={session.therapistMethods.includes(THERAPIST_METHOD_OTHER)}
                otherLabel="Если отметили «Другое», опишите смешанную или редкую рамку"
                otherPlaceholder="Например: интеграция ACT и работы с телом…"
                otherValue={session.draftInput}
                onOtherChange={(value) => dispatch({ type: "SET_DRAFT", value })}
                otherInputClassName={therapistOtherTextareaClass}
              />
              <div className={assistantStickyBar}>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={
                    session.therapistMethods.length === 0 ||
                    (session.therapistMethods.includes(THERAPIST_METHOD_OTHER) && !session.draftInput.trim())
                  }
                  onClick={() => dispatch({ type: "SUBMIT_THERAPIST_METHODS" })}
                >
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "supervisor_style_selection" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                Какого супервизора вам важно встретить сегодня?
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Иногда глубина разбора зависит не только от кейса, но и от того, какой контакт вам сейчас нужен.
              </p>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Стиль супервизора">
                {SUPERVISOR_STYLE_OPTIONS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={session.supervisorStyle === label}
                    className={`${choiceRow} ${session.supervisorStyle === label ? choiceRowSelected : ""}`}
                    onClick={() => dispatch({ type: "SELECT_SUPERVISOR_STYLE", label })}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-2 ${
                        session.supervisorStyle === label
                          ? "border-[color:var(--accent-green)] bg-[color:color-mix(in srgb, var(--accent-green) 35%, white)]"
                          : "border-[color:var(--border)]"
                      }`}
                      aria-hidden
                    />
                    <span className="text-[color:var(--text)]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.step === "focus_selection" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                На каком уровне вы хотите сегодня разбирать этот случай?
              </h1>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Фокус разбора">
                {FOCUS_SELECTION_LABELS_ORDERED.map((label) => (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={session.focusLabel === label}
                    className={`${choiceRow} ${session.focusLabel === label ? choiceRowSelected : ""}`}
                    onClick={() => dispatch({ type: "SELECT_FOCUS", label })}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-2 ${
                        session.focusLabel === label
                          ? "border-[color:var(--accent-green)] bg-[color:color-mix(in srgb, var(--accent-green) 35%, white)]"
                          : "border-[color:var(--border)]"
                      }`}
                      aria-hidden
                    />
                    <span className="text-[color:var(--text)]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.step === "focus_help_notice" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Помощь с выбором фокуса
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">{FOCUS_HELP_NOTICE}</p>
              <div className={assistantStickyBar}>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => dispatch({ type: "FOCUS_HELP_CONTINUE" })}
                >
                  Вернуться к выбору фокуса
                </Button>
              </div>
            </div>
          )}

          {session.step === "depth_selection" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                Какую глубину разбора выбираем сегодня?
              </h1>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Глубина разбора">
                {depthOrderForBilling.map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    role="radio"
                    aria-checked={session.sessionDepth === depth}
                    className={`${choiceRow} ${session.sessionDepth === depth ? choiceRowSelected : ""}`}
                    onClick={() => dispatch({ type: "SELECT_DEPTH", depth })}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-2 ${
                        session.sessionDepth === depth
                          ? "border-[color:var(--accent-green)] bg-[color:color-mix(in srgb, var(--accent-green) 35%, white)]"
                          : "border-[color:var(--border)]"
                      }`}
                      aria-hidden
                    />
                    <span className="text-[color:var(--text)]">
                      {SESSION_DEPTH_KEYBOARD_LABELS[depth]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.step === "question_flow" &&
            session.focusKey &&
            session.sessionDepth &&
            currentQ !== undefined && (
              <div className="space-y-5">
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                  Вопрос {session.questionModuleIdx + 1} из {totalQs}
                </h1>
                {session.tensionFlowError.trim() ? (
                  <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 10%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                    {session.tensionFlowError.trim()}
                  </div>
                ) : null}
                {session.transitionLine && (
                  <p className="text-sm font-medium text-[color:var(--muted)]">
                    {session.transitionLine}
                  </p>
                )}
                <p className="text-lg font-medium leading-snug tracking-[-0.02em] text-[color:var(--text)] sm:text-xl sm:leading-snug whitespace-pre-line">
                  {currentQ}
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  Ответ можно отправить текстом или голосовым сообщением 🎤
                </p>
                <div className={assistantStickyBar}>
                  <textarea
                    id={`bank-q-${session.questionModuleIdx}`}
                    className={draftTextareaClass}
                    placeholder="Ваш ответ как терапевта..."
                    value={session.draftInput}
                    onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                  />
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={session.draftInput.trim().length === 0}
                    onClick={submitQuestionBankAnswer}
                  >
                    Сохранить ответ и продолжить
                  </Button>
                </div>
              </div>
            )}

          {session.step === "tension_stop_loading" && session.tensionPending && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Напряжение в поле — короткая остановка
              </h1>
              <p className="text-sm font-medium leading-relaxed text-[color:var(--text)]">
                Стоп · Не спешим · Сейчас про вас · Сейчас важнее не клиент.
              </p>
              <p className="text-xs leading-relaxed text-[color:var(--muted)]">
                Короткие ориентиры для фразы остановки: {TENSION_STOP_STEP_ONE_OPTIONS}
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Готовлю уточняющий контакт и один вопрос…
              </p>
            </div>
          )}

          {session.step === "tension_stop" && session.tensionPending && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Напряжение в поле — короткая остановка
              </h1>
              <p className="text-sm font-medium leading-relaxed text-[color:var(--text)]">
                Стоп · Не спешим · Сейчас про вас · Сейчас важнее не клиент.
              </p>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-4">
                <p className="text-sm font-semibold text-[color:var(--text)]">Остановка и один уточняющий вопрос</p>
                  <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                    {stripClinicalMarkdown(session.tensionStopText.trim())}
                  </div>
              </div>
              {session.tensionFlowError.trim() ? (
                <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 10%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                  {session.tensionFlowError.trim()}
                </div>
              ) : null}
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Ответьте на уточняющий вопрос выше — коротко, по существу.
              </p>
              <div className={assistantStickyBar}>
                <textarea
                  id="tension-probe-answer"
                  className={draftTextareaClass}
                  placeholder="Ваш ответ на уточняющий вопрос…"
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={session.draftInput.trim().length === 0}
                    onClick={() => dispatch({ type: "TENSION_SUBMIT_PROBE" })}
                  >
                    Отправить уточнение и получить гипотезу
                  </Button>
                  <Button
                    type="button"
                    tone="ghost"
                    className="w-full sm:w-auto"
                    onClick={() => dispatch({ type: "TENSION_FLOW_CANCEL" })}
                  >
                    Вернуться к ответу на модуль без короткой остановки
                  </Button>
                </div>
              </div>
            </div>
          )}

          {session.step === "tension_hypothesis_loading" && session.tensionPending && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Рабочая гипотеза</h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Формирую гипотезу по вашему напряжению и уточнению…
              </p>
            </div>
          )}

          {session.step === "integration_reflection" &&
            session.reflectionStatus === "loading" &&
            reflectionOverloadRetry && (
              <div className="space-y-4">
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                  Интеграционная рефлексия
                </h1>
                <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                  AI сейчас под высокой клинической нагрузкой. Ваш кейс удержан. Повторим через несколько
                  секунд.
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full sm:w-auto"
                    onClick={retryIntegrationReflectionFetch}
                  >
                    Повторить
                  </Button>
                </div>
              </div>
            )}

          {session.step === "integration_reflection" &&
            session.reflectionStatus === "loading" &&
            !reflectionOverloadRetry && (
              <div className="space-y-4">
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                  Интеграционная рефлексия
                </h1>
                <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                  Завершаю супервизию. Формирую интеграционную рефлексию...
                </p>
              </div>
            )}

          {session.step === "closing_step1" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Итог супервизионного цикла</h1>

              {session.reflectionStatus === "success" && session.reflectionText && (
                <div className="max-h-[min(52vh,28rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-4">
                  <p className="text-sm font-semibold text-[color:var(--text)]">Интеграционная рефлексия</p>
                  <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                    {stripClinicalMarkdown(session.reflectionText)}
                  </div>
                </div>
              )}

              {(session.reflectionStatus === "error" || session.reflectionError) && (
                <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 12%, white)] px-4 py-4">
                  <p className="text-sm font-semibold text-[color:var(--text)]">Статус анализа</p>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {session.reflectionError || "Не удалось получить интеграционную рефлексию."}
                  </p>
                  {reflectionOverloadRetry && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        tone="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          retryIntegrationReflectionFetch();
                          dispatch({ type: "REFLECTION_LOADING" });
                        }}
                      >
                        Продолжить супервизию
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-[color:var(--text)]">
                  Ваш исходный запрос в супервизию был:
                </p>
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-3">
                  <div className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                    {session.supervisionRequest}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[color:var(--text)]">
                  Удалось ли сейчас приблизиться к ответу?
                </p>
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="Приблизиться к ответу">
                  {[
                    "✅ Да, стало яснее",
                    "◐ Частично, вижу больше",
                    "◯ Пока нет, хочу глубже",
                  ].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`${choiceRow}${session.closingStep1Answer === label ? ` ${choiceRowSelected}` : ""}`}
                      onClick={() => dispatch({ type: "CLOSING_STEP1_SELECT", value: label })}
                    >
                      <span className="text-[color:var(--text)]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {session.step === "closing_step2" && (
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                Что из этого разбора вы забираете с собой в практику?
              </h1>
              <div className={assistantStickyBar}>
                <textarea
                  id="closing-takeaway"
                  className={draftTextareaClass}
                  placeholder="Коротко или развёрнуто — как вам полезно."
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={session.draftInput.trim().length === 0}
                  onClick={() => dispatch({ type: "CLOSING_STEP2_SUBMIT" })}
                >
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "closing_step3" &&
            session.closingIntegrationStatus === "loading" &&
            closingIntegrationOverloadRetry && (
              <div className="space-y-4">
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">Что сегодня особенно проявилось</h1>
                <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                  AI сейчас под высокой клинической нагрузкой. Ваш кейс удержан. Повторим через несколько
                  секунд.
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full sm:w-auto"
                    onClick={retryClosingIntegrationFetch}
                  >
                    Повторить
                  </Button>
                </div>
              </div>
            )}

          {session.step === "closing_step3" &&
            session.closingIntegrationStatus === "loading" &&
            !closingIntegrationOverloadRetry && (
              <div className="space-y-6">
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">Что сегодня особенно проявилось</h1>
                <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                  Формирую персональную интеграцию по вашему ответу…
                </p>
              </div>
            )}

          {session.step === "closing_step3" && session.closingIntegrationStatus !== "loading" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Что сегодня особенно проявилось</h1>

              {session.closingIntegrationStatus === "error" && (
                <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 12%, white)] px-4 py-4">
                  <p className="text-sm font-semibold text-[color:var(--text)]">Не получилось сформировать блок</p>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {session.closingIntegrationError ||
                      "Не удалось загрузить данные. Попробуйте обновить страницу."}
                  </p>
                </div>
              )}

              {session.closingIntegrationStatus === "success" && session.closingIntegrationText.trim() && (
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-4">
                  <div className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                    {stripClinicalMarkdown(session.closingIntegrationText.trim())}
                  </div>
                </div>
              )}

              <div className={assistantStickyBar}>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {session.closingIntegrationStatus === "error" && (
                    <Button
                      type="button"
                      tone="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        retryClosingIntegrationFetch();
                        dispatch({ type: "CLOSING_INTEGRATION_LOADING" });
                      }}
                    >
                      Повторить
                    </Button>
                  )}
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={
                      session.closingIntegrationStatus !== "success" ||
                      session.closingIntegrationText.trim().length === 0
                    }
                    onClick={() => dispatch({ type: "CLOSING_STEP3_CONTINUE" })}
                  >
                    Продолжить
                  </Button>
                </div>
              </div>
            </div>
          )}

          {session.step === "closing_step4" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Куда хотите пойти дальше в этом кейсе?
              </h1>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Дальше в кейсе">
                {[
                  "Перенос",
                  "Контрперенос",
                  "Слепые зоны",
                  "Стратегия следующей сессии",
                  "Разбор переписки",
                  "📒 Зафиксировать инсайт и завершить",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={choiceRow}
                    onClick={() => {
                      if (
                        authReady &&
                        !authUser &&
                        (label === "Перенос" || label === "Контрперенос")
                      ) {
                        openCasePersistenceAuthModal();
                        return;
                      }
                      dispatch({ type: "CLOSING_STEP4_SELECT", value: label });
                    }}
                  >
                    <span className="text-[color:var(--text)]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.step === "post_reflection" && (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Итог супервизионного цикла
              </h1>
              {session.reflectionStatus === "success" && session.reflectionText && (
                <div
                  className={`max-h-[min(52vh,28rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-4`}
                >
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Интеграционная рефлексия
                  </p>
                  <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                    {stripClinicalMarkdown(session.reflectionText)}
                  </div>
                </div>
              )}
              {(session.reflectionStatus === "error" || session.reflectionError) && (
                <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 12%, white)] px-4 py-4">
                  <p className="text-sm font-semibold text-[color:var(--text)]">Статус анализа</p>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {session.reflectionError}
                  </p>
                  {reflectionOverloadRetry && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        tone="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          retryIntegrationReflectionFetch();
                          dispatch({ type: "REFLECTION_LOADING" });
                        }}
                      >
                        Продолжить супервизию
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {navFlowError && (
                <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 10%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)]">
                  {navFlowError}
                </div>
              )}
              {showPremiumPostIntroPaywall && !authUser && (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                    Вы завершили этот цикл разбора. Чуть ниже — как сохранить доступ к следующим кейсам в том же формате.
                  </p>
                  <div className="space-y-5 rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 92%, transparent)] px-4 py-5">
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--text)]">
                    {PREMIUM_PAYWALL_TITLE}
                  </h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                    {PREMIUM_PAYWALL_LEAD}
                  </p>
                  <SupervisionTrustBlock />
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
                </div>
              )}
              {canUseChatAnalysis(billingForProductGates) && (
                <div className="space-y-3 border-t border-[color:var(--border)] pt-6">
                  <p className="text-sm font-medium text-[color:var(--text)]">
                    Анализ переписки или скриншотов
                  </p>
                  <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                    Отдельный режим: разбор фрагмента переписки или загруженных скриншотов — с тем же
                    клиническим тоном супервизии.
                  </p>
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full sm:w-auto text-left justify-start"
                    onClick={() => dispatch({ type: "OPEN_CHAT_ANALYSIS" })}
                  >
                    💬 Анализ переписки или скриншотов
                  </Button>
                </div>
              )}
              {canUseNav(billingForProductGates) && (
                <div className="space-y-3 border-t border-[color:var(--border)] pt-6">
                  <p className="text-sm font-medium text-[color:var(--text)]">
                    Многослойная навигация по разбору
                  </p>
                  <div className="flex flex-col gap-2">
                    {NAV_LEVEL_UI_ORDER.map((level) => {
                      const nk = navKeyForLevel(level);
                      if (!nk) return null;
                      return (
                        <Button
                          key={level}
                          type="button"
                          tone="secondary"
                          className="w-full sm:w-auto text-left justify-start"
                          onClick={() => {
                            setNavFlowError(null);
                            dispatch({ type: "NAV_BEGIN_LEVEL", navKey: nk });
                          }}
                        >
                          {navLevelLabel(level)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className={assistantStickyBar}>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[color:var(--text)]">
                    Что хотите исследовать дальше в этом случае?
                  </p>
                  <div className="flex flex-col gap-2">
                    {!gateFreeRetention &&
                      POST_REFLECTION_WEB_ACTIONS.map((a) => (
                        <Button
                          key={a.id}
                          type="button"
                          tone="secondary"
                          className="w-full sm:w-auto text-left justify-start"
                          onClick={() => dispatch({ type: "POST_REFLECTION_ACTION", id: a.id })}
                        >
                          {a.label}
                        </Button>
                      ))}
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        dispatch({ type: "POST_REFLECTION_ACTION", id: "finish_after_reflection" })
                      }
                    >
                      {POST_REFLECTION_FINISH_LABEL}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 pt-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      tone="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => void copySession()}
                    >
                      Скопировать сессию
                    </Button>
                  </div>
                  {sessionCopiedNotice ? (
                    <p
                      className="text-xs font-medium text-[color:color-mix(in srgb,var(--accent-green)72%,var(--text))]"
                      aria-live="polite"
                    >
                      Сессия скопирована.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {session.step === "nav_depth_selection" && session.navKey && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] whitespace-pre-line">
                {NAV_CONTEXT_LABELS[session.navKey] ?? "Разбор"}
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Выберите глубину уточняющих вопросов перед финальным анализом.
              </p>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Глубина уточняющих вопросов">
                {NAV_CLARIFYING_DEPTH_ORDER.map((depth: DepthLabelCallbackKey) => (
                  <button
                    key={depth}
                    type="button"
                    className={choiceRow}
                    onClick={() =>
                      dispatch({
                        type: "NAV_SELECT_CLARIFYING_DEPTH",
                        count: clarifyingQuestionCountForDepth(depth),
                      })
                    }
                  >
                    <span className="text-[color:var(--text)]">{NAV_CLARIFYING_DEPTH_LABELS[depth]}</span>
                  </button>
                ))}
              </div>
              <div className={assistantStickyBar}>
                <Button
                  type="button"
                  tone="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    navPersistedSigRef.current = null;
                    dispatch({ type: "NAV_BACK_TO_POST_REFLECTION" });
                  }}
                >
                  Назад к итогам супервизии
                </Button>
              </div>
            </div>
          )}

          {session.step === "nav_clarifying_loading" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Уточняющие вопросы</h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">{NAV_CLARIFYING_INTRO}</p>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Готовлю уточняющие вопросы…
              </p>
            </div>
          )}

          {session.step === "nav_clarifying" && session.navQuestions.length > 0 && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Уточняющий вопрос {Math.min(session.navQuestionIndex + 1, session.navQuestions.length)} из{" "}
                {session.navQuestions.length}
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">{NAV_CLARIFYING_INTRO}</p>
              <p className="text-lg font-medium leading-snug tracking-[-0.02em] text-[color:var(--text)] sm:text-xl sm:leading-snug whitespace-pre-line">
                {session.navQuestions[session.navQuestionIndex] ?? ""}
              </p>
              <div className={assistantStickyBar}>
                <textarea
                  id="nav-clarifying-answer"
                  className={draftTextareaClass}
                  placeholder="Ваш ответ как терапевта..."
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={session.draftInput.trim().length === 0}
                  onClick={() => dispatch({ type: "NAV_SUBMIT_CLARIFYING_ANSWER" })}
                >
                  Сохранить ответ и продолжить
                </Button>
              </div>
            </div>
          )}

          {session.step === "nav_final_loading" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Финальный разбор</h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Собираю финальный супервизионный анализ…
              </p>
            </div>
          )}

          {session.step === "nav_tail_flow" && session.navFinalAnalysis.trim() ? (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                {session.navKey ? NAV_CONTEXT_LABELS[session.navKey] ?? "Разбор" : "Разбор"}
              </h1>
              <div className="max-h-[min(52vh,28rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-4">
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  Финальный супервизионный анализ
                </p>
                <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                  {stripClinicalMarkdown(session.navFinalAnalysis)}
                </div>
              </div>

              {session.navTailPhase === "psychotype" ? (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                    {PSYCHOTYPE_WOW_TEXT}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      className="w-full sm:w-auto text-left justify-start"
                      onClick={() => dispatch({ type: "NAV_PSYCHOTYPE_ACK" })}
                    >
                      {PSYCHOTYPE_BUTTON_GET_QUESTIONS}
                    </Button>
                    <Button
                      type="button"
                      tone="secondary"
                      className="w-full sm:w-auto text-left justify-start"
                      onClick={() => dispatch({ type: "NAV_PSYCHOTYPE_ACK" })}
                    >
                      {PSYCHOTYPE_BUTTON_LATER}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                    {buildNavSupervisionFollowupQuestion(session.supervisionRequest)}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      className="w-full sm:w-auto text-left justify-start"
                      onClick={() => dispatch({ type: "NAV_SUPERVISION_TAIL_CONTINUE" })}
                    >
                      {NAV_SUPERVISION_TAIL_CONTINUE_LABEL}
                    </Button>
                    <Button
                      type="button"
                      tone="secondary"
                      className="w-full sm:w-auto text-left justify-start"
                      onClick={() => dispatch({ type: "NAV_SUPERVISION_TAIL_FINISH" })}
                    >
                      {NAV_SUPERVISION_TAIL_FINISH_LABEL}
                    </Button>
                  </div>
                </div>
              )}

              <div className={assistantStickyBar}>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      tone="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        navPersistedSigRef.current = null;
                        dispatch({ type: "NAV_BACK_TO_POST_REFLECTION" });
                      }}
                    >
                      Вернуться к итогам супервизии
                    </Button>
                    <Button
                      type="button"
                      tone="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void copySession()}
                    >
                      Скопировать сессию
                    </Button>
                  </div>
                  {sessionCopiedNotice ? (
                    <p
                      className="text-xs font-medium text-[color:color-mix(in srgb,var(--accent-green)72%,var(--text))]"
                      aria-live="polite"
                    >
                      Сессия скопирована.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {session.step === "nav_final_result" && session.navFinalError.trim() ? (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                {session.navKey ? NAV_CONTEXT_LABELS[session.navKey] ?? "Разбор" : "Разбор"}
              </h1>
              <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 12%, white)] px-4 py-4">
                <p className="text-sm font-semibold text-[color:var(--text)]">Статус анализа</p>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{session.navFinalError}</p>
              </div>
              <div className={assistantStickyBar}>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        navPersistedSigRef.current = null;
                        dispatch({ type: "NAV_BACK_TO_POST_REFLECTION" });
                      }}
                    >
                      Вернуться к итогам супервизии
                    </Button>
                    <Button
                      type="button"
                      tone="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void copySession()}
                    >
                      Скопировать сессию
                    </Button>
                  </div>
                  {sessionCopiedNotice ? (
                    <p
                      className="text-xs font-medium text-[color:color-mix(in srgb,var(--accent-green)72%,var(--text))]"
                      aria-live="polite"
                    >
                      Сессия скопирована.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {session.step === "chat_analysis_focus" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                Анализ переписки или скриншотов
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Выберите фокус разбора — язык и структура ответа заданы клинически, без сокращений.
              </p>
              <div className="flex flex-col gap-2" aria-label="Фокус анализа переписки">
                {chatFocusEntries.map(([key, pair]) => (
                  <button
                    key={key}
                    type="button"
                    className={choiceRow}
                    onClick={() => dispatch({ type: "CHAT_ANALYSIS_SELECT_FOCUS", key })}
                  >
                    <span className="text-[color:var(--text)]">{pair[0]}</span>
                  </button>
                ))}
              </div>
              <div className={assistantStickyBar}>
                <Button
                  type="button"
                  tone="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => dispatch({ type: "CHAT_ANALYSIS_BACK" })}
                >
                  Назад к итогам супервизии
                </Button>
              </div>
            </div>
          )}

          {session.step === "chat_analysis_compose" && session.chatAnalysisFocusKey && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                {_CHAT_FOCUS_PROMPTS[session.chatAnalysisFocusKey][0]}
              </h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Вставьте текст переписки и/или добавьте до восьми скриншотов (PNG, JPEG, WebP или GIF).
              </p>
              {session.chatAnalysisError.trim() ? (
                <div className="rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 10%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                  {session.chatAnalysisError.trim()}
                </div>
              ) : null}
              <div className={assistantStickyBar}>
                <textarea
                  id="chat-analysis-transcript"
                  className={draftTextareaClass}
                  placeholder="Текст переписки или описание того, что на скриншотах…"
                  value={session.draftInput}
                  onChange={(e) => dispatch({ type: "SET_DRAFT", value: e.target.value })}
                />
                <div className="space-y-2">
                  <label htmlFor="chat-analysis-files" className="text-sm font-medium text-[color:var(--text)]">
                    Скриншоты
                  </label>
                  <input
                    id="chat-analysis-files"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="block w-full text-sm text-[color:var(--muted)]"
                    onChange={(e) => onChatAnalysisFiles(e.target.files)}
                  />
                  {chatAnalysisImages.length > 0 ? (
                    <p className="text-xs text-[color:var(--muted)]">
                      Загружено изображений: {chatAnalysisImages.length}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={
                      session.draftInput.trim().length === 0 && chatAnalysisImages.length === 0
                    }
                    onClick={() => dispatch({ type: "CHAT_ANALYSIS_SUBMIT" })}
                  >
                    Запустить анализ
                  </Button>
                  <Button
                    type="button"
                    tone="ghost"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setChatAnalysisImages([]);
                      dispatch({ type: "CHAT_ANALYSIS_BACK" });
                    }}
                  >
                    Назад к итогам супервизии
                  </Button>
                </div>
              </div>
            </div>
          )}

          {session.step === "chat_analysis_loading" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Анализ переписки</h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Модель читает материал и формулирует разбор…
              </p>
            </div>
          )}

          {session.step === "chat_analysis_result" && session.chatAnalysisResult.trim() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Разбор переписки</h1>
              <div className="max-h-[min(52vh,28rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-4">
                <div className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                  {stripClinicalMarkdown(session.chatAnalysisResult.trim())}
                </div>
              </div>
              <div className={assistantStickyBar}>
                <Button
                  type="button"
                  tone="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => dispatch({ type: "CHAT_ANALYSIS_BACK" })}
                >
                  Назад к итогам супервизии
                </Button>
              </div>
            </div>
          )}

          {session.step === "finished" && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Спасибо за работу</h1>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Когда будете готовы продолжить — я рядом.
              </p>
              {authUser && finishSaveStatus === "saving" && (
                <p className="text-sm leading-relaxed text-[color:var(--muted)]" aria-live="polite">
                  Сохраняем кейс в «Мои случаи»…
                </p>
              )}
              {authUser && finishSaveStatus === "success" && (
                <div className="rounded-xl border border-[color:color-mix(in srgb,var(--accent-green)40%,var(--border))] bg-[color:color-mix(in srgb,var(--accent-green)10%,white)] px-4 py-4">
                  <p className="text-sm font-medium text-[color:var(--text)]">
                    Кейс сохранён в «Мои случаи».
                  </p>
                  <div className="mt-3">
                    <ButtonLink href="/cases" tone="primary" className="w-full sm:w-auto">
                      Перейти в мои случаи
                    </ButtonLink>
                  </div>
                </div>
              )}
              {authUser && finishSaveStatus === "error" && (
                <div className="space-y-3">
                  <p className="rounded-xl border border-[color:color-mix(in srgb,var(--accent-sand)40%,var(--border))] bg-[color:color-mix(in srgb,var(--accent-sand)10%,white)] px-4 py-3 text-sm text-[color:var(--muted)]">
                    Не удалось сохранить кейс на сервере. Разбор остаётся в истории сессии в браузере — можно
                    повторить сохранение.
                  </p>
                  <Button
                    type="button"
                    tone="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => setFinishSaveRetryTick((t) => t + 1)}
                  >
                    Повторить сохранение
                  </Button>
                </div>
              )}
              {authUser && finishSaveStatus === "skipped" && session.remoteCaseId == null && (
                <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                  Кейс ещё не был привязан к аккаунту на сервере — сохранение в «Мои случаи» недоступно для
                  этой сессии.
                </p>
              )}
              {showFinishedPaywall && (
                <div className="space-y-5">
                  <p className="text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                    {PREMIUM_PAYWALL_LEAD}
                  </p>
                  <SupervisionTrustBlock />
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
              <div className={assistantStickyBar}>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={
                        caseStartBlocked ||
                        Boolean(authUser && finishSaveStatus === "saving")
                      }
                      onClick={() => dispatch({ type: "RESET" })}
                    >
                      Начать новый кейс
                    </Button>
                    <Button
                      type="button"
                      tone="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => void copySession()}
                    >
                      Скопировать сессию
                    </Button>
                  </div>
                  {sessionCopiedNotice ? (
                    <p
                      className="text-xs font-medium text-[color:color-mix(in srgb,var(--accent-green)72%,var(--text))]"
                      aria-live="polite"
                    >
                      Сессия скопирована.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
          </div>
        </Card>
      </Container>
    </main>
  );
}
