import Link from "next/link";

import { PsyAssistLogo } from "@/components/brand/PsyAssistLogo";
import { QaModeBadgeClient } from "@/components/qa/QaModeBadgeClient";
import { Container } from "@/components/ui/Container";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

export async function AppHeader() {
  const supabase = await createSupabaseServerClientOptional();
  let email: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  return (
    <header className="z-50 shrink-0 flex-none border-b border-[color:var(--border)] bg-[color:color-mix(in srgb,var(--bg) 92%,transparent)] backdrop-blur-md supports-[backdrop-filter]:bg-[color:color-mix(in srgb,var(--bg) 82%,transparent)]">
      <Container className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 max-md:flex-col max-md:items-stretch sm:py-3.5">
        <Link
          href="/"
          className="inline-flex min-w-0 max-md:w-full max-md:justify-start items-center gap-3 rounded-xl outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
        >
          <PsyAssistLogo variant="header" priority />
          <span className="text-base font-semibold tracking-[-0.02em] text-[color:var(--text)] sm:text-lg">
            PsyAssist
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          <QaModeBadgeClient />
          <nav className="flex max-md:-mx-1 max-md:flex-nowrap max-md:gap-x-1 max-md:gap-y-2 max-md:overflow-x-auto max-md:overscroll-x-contain max-md:px-1 max-md:pb-1 max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden flex-wrap items-center gap-x-2 gap-y-2 text-sm sm:gap-x-3 sm:overflow-visible sm:pb-0">
          <Link
            href="/assistant"
            className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--text)] sm:px-2.5 sm:py-1.5"
          >
            Ассистент
          </Link>
          <span className="hidden text-[color:color-mix(in srgb,var(--muted) 55%,transparent)] sm:inline" aria-hidden>
            ·
          </span>
          <Link
            href="/offer"
            className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:color-mix(in srgb,var(--muted) 92%,transparent)] transition hover:text-[color:var(--text)] sm:text-sm sm:px-2.5 sm:py-1.5"
          >
            Оферта
          </Link>
          <Link
            href="/privacy"
            className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:color-mix(in srgb,var(--muted) 92%,transparent)] transition hover:text-[color:var(--text)] sm:text-sm sm:px-2.5 sm:py-1.5"
          >
            Конфиденциальность
          </Link>
          <Link
            href="/contacts"
            className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2.5 py-1.5 text-[color:color-mix(in srgb,var(--muted) 92%,transparent)] transition hover:text-[color:var(--text)] sm:text-sm sm:px-2.5 sm:py-1.5"
          >
            Контакты
          </Link>
          <span className="hidden text-[color:color-mix(in srgb,var(--muted) 55%,transparent)] sm:inline" aria-hidden>
            ·
          </span>
          {email ? (
            <>
              <Link
                href="/dashboard"
                className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--text)] sm:px-2 sm:py-1.5"
              >
                Дашборд
              </Link>
              <Link
                href="/account"
                className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--text)] sm:px-2 sm:py-1.5"
              >
                Аккаунт
              </Link>
              <Link
                href="/logout"
                className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2 py-1.5 font-medium text-[color:var(--text)] transition hover:opacity-90 sm:px-2 sm:py-1.5"
              >
                Выйти
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2 py-1.5 text-[color:var(--muted)] transition hover:text-[color:var(--text)] sm:px-2 sm:py-1.5"
              >
                Вход
              </Link>
              <Link
                href="/signup"
                className="max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 rounded-lg px-2 py-1.5 font-medium text-[color:var(--text)] transition hover:opacity-90 sm:px-2 sm:py-1.5"
              >
                Регистрация
              </Link>
            </>
          )}
          </nav>
        </div>
      </Container>
    </header>
  );
}
