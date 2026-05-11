import { NextResponse } from "next/server";

import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createSupabaseServerClientOptional();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${origin}/`, { status: 302 });
}
