import { Card } from "@/components/ui/Card";

const BODY =
  "Хотите, чтобы кейс сохранился в вашей личной памяти и вы могли вернуться к нему позже?\n\nПройти супервизию можно и без входа.\nНо сохранение кейса, история разборов и продолжение работы доступны только в личном кабинете.";

type Props = {
  isAuthenticated: boolean;
};

/**
 * Информационная карточка о сохранении кейса (маркетинг, не клинический текст).
 * Render-only между confidentiality и case_name на шаге case_reminder.
 */
export function CaseMemoryPremiumCard({ isAuthenticated }: Props) {
  const statusLine = isAuthenticated
    ? "✅ Вы в аккаунте — кейс сохранится в «Мои случаи»"
    : "🔒 Вы не авторизованы — текущий кейс не будет сохранён";

  return (
    <Card className="border-[color:color-mix(in srgb,var(--accent-sand) 32%,var(--border))] bg-[color:color-mix(in srgb,var(--accent-sand) 5%,var(--card))] shadow-[0_1px_2px_color-mix(in srgb,var(--text) 4%,transparent)]">
      <div className="space-y-3 p-4 sm:p-5">
        <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--muted)]">{BODY}</p>
        <p
          className="text-xs leading-relaxed text-[color:color-mix(in srgb,var(--muted) 88%,var(--text))]"
          role="status"
        >
          {statusLine}
        </p>
      </div>
    </Card>
  );
}
