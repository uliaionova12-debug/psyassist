import type {
  CaseRow,
  CaseSummaryRow,
  SupervisionCase,
  SupervisionCaseParsedFields,
  SupervisionCaseSummary,
} from "@/lib/persistence/types";

const CASE_TITLE_OBJECT_KEYS = [
  "title",
  "label",
  "name",
  "text",
  "value",
  "case_title",
  "caseTitle",
  "client_alias",
  "client_name",
  "clientName",
] as const;

/** Coerce API/DB values to a display-safe string (avoids `[object Object]` in UI). */
export function persistenceDisplayString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length ? t : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    const t = String(value).trim();
    return t.length ? t : null;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of CASE_TITLE_OBJECT_KEYS) {
      const inner = persistenceDisplayString(o[key]);
      if (inner) return inner;
    }
  }
  return null;
}

export function supervisionCaseDisplayTitle(
  c: Pick<SupervisionCaseSummary, "id" | "case_title" | "client_name">
): string {
  return (
    persistenceDisplayString(c.case_title) ||
    persistenceDisplayString(c.client_name) ||
    `Кейс #${persistenceDisplayString(c.id) ?? String(c.id)}`
  );
}

function normalizeSummaryFields(
  row: CaseSummaryRow | Record<string, unknown>
): SupervisionCaseSummary {
  const r = row as Record<string, unknown>;
  const idRaw = r.id ?? r.caseId ?? r.case_id;
  const id = persistenceDisplayString(idRaw) ?? (idRaw != null ? String(idRaw) : "");
  return {
    id,
    case_title: persistenceDisplayString(r.case_title ?? r.caseTitle ?? r.title),
    client_name: persistenceDisplayString(r.client_name ?? r.clientName),
    first_session_date: persistenceDisplayString(r.first_session_date ?? r.firstSessionDate),
    created_at: persistenceDisplayString(r.created_at ?? r.createdAt) ?? "",
    updated_at: persistenceDisplayString(r.updated_at ?? r.updatedAt) ?? "",
    status: persistenceDisplayString(r.status),
    focus: persistenceDisplayString(r.focus),
    current_step: persistenceDisplayString(r.current_step ?? r.currentStep),
    current_layer: persistenceDisplayString(r.current_layer ?? r.currentLayer),
    duration_minutes:
      typeof r.duration_minutes === "number"
        ? r.duration_minutes
        : typeof r.durationMinutes === "number"
          ? r.durationMinutes
          : null,
    last_insight: persistenceDisplayString(r.last_insight ?? r.lastInsight),
    resume_available: Boolean(r.resume_available ?? r.resumeAvailable),
  };
}

export function normalizeSupervisionCaseSummary(raw: unknown): SupervisionCaseSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const summary = normalizeSummaryFields(raw as Record<string, unknown>);
  if (!summary.id) return null;
  return summary;
}

export function caseSummaryRowToSupervisionSummary(row: CaseSummaryRow): SupervisionCaseSummary {
  return normalizeSummaryFields(row);
}

function lastBlockAfterPrefix(blob: string, prefix: string): string | null {
  const idx = blob.lastIndexOf(prefix);
  if (idx < 0) return null;
  let rest = blob.slice(idx + prefix.length).trimStart();
  const cut = rest.indexOf("\n\n");
  if (cut >= 0) rest = rest.slice(0, cut).trimEnd();
  return rest.length ? rest : null;
}

function collectRegexMatches(text: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  while ((m = r.exec(text)) !== null) {
    if (m[1]) out.push(m[1].trim());
  }
  return out;
}

/** Best-effort parse of `case_context` lines appended by `assistant-reducer`. */
export function parseCaseContextBlob(caseContext: string | null): SupervisionCaseParsedFields {
  const blob = (caseContext ?? "").trim();
  const supervisionConfirmed = lastBlockAfterPrefix(blob, "Запрос на супервизию (подтверждено):\n");
  const supervisionDraft = lastBlockAfterPrefix(blob, "Запрос на супервизию:\n");
  const supervisionRequest = supervisionConfirmed ?? supervisionDraft;

  let therapistIdentityLine: string | null = null;
  let modalitiesLine: string | null = null;
  const profIdx = blob.lastIndexOf("[Профиль специалиста]");
  if (profIdx >= 0) {
    const slice = blob.slice(profIdx);
    const spec = slice.match(/Специализация:\s*([^\n]+)/);
    const meth = slice.match(/Подходы и методы:\s*([^\n]+)/);
    therapistIdentityLine = spec?.[1]?.trim() ?? null;
    modalitiesLine = meth?.[1]?.trim() ?? null;
  }

  const styles = collectRegexMatches(blob, /^Стиль супервизора:\s*(.+)$/gm);
  const focuses = collectRegexMatches(blob, /^Фокус разбора:\s*(.+)$/gm);
  const depths = collectRegexMatches(blob, /^Глубина разбора:\s*(.+)$/gm);

  const supervisor_style = styles.length ? styles[styles.length - 1]! : null;
  const focus = focuses.length ? focuses[focuses.length - 1]! : null;
  const depth = depths.length ? depths[depths.length - 1]! : null;

  const answers: Array<{ moduleDotQuestion: string; answer: string }> = [];
  const qRe = /^(.+?\..+?)\nОтвет:\s*([\s\S]*?)(?=\n\n|$)/gm;
  let qm: RegExpExecArray | null;
  while ((qm = qRe.exec(blob)) !== null) {
    const head = qm[1]?.trim();
    const body = qm[2]?.trim();
    if (head && body && !head.startsWith("[Вопрос")) answers.push({ moduleDotQuestion: head, answer: body });
  }

  const interruptAnswers: Array<{ question: string; answer: string; analysis: string }> = [];
  const intRe = /\[Вопрос\s*\d+\s*[—-]\s*уточнение\]\s*\nВопрос:\s*([\s\S]*?)\nОтвет:\s*([\s\S]*?)\nАнализ:\s*([\s\S]*?)(?=\n\n|$)/g;
  let im: RegExpExecArray | null;
  while ((im = intRe.exec(blob)) !== null) {
    interruptAnswers.push({
      question: im[1]?.trim() ?? "",
      answer: im[2]?.trim() ?? "",
      analysis: im[3]?.trim() ?? "",
    });
  }

  let integrationReflection: string | null = null;
  const reflIdx = blob.lastIndexOf("Интеграционная рефлексия:\n");
  if (reflIdx >= 0) {
    integrationReflection = blob.slice(reflIdx + "Интеграционная рефлексия:\n".length).trimEnd();
    const statusCut = integrationReflection.search(/\n\nСтатус интеграционной рефлексии/);
    if (statusCut >= 0) integrationReflection = integrationReflection.slice(0, statusCut).trimEnd();
  }

  const previousChatAnalyses: Array<{ focusTitle: string; text: string }> = [];
  const chatRe = /\[Анализ переписки\s*[—-]\s*([^\]]+)\]\s*\n([\s\S]*?)(?=\n\n\[|\n\nЗапрос|\n\nИнтеграционная|\n\n\[Профиль|$)/g;
  let cm: RegExpExecArray | null;
  while ((cm = chatRe.exec(blob)) !== null) {
    previousChatAnalyses.push({
      focusTitle: cm[1]?.trim() ?? "",
      text: cm[2]?.trim() ?? "",
    });
  }

  return {
    supervisionRequest,
    therapistIdentityLine,
    modalitiesLine,
    supervisor_style,
    focus,
    depth,
    answers,
    interruptAnswers,
    integrationReflection,
    previousChatAnalyses,
  };
}

export function caseRowToSupervisionCase(row: CaseRow): SupervisionCase {
  const parsed = parseCaseContextBlob(row.case_context);
  const summary = normalizeSummaryFields({
    ...row,
    resume_available: Boolean(row.session_snapshot),
  });
  return {
    ...summary,
    ...parsed,
    focus: row.focus ?? parsed.focus,
    user_name: row.user_name,
    initial_case: row.initial_case,
    case_context: row.case_context,
    status: row.status,
  };
}
