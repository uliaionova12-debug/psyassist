import { FREE_INTRO_BANNER } from "@/lib/billing/paywall";

type Props = {
  /** Переопределение текста без изменения clinical контента по умолчанию */
  message?: string;
};

/**
 * Информационная плашка ознакомительного режима (не блокирующий paywall).
 */
export function FreeIntroPaywall({ message = FREE_INTRO_BANNER }: Props) {
  return (
    <div className="mb-5 rounded-xl border border-[color:color-mix(in srgb, var(--accent-sand) 40%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-sand) 8%, white)] px-4 py-3 text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
      {message}
    </div>
  );
}
