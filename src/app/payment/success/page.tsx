import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export default function PaymentSuccessPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Container className="flex flex-1 flex-col py-10">
        <Card className="mx-auto w-full max-w-lg px-6 py-8">
          <h1 className="text-lg font-semibold text-[color:var(--text)]">Спасибо за оплату</h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
            Если платёж прошёл успешно, статус обновится в приложении автоматически. При необходимости
            проверьте чек в ЮKassa.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/assistant" className="sm:flex-1 text-center">
              К ассистенту
            </ButtonLink>
            <ButtonLink href="/dashboard" tone="secondary" className="sm:flex-1 text-center">
              Личный кабинет
            </ButtonLink>
          </div>
        </Card>
      </Container>
    </main>
  );
}
