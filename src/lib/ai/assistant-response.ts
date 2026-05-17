/** JSON body from POST /api/assistant and sibling clinical routes. */
export type AssistantApiPayload = {
  ok?: boolean;
  text?: string;
  code?: string;
  status?: string;
  retryable?: boolean;
  message?: string;
};

/** True only for explicit temporary overload — never `retryable` alone (avoids false overload UI). */
export function isTemporaryAiOverloadResponse(
  data: AssistantApiPayload | null | undefined
): boolean {
  if (!data || data.ok === true) return false;
  if (data.code === "TEMPORARY_AI_OVERLOAD") return true;
  return data.status === "temporary_ai_overload" && data.retryable === true;
}

export type AssistantPromptOutcome =
  | { kind: "success"; text: string }
  | { kind: "overload" }
  | { kind: "error" };

export function classifyAssistantPromptResponse(
  data: AssistantApiPayload | null | undefined
): AssistantPromptOutcome {
  if (data?.ok && data.text?.trim()) {
    return { kind: "success", text: data.text.trim() };
  }
  if (isTemporaryAiOverloadResponse(data)) {
    return { kind: "overload" };
  }
  return { kind: "error" };
}
