"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export function GeminiKeyDevClient() {
  const [keyInput, setKeyInput] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/dev/gemini-key");
    if (!res.ok) return;
    const data = (await res.json()) as { configured?: boolean };
    setConfigured(Boolean(data.configured));
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dev/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Не удалось сохранить. Попробуйте ещё раз.");
        setBusy(false);
        return;
      }
      setKeyInput("");
      setMessage("Ключ сохранён только для текущей локальной сессии разработки.");
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dev/gemini-key", { method: "DELETE" });
      if (!res.ok) {
        setMessage("Не удалось очистить. Попробуйте ещё раз.");
        return;
      }
      setMessage("Ключ очищен.");
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Container className="py-10 sm:py-14">
        <Card className="mx-auto max-w-md space-y-6 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
              Ключ анализа (локально)
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
              Ключ действует только в текущей сессии разработки на этом компьютере, не подходит для
              публикации и не должен попадать в репозиторий.
            </p>
            {configured !== null && (
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                Состояние сессии: {configured ? "в памяти задан ключ" : "ключ в памяти не задан"}
              </p>
            )}
          </div>

          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label htmlFor="gemini-key" className="mb-1.5 block text-sm font-medium text-[color:var(--text)]">
                Ключ
              </label>
              <input
                id="gemini-key"
                type="password"
                autoComplete="off"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)] outline-none ring-[color:var(--accent)] focus-visible:ring-2"
                placeholder="Вставьте ключ"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>
                Сохранить
              </Button>
              <Button type="button" tone="secondary" disabled={busy} onClick={() => void onClear()}>
                Очистить
              </Button>
            </div>
          </form>

          {message && <p className="text-sm text-[color:var(--muted)]">{message}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[color:var(--border)] pt-4 text-sm">
            <Link href="/" className="text-[color:var(--accent)] underline-offset-4 hover:underline">
              На главную
            </Link>
            <Link href="/assistant" className="text-[color:var(--accent)] underline-offset-4 hover:underline">
              К ассистенту
            </Link>
          </div>
        </Card>
      </Container>
    </main>
  );
}
