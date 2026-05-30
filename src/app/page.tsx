import Image from "next/image";
import Link from "next/link";

import { PsyAssistLogo } from "@/components/brand/PsyAssistLogo";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

// ─── data ─────────────────────────────────────────────────────────────────────

const navLinks = [
  { href: "#for-whom", label: "Для кого" },
  { href: "#how-it-works", label: "Как работает" },
  { href: "#modules", label: "Модули" },
  { href: "#pricing", label: "Тарифы" },
];

const painPoints = [
  {
    emoji: "🌙",
    title: "После трудной сессии — в 23:00",
    body: "Клиент ушёл, но случай остался с вами. Следующая супервизия — через неделю. А разобраться нужно сейчас, пока свежо.",
  },
  {
    emoji: "🔍",
    title: "Что-то происходит в поле — но что?",
    body: "Вы замечаете: что-то сдвинулось в контакте. Перенос? Контрперенос? Или снова ваша личная история выходит на поверхность?",
  },
  {
    emoji: "📱",
    title: "Клиент написал в 2 ночи",
    body: "Длинное, тревожное сообщение. Тест на доступность? Реальный кризис? Манипуляция? Как ответить — и надо ли сейчас?",
  },
];

const audiences = [
  { icon: "🪑", title: "Частная практика", body: "Когда супервизор раз в месяц, а сложный случай — прямо сейчас" },
  { icon: "🧩", title: "Сложные кейсы", body: "Нарциссические структуры, суицидальный риск, эротический контрперенос — требует точности" },
  { icon: "📋", title: "Супервизоры и тренеры", body: "Структурировать наблюдения перед групповой или индивидуальной работой" },
  { icon: "🔒", title: "Строгая конфиденциальность", body: "Имена клиентов не нужны. Данные не хранятся и не обучают модели" },
];

const steps = [
  { num: "01", title: "Опишите случай своими словами", body: "Без шаблонов и форм. PsyAssist задаёт уточняющие вопросы — как живой супервизор на первой встрече." },
  { num: "02", title: "Идёте через клиническую логику", body: "Фокус, запрос, динамика поля, контрперенос. Система не даёт советов — помогает вам думать структурированно." },
  { num: "03", title: "Получаете разбор на вашем кейсе", body: "Рабочие гипотезы, направления работы, интеграционная рефлексия — всё анкеровано на вашем конкретном случае." },
];

const modules = [
  { tag: "Модуль 1", title: "Супервизия случая", scenario: "Есть клиент, который не выходит из головы.", description: "Структурированный клинический разбор: от нарратива до рабочей гипотезы. Как живая супервизия — но в любое время суток.", href: "/case", tone: "primary" as const },
  { tag: "Модуль 2", title: "Поле между сессиями", scenario: "Клиент написал странное сообщение.", description: "Анализ переписки, голосовых, скриншотов. Что за этим стоит: тест на доступность, тревога привязанности, манипуляция?", href: "/chat-analysis", tone: "secondary" as const },
  { tag: "Модуль 3", title: "Динамика терапии", scenario: "Чувствуете, что что-то изменилось в процессе.", description: "Картина изменений во времени: гипотезы, разрывы альянса, ремонт, тактические решения между встречами.", href: "/client", tone: "ghost" as const },
];

const testimonials = [
  { quote: "Разбирала кейс с нарциссическим клиентом. Система сразу вышла на финансовый контрперенос — я о нём даже не думала. Вернулась к этому на следующей сессии.", name: "Анна К.", title: "Гештальт-терапевт, 9 лет практики" },
  { quote: "Работаю в частной практике, супервизор раз в месяц. PsyAssist стал пространством, где я думаю между встречами. Не даёт готовых ответов — и это правильно.", name: "Марина Р.", title: "Психоаналитический психотерапевт" },
  { quote: "Пришла с послеродовым кейсом. Система поставила safety before depth ещё на первом шаге — именно это я и хотела проверить у себя.", name: "Светлана В.", title: "КПТ-терапевт, перинатальная специализация" },
];

const pricingPlans = [
  { name: "Стартовый", price: "Бесплатно", period: "", description: "Чтобы попробовать и убедиться", features: ["3 супервизии в месяц", "Все три модуля", "Полный клинический разбор", "Без кредитной карты"], cta: "Начать бесплатно", href: "/case", primary: false },
  { name: "Профессиональный", price: "600 ₽", period: "/ месяц", description: "Для постоянной клинической практики", features: ["Неограниченные супервизии", "Библиотека разобранных кейсов", "Экспорт гипотез и заметок", "Все обновления первым"], cta: "Попробовать 7 дней бесплатно", href: "/case", primary: true },
];

const faqs = [
  { q: "PsyAssist заменяет живую супервизию?", a: "Нет — и мы говорим об этом прямо. PsyAssist помогает думать структурированно между супервизиями, а не вместо них. Этические и клинические решения всегда остаются за вами." },
  { q: "Данные о клиентах защищены?", a: "Вам не нужно вводить имена клиентов. Платформа работает с клиническими описаниями. Данные не передаются третьим лицам и не используются для обучения AI-моделей." },
  { q: "Кто стоит за клинической логикой?", a: "PsyAssist создан практикующим клиническим психологом и аккредитованным супервизором. Вся логика основана на реальных клинических сценариях — не на шаблонах из учебников." },
  { q: "Для какого модального подхода подходит?", a: "Для любого — гештальт, психоанализ, КПТ, системный, нарративный. Вы указываете свой метод при работе с кейсом, система адаптирует язык супервизии." },
];

const legalLinks = [
  { href: "/offer", label: "Договор-оферта" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/contacts", label: "Контакты" },
  { href: "/documents", label: "Документы супервизора" },
];

// ─── page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* ═══ NAV ═══ */}
      <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 backdrop-blur-md">
        <Container className="flex items-center justify-between py-3 sm:py-3.5">
          <div className="flex items-center gap-3">
            <PsyAssistLogo variant="header" className="!h-9 !w-9 sm:!h-10 sm:!w-10" />
            <span className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--text)]">PsyAssist</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-[color:var(--muted)] transition hover:text-[color:var(--text)]">{l.label}</a>
            ))}
          </nav>
          <ButtonLink href="/case" tone="primary" className="px-4 py-2 text-sm">Попробовать →</ButtonLink>
        </Container>
      </header>

      <main>

        {/* ═══ HERO ═══ */}
        <section aria-label="Главный блок" className="overflow-hidden">
          <Container className="py-14 sm:py-20 md:py-24">
            <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:gap-12 lg:gap-20">

              {/* — text — */}
              <div className="flex-1 text-center md:text-left">
                <p className="anim-fade-up text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]" style={{ animationDelay: "0ms" }}>
                  Супервизия для психологов, психотерапевтов и коучей
                </p>
                <h1 className="anim-fade-up mt-4 text-balance text-[1.75rem] font-semibold leading-[1.17] tracking-[-0.035em] text-[color:var(--text)] sm:text-4xl md:text-[2.5rem] lg:text-[2.875rem]" style={{ animationDelay: "100ms" }}>
                  Есть клиент, который не выходит у вас из головы?
                </h1>
                <p className="anim-fade-up mt-3 text-xl font-medium tracking-[-0.02em] text-[color:var(--accent-sand)] sm:text-2xl" style={{ animationDelay: "200ms" }}>
                  Терапия идёт. Ясность — нет.
                </p>
                <p className="anim-fade-up mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-[color:var(--muted)] sm:text-[17px] md:mx-0" style={{ animationDelay: "300ms" }}>
                  PsyAssist помогает структурировать клинический разбор, увидеть контрперенос и поле терапии — приватно, без записи, прямо сейчас.
                </p>
                <div className="anim-fade-up mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start" style={{ animationDelay: "400ms" }}>
                  <ButtonLink href="/case" tone="primary" className="w-full px-6 py-3 text-base sm:w-auto">
                    Попробовать бесплатно →
                  </ButtonLink>
                  <a href="#how-it-works" className="text-sm text-[color:var(--muted)] underline underline-offset-4 transition hover:text-[color:var(--text)]">
                    Смотреть как работает ↓
                  </a>
                </div>
                <div className="anim-fade-up mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[color:var(--muted)] md:justify-start" style={{ animationDelay: "500ms" }}>
                  <span>✓ Приватно</span>
                  <span>✓ Для практикующих специалистов</span>
                  <span>✓ Без замены живой супервизии</span>
                </div>
              </div>

              {/* — photo — */}
              <div className="anim-slide-right relative w-full max-w-[300px] shrink-0 md:max-w-[360px] lg:max-w-[400px]" style={{ animationDelay: "150ms" }}>
                <div className="photo-hover relative aspect-[3/4] overflow-hidden rounded-3xl shadow-xl">
                  <Image
                    src="/photos/yulia-closeup.jpg"
                    alt="Юлия Ионова — клинический психолог, аккредитованный супервизор"
                    fill
                    className="anim-ken-burns object-cover object-top"
                    priority
                    sizes="(max-width: 768px) 300px, 400px"
                  />
                </div>
                {/* floating badge */}
                <div className="anim-float-card absolute -bottom-4 -left-4 rounded-2xl bg-white px-4 py-3 shadow-lg">
                  <p className="text-xs font-semibold text-[color:var(--text)]">13 клинических сценариев</p>
                  <p className="text-[11px] text-[color:var(--muted)]">на основе реальной практики</p>
                </div>
              </div>

            </div>
          </Container>
        </section>

        {/* ═══ TRUST BAR ═══ */}
        <section aria-label="Статистика" className="border-y border-[color:var(--border)] bg-white">
          <Container className="py-6">
            <div className="flex flex-wrap items-center justify-center gap-8 text-center sm:gap-12 md:gap-16">
              {[
                { val: "13+", label: "клинических сценариев" },
                { val: "3", label: "клинических модуля" },
                { val: "Gemini + GPT", label: "клинический AI-слой" },
                { val: "0", label: "имён клиентов не нужно" },
              ].map(({ val, label }, i) => (
                <AnimateIn key={label} delay={i * 80}>
                  <p className="anim-pulse-soft text-xl font-semibold text-[color:var(--accent-sand)] sm:text-2xl">{val}</p>
                  <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">{label}</p>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ PAIN POINTS ═══ */}
        <section aria-label="Ситуации" className="py-16 sm:py-20 md:py-24">
          <Container>
            <AnimateIn>
              <h2 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">
                Вы узнаёте эти ситуации?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-base text-[color:var(--muted)]">Именно для них и создан PsyAssist.</p>
            </AnimateIn>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {painPoints.map((p, i) => (
                <AnimateIn key={p.title} delay={i * 100}>
                  <Card className="h-full p-6 sm:p-7 transition-shadow duration-300 hover:shadow-[0_4px_24px_rgba(31,35,40,0.12)]">
                    <div className="mb-4 text-3xl">{p.emoji}</div>
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-[color:var(--text)]">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{p.body}</p>
                  </Card>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ FACE STRIP — 3 портрета ═══ */}
        <section aria-label="Фото" className="overflow-hidden bg-white py-12 sm:py-14">
          <Container>
            <div className="grid grid-cols-3 gap-3 sm:gap-5 md:gap-6">
              {[
                { src: "/photos/yulia-standing.jpg",  alt: "Юлия Ионова — психолог",      delay: 0   },
                { src: "/photos/yulia-closeup.jpg",   alt: "Юлия Ионова — взгляд",        delay: 100 },
                { src: "/photos/yulia-light.jpg",     alt: "Юлия Ионова — улыбка",        delay: 200 },
              ].map(({ src, alt, delay }) => (
                <AnimateIn key={src} delay={delay} className="h-full">
                  <div className="photo-hover relative aspect-[3/4] overflow-hidden rounded-2xl sm:rounded-3xl">
                    <Image src={src} alt={alt} fill className="object-cover object-top" sizes="(max-width: 640px) 33vw, 400px" />
                  </div>
                </AnimateIn>
              ))}
            </div>
            <AnimateIn delay={100}>
              <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
                Юлия Ионова — клинический психолог, аккредитованный супервизор, автор PsyAssist
              </p>
            </AnimateIn>
          </Container>
        </section>

        {/* ═══ FOR WHOM ═══ */}
        <section id="for-whom" aria-label="Для кого" className="py-16 sm:py-20 md:py-24">
          <Container>
            <AnimateIn>
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">Для кого PsyAssist</p>
              <h2 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">Для практикующих специалистов</h2>
            </AnimateIn>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map((a, i) => (
                <AnimateIn key={a.title} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                    <div className="mb-3 text-2xl">{a.icon}</div>
                    <h3 className="text-sm font-semibold text-[color:var(--text)]">{a.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted)]">{a.body}</p>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ QUOTE / CASE TEASER ═══ */}
        <section aria-label="Пример кейса" className="bg-white py-16 sm:py-20 md:py-24">
          <Container>
            <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:gap-16">
              <AnimateIn className="w-full max-w-[280px] shrink-0 md:max-w-[320px]">
                <div className="photo-hover relative aspect-[3/4] overflow-hidden rounded-3xl shadow-xl">
                  <Image
                    src="/photos/yulia-elegant.jpg"
                    alt="Юлия Ионова — клинический психолог"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 280px, 320px"
                  />
                </div>
              </AnimateIn>
              <div className="flex-1">
                <AnimateIn delay={100}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">Реальный кейс из практики</p>
                  <blockquote className="mt-4 text-2xl font-semibold leading-[1.3] tracking-[-0.03em] text-[color:var(--text)] sm:text-3xl">
                    «А где же его агрессия?»
                  </blockquote>
                  <p className="mt-5 max-w-lg text-base leading-relaxed text-[color:var(--muted)]">
                    Клиент — интеллектуальный, успешный, стабильный. Год работы. Приносит инсайты каждую сессию. Но ни разу не злился, не плакал, не терял контроль. Это прогресс — или sophisticated bypass?
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-[color:var(--muted)]">
                    Именно такие случаи — с внешне успешной динамикой и скрытым псевдо-инсайтом — PsyAssist разбирает особенно точно.
                  </p>
                  <ButtonLink href="/case" tone="primary" className="mt-6 px-5 py-2.5">Попробовать разобрать кейс →</ButtonLink>
                </AnimateIn>
              </div>
            </div>
          </Container>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how-it-works" aria-label="Как работает" className="py-16 sm:py-20 md:py-24">
          <Container>
            <AnimateIn>
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">Как работает</p>
              <h2 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">Как работает AI-супервизия</h2>
            </AnimateIn>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <AnimateIn key={s.num} delay={i * 120}>
                  <p className="text-[2.5rem] font-bold leading-none tracking-[-0.05em] text-[color:var(--accent-sand)]">{s.num}</p>
                  <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-[color:var(--text)]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{s.body}</p>
                </AnimateIn>
              ))}
            </div>

            {/* floating phone screenshots */}
            <div className="mt-14 flex flex-wrap items-end justify-center gap-6">
              {[
                { src: "/screenshots/app-main.png",    alt: "PsyAssist — меню",    label: "Главное меню",    floatDelay: "0s"    },
                { src: "/screenshots/app-billing.png", alt: "PsyAssist — тарифы",  label: "Баланс и тарифы", floatDelay: "0.8s"  },
              ].map(({ src, alt, label, floatDelay }) => (
                <AnimateIn key={label}>
                  <div className="flex flex-col items-center gap-3" style={{ animation: `float 3.5s ease-in-out ${floatDelay} infinite` }}>
                    <div className="relative h-[500px] w-[245px] overflow-hidden rounded-[2.25rem] border-[3px] border-[color:var(--text)] shadow-2xl">
                      <Image src={src} alt={alt} fill className="object-cover object-top" sizes="245px" />
                    </div>
                    <p className="text-xs text-[color:var(--muted)]">{label}</p>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ ABOUT CREATOR ═══ */}
        <section aria-label="Об авторе" className="bg-white py-16 sm:py-20 md:py-24">
          <Container>
            <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:gap-16">
              <AnimateIn className="w-full max-w-[300px] shrink-0 md:max-w-[340px]">
                <div className="photo-hover relative aspect-[3/4] overflow-hidden rounded-3xl shadow-xl">
                  <Image
                    src="/photos/yulia-psychologist.jpg"
                    alt="Юлия Ионова — автор PsyAssist"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 300px, 340px"
                  />
                </div>
              </AnimateIn>
              <div className="flex-1">
                <AnimateIn delay={150}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">Создано специалистом</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">Не разработчиком. Психологом.</h2>
                  <p className="mt-5 text-base leading-relaxed text-[color:var(--muted)]">
                    Я создала PsyAssist потому, что как практикующий специалист знаю это изнутри — когда после сессии остаётся ощущение, что что-то важное осталось незамеченным, а следующая супервизия через две недели.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      "Клинический психолог, специализация — психотравма и зависимые отношения",
                      "Аккредитованный супервизор — диплом и сертификат в открытом доступе",
                      "Обучение психологов: перенос, контрперенос, работа с полем",
                      "Вся клиническая логика PsyAssist основана на реальных случаях практики",
                    ].map((c) => (
                      <div key={c} className="flex items-start gap-2.5">
                        <span className="mt-[3px] shrink-0 text-sm text-[color:var(--accent-sand)]">✓</span>
                        <p className="text-sm leading-relaxed text-[color:var(--muted)]">{c}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 border-t border-[color:var(--border)] pt-5">
                    <p className="text-sm font-semibold text-[color:var(--text)]">Юлия Ионова</p>
                    <p className="text-sm text-[color:var(--muted)]">Клинический психолог · Аккредитованный супервизор</p>
                  </div>
                </AnimateIn>
              </div>
            </div>
          </Container>
        </section>

        {/* ═══ MODULES ═══ */}
        <section id="modules" aria-label="Модули" className="py-16 sm:py-20 md:py-24">
          <Container>
            <AnimateIn>
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">Клинические модули</p>
              <h2 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">Три инструмента для реальной практики</h2>
            </AnimateIn>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {modules.map((m, i) => (
                <AnimateIn key={m.title} delay={i * 100}>
                  <Card className="flex h-full flex-col p-6 sm:p-7 transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(31,35,40,0.12)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">{m.tag}</p>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[color:var(--text)]">{m.title}</h3>
                    <p className="mt-2 text-sm font-medium italic text-[color:var(--accent-sand)]">{m.scenario}</p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[color:var(--muted)]">{m.description}</p>
                    <ButtonLink href={m.href} tone={m.tone} className="mt-5 w-full text-center">Открыть модуль</ButtonLink>
                  </Card>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ TESTIMONIALS ═══ */}
        <section aria-label="Отзывы" className="bg-white py-16 sm:py-20 md:py-24">
          <Container>
            <AnimateIn>
              <h2 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">Что говорят коллеги</h2>
            </AnimateIn>
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <AnimateIn key={t.name} delay={i * 100}>
                  <Card className="flex h-full flex-col p-6 sm:p-7">
                    <p className="flex-1 text-sm leading-relaxed text-[color:var(--text)]">«{t.quote}»</p>
                    <div className="mt-5 border-t border-[color:var(--border)] pt-4">
                      <p className="text-sm font-semibold text-[color:var(--text)]">{t.name}</p>
                      <p className="text-xs text-[color:var(--muted)]">{t.title}</p>
                    </div>
                  </Card>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ PRICING ═══ */}
        <section id="pricing" aria-label="Тарифы" className="py-16 sm:py-20 md:py-24">
          <Container>
            <AnimateIn>
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">Тарифы</p>
              <h2 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">Начните бесплатно</h2>
              <p className="mx-auto mt-3 max-w-sm text-center text-base text-[color:var(--muted)]">Попробуйте с реальным кейсом — без карты и без обязательств.</p>
            </AnimateIn>
            <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
              {pricingPlans.map((plan, i) => (
                <AnimateIn key={plan.name} delay={i * 120}>
                  <div className={`h-full rounded-2xl p-6 sm:p-8 transition-transform duration-300 hover:-translate-y-1 ${plan.primary ? "bg-[color:var(--accent-green)]" : "border border-[color:var(--border)] bg-[color:var(--bg)]"}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${plan.primary ? "text-white/60" : "text-[color:var(--muted)]"}`}>{plan.name}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className={`text-3xl font-semibold tracking-[-0.03em] ${plan.primary ? "text-white" : "text-[color:var(--text)]"}`}>{plan.price}</span>
                      {plan.period && <span className={`text-sm ${plan.primary ? "text-white/60" : "text-[color:var(--muted)]"}`}>{plan.period}</span>}
                    </div>
                    <p className={`mt-1 text-sm ${plan.primary ? "text-white/70" : "text-[color:var(--muted)]"}`}>{plan.description}</p>
                    <ul className="mt-5 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className={`flex items-start gap-2 text-sm ${plan.primary ? "text-white/90" : "text-[color:var(--muted)]"}`}>
                          <span className={`mt-[2px] shrink-0 ${plan.primary ? "text-white" : "text-[color:var(--accent-sand)]"}`}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <ButtonLink href={plan.href} tone={plan.primary ? "ghost" : "primary"} className={`w-full text-center ${plan.primary ? "border border-white/30 text-white hover:bg-white/10" : ""}`}>
                        {plan.cta}
                      </ButtonLink>
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ FAQ ═══ */}
        <section aria-label="Частые вопросы" className="bg-white py-16 sm:py-20 md:py-24">
          <Container>
            <AnimateIn>
              <h2 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)] sm:text-[1.875rem]">Частые вопросы</h2>
            </AnimateIn>
            <div className="mx-auto mt-10 max-w-2xl divide-y divide-[color:var(--border)]">
              {faqs.map((f, i) => (
                <AnimateIn key={f.q} delay={i * 60}>
                  <div className="py-5">
                    <p className="text-base font-semibold tracking-[-0.02em] text-[color:var(--text)]">{f.q}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-[color:var(--muted)]">{f.a}</p>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </Container>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section aria-label="Попробовать" className="overflow-hidden bg-[color:var(--accent-green)] py-16 sm:py-20">
          <Container>
            <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:gap-16">
              <AnimateIn className="w-full max-w-[240px] shrink-0 md:max-w-[280px]">
                <div className="photo-hover relative aspect-[3/4] overflow-hidden rounded-3xl shadow-2xl">
                  <Image
                    src="/photos/yulia-light.jpg"
                    alt="Юлия Ионова — PsyAssist"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 240px, 280px"
                  />
                </div>
              </AnimateIn>
              <AnimateIn delay={150} className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-semibold leading-snug tracking-[-0.03em] text-white sm:text-3xl md:text-4xl">
                  Разберём ваш случай прямо сейчас
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
                  Без регистрации, без карты. Просто опишите случай — и пройдите полный клинический разбор. Бесплатно.
                </p>
                <ButtonLink href="/case" tone="primary" className="mt-8 px-7 py-3.5 text-base">
                  Начать супервизию →
                </ButtonLink>
              </AnimateIn>
            </div>
          </Container>
        </section>

        {/* ═══ ETHICS ═══ */}
        <section aria-label="Этика" className="py-10 sm:py-12">
          <Container>
            <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-[color:var(--muted)]">
              Вы сохраняете профессиональную и этическую ответственность за клинические решения. PsyAssist помогает структурировать размышление — не диагностирует и не заменяет очную супервизию. Имена клиентов не требуются. Данные не передаются третьим лицам.
            </p>
          </Container>
        </section>

      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[color:var(--border)] py-10">
        <Container>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <PsyAssistLogo variant="header" className="!h-8 !w-8" />
              <span className="text-sm font-semibold text-[color:var(--text)]">PsyAssist</span>
            </div>
            <nav aria-label="Правовая информация">
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                {legalLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[color:var(--muted)] transition hover:text-[color:var(--text)]">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </Container>
      </footer>

    </div>
  );
}
