import { Button } from "@/components/ui/Button";
import { PLAN_PRICES_RUB } from "@/lib/billing/plans";

type Props = {
  onSelectStart: () => void;
  onSelectPractice: () => void;
  disabled?: boolean;
};

export function SubscriptionPaywall({ onSelectStart, onSelectPractice, disabled }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      <div className="flex-1 min-w-[220px] rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 90%, transparent)] px-4 py-4">
        <p className="text-sm font-semibold text-[color:var(--text)]">START — 5 кейсов в месяц</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
          До 5 кейсов в месяц, история, прогресс, учёт времени.
        </p>
        <Button
          type="button"
          tone="secondary"
          className="mt-4 w-full"
          disabled={disabled}
          onClick={onSelectStart}
        >
          5 кейсов / месяц — {PLAN_PRICES_RUB.start_monthly} ₽
        </Button>
      </div>
      <div className="flex-1 min-w-[220px] rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 90%, transparent)] px-4 py-4">
        <p className="text-sm font-semibold text-[color:var(--text)]">PRACTICE — без ограничений</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
          Без ограничений по кейсам, разбор переписки и скриншотов, расширенные возможности NAV.
        </p>
        <Button type="button" className="mt-4 w-full" disabled={disabled} onClick={onSelectPractice}>
          Без ограничений — {PLAN_PRICES_RUB.practice_monthly} ₽
        </Button>
      </div>
    </div>
  );
}
