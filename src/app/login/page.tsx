import { Suspense } from "react";

import { LoginClient } from "@/app/login/LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center text-sm text-[color:var(--muted)]">
          Загрузка…
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
