import type { Metadata } from "next";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

import { SupervisionRequestForm } from "@/app/documents/SupervisionRequestForm";

export const metadata: Metadata = {
  title: "Документы и супервизия — PsyAssist",
  description:
    "Документы супервизора, программа сертификации PsyAssist и заявка на личную online-супервизию",
};

const docPlaceholder =
  "inline-flex max-w-full min-w-0 items-center justify-center break-all rounded-lg border border-dashed border-[color:color-mix(in srgb,var(--muted) 45%,var(--border))] px-3 py-2 text-center font-mono text-xs text-[color:var(--muted)] sm:justify-start sm:text-left";

export default function DocumentsPage() {
  return (
    <main className="flex min-w-0 w-full flex-1 flex-col">
      <Container className="max-w-3xl pb-24 pt-10 sm:pt-14 md:pb-32">
        <header className="mb-10 space-y-3">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
            Документы и супервизионный маршрут
          </h1>
          <p className="text-sm leading-relaxed text-[color:var(--muted)]">
            Раздел для профессионального доверия к сервису: подтверждение квалификации супервизора,
            правила сертификации PsyAssist и возможность записаться на живую online-супервизию.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--text)]">
            1. Документы супервизора
          </h2>
          <Card className="space-y-4 p-6">
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">
              Ниже — плейсхолдеры для загрузки сканов и файлов. После размещения реальных материалов
              ссылки заменятся на актуальные документы; регистрационные номера не указываются до
              публикации верифицированных данных.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[color:var(--text)]">Аккредитация / статус в профессиональных реестрах</span>
                <span className={docPlaceholder}>[PDF — аккредитация]</span>
              </li>
              <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[color:var(--text)]">Свидетельства об образовании и повышении квалификации</span>
                <span className={docPlaceholder}>[PDF — свидетельства]</span>
              </li>
              <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[color:var(--text)]">Сертификаты программ супервизии и смежных направлений</span>
                <span className={docPlaceholder}>[PDF — сертификаты]</span>
              </li>
              <li className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-[color:var(--text)]">Правила сертификации PsyAssist</span>
                <span className={docPlaceholder}>[PDF — правила сертификации PsyAssist]</span>
              </li>
            </ul>
          </Card>
        </section>

        <section className="mt-12 space-y-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--text)]">
            2. Супервизионный маршрут PsyAssist
          </h2>
          <Card className="p-6">
            <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-[color:var(--muted)]">
              <li>
                <strong className="text-[color:var(--text)]">10 часов</strong> активной супервизионной работы в
                экосистеме PsyAssist (учёт по правилам программы на момент прохождения).
              </li>
              <li>
                <strong className="text-[color:var(--text)]">Индивидуальная online-супервизия</strong> с{" "}
                <strong className="text-[color:var(--text)]">Юлией Ионовой</strong> — согласование формата и
                расписания после заявки.
              </li>
              <li>
                <strong className="text-[color:var(--text)]">Именной сертификат</strong> по завершении
                маршрута — условия и шаблон будут опубликованы вместе с финальной редакцией программы.
              </li>
              <li>
                <strong className="text-[color:var(--text)]">Профессиональное портфолио</strong> — подборка
                материалов и подтверждений прохождения для вашего профессионального профиля (детали — в
                правилах сертификации).
              </li>
            </ul>
          </Card>
        </section>

        <section className="mt-12 space-y-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--text)]">
            3. Личная online-супервизия с Юлией Ионовой
          </h2>
          <Card className="space-y-4 p-6">
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">
              Оставьте заявку: мы свяжемся для согласования слота. Не указывайте в тексте персональные
              данные клиентов — только профессиональный запрос в обезличенном виде.
            </p>
            <SupervisionRequestForm />
          </Card>
        </section>

        <p className="mt-12 text-xs leading-relaxed text-[color:color-mix(in srgb,var(--muted) 88%,transparent)]">
          PsyAssist остаётся цифровым аналитическим сервисом супервизионной поддержки; живые сессии
          супервизии оформляются отдельно и не заменяют самостоятельную этическую и профессиональную
          ответственность специалиста.
        </p>
      </Container>
    </main>
  );
}
