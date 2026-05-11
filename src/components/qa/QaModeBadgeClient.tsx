"use client";

import { useEffect, useMemo, useState } from "react";

import { isQaMode, subscribeQaMode } from "@/lib/qa-mode";

export function QaModeBadgeClient() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isQaMode());
    return subscribeQaMode((v) => setEnabled(Boolean(v) || isQaMode()));
  }, []);

  const pillClass = useMemo(() => {
    return [
      "pointer-events-none select-none",
      "rounded-full border border-[color:color-mix(in srgb,var(--muted) 35%,transparent)]",
      "bg-[color:color-mix(in srgb,var(--bg) 70%,transparent)]",
      "px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-[color:var(--muted)]",
      "uppercase",
    ].join(" ");
  }, []);

  if (!enabled) return null;

  return <span className={pillClass}>QA MODE</span>;
}

