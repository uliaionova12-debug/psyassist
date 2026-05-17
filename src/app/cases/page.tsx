import { CasesPageClient } from "./CasesPageClient";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const supabase = await createSupabaseServerClientOptional();
  let serverHasSession = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.info("[cases/page] user id or NO_SESSION", user?.id ?? "NO_SESSION");
    serverHasSession = Boolean(user);
  } else {
    console.info("[cases/page] user id or NO_SESSION", "NO_SESSION");
  }

  return <CasesPageClient serverHasSession={serverHasSession} />;
}
