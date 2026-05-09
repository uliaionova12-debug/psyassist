import { cn } from "@/lib/cn";

export function Container({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mx-auto w-full max-w-5xl px-5", className)} {...props} />;
}

