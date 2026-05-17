/**
 * Production beta: tension interrupt is hard-disabled in code.
 * Set to `true` and redeploy to re-enable (optionally also set
 * NEXT_PUBLIC_TENSION_INTERRUPT_ENABLED=true for explicit env override).
 */
export const TENSION_INTERRUPT_ENABLED = false;

/** Client-visible gate for tension interrupt in question_flow. */
export function isTensionInterruptEnabled(): boolean {
  if (!TENSION_INTERRUPT_ENABLED) return false;
  const v = process.env.NEXT_PUBLIC_TENSION_INTERRUPT_ENABLED;
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true";
}
