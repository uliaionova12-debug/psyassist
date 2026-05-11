import { SESSION_DEPTH_KEYBOARD_LABELS } from "@/lib/clinical/depth";
import {
  extractMemoryPhraseFromReflection,
  stripClinicalMarkdown,
} from "@/lib/clinical/markdown-strip";
import type { SupervisionSession } from "@/lib/clinical/session";

function dashOr(text: string | null | undefined): string {
  const t = text?.trim();
  return t ? stripClinicalMarkdown(t) : "—";
}

function optionalBlock(label: string, value: string | null | undefined): string[] {
  const v = value?.trim();
  if (!v) return [];
  return ["", `${label}:`, stripClinicalMarkdown(v)];
}

/**
 * Premium plain-text export for clipboard / sharing (no markdown markers).
 */
export function buildPremiumSessionPlainExport(session: SupervisionSession): string {
  const now = new Date();
  const readable = now.toLocaleString("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const iso = now.toISOString();

  const caseTitle = dashOr(session.intake.client_alias);
  const supervisorStyle = dashOr(session.supervisorStyle);
  const focus = dashOr(session.focusLabel);
  const depth =
    session.sessionDepth != null
      ? SESSION_DEPTH_KEYBOARD_LABELS[session.sessionDepth] ??
        stripClinicalMarkdown(String(session.sessionDepth))
      : "—";

  const reflectionRaw = session.reflectionText.trim();
  const reflectionPlain = reflectionRaw ? stripClinicalMarkdown(reflectionRaw) : "";
  const memoryPhrase = reflectionRaw ? extractMemoryPhraseFromReflection(reflectionRaw) : null;

  const lines: string[] = [
    "=== PsyAssist ===",
    "",
    "Кейс:",
    caseTitle,
    "",
    "Дата:",
    `${readable} (${iso})`,
    "",
    "Стиль супервизора:",
    supervisorStyle,
    "",
    "Фокус:",
    focus,
    "",
    "Глубина:",
    depth,
    "",
    "Интеграционная рефлексия:",
    reflectionPlain || "—",
  ];

  lines.push(
    ...optionalBlock(
      "Удалось ли приблизиться к ответу",
      session.closingStep1Answer ?? undefined
    ),
    ...optionalBlock(
      "Что из разбора вы забираете в практику",
      session.closingTherapistTakeaway.trim() ? session.closingTherapistTakeaway : undefined
    ),
    ...optionalBlock("Что сегодня особенно проявилось", session.closingIntegrationText),
    ...optionalBlock("Куда хотите пойти дальше в этом кейсе", session.closingNextModuleChoice ?? undefined),
    "",
    "Фраза на память:",
    memoryPhrase ? stripClinicalMarkdown(memoryPhrase) : "—"
  );

  return lines.join("\n").trimEnd();
}
