import Link from "next/link";

import { cn } from "@/lib/cn";

type ButtonTone = "primary" | "secondary" | "ghost";

const toneClasses: Record<ButtonTone, string> = {
  primary:
    "bg-[color:var(--accent-sand)] text-[color:var(--text)] hover:brightness-[0.98] active:brightness-[0.96]",
  secondary:
    "bg-[color:color-mix(in srgb, var(--accent-green) 12%, white)] text-[color:var(--text)] hover:bg-[color:color-mix(in srgb, var(--accent-green) 16%, white)]",
  ghost:
    "bg-transparent text-[color:var(--text)] hover:bg-[color:color-mix(in srgb, var(--text) 6%, transparent)]"
};

const base =
  "inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium tracking-[-0.01em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]";

export function Button({
  className,
  tone = "primary",
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { tone?: ButtonTone }) {
  return <button className={cn(base, toneClasses[tone], className)} {...props} />;
}

export function ButtonLink({
  className,
  tone = "primary",
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & { tone?: ButtonTone }) {
  return <Link className={cn(base, toneClasses[tone], className)} {...props} />;
}

