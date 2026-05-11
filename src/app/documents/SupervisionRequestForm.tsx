"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

const WEEKDAYS = [
  { value: "mon", label: "Понедельник" },
  { value: "tue", label: "Вторник" },
  { value: "wed", label: "Среда" },
  { value: "thu", label: "Четверг" },
  { value: "fri", label: "Пятница" },
  { value: "sat", label: "Суббота" },
  { value: "sun", label: "Воскресенье" },
  { value: "flex", label: "Гибко / обсудим" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb,white 88%,transparent)] px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb,var(--accent-sand) 55%,transparent)]";

export function SupervisionRequestForm() {
  const [preferredDay, setPreferredDay] = useState("flex");
  const [preferredTime, setPreferredTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [requestBrief, setRequestBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/supervision-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredDay,
          preferredTime: preferredTime.trim(),
          timezone: timezone.trim(),
          requestBrief: requestBrief.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        code?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError("Не удалось отправить заявку. Проверьте поля и попробуйте ещё раз.");
        return;
      }
      setNotice(data.message ?? "Заявка принята. Мы свяжемся с вами для согласования времени.");
      setRequestBrief("");
    } catch {
      setError("Сеть недоступна. Попробуйте позже.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-[color:var(--text)]">
        Удобный день недели
        <select className={inputClass} value={preferredDay} onChange={(ev) => setPreferredDay(ev.target.value)}>
          {WEEKDAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-[color:var(--text)]">
        Удобное время
        <input
          type="text"
          className={inputClass}
          placeholder="Например: 18:00–20:00 или утро по будням"
          value={preferredTime}
          onChange={(ev) => setPreferredTime(ev.target.value)}
          required
          maxLength={200}
        />
      </label>
      <label className="block text-sm font-medium text-[color:var(--text)]">
        Часовой пояс
        <input
          type="text"
          className={inputClass}
          placeholder="Например: Москва (UTC+3) или Europe/Moscow"
          value={timezone}
          onChange={(ev) => setTimezone(ev.target.value)}
          required
          maxLength={200}
        />
      </label>
      <label className="block text-sm font-medium text-[color:var(--text)]">
        Краткий запрос на супервизию
        <textarea
          className={`${inputClass} min-h-[120px] resize-y`}
          placeholder="Тема, запрос, контекст (без идентифицирующих данных клиентов)."
          value={requestBrief}
          onChange={(ev) => setRequestBrief(ev.target.value)}
          required
          minLength={10}
          maxLength={4000}
        />
      </label>
      {error && <p className="text-sm text-[color:color-mix(in srgb,var(--accent-sand) 70%,var(--text))]">{error}</p>}
      {notice && (
        <p className="rounded-xl border border-[color:color-mix(in srgb,var(--accent-green) 35%,var(--border))] bg-[color:color-mix(in srgb,var(--accent-green) 8%,white)] px-4 py-3 text-sm text-[color:var(--text)]">
          {notice}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Отправка…" : "Отправить заявку"}
      </Button>
    </form>
  );
}
