"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GuardedCaseFeatureLink } from "@/components/auth/GuardedCaseFeatureLink";
import { PsyAssistLogo } from "@/components/brand/PsyAssistLogo";
import { QaModeBadgeClient } from "@/components/qa/QaModeBadgeClient";
import { Container } from "@/components/ui/Container";
import { profileDisplayName } from "@/lib/user/profile";
import { createSupabaseBrowserClientOptional } from "@/lib/supabase/browser-optional";

function labelInitial(label: string): string {
  const ch = label.trim().charAt(0);
  return ch ? ch.toLocaleUpperCase("ru-RU") : "?";
}

type Props = {
  initialEmail: string | null;
  initialName: string | null;
};

export function AppHeaderClient({ initialEmail, initialName }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [displayName, setDisplayName] = useState(() =>
    initialEmail ? profileDisplayName(initialName, initialEmail) : null
  );
  const [profilePending, setProfilePending] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
    setDisplayName(initialEmail ? profileDisplayName(initialName, initialEmail) : null);
    setProfilePending(false);
  }, [initialEmail, initialName]);

  useEffect(() => {
    const client = createSupabaseBrowserClientOptional();
    if (!client) return;

    void client.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });

    const { data } = client.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!email) {
      setDisplayName(null);
      setProfilePending(false);
      return;
    }

    let cancelled = false;
    const hasLabel = Boolean(profileDisplayName(initialName, email));
    if (!hasLabel) setProfilePending(true);

    void fetch("/api/user/profile", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data: { ok?: boolean; profile?: { name?: string | null } }) => {
        if (cancelled) return;
        const name = data?.ok && data.profile ? data.profile.name : initialName;
        setDisplayName(profileDisplayName(name, email));
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayName(profileDisplayName(initialName, email));
        }
      })
      .finally(() => {
        if (!cancelled) setProfilePending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, initialName]);

  const loggedIn = Boolean(email);
  const accountLabel = displayName ?? "Аккаунт";

  return (
    <header className="sticky top-0 z-50 shrink-0 flex-none border-b border-[color:var(--border)] bg-[color:color-mix(in srgb,var(--bg) 92%,transparent)] backdrop-blur-md supports-[backdrop-filter]:bg-[color:color-mix(in srgb,var(--bg) 82%,transparent)] md:static md:top-auto">
      <Container className="py-3 md:py-3.5">
        {/* Row 1: logo + primary auth — never scrolls, never wraps (mobile); desktop unchanged */}
        <div className="flex min-h-[3.25rem] flex-nowrap items-center justify-between gap-2 md:min-h-0 md:gap-3">
          <div className="min-w-0 flex-1 md:flex-none">
            <Link
              href="/"
              className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb,var(--accent-sand) 55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] md:gap-3"
            >
              <PsyAssistLogo variant="header" priority />
              <span className="min-w-0 truncate text-base font-semibold tracking-[-0.02em] text-[color:var(--text)] md:text-lg">
                PsyAssist
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5 md:gap-2">
            <QaModeBadgeClient />
            {loggedIn ? (
              <Link
                href="/account"
                className="inline-flex max-w-none shrink-0 items-center gap-1.5 rounded-xl border border-[color:color-mix(in srgb,var(--border) 70%,transparent)] bg-[color:color-mix(in srgb,white 72%,transparent)] px-2.5 py-2 text-sm font-medium text-[color:var(--text)] shadow-sm transition hover:border-[color:color-mix(in srgb,var(--accent-sand) 28%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb,var(--accent-sand) 55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] md:gap-2 md:px-3.5"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in srgb,var(--accent-sand) 35%,white)] text-xs font-semibold text-[color:var(--text)]"
                  aria-hidden
                >
                  {displayName ? labelInitial(displayName) : email ? labelInitial(email) : "•"}
                </span>
                <span className="tracking-[-0.02em] max-md:min-w-0 max-md:truncate max-md:whitespace-nowrap">
                  {profilePending ? (
                    <span
                      className="inline-block h-4 w-[4.5rem] animate-pulse rounded-md bg-[color:color-mix(in srgb,var(--muted) 28%,transparent)]"
                      aria-hidden
                    />
                  ) : (
                    accountLabel
                  )}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[color:var(--accent-sand)] px-3 py-2.5 text-sm font-medium tracking-[-0.01em] text-[color:var(--text)] transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb,var(--accent-sand) 55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] active:brightness-[0.96] md:px-4"
              >
                Войти
              </Link>
            )}
          </div>
        </div>

        {/* Row 2: horizontal nav; overflow-x only on inner strip (mobile) */}
        <nav
          className="mt-3 border-t border-[color:color-mix(in srgb,var(--border) 55%,transparent)] pt-3 text-sm md:mt-3.5 md:border-0 md:pt-0"
          aria-label="Основная навигация"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 max-md:-mx-1 max-md:flex-nowrap max-md:gap-x-1 max-md:overflow-x-auto max-md:overscroll-x-contain max-md:px-1 max-md:pb-0.5 max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:gap-x-3 md:overflow-visible">
            <Link
              href="/assistant"
              className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--text)] md:px-2.5 md:py-1.5"
            >
              Ассистент
            </Link>
            <span className="hidden text-[color:color-mix(in srgb,var(--muted) 55%,transparent)] md:inline" aria-hidden>
              ·
            </span>
            <GuardedCaseFeatureLink
              href="/cases"
              className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--text)] md:px-2.5 md:py-1.5"
            >
              Мои случаи
            </GuardedCaseFeatureLink>
            <span className="hidden text-[color:color-mix(in srgb,var(--muted) 55%,transparent)] md:inline" aria-hidden>
              ·
            </span>
            <GuardedCaseFeatureLink
              href="/dashboard"
              className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--text)] md:px-2.5 md:py-1.5"
            >
              История кейсов
            </GuardedCaseFeatureLink>
            <span className="hidden text-[color:color-mix(in srgb,var(--muted) 55%,transparent)] md:inline" aria-hidden>
              ·
            </span>
            <Link
              href="/offer"
              className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:color-mix(in srgb,var(--muted) 92%,transparent)] transition hover:text-[color:var(--text)] md:text-sm md:px-2.5 md:py-1.5"
            >
              Оферта
            </Link>
            <Link
              href="/privacy"
              className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:color-mix(in srgb,var(--muted) 92%,transparent)] transition hover:text-[color:var(--text)] md:text-sm md:px-2.5 md:py-1.5"
            >
              Конфиденциальность
            </Link>
            <Link
              href="/contacts"
              className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:color-mix(in srgb,var(--muted) 92%,transparent)] transition hover:text-[color:var(--text)] md:text-sm md:px-2.5 md:py-1.5"
            >
              Контакты
            </Link>
            <span className="hidden text-[color:color-mix(in srgb,var(--muted) 55%,transparent)] md:inline" aria-hidden>
              ·
            </span>
            {loggedIn ? (
              <Link
                href="/logout"
                className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2 py-1.5 font-medium text-[color:var(--text)] transition hover:opacity-90 md:px-2 md:py-1.5"
              >
                Выйти
              </Link>
            ) : (
              <Link
                href="/signup"
                className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2 py-1.5 font-medium text-[color:var(--text)] transition hover:opacity-90 md:px-2 md:py-1.5"
              >
                Регистрация
              </Link>
            )}
          </div>
        </nav>
      </Container>
    </header>
  );
}
