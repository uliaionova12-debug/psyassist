import Link from "next/link";

import { PsyAssistLogo } from "@/components/brand/PsyAssistLogo";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

const activationCards = [
  {
    title: "🧠 Супервизия случая",
    description: "Глубокий клинический разбор реального кейса",
    href: "/case",
    cta: "Начать",
    tone: "primary" as const
  },
  {
    title: "📸 Разбор переписки",
    description: "Анализ сообщений, скриншотов и коммуникации",
    href: "/client",
    cta: "Загрузить",
    tone: "secondary" as const
  },
  {
    title: "📈 Динамика терапии",
    description: "Отслеживание изменений, гипотез и стратегии работы",
    href: "/client",
    cta: "Открыть",
    tone: "ghost" as const
  }
];

const secondaryLinks = [
  { href: "/content", label: "Контент" },
  { href: "/cases", label: "Мои случаи" },
  { href: "/phrase", label: "Терапевтические фразы" },
  { href: "/profile", label: "Профиль" }
];

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <Container className="py-8 sm:py-12 md:py-16">
        <section className="flex flex-col items-center text-center">
          <PsyAssistLogo
            variant="hero"
            priority
            className="!w-[118px] sm:!w-[154px] md:!w-[184px] lg:!w-[200px]"
          />

          <div className="mt-8 max-w-2xl space-y-5 sm:mt-10 sm:space-y-6 md:mt-11">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 75%, transparent)] px-3 py-1 text-xs text-[color:var(--muted)]">
              Приватно • Для практикующих специалистов • Без замены живой супервизии
            </div>

            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl md:text-[3rem] md:leading-[1.08]">
              PsyAssist
            </h1>
            <p className="text-lg font-medium tracking-[-0.02em] text-[color:var(--text)] sm:text-xl">
              AI-супервизор для психологов
            </p>
            <p className="text-sm leading-relaxed text-[color:var(--muted)] sm:text-base sm:leading-relaxed">
              Разбирайте клиентские случаи, проверяйте гипотезы, исследуйте перенос и контрперенос,
              находите интервенции и отслеживайте динамику терапии.
            </p>
          </div>

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:mt-12 sm:flex-row md:mt-14 sm:justify-center">
            <ButtonLink href="/case" tone="primary" className="w-full sm:w-auto sm:min-w-[220px]">
              🧠 Начать супервизию случая
            </ButtonLink>
            <ButtonLink href="/client" tone="secondary" className="w-full sm:w-auto sm:min-w-[220px]">
              Загрузить материалы клиента
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="activation-cards-heading" className="mt-12 sm:mt-14 md:mt-16">
          <h2 id="activation-cards-heading" className="sr-only">
            Быстрый старт
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {activationCards.map((card) => (
              <Card key={card.title} className="p-5 sm:p-6">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex flex-col gap-2 text-left">
                    <div className="text-lg font-semibold tracking-[-0.02em]">{card.title}</div>
                    <div className="text-sm leading-relaxed text-[color:var(--muted)]">
                      {card.description}
                    </div>
                  </div>
                  <div className="mt-auto">
                    <ButtonLink href={card.href} tone={card.tone} className="w-full">
                      {card.cta}
                    </ButtonLink>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-[color:var(--border)] pt-8 sm:mt-14 md:mt-16">
          <p className="text-center text-xs leading-relaxed text-[color:var(--muted)] sm:text-sm">
            Вы сохраняете профессиональную и этическую ответственность за клинические решения.
            PsyAssist помогает структурировать размышление и документирование — не диагностирует и не
            заменяет очную супервизию.
          </p>
          <nav aria-label="Дополнительные разделы" className="mt-6">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
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
