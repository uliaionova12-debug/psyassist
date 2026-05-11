import Link from "next/link";

/** Ненавязчивое предложение войти после гостевого intro (маркетинг, не клинический текст). */
export function GuestPaywallHint() {
  return (
    <p className="text-sm leading-relaxed text-[color:var(--muted)]">
      Чтобы сохранить историю разборов и привязать оплату к аккаунту,&nbsp;
      <Link
        href="/login"
        className="font-medium text-[color:var(--text)] underline underline-offset-2 hover:opacity-90"
      >
        войдите
      </Link>
      &nbsp;или&nbsp;
      <Link
        href="/signup"
        className="font-medium text-[color:var(--text)] underline underline-offset-2 hover:opacity-90"
      >
        зарегистрируйтесь
      </Link>
      .
    </p>
  );
}
