"use client";

import { useCasePersistenceAuth } from "@/components/auth/CasePersistenceAuthProvider";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

const insightCards = [
  {
    title: "Запрос клиента",
    description: "Зафиксируйте формулировку запроса и критерии желаемых изменений."
  },
  {
    title: "Гипотезы",
    description: "Рабочие гипотезы и варианты фокуса терапии без жёстких выводов."
  },
  {
    title: "Защиты",
    description: "Наблюдения о защитах и функциях симптома — бережно и без ярлыков."
  },
  {
    title: "Перенос",
    description: "Отметки о переносе и контексте, в котором он проявляется."
  },
  {
    title: "Контрперенос",
    description: "Ваши реакции как инструмент понимания динамики (с заботой о границах)."
  },
  {
    title: "Домашние задания",
    description: "Маленькие шаги между сессиями: наблюдения, упражнения, практика."
  },
  {
    title: "Динамика терапии",
    description: "Траектория, устойчивые изменения, риски и точки поддержки."
  }
];

export default function ClientPage() {
  const { authReady, authUser, openCasePersistenceAuthModal } = useCasePersistenceAuth();

  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 75%, transparent)] px-3 py-1 text-xs text-[color:var(--muted)]">
            Клиент • Инсайты • Динамика
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Клиент</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[color:var(--muted)] sm:text-base">
            Пространство для структурированных заметок и инсайтов по клиенту. Пока без авторизации
            и базы — готовим UX и сущности, затем подключим Supabase.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {insightCards.map((c) => (
            <Card key={c.title} className="p-5 sm:p-6">
              <div className="flex h-full flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold tracking-[-0.02em]">{c.title}</div>
                  <div className="text-sm leading-relaxed text-[color:var(--muted)]">
                    {c.description}
                  </div>
                </div>

                <div className="mt-auto">
                  <Button
                    tone="secondary"
                    className="w-full"
                    onClick={() => {
                      if (
                        authReady &&
                        !authUser &&
                        (c.title === "Перенос" || c.title === "Контперенос")
                      ) {
                        openCasePersistenceAuthModal();
                        return;
                      }
                      alert(`MVP: карточка «${c.title}». Хранение подключим позже.`);
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

