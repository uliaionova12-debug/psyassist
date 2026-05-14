import type {
  CaseRow,
  CaseSummaryRow,
  SupervisionCase,
  SupervisionCaseParsedFields,
  SupervisionCaseSummary,
} from "@/lib/persistence/types";

export function caseSummaryRowToSupervisionSummary(row: CaseSummaryRow): SupervisionCaseSummary {
  return {
    id: String(row.id),
    case_title: row.case_title,
    client_name: row.client_name,
    first_session_date: row.first_session_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: row.status,
    focus: row.focus,
    current_step: row.current_step,
    current_layer: row.current_layer,
    duration_minutes: row.duration_minutes,
    last_insight: row.last_insight,
    resume_available: Boolean(row.resume_available),
  };
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
  const summary: SupervisionCaseSummary = {
    id: String(row.id),
    case_title: row.case_title,
    client_name: row.client_name,
    first_session_date: row.first_session_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: row.status,
    focus: row.focus,
    current_step: row.current_step,
    current_layer: row.current_layer,
    duration_minutes: row.duration_minutes,
    last_insight: row.last_insight,
    resume_available: Boolean(row.session_snapshot),
  };
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
