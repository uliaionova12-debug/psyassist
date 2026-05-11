import { Suspense } from "react";

import { SignupClient } from "@/app/signup/SignupClient";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center text-sm text-[color:var(--muted)]">
          Загрузка…
        </main>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
