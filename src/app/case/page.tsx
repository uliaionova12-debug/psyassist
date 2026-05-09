import { Container } from "@/components/ui/Container";

export default function CasePage() {
  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Разобрать случай</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          MVP-заглушка. Здесь будет форма кейса и супервизорский разбор.
        </p>
      </Container>
    </main>
  );
}

