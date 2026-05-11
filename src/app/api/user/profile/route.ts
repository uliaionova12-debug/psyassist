import { NextResponse } from "next/server";
import { z } from "zod";

import type { PlanType, UserBillingProfile } from "@/lib/billing/billing-types";
import { createSupabaseServerClientOptional } from "@/lib/supabase/server-optional";
import {
  billingProfileToProfilePatch,
  ensureProfileExists,
  fetchProfileRowForUser,
  profileRowToBilling,
  rowToUserProfile,
} from "@/lib/user/profile";
import { isQaModeServer } from "@/lib/qa-mode";

const BillingSchema = z.object({
  planType: z.enum(["free", "single_case", "start", "practice"]),
  freeIntroUsed: z.boolean(),
  singleCaseCredits: z.number().int().min(0),
  subscriptionKind: z.enum(["start", "practice"]).nullable(),
  monthlyCaseUsed: z.number().int().min(0),
  billingPeriodMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

const PatchSchema = z.object({
  name: z.union([z.string().min(1).max(200), z.literal("")]).optional(),
  billing: BillingSchema.optional(),
});

export async function GET() {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" as const }, { status: 503 });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false as const, code: "UNAUTHORIZED" as const }, { status: 401 });
  }

  await ensureProfileExists(supabase, user.id, user.email ?? null);

  const loaded = await fetchProfileRowForUser(supabase, user.id);
  if (!loaded.ok) {
    return NextResponse.json(
      { ok: false as const, code: loaded.code, message: loaded.message },
      { status: loaded.code === "NOT_FOUND" ? 404 : 500 }
    );
  }

  const profile = rowToUserProfile(loaded.row);
  const billing = profileRowToBilling(loaded.row);

  return NextResponse.json({
    ok: true as const,
    profile,
    billing,
    qaMode: isQaModeServer(user.email ?? null),
  });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClientOptional();
  if (!supabase) {
    return NextResponse.json({ ok: false as const, code: "SUPABASE_DISABLED" as const }, { status: 503 });
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false as const, code: "UNAUTHORIZED" as const }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, code: "INVALID_JSON" as const }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false as const, code: "INVALID_BODY" as const }, { status: 400 });
  }

  const upsertRow: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? null,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.name !== undefined) {
    upsertRow.name = parsed.data.name === "" ? null : parsed.data.name;
  }

  if (parsed.data.billing) {
    const b = parsed.data.billing;
    const bp: UserBillingProfile = {
      planType: b.planType as PlanType,
      freeIntroUsed: b.freeIntroUsed,
      singleCaseCredits: b.singleCaseCredits,
      subscriptionKind: b.subscriptionKind,
      monthlyCaseUsed: b.monthlyCaseUsed,
      billingPeriodMonth: b.billingPeriodMonth,
    };
    Object.assign(upsertRow, billingProfileToProfilePatch(bp));
  }

  const payloadKeys = Object.keys(upsertRow).filter((k) => !["id", "email", "updated_at"].includes(k));
  if (payloadKeys.length === 0) {
    return NextResponse.json({ ok: true as const, skipped: true as const });
  }

  const { error } = await supabase.from("profiles").upsert(upsertRow, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ ok: false as const, code: "UPSERT_FAILED" as const }, { status: 500 });
  }

  const loaded = await fetchProfileRowForUser(supabase, user.id);
  if (!loaded.ok) {
    return NextResponse.json({ ok: true as const });
  }

  return NextResponse.json({
    ok: true as const,
    profile: rowToUserProfile(loaded.row),
    billing: profileRowToBilling(loaded.row),
  });
}
