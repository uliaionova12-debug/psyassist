/** Allowlisted post-checkout paths only (no open redirects). */
export const CHECKOUT_RETURN_PATHS = ["/assistant", "/chat-analysis", "/dashboard", "/"] as const;

export type CheckoutReturnPath = (typeof CHECKOUT_RETURN_PATHS)[number];

export function resolveCheckoutReturnPath(returnPath: string | undefined): CheckoutReturnPath {
  if (returnPath && (CHECKOUT_RETURN_PATHS as readonly string[]).includes(returnPath)) {
    return returnPath as CheckoutReturnPath;
  }
  return "/assistant";
}

export function buildCheckoutReturnUrl(appBaseUrl: string, path: CheckoutReturnPath): string {
  const base = appBaseUrl.replace(/\/$/, "");
  const suffix = path === "/" ? "/" : path;
  return `${base}${suffix}?billing_checkout=1`;
}
