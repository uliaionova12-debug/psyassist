import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

/** Premium UX copy when Supabase env is absent — no technical jargon shown to users. */
export function AuthVaultPlaceholder() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Container className="flex flex-1 items-center justify-center py-10 sm:py-14">
        <Card className="mx-auto max-w-md border border-[color:color-mix(in srgb,var(--border) 92%,transparent)] bg-[color:color-mix(in srgb,white 94%,var(--bg))] p-6 shadow-[var(--shadow)] sm:p-7">
          <div className="flex gap-4">
            <div
              className="mt-0.5 shrink-0 text-[color:color-mix(in srgb,var(--muted) 78%,var(--accent-sand))]"
              aria-hidden
            >
              <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 3 5 6v5.5c0 4.25 2.86 8.22 7 9.5 4.14-1.28 7-5.25 7-9.5V6l-7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <p className="text-[13px] font-medium tracking-[-0.02em] text-[color:var(--text)] sm:text-sm">
                Личный кабинет подключается.
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                Авторизация и сохранение кейсов будут доступны после активации защищённого хранилища.
              </p>
            </div>
          </div>
        </Card>
      </Container>
    </main>
  );
}
