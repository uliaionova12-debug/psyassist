/**
 * Production beta: tension interrupt is hard-disabled in code.
 * Re-enable only by setting TENSION_INTERRUPT_ENABLED = true and redeploying.
 */
export const TENSION_INTERRUPT_ENABLED = false;

/** Shown in console on assistant load — proves this bundle includes the beta hard-off gate. */
export const TENSION_INTERRUPT_BUILD_MARKER = "psyassist-tension-off-beta-2026-05";

export type TensionSessionStep =
  | "tension_stop_loading"
  | "tension_stop"
  | "tension_hypothesis_loading";

const TENSION_STEPS = new Set<TensionSessionStep>([
  "tension_stop_loading",
  "tension_stop",
  "tension_hypothesis_loading",
]);

export function isTensionSessionStep(step: string): step is TensionSessionStep {
  return TENSION_STEPS.has(step as TensionSessionStep);
}

/** Client-visible gate for tension interrupt in question_flow. Always false for beta. */
export function isTensionInterruptEnabled(): boolean {
  return false;
}
