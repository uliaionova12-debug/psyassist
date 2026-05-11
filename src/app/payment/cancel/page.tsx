import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export default function PaymentCancelPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Container className="flex flex-1 flex-col py-10">
        <Card className="mx-auto w-full max-w-lg px-6 py-8">
          <h1 className="text-lg font-semibold text-[color:var(--text)]">Оплата не завершена</h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
            Вы вернулись без оплаты или платёж был отменён. Ничего не списано — можно выбрать тариф снова,
            когда будете готовы.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/assistant" className="sm:flex-1 text-center">
              К тарифам
            </ButtonLink>
            <ButtonLink href="/chat-analysis" tone="secondary" className="sm:flex-1 text-center">
              Разбор переписки
            </ButtonLink>
          </div>
        </Card>
      </Container>
    </main>
  );
}
