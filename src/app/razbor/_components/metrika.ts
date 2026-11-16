export const YM_ID = process.env.NEXT_PUBLIC_YM_ID?.trim() ?? "";

export type RazborGoal =
  | "razbor_landing_open"
  | "razbor_start"
  | "razbor_complete"
  | "razbor_pay_click"
  | "razbor_time_click"
  | "razbor_lead_success";

type YmFn = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: YmFn;
  }
}

/** Queues calls until tag.js loads (same stub as the official snippet). No-op without NEXT_PUBLIC_YM_ID. */
function ym(...args: unknown[]) {
  if (typeof window === "undefined" || !YM_ID) return;
  if (!window.ym) {
    const stub: YmFn = (...a: unknown[]) => {
      (stub.a = stub.a || []).push(a);
    };
    stub.l = Date.now();
    window.ym = stub;
  }
  window.ym(...args);
}

export function initMetrika() {
  ym(Number(YM_ID), "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });
}

export function reachGoal(goal: RazborGoal, params?: Record<string, string>) {
  ym(Number(YM_ID), "reachGoal", goal, params);
}
