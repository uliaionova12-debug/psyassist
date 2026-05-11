"use client";

import { usePathname } from "next/navigation";

import { AppFooter } from "@/components/layout/AppFooter";

/** Marketing footer is hidden on `/assistant` so the supervision flow behaves as a focused workspace. */
export function ConditionalAssistantFooter() {
  const pathname = usePathname();
  if (pathname === "/assistant") return null;
  return <AppFooter />;
}
