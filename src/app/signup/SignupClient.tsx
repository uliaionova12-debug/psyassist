"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthVaultPlaceholder } from "@/components/auth/AuthVaultPlaceholder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { createSupabaseBrowserClientOptional } from "@/lib/supabase/browser-optional";

function redirectUri(nextPath: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export function SignupClient() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = useMemo(() => {
    const n = params.get("next");
    return n?.startsWith("/") ? n : "/dashboard";
  }, [params]);

  const supabase = useMemo(() => createSupabaseBrowserClientOptional(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!supabase) {
    return <AuthVaultPlaceholder />;
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUri(nextPath),
      },
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(
      "Если включено подтверждение email, проверьте почту. После подтверждения можно войти с паролем."
    );
    router.refresh();
  }

  async function onMagicSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectUri(nextPath),
      },
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Проверьте почту — отправили ссылку для входа или завершения регистрации.");
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Container className="py-10 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))] sm:py-14 sm:pb-14">
        <Card className="mx-auto max-w-md space-y-6 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text)]">
              Регистрация
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
              Создайте аккаунт с паролем или войдите по ссылке с почты.
            </p>
          </div>

          {message && (
            <p className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 90%, transparent)] px-4 py-3 text-sm text-[color:var(--muted)] whitespace-pre-line">
              {message}
            </p>
          )}

          <form className="space-y-4" onSubmit={onSignup}>
            <label className="block text-sm font-medium text-[color:var(--text)]">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)]"
              />
            </label>
            <label className="block text-sm font-medium text-[color:var(--text)]">
              Пароль
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)]"
              />
            </label>
            <Button type="submit" className="w-full" disabled={busy}>
              Зарегистрироваться
            </Button>
          </form>

          <form className="space-y-3 border-t border-[color:var(--border)] pt-6" onSubmit={onMagicSignup}>
            <p className="text-sm font-medium text-[color:var(--text)]">Только магическая ссылка</p>
            <p className="text-xs leading-relaxed text-[color:var(--muted)]">
              Без пароля: отправим ссылку на указанный email (можно использовать тот же адрес, что выше).
            </p>
            <Button type="submit" tone="secondary" className="w-full" disabled={busy}>
              Отправить ссылку
            </Button>
          </form>

          <p className="text-center text-sm text-[color:var(--muted)]">
            Уже есть аккаунт?{" "}
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-[color:var(--text)] underline underline-offset-2">
              Вход
            </Link>
          </p>
        </Card>
      </Container>
    </main>
  );
}
