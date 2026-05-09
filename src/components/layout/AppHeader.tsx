import Link from "next/link";

import { PsyAssistLogo } from "@/components/brand/PsyAssistLogo";
import { Container } from "@/components/ui/Container";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:color-mix(in srgb,var(--bg) 88%,transparent)] backdrop-blur-md supports-[backdrop-filter]:bg-[color:color-mix(in srgb,var(--bg) 78%,transparent)]">
      <Container className="flex items-center py-3 sm:py-3.5">
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-xl outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]"
        >
          <PsyAssistLogo variant="header" priority />
          <span className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--text)] sm:text-base">
            PsyAssist
          </span>
        </Link>
      </Container>
    </header>
  );
}
