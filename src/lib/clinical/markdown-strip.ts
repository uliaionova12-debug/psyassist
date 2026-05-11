/**
 * Conservative markdown cleanup for clinical / supervisee-facing Russian text.
 * Removes common Gemini/markdown artifacts while keeping wording readable.
 */

const MEMORY_PHRASE_SPLIT_RE = /(?:^|\n)\s*Фраза на память\s*\n?/i;

/**
 * Strip markdown-style markup from clinical model output.
 */
export function stripClinicalMarkdown(raw: string): string {
  if (!raw) return "";

  let s = raw.replace(/\r\n/g, "\n");

  // Fenced code blocks (handles ```lang newline bodies).
  s = s.replace(/^```[^\n`]*\n([\s\S]*?)^```\s*/gm, "$1");
  s = s.replace(/```([^`\n][^`]*?)```/g, "$1");

  // Inline code spans (paired backticks only).
  s = s.replace(/`([^`]+)`/g, "$1");

  // Markdown links: [label](url) → label
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Bold / strong (__ … __ before single underscores — avoids breaking italic heuristic below).
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");

  // Italic on single lines: *phrase* / _phrase_
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s),.!?;:]|$)/g, "$1$2");
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s),.!?;:]|$)/g, "$1$2");

  // ATX headings
  s = s.replace(/^#{1,6}\s+/gm, "");

  // List bullets / enumerators at line starts (preserve numbered intent lightly — strip markdown chars).
  s = s.replace(/^[\t ]{0,3}[-*+•●○◦]\s+/gm, "");
  s = s.replace(/^[\t ]{0,3}\d+\.\s+/gm, "");

  // Stray emphasis fragments models sometimes leak.
  s = s.replace(/\*\*/g, "");
  s = s.replace(/\*{2,}/g, "");
  s = s.replace(/_{3,}/g, "");

  return s.replace(/\n{3,}/g, "\n\n").trim();
}

function heuristicMemoryPhraseFromTail(fullStripped: string): string | null {
  const trimmed = fullStripped.trim();
  if (!trimmed) return null;

  const blocks = trimmed.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const lastBlock = blocks[blocks.length - 1];
  if (!lastBlock) return null;

  const lines = lastBlock.split("\n").map((l) => l.trim()).filter(Boolean);
  const candidate = lines.length ? lines[lines.length - 1] : lastBlock;

  if (!candidate || candidate.length > 220) return null;
  if (/^#{1,6}\s/.test(candidate)) return null;
  if (/^[-*•]\s/.test(candidate)) return null;

  return candidate;
}

/**
 * Pull «Фраза на память» from integration reflection when that section exists;
 * otherwise minimal heuristic on the stripped tail.
 */
export function extractMemoryPhraseFromReflection(text: string): string | null {
  const stripped = stripClinicalMarkdown(text);
  if (!stripped) return null;

  const parts = stripped.split(MEMORY_PHRASE_SPLIT_RE);
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1].trim();
    const firstPara = tail.split(/\n\s*\n/).find((p) => p.trim())?.trim() ?? "";
    const firstLine = firstPara.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
    if (firstLine && firstLine.length <= 240) return firstLine;
  }

  return heuristicMemoryPhraseFromTail(stripped);
}
