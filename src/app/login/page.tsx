import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginClient } from "@/app/login/LoginClient";
import { sanitizeInternalNextPath } from "@/lib/auth/redirect-urls";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = sanitizeInternalNextPath(params.next);

  const supabase = await createSupabaseServerClientOptional();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.info("[login/page] user id or NO_SESSION", user?.id ?? "NO_SESSION");
    if (user) {
      redirect(nextPath);
    }
  } else {
    console.info("[login/page] user id or NO_SESSION", "NO_SESSION");
  }

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
