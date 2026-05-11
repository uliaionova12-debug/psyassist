import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatAnalysisClient } from "@/app/chat-analysis/ChatAnalysisClient";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Разбор переписки — PsyAssist",
  description:
    "Разбор переписки с клиентом: текст или скриншоты — клинический тон супервизии (тариф Practice).",
};

function ChatAnalysisFallback() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <Container className="max-w-2xl py-10 sm:py-14">
        <p className="text-sm text-[color:var(--muted)]">Загрузка модуля…</p>
      </Container>
    </main>
  );
}

export default function ChatAnalysisPage() {
  return (
    <Suspense fallback={<ChatAnalysisFallback />}>
      <ChatAnalysisClient />
    </Suspense>
  );
}
