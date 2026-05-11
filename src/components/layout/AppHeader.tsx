import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

import { AppHeaderClient } from "@/components/layout/AppHeaderClient";

export async function AppHeader() {
  const supabase = await createSupabaseServerClientOptional();
  let email: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  return <AppHeaderClient initialEmail={email} />;
}
