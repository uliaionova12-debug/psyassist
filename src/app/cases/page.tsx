import { CasesPageClient } from "./CasesPageClient";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const supabase = await createSupabaseServerClientOptional();
  let initialEmail: string | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    initialEmail = user?.email ?? null;
  }

  return <CasesPageClient initialEmail={initialEmail} />;
}
