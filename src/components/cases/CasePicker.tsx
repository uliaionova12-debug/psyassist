"use client";

import type { SupervisionCaseSummary } from "@/lib/persistence/types";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type CasePickerProps = {
  cases: SupervisionCaseSummary[];
  onSelect: (caseId: string) => void;
  onNewCase: () => void;
};

function caseLabel(c: SupervisionCaseSummary): string {
  const t = c.case_title?.trim();
  if (t) return t;
  const cl = c.client_name?.trim();
  if (cl) return cl;
  return `Кейс #${c.id}`;
}

export function CasePicker({ cases, onSelect, onNewCase }: CasePickerProps) {
  return (
    <Card className="space-y-4 p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--muted)]">
          Сохранённые кейсы из супервизии. Выберите, чтобы подставить контекст в модуль.
        </p>
        <Button type="button" tone="secondary" className="shrink-0 sm:w-auto w-full" onClick={onNewCase}>
          + Новый кейс
        </Button>
      </div>
      <ul className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in srgb,white 92%,transparent)]">
        {cases.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition hover:bg-[color:color-mix(in srgb,var(--accent-sand) 8%,white)]"
              onClick={() => onSelect(c.id)}
            >
              <span className="font-medium text-[color:var(--text)]">{caseLabel(c)}</span>
              {c.first_session_date?.trim() ? (
                <span className="text-xs text-[color:var(--muted)]">
                  Сессия / длительность: {c.first_session_date.trim()}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
