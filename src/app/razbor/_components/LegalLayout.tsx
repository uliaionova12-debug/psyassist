import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";

import { RazborFooter } from "./Footer";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="rz">
      <main className="flex w-full min-w-0 flex-1 flex-col">
        <Container className="max-w-3xl pt-8 pb-20 sm:pt-12">
          <p>
            <Link href="/razbor" className="rz-link-btn">
              ← К разбору ситуации
            </Link>
          </p>
          <article className="rz-legal break-words">
            <h1>{title}</h1>
            <p className="rz-muted rz-small">Редакция от {updated}</p>
            {children}
          </article>
        </Container>
      </main>
      <RazborFooter />
    </div>
  );
}
