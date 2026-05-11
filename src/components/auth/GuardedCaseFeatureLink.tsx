"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { useCasePersistenceAuth } from "@/components/auth/CasePersistenceAuthProvider";

export function GuardedCaseFeatureLink({
  onClick,
  ...props
}: ComponentPropsWithoutRef<typeof Link>) {
  const { authReady, authUser, openCasePersistenceAuthModal } = useCasePersistenceAuth();

  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (!authReady) return;
        if (!authUser) {
          e.preventDefault();
          openCasePersistenceAuthModal();
        }
      }}
    />
  );
}
