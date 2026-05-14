/** Row shape for public.cases */
export type CaseRow = {
  id: number;
  user_id: string;
  user_name: string | null;
  case_title: string | null;
  client_name: string | null;
  first_session_date: string | null;
  initial_case: string | null;
  case_context: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  focus: string | null;
  current_step: string | null;
  current_layer: string | null;
  current_question: string | null;
  duration_minutes: number | null;
  last_insight: string | null;
  clinical_memory: Record<string, unknown> | null;
  session_snapshot: unknown | null;
  /** Generated column when present in select. */
  resume_available?: boolean;
};

/** Summary row for archive lists (get_user_cases) */
export type CaseSummaryRow = Pick<
  CaseRow,
  | "id"
  | "case_title"
  | "client_name"
  | "first_session_date"
  | "created_at"
  | "updated_at"
  | "status"
  | "focus"
  | "current_step"
  | "current_layer"
  | "duration_minutes"
  | "last_insight"
> & { resume_available: boolean };

/** List item for advanced modules (case picker); `id` is string for URLs and React keys. */
export type SupervisionCaseSummary = {
  id: string;
  case_title: string | null;
  client_name: string | null;
  first_session_date: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  focus: string | null;
  current_step: string | null;
  current_layer: string | null;
  duration_minutes: number | null;
  last_insight: string | null;
  /** True when a server snapshot exists for /assistant?resume= */
  resume_available: boolean;
};

/** Parsed supervision memory derived from `case_context` append log (+ row fields). */
export type SupervisionCaseParsedFields = {
  supervisionRequest: string | null;
  therapistIdentityLine: string | null;
  modalitiesLine: string | null;
  supervisor_style: string | null;
  focus: string | null;
  depth: string | null;
  answers: Array<{ moduleDotQuestion: string; answer: string }>;
  interruptAnswers: Array<{ question: string; answer: string; analysis: string }>;
  integrationReflection: string | null;
  /** Stored chat-analysis segments from assistant persistence (`[Анализ переписки — …]`). */
  previousChatAnalyses: Array<{ focusTitle: string; text: string }>;
};

/** Full case view for advanced modules (picker selection → loaded context). */
export type SupervisionCase = SupervisionCaseSummary &
  SupervisionCaseParsedFields & {
    user_name: string | null;
    initial_case: string | null;
    case_context: string | null;
    status: string | null;
  };

export type SupervisionProgressRow = {
  user_id: string;
  total_active_seconds: number;
  created_at: string;
  updated_at: string;
};

export type SupervisionSessionRow = {
  id: number;
  user_id: string;
  started_at: string;
  last_activity_at: string;
  active_seconds: number;
  is_open: boolean;
  closed_at: string | null;
};

export type SupervisionProgressComputed = {
  total_seconds: number;
  total_minutes: number;
  hours: number;
  minutes: number;
  target_hours: number;
  target_minutes: number;
  progress_percent: number;
};
