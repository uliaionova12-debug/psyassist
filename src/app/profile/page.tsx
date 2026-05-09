import { Container } from "@/components/ui/Container";

export default function ProfilePage() {
  return (
    <main className="min-h-dvh">
      <Container className="py-10 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Мой профиль</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          MVP-заглушка. Здесь будут настройки профиля и безопасность.
        </p>
      </Container>
    </main>
  );
}

