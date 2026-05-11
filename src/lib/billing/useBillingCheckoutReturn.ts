"use client";

import { useEffect, useRef } from "react";

import { PRODUCT_EVENTS } from "@/lib/analytics/constants";
import { trackEvent } from "@/lib/analytics/events";

/** After YooKassa redirect: poll payment status once, strip `billing_checkout` from URL, emit analytics. */
export function useBillingCheckoutReturn(): void {
  const billingReturnHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || billingReturnHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing_checkout") !== "1") return;
    billingReturnHandledRef.current = true;

    const pid =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("psyassist_checkout_payment_id")
        : null;
    window.history.replaceState({}, "", window.location.pathname);

    if (!pid) {
      void trackEvent({
        eventName: PRODUCT_EVENTS.checkout_failed,
        payload: { reason: "missing_payment_session" },
      });
      return;
    }

    void (async () => {
      try {
        const res = await fetch(`/api/billing/payment-status?id=${encodeURIComponent(pid)}`);
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          status?: string;
        } | null;
        try {
          sessionStorage.removeItem("psyassist_checkout_payment_id");
        } catch {
          /* noop */
        }

        if (data?.ok && data.status === "succeeded") {
          void trackEvent({
            eventName: PRODUCT_EVENTS.checkout_success,
            payload: { paymentId: pid },
          });
          return;
        }
        if (data?.ok && data.status === "canceled") {
          void trackEvent({
            eventName: PRODUCT_EVENTS.checkout_failed,
            payload: { reason: "canceled", paymentId: pid },
          });
          return;
        }
        void trackEvent({
          eventName: PRODUCT_EVENTS.checkout_failed,
          payload: {
            reason: data?.ok ? "pending_or_unknown" : "status_lookup",
            status: data?.status,
            paymentId: pid,
          },
        });
      } catch {
        try {
          sessionStorage.removeItem("psyassist_checkout_payment_id");
        } catch {
          /* noop */
        }
        void trackEvent({
          eventName: PRODUCT_EVENTS.checkout_failed,
          payload: { reason: "network", paymentId: pid },
        });
      }
    })();
  }, []);
}
