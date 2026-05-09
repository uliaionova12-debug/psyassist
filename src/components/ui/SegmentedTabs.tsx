import { cn } from "@/lib/cn";

export type SegmentedTab<T extends string> = {
  key: T;
  label: string;
};

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className
}: {
  tabs: Array<SegmentedTab<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 65%, transparent)] p-1",
        className
      )}
    >
      {tabs.map((t) => {
        const isActive = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium tracking-[-0.01em] transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in srgb, var(--accent-sand) 55%, transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]",
              isActive
                ? "bg-[color:var(--card)] shadow-[0_1px_2px_rgba(31,35,40,0.06)]"
                : "text-[color:var(--muted)] hover:bg-[color:color-mix(in srgb, var(--text) 5%, transparent)]"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

