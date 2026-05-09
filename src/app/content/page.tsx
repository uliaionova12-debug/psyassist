"use client";

import { useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SegmentedTabs, type SegmentedTab } from "@/components/ui/SegmentedTabs";
import { Button } from "@/components/ui/Button";

type Channel =
  | "telegram"
  | "instagram"
  | "vk"
  | "dzen"
  | "email"
  | "podcast"
  | "article"
  | "warmup";

const channelTabs: Array<SegmentedTab<Channel>> = [
  { key: "telegram", label: "Telegram" },
  { key: "instagram", label: "Instagram" },
  { key: "vk", label: "VK" },
  { key: "dzen", label: "Дзен" },
  { key: "email", label: "Email" },
  { key: "podcast", label: "Подкаст" },
  { key: "article", label: "Статья" },
  { key: "warmup", label: "Прогрев" }
];

const generatorCards = [
  { title: "Пост по кейсу", description: "Этично и профессионально: кейс → ценность → выводы." },
  { title: "Серия постов", description: "3–7 постов под одну тему с логикой прогрессии." },
  { title: "Сценарий подкаста", description: "Структура выпуска: тезисы, примеры, выводы." },
  { title: "Экспертная статья", description: "Длинный формат с опорами на практику и этику." },
  { title: "Портрет целевой аудитории", description: "Сегменты, боли, мотивации, барьеры." },
  { title: "Воронка под продукт", description: "Путь от знакомства до покупки: шаги и контент." },
  { title: "Контент-план на месяц", description: "Баланс экспертности, доверия и продаж." }
];

export default function ContentPage() {
  const [channel, setChannel] = useState<Channel>("telegram");
  const channelLabel = useMemo(
    () => channelTabs.find((t) => t.key === channel)?.label ?? "",
    [channel]
  );

  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 75%, transparent)] px-3 py-1 text-xs text-[color:var(--muted)]">
            Контент • Этика • Экспертность
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Контент</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[color:var(--muted)] sm:text-base">
            Генератор этичного экспертного контента на основе кейсов, аудитории и продуктов. Пока
            без AI — структура и UX готовы, интеграцию добавим позже.
          </p>
        </div>

        <div className="mt-6 sm:mt-8">
          <SegmentedTabs tabs={channelTabs} value={channel} onChange={setChannel} />
          <div className="mt-3 text-xs text-[color:var(--muted)]">
            Выбран канал: <span className="text-[color:var(--text)]">{channelLabel}</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {generatorCards.map((c) => (
            <Card key={c.title} className="p-5 sm:p-6">
              <div className="flex h-full flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold tracking-[-0.02em]">{c.title}</div>
                  <div className="text-sm leading-relaxed text-[color:var(--muted)]">
                    {c.description}
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <Button
                    tone="secondary"
                    className="w-full"
                    onClick={() => {
                      alert(
                        `MVP: генератор «${c.title}» для канала «${channelLabel}». AI подключим позже.`
                      );
                    }}
                  >
                    Открыть
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}

