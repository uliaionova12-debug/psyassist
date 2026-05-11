"use client";

import { cn } from "@/lib/cn";

const chipRow =
  "inline-flex max-w-full cursor-pointer items-start gap-2 rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb, white 88%, transparent)] px-3 py-2.5 text-left text-sm leading-snug tracking-[-0.01em] transition hover:border-[color:color-mix(in srgb, var(--accent-sand) 35%, var(--border))]";

const chipRowSelected =
  "border-[color:color-mix(in srgb, var(--accent-green) 45%, var(--border))] bg-[color:color-mix(in srgb, var(--accent-green) 10%, white)]";

type MultiSelectClinicalOptionsProps = {
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
  otherSelected: boolean;
  otherLabel: string;
  otherPlaceholder?: string;
  otherValue: string;
  onOtherChange: (value: string) => void;
  otherInputClassName: string;
};

export function MultiSelectClinicalOptions({
  options,
  selected,
  onToggle,
  otherSelected,
  otherLabel,
  otherPlaceholder,
  otherValue,
  onOtherChange,
  otherInputClassName,
}: MultiSelectClinicalOptionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isOn = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className={cn(chipRow, isOn && chipRowSelected)}
              onClick={() => onToggle(opt)}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 rounded border-2",
                  isOn
                    ? "border-[color:var(--accent-green)] bg-[color:color-mix(in srgb, var(--accent-green) 35%, white)]"
                    : "border-[color:var(--border)] bg-[color:color-mix(in srgb, white 70%, transparent)]"
                )}
                aria-hidden
              />
              <span className="min-w-0 text-[color:var(--text)]">{opt}</span>
            </button>
          );
        })}
      </div>
      {otherSelected ? (
        <div className="space-y-2">
          <label htmlFor="therapist-other-multi" className="text-sm font-medium text-[color:var(--text)]">
            {otherLabel}
          </label>
          <textarea
            id="therapist-other-multi"
            className={otherInputClassName}
            placeholder={otherPlaceholder}
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
