import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for trusted server routes (webhooks). Bypasses RLS.
 * Never import from client components.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
