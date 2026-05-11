import { redirect } from "next/navigation";

import { AccountSettingsClient } from "@/app/account/AccountSettingsClient";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import {
  ensureProfileExists,
  fetchProfileRowForUser,
  rowToUserProfile,
  type UserProfile,
} from "@/lib/user/profile";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  await ensureProfileExists(supabase, user.id, user.email ?? null);

  const loaded = await fetchProfileRowForUser(supabase, user.id);
  const fallback: UserProfile = {
    id: user.id,
    email: user.email ?? null,
    name: null,
    planType: "free",
    billingStatus: "none",
    freeIntroUsed: false,
    singleCaseCredits: 0,
    monthlyCaseLimit: null,
    monthlyCaseUsed: 0,
    subscriptionKind: null,
    billingPeriodMonth: new Date().toISOString().slice(0, 7),
    unlimitedCases: false,
    paidUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profile = loaded.ok ? rowToUserProfile(loaded.row) : fallback;

  return <AccountSettingsClient initialProfile={profile} />;
}
