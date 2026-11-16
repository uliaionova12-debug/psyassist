"use client";

import type { ComponentPropsWithoutRef } from "react";

import { reachGoal, type RazborGoal } from "./metrika";

export function TrackedLink({
  goal,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"a"> & { goal: RazborGoal }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        reachGoal(goal);
        onClick?.(e);
      }}
    />
  );
}
