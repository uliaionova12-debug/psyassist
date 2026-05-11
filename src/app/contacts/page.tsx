import type { Metadata } from "next";

import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Контакты — PsyAssist",
  description: "Контакты сервиса PsyAssist для специалистов помогающих профессий",
};

export default function ContactsPage() {
  return (
    <main className="flex min-w-0 w-full flex-1 flex-col">
      <Container className="max-w-3xl pb-24 pt-10 sm:pt-14 md:pb-32">
        <article className="break-words text-sm leading-relaxed text-[color:var(--muted)]">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
            Контакты
          </h1>

          <section className="mt-8 space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb,white 92%,transparent)] p-6">
            <h2 className="text-base font-semibold text-[color:var(--text)]">Исполнитель / продукт</h2>
            <p>
              <strong className="text-[color:var(--text)]">PsyAssist</strong> — цифровой аналитический
              сервис профессиональной супервизионной поддержки для психологов и специалистов помогающих
              профессий. Не является медицинской услугой, не заменяет живую супервизию и не предназначен
              для экстренной помощи.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-base font-semibold text-[color:var(--text)]">Реквизиты</h2>
            <dl className="space-y-3 border-l-2 border-[color:color-mix(in srgb,var(--accent-sand) 45%,var(--border))] pl-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[color:color-mix(in srgb,var(--muted) 85%,transparent)]">
                  Наименование
                </dt>
                <dd className="mt-1 text-[color:var(--text)]">Индивидуальный предприниматель Юлия Ионова</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[color:color-mix(in srgb,var(--muted) 85%,transparent)]">
                  ИНН
                </dt>
                <dd className="mt-1 font-mono text-[color:var(--text)]">[ИНН]</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[color:color-mix(in srgb,var(--muted) 85%,transparent)]">
                  ОГРНИП
                </dt>
                <dd className="mt-1 font-mono text-[color:var(--text)]">[ОГРНИП]</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[color:color-mix(in srgb,var(--muted) 85%,transparent)]">
                  Email
                </dt>
                <dd className="mt-1 font-mono text-[color:var(--text)]">[Email]</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[color:color-mix(in srgb,var(--muted) 85%,transparent)]">
                  Telegram / поддержка
                </dt>
                <dd className="mt-1 font-mono text-[color:var(--text)]">[Telegram или канал поддержки]</dd>
              </div>
            </dl>
            <p className="text-xs">
              Указанные реквизиты и контакты являются плейсхолдерами до публикации действительных данных.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-base font-semibold text-[color:var(--text)]">Поддержка пользователей</h2>
            <p>
              По вопросам доступа к сервису, учётной записи и техническим сбоям пишите на{" "}
              <span className="font-mono text-[color:var(--text)]">[Email поддержки]</span> или в{" "}
              <span className="font-mono text-[color:var(--text)]">[Telegram поддержки]</span>. Срок ответа
              уточняется Исполнителем в рабочих процедурах.
            </p>
            <p className="text-xs">
              Обращения по экстренным жизненным ситуациям и угрозам направляйте в службы экстренной помощи и
              очным специалистам — сервис PsyAssist этому не предназначен.
            </p>
          </section>
        </article>
      </Container>
    </main>
  );
}
