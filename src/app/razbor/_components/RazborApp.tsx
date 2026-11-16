"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { reachGoal } from "./metrika";
import { RazborForm } from "./RazborForm";

const RazborContext = createContext<{ start: () => void } | null>(null);

const isFormState = (state: unknown) =>
  typeof state === "object" &&
  state !== null &&
  (state as { razbor?: unknown }).razbor === true;

export function RazborApp({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#start") {
      window.history.replaceState({ razbor: true }, "");
      setOpen(true);
    }
    const onPop = (e: PopStateEvent) => setOpen(isFormState(e.state));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const start = useCallback(() => {
    reachGoal("razbor_start");
    window.history.pushState({ razbor: true }, "", "#start");
    setOpen(true);
    window.scrollTo(0, 0);
  }, []);

  const exit = useCallback(() => {
    if (isFormState(window.history.state)) {
      window.history.back();
    } else {
      setOpen(false);
    }
  }, []);

  return (
    <RazborContext.Provider value={{ start }}>
      <div hidden={open}>{children}</div>
      {open ? <RazborForm onExit={exit} /> : null}
    </RazborContext.Provider>
  );
}

export function StartButton({
  children = "Начать разбор",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const ctx = useContext(RazborContext);
  return (
    <a
      href="#start"
      className={className ?? "rz-btn"}
      onClick={(e) => {
        if (!ctx) return;
        e.preventDefault();
        ctx.start();
      }}
    >
      {children}
    </a>
  );
}
