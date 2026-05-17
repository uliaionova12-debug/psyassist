import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import { ensureProfileExists, fetchProfileRowForUser } from "@/lib/user/profile";

import { AppHeaderClient } from "@/components/layout/AppHeaderClient";

export async function AppHeader() {
  const supabase = await createSupabaseServerClientOptional();
  let email: string | null = null;
  let name: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    if (user) {
      await ensureProfileExists(supabase, user.id, user.email ?? null);
      const loaded = await fetchProfileRowForUser(supabase, user.id);
      if (loaded.ok) {
        name = loaded.row.name;
      }
    }
  }

  return <AppHeaderClient initialEmail={email} initialName={name} />;
}
