"use client";

import { useBillingCheckoutReturn } from "@/lib/billing/useBillingCheckoutReturn";

/** Mount once in root layout so any allowlisted return_url can finish checkout UX. */
export function BillingCheckoutReturnListener(): null {
  useBillingCheckoutReturn();
  return null;
}
