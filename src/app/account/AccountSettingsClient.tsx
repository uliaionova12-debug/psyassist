"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UserProfile } from "@/lib/user/profile";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

type Props = {
  initialProfile: UserProfile;
};

export function AccountSettingsClient({ initialProfile }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialProfile.name ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setBusy(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    setBusy(false);
    if (!data?.ok) {
      setNotice(data?.message ?? "Не удалось сохранить");
      return;
    }
    setNotice("Сохранено");
    router.refresh();
  }

  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <Card className="mx-auto max-w-lg space-y-6 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Аккаунт</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Имя отображается в интерфейсе; тариф и биллинг настраиваются после оплаты.
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[color:var(--muted)]">Email</dt>
              <dd className="mt-1 font-medium text-[color:var(--text)]">{initialProfile.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--muted)]">Текущий тариф</dt>
              <dd className="mt-1 font-medium text-[color:var(--text)]">{initialProfile.planType}</dd>
            </div>
          </dl>

          <form className="space-y-4 border-t border-[color:var(--border)] pt-6" onSubmit={onSave}>
            <label className="block text-sm font-medium text-[color:var(--text)]">
              Имя
              <input
                type="text"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                maxLength={200}
                className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)]"
              />
            </label>
            {notice && <p className="text-sm text-[color:var(--muted)]">{notice}</p>}
            <Button type="submit" disabled={busy}>
              Сохранить
            </Button>
          </form>
        </Card>
      </Container>
    </main>
  );
}
