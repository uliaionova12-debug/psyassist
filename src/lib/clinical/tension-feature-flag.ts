/** Client-visible flag: tension interrupt in question_flow (default off for production beta). */
export function isTensionInterruptEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_TENSION_INTERRUPT_ENABLED;
  if (!v) return false;
  return v === "1" || v.toLowerCase() === "true";
}
