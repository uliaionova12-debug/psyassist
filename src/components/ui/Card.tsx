import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-[var(--shadow)]",
        className
      )}
      {...props}
    />
  );
}

