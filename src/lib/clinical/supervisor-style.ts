/**
 * Preferred supervisory stance for tone shaping (UI labels RU → internal EN directives for the model).
 */

import { therapistPromptInjectionFromArrays } from "@/lib/clinical/therapist-profile";

export const SUPERVISOR_STYLE_OPTIONS = [
  "Провокативный",
  "Бережный",
  "Не щадить",
  "Стратег следующей сессии",
  "Честное зеркало",
  "Глубинный аналитик",
  "Супервизор слепых зон",
  "Этический наблюдатель",
] as const;

export type SupervisorStyleLabel = (typeof SUPERVISOR_STYLE_OPTIONS)[number];

const SUPERVISOR_STYLE_DIRECTIVES_EN: Record<SupervisorStyleLabel, string> = {
  Провокативный:
    "Adopt a respectfully provocative stance: challenge assumptions, name avoidance, and press on edges of the therapist's narrative—without hostility.",
  Бережный:
    "Prioritize warmth, pacing, and alliance safety; validate difficulty; soften confrontation; invite reflection gently.",
  "Не щадить":
    "Be direct and uncompromising: name collusion, drift, and self-deception plainly; minimal reassurance; favor stark clarity.",
  "Стратег следующей сессии":
    "Prioritize tactical planning for the very next session: agenda, sequence of interventions, boundaries of focus, and measurable micro-goals.",
  "Честное зеркало":
    "Mirror the therapist's stance and blind spots frankly—reflect back patterns in how they hold the case without flattery or cushioning.",
  "Глубинный аналитик":
    "Emphasize depth: defenses, unconscious pulls, transference–countertransference arcs; slower interpretive layering over quick fixes.",
  "Супервизор слепых зон":
    "Spot omissions and unnoticed dynamics; foreground risks the therapist may be overlooking and countertransference traps.",
  "Этический наблюдатель":
    "Foreground ethics, boundaries, dual relationships, duty of care, and safety framing alongside clinical hypotheses.",
};

export function isSupervisorStyleLabel(label: string): label is SupervisorStyleLabel {
  return (SUPERVISOR_STYLE_OPTIONS as readonly string[]).includes(label);
}

/** English directive for prompts; unknown → undefined */
export function englishDirectiveForSupervisorStyleLabel(
  label: string | null | undefined
): string | undefined {
  if (!label?.trim()) return undefined;
  const t = label.trim();
  if (!isSupervisorStyleLabel(t)) return undefined;
  return SUPERVISOR_STYLE_DIRECTIVES_EN[t];
}

/** Block appended after therapist profile, modalities, and stated focus per product flow. */
export function supervisorStylePromptAppend(label: string | null | undefined): string {
  const directive = englishDirectiveForSupervisorStyleLabel(label);
  if (!directive) return "";
  return (
    `\n\nSUPERVISOR STYLE:\n${directive}\n` +
    "(Apply this as an internal tone modifier; all therapist-facing text stays strictly in Russian.)\n"
  );
}

export type TherapistFieldsForSupervisionPrompt = {
  therapistSpecializations: string[];
  therapistMethods: string[];
  therapistOtherSpecialization: string;
  therapistOtherMethods: string;
};

/** Therapist injection → focus line → SUPERVISOR STYLE (order fixed). */
export function buildOrderedSupervisionContextAppend(
  therapist: TherapistFieldsForSupervisionPrompt,
  focusLabel: string | null,
  supervisorStyleLabel: string | null
): string {
  const therapistBlock = therapistPromptInjectionFromArrays(therapist)?.trim() ?? "";
  const focusLine = focusLabel?.trim()
    ? `Текущий фокус разбора (выбор терапевта): ${focusLabel.trim()}`
    : "";
  const ss = supervisorStylePromptAppend(supervisorStyleLabel).trim();
  return [therapistBlock, focusLine, ss].filter(Boolean).join("\n\n");
}
