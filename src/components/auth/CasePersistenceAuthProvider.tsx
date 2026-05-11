"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/Button";
import { CASE_PERSISTENCE_AUTH_MODAL_TEXT } from "@/lib/auth/case-persistence-modal-copy";
import { createSupabaseBrowserClientOptional } from "@/lib/supabase/browser-optional";

type CasePersistenceAuthContextValue = {
  authReady: boolean;
  authUser: { id: string } | null;
  openCasePersistenceAuthModal: () => void;
};

const CasePersistenceAuthContext = createContext<CasePersistenceAuthContextValue | null>(null);

export function useCasePersistenceAuth(): CasePersistenceAuthContextValue {
  const ctx = useContext(CasePersistenceAuthContext);
  if (!ctx) {
    throw new Error("useCasePersistenceAuth must be used within CasePersistenceAuthProvider");
  }
  return ctx;
}

function CasePersistenceAuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-[color:color-mix(in srgb,black 42%,transparent)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-persistence-auth-heading"
        className="relative z-[201] w-full max-w-[min(100%,22rem)] rounded-2xl border border-[color:var(--border)] bg-[color:color-mix(in srgb,var(--card) 96%,white)] px-5 py-6 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.35)] sm:max-w-md sm:px-6 sm:py-7"
      >
        <p
          id="case-persistence-auth-heading"
          className="text-[15px] font-semibold leading-snug tracking-[-0.02em] text-[color:var(--text)]"
        >
          {CASE_PERSISTENCE_AUTH_MODAL_TEXT}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" tone="secondary" className="w-full sm:w-auto" onClick={onClose}>
            Позже
          </Button>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--accent-sand)] px-4 py-3 text-center text-sm font-medium tracking-[-0.01em] text-[color:var(--text)] transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb,var(--accent-sand) 55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] active:brightness-[0.96] sm:w-auto"
            onClick={onClose}
          >
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CasePersistenceAuthProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const client = createSupabaseBrowserClientOptional();
    if (!client) {
      setAuthUser(null);
      setAuthReady(true);
      return;
    }

    let sub: { unsubscribe: () => void } | undefined;

    void client.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id } : null);
      setAuthReady(true);
    });

    const { data } = client.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id } : null);
    });
    sub = data.subscription;

    return () => sub?.unsubscribe();
  }, []);

  const openCasePersistenceAuthModal = useCallback(() => setModalOpen(true), []);

  const value = useMemo(
    () => ({
      authReady,
      authUser,
      openCasePersistenceAuthModal,
    }),
    [authReady, authUser, openCasePersistenceAuthModal]
  );

  return (
    <CasePersistenceAuthContext.Provider value={value}>
      {children}
      <CasePersistenceAuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </CasePersistenceAuthContext.Provider>
  );
}
