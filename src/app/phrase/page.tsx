import { Container } from "@/components/ui/Container";

export default function PhrasePage() {
  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Подобрать терапевтическую фразу
        </h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          MVP-заглушка. Здесь будет генератор фраз (позже подключим OpenAI).
        </p>
      </Container>
    </main>
  );
}

