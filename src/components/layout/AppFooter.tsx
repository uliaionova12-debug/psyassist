import Link from "next/link";

import { Container } from "@/components/ui/Container";

export function AppFooter() {
  return (
    <footer className="relative z-10 mt-auto shrink-0 flex-none border-t border-[color:var(--border)] bg-[color:color-mix(in srgb,var(--bg) 96%,transparent)] backdrop-blur-[2px]">
      <Container className="py-8 pb-[max(2rem,env(safe-area-inset-bottom)+1.25rem)] sm:py-10 sm:pb-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <div className="max-w-md shrink-0 space-y-2">
            <p className="text-sm font-semibold text-[color:var(--text)]">PsyAssist</p>
            <p className="text-xs leading-relaxed text-[color:var(--muted)]">
              Цифровой аналитический сервис профессиональной супервизионной поддержки для психологов и
              специалистов помогающих профессий. Не является медицинской услугой и не заменяет
              очную супервизию или иную профессиональную ответственность специалиста.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:flex sm:max-w-xl sm:flex-wrap sm:justify-end sm:gap-x-10 sm:gap-y-3">
            <Link
              href="/offer"
              className="text-[color:var(--muted)] underline-offset-2 transition hover:text-[color:var(--text)] hover:underline"
            >
              Договор-оферта
            </Link>
            <Link
              href="/privacy"
              className="text-[color:var(--muted)] underline-offset-2 transition hover:text-[color:var(--text)] hover:underline"
            >
              Конфиденциальность
            </Link>
            <Link
              href="/contacts"
              className="text-[color:var(--muted)] underline-offset-2 transition hover:text-[color:var(--text)] hover:underline"
            >
              Контакты
            </Link>
            <Link
              href="/documents"
              className="text-[color:var(--muted)] underline-offset-2 transition hover:text-[color:var(--text)] hover:underline"
            >
              Документы супервизора
            </Link>
          </nav>
        </div>
        <p className="mt-8 border-t border-[color:var(--border)] pt-6 text-xs text-[color:color-mix(in srgb,var(--muted) 85%,transparent)]">
          © {new Date().getFullYear()} PsyAssist. Информация на сайте не является медицинской
          рекомендацией или диагнозом.
        </p>
      </Container>
    </footer>
  );
}
