import Link from "next/link";

import { PsyAssistLogo } from "@/components/brand/PsyAssistLogo";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

const activationCards = [
  {
    title: "Супервизия случая",
    description:
      "Структурированный разбор истории, фокусов и гипотез в режиме живой супервизионной логики.",
    href: "/case",
    cta: "Открыть модуль",
    tone: "primary" as const
  },
  {
    title: "Поле между сессиями",
    description:
      "Сообщения, скриншоты, голосовые, скрытая динамика, границы и перенос вне кабинета.",
    href: "/chat-analysis",
    cta: "Открыть модуль",
    tone: "secondary" as const
  },
  {
    title: "Динамика терапии",
    description:
      "Картина изменений во времени: гипотезы, контракт терапии и тактические решения между встречами.",
    href: "/client",
    cta: "Открыть модуль",
    tone: "ghost" as const
  }
];

const secondaryLinks = [
  { href: "/content", label: "Контент" },
  { href: "/cases", label: "Мои случаи" },
  { href: "/phrase", label: "Терапевтические фразы" },
  { href: "/account", label: "Аккаунт" },
  { href: "/dashboard", label: "Дашборд" }
];

export default function HomePage() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <section aria-label="Главный блок" className="flex flex-col">
        <Container className="py-8 sm:py-11 md:py-16">
          <div className="flex flex-col items-center">
            <PsyAssistLogo
              variant="hero"
              priority
              className="!w-[132px] shrink-0 sm:!w-[176px] md:!w-[212px]"
            />

            <div className="mt-6 w-full max-w-[34rem] text-center sm:mt-8 md:mt-10">
              <p className="mx-auto flex max-w-lg flex-wrap justify-center gap-x-2 gap-y-1 text-xs leading-snug text-[color:var(--muted)] sm:text-[13px]">
                <span>Приватно</span>
                <span className="select-none opacity-40" aria-hidden>
                  ·
                </span>
                <span>Для практикующих специалистов</span>
                <span className="select-none opacity-40" aria-hidden>
                  ·
                </span>
                <span className="max-w-[17rem] text-center sm:max-w-none">Без замены живой супервизии</span>
              </p>

              <h1 className="mt-5 text-balance text-[1.375rem] font-semibold leading-snug tracking-[-0.03em] text-[color:var(--text)] sm:mt-6 sm:text-2xl sm:leading-snug md:text-3xl md:leading-[1.2] lg:text-[2rem] lg:leading-[1.22]">
                Когда после сессии вы понимаете, что что-то важное осталось между строк.
              </h1>

              <p className="mx-auto mt-5 max-w-[30rem] text-pretty text-[15px] leading-relaxed text-[color:var(--text)] sm:mt-6 sm:text-lg sm:leading-relaxed">
                PsyAssist помогает видеть динамику клиента, собственный контрперенос и поле терапии глубже.
              </p>
            </div>

            <div className="mt-10 flex w-full max-w-lg flex-col gap-3 sm:mt-12 md:mt-14 sm:max-w-xl sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4">
              <ButtonLink
                href="/case"
                tone="primary"
                className="min-h-[3rem] w-full shrink-0 px-5 py-3 text-center text-sm leading-snug sm:w-auto sm:min-w-[220px] sm:max-w-[320px]"
              >
                Начать супервизию случая
              </ButtonLink>
              <ButtonLink
                href="/chat-analysis"
                tone="secondary"
                className="min-h-[3rem] w-full shrink-0 px-5 py-3 text-center text-sm leading-snug sm:w-auto sm:min-w-[220px] sm:max-w-[320px]"
              >
                Поле между сессиями
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <Container className="pb-12 sm:pb-16 md:pb-24">
        <section aria-labelledby="activation-cards-heading" className="mt-10 sm:mt-12 md:mt-14">
          <h2
            id="activation-cards-heading"
            className="mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)] md:mb-8 md:text-left"
          >
            Клинические модули
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5 lg:gap-6 md:items-stretch">
            {activationCards.map((card) => (
              <Card key={card.title} className="flex h-full min-h-0 flex-col p-6 sm:p-7">
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    Модуль
                  </p>
                  <div className="min-h-0 flex-1 space-y-3">
                    <h3 className="text-lg font-semibold leading-snug tracking-[-0.02em] text-[color:var(--text)] sm:text-[1.125rem]">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[color:var(--muted)]">{card.description}</p>
                  </div>
                  <div className="mt-auto shrink-0 pt-2">
                    <ButtonLink href={card.href} tone={card.tone} className="w-full text-center leading-snug">
                      {card.cta}
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <footer className="mt-14 border-t border-[color:var(--border)] pt-10 sm:mt-16 md:mt-20">
          <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-[color:var(--muted)] sm:text-sm">
            Вы сохраняете профессиональную и этическую ответственность за клинические решения.
            PsyAssist помогает структурировать размышление и документирование — не диагностирует и не
            заменяет очную супервизию.
          </p>
          <nav aria-label="Дополнительные разделы" className="mt-8">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm">
              {secondaryLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[color:var(--muted)] underline-offset-4 transition hover:text-[color:var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </footer>
      </Container>
    </main>
  );
}
