/**
 * In-memory Gemini API key override for local development only.
 * Cleared on server restart; never used when NODE_ENV !== "development".
 */

let runtimeApiKey: string | null = null;

export function setGeminiRuntimeApiKey(key: string | null): void {
  if (process.env.NODE_ENV !== "development") return;
  runtimeApiKey = key == null ? null : key.trim() || null;
}

export function getGeminiRuntimeApiKey(): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  return runtimeApiKey;
}
