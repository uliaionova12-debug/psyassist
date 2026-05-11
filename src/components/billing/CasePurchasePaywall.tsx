import { Button } from "@/components/ui/Button";
import { PLAN_PRICES_RUB } from "@/lib/billing/plans";

type Props = {
  onSelect: () => void;
  disabled?: boolean;
};

export function CasePurchasePaywall({ onSelect, disabled }: Props) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 90%, transparent)] px-4 py-4">
      <p className="text-sm font-semibold text-[color:var(--text)]">Разобрать один кейс</p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
        Полный разбор одного случая: все вопросы, напряжение, интеграционная рефлексия, NAV,
        сохранение кейса.
      </p>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={disabled} onClick={onSelect}>
        Разобрать один кейс — {PLAN_PRICES_RUB.single_case} ₽
      </Button>
    </div>
  );
}
