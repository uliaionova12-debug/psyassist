"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

function generateDemoResponse(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("план")) {
    return [
      "1. Утренние клиенты",
      "2. Анализ кейсов",
      "3. Контент",
      "4. Административные задачи",
      "5. Вечерняя рефлексия"
    ].join("\n");
  }

  if (normalized.includes("чек")) {
    return [
      "1. Цель встречи",
      "2. Эмоциональный фон",
      "3. Запрос",
      "4. Интервенции",
      "5. Домашнее задание"
    ].join("\n");
  }

  if (normalized.includes("пост")) {
    return [
      "1. Клиентский инсайт",
      "2. Ошибка аудитории",
      "3. Личный кейс",
      "4. Практический инструмент",
      "5. Призыв к диалогу"
    ].join("\n");
  }

  return "Опишите задачу подробнее.";
}

export default function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string>("");

  const isGenerateDisabled = useMemo(() => prompt.trim().length === 0, [prompt]);

  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 75%, transparent)] px-3 py-1 text-xs text-[color:var(--muted)]">
            Lite • Домашние задания • Быстрые подсказки
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Нейропомощник
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[color:var(--muted)] sm:text-base">
            AI-помощник для ежедневных рабочих задач психолога.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <div className="text-sm font-medium tracking-[-0.01em]">Задача</div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  placeholder={
                    "Например:\n- составь план дня\n- создай чек-лист для клиента\n- придумай идеи постов\n- подготовь домашнее задание"
                  }
                  className="min-h-[140px] w-full resize-y rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm leading-relaxed text-[color:var(--text)] shadow-[0_1px_0_rgba(31,35,40,0.02)] placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[color:var(--muted)]">
                  Подсказка: попробуйте слова «план», «чек», «пост».
                </div>
                <Button
                  className="w-full sm:w-auto"
                  disabled={isGenerateDisabled}
                  onClick={() => setResponse(generateDemoResponse(prompt))}
                >
                  Сгенерировать
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium tracking-[-0.01em]">Ответ</div>
              <div className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">
                {response || "Здесь появится результат генерации."}
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}

