import Link from "next/link";

type Props = {
  /** inline — под блоком тарифов; card — карточка на дашборде */
  variant?: "inline" | "card";
};

/**
 * Маркетинговый блок доверия (не клинические формулировки ассистента).
 */
export function SupervisionTrustBlock({ variant = "inline" }: Props) {
  if (variant === "card") {
    return (
      <div className="rounded-xl border border-[color:color-mix(in srgb,var(--accent-sand) 35%,var(--border))] bg-[color:color-mix(in srgb,var(--accent-sand) 6%,white)] p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
          Супервизор и сертификация
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
          Аккредитация, документы супервизора и программа с часами живой супервизии — на странице
          документов. Там же можно оставить заявку на индивидуальную online-супервизию.
        </p>
        <Link
          href="/documents"
          className="mt-3 inline-block text-sm font-medium text-[color:var(--text)] underline underline-offset-2 hover:opacity-90"
        >
          Документы и заявка →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[color:color-mix(in srgb,var(--border) 90%,transparent)] bg-[color:color-mix(in srgb,white 94%,transparent)] px-4 py-3">
      <p className="text-xs leading-relaxed text-[color:var(--muted)]">
        Документы супервизора, правила сертификации PsyAssist и заявка на личную online-супервизию с{" "}
        <span className="text-[color:var(--text)]">Юлией Ионовой</span> —{" "}
        <Link href="/documents" className="font-medium text-[color:var(--text)] underline underline-offset-2">
          раздел «Документы»
        </Link>
        .
      </p>
    </div>
  );
}
