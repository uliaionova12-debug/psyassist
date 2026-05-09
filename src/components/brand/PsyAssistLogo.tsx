import Image from "next/image";

import { cn } from "@/lib/cn";

const LOGO_SRC = "/branding/psyassist-logo.png";

export function PsyAssistLogo({
  variant,
  className,
  priority = false
}: {
  variant: "header" | "hero";
  className?: string;
  priority?: boolean;
}) {
  if (variant === "header") {
    return (
      <Image
        src={LOGO_SRC}
        alt="PsyAssist"
        width={120}
        height={120}
        priority={priority}
        sizes="(max-width: 640px) 40px, 48px"
        className={cn(
          "h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[color:color-mix(in srgb,var(--text) 10%,transparent)] sm:h-11 sm:w-11 md:h-12 md:w-12",
          className
        )}
      />
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt="PsyAssist — AI-супервизор для психологов"
      width={380}
      height={380}
      priority={priority}
      sizes="(max-width: 640px) 220px, (max-width: 1024px) 280px, 380px"
      className={cn(
        "mx-auto h-auto w-[220px] rounded-full object-cover shadow-[var(--shadow)] ring-1 ring-[color:color-mix(in srgb,var(--text) 10%,transparent)] sm:w-[280px] md:w-[340px] lg:w-[380px]",
        className
      )}
    />
  );
}
