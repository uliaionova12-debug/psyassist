import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Doc = {
  path?: string;
  type?: string;
  body: string;
};

const DOC_BEGIN = "===== DOCUMENT BEGIN =====";
const DOC_END = "===== DOCUMENT END =====";

const BASIC_LATIN_LOOKALIKES: Record<string, string> = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
  Y: "У",
  a: "а",
  c: "с",
  e: "е",
  o: "о",
  p: "р",
  x: "х",
  y: "у",
  k: "к",
  m: "м",
  t: "т",
  h: "н",
};

// Small, deterministic "patches" for OCR-specific garbage seen in this dataset.
// These are applied before generic filtering to salvage meaningful Russian text.
const DATASET_FIXES: Array<{ re: RegExp; to: string }> = [
  { re: /\[TapannenbHble/gu, to: "Параллельные" },
  { re: /\bNpouecchbl\b/gu, to: "процессы" },
  { re: /\bnpoLeccshl\b/gu, to: "процессы" },
  { re: /\b3TO\b/gu, to: "ЭТО" },
  { re: /\bNPOABNEHNA\b/gu, to: "ПРОЯВЛЕНИЯ" },
  { re: /\bB3AUMOOTHOLLEHNN\b/gu, to: "ВЗАИМООТНОШЕНИЙ" },
  { re: /\bMEX IY\b/gu, to: "МЕЖДУ" },
  { re: /\bNCUXOTEPANeBTOM\b/gu, to: "ПСИХОТЕРАПЕВТОМ" },
  { re: /\bCynepBU3NPYEMbBIM\b/gu, to: "СУПЕРВИЗИРУЕМЫМ" },
  { re: /\bCYNepBMU30pOM\b/gu, to: "СУПЕРВИЗОРОМ" },
  { re: /\bOTpaXKaroLLMe\b/gu, to: "ОТРАЖАЮЩИЕ" },
  { re: /\bNOAEHTUYHbIE\b/gu, to: "ИДЕНТИЧНЫЕ" },
  { re: /\bNCUXOTEPaANneBTOM\b/gu, to: "ПСИХОТЕРАПЕВТОМ" },
  { re: /\bW\b/gu, to: "и" },
  { re: /\bnauneHToM\b/gu, to: "пациентом" },
  { re: /\bFpynmnon\b/gu, to: "групповой" },
  { re: /\bCEMbeN\b/gu, to: "семейной" },
  { re: /\bKnoHnpoBaHme\b/gu, to: "«Клонирование»" },
  { re: /\bTeparneBTUYEeCKOmn\b/gu, to: "терапевтической" },
  { re: /\bCUCTEMDI\b/gu, to: "системы" },
];

function normalizeText(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function applyCharMap(s: string, map: Record<string, string>) {
  let out = "";
  for (const ch of s) out += map[ch] ?? ch;
  return out;
}

function countMatches(s: string, re: RegExp) {
  const m = s.match(re);
  return m ? m.length : 0;
}

function cyrillicRatio(s: string) {
  const letters = countMatches(s, /[A-Za-z\u0400-\u04FF]/gu);
  if (letters === 0) return 0;
  const cyr = countMatches(s, /[\u0400-\u04FF]/gu);
  return cyr / letters;
}

function isLikelyMetadataLine(line: string) {
  const l = line.trim();
  if (!l) return true;
  if (l === DOC_BEGIN || l === DOC_END) return true;
  if (l.startsWith("path: ")) return true;
  if (l.startsWith("type: ")) return true;
  if (/^\|?\s*\d{1,4}\s*$/.test(l)) return true; // page numbers like "| 56" or "56"
  if (/^_+\s*\d+%$/.test(l)) return true; // OCR progress like "_ 70%"
  return false;
}

function stitchHyphenation(lines: string[]) {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i] ?? "";
    const next = lines[i + 1] ?? "";
    if (
      cur.endsWith("-") &&
      next &&
      /^[а-яё]/iu.test(next.trim()) &&
      /[а-яё]$/iu.test(cur.slice(0, -1))
    ) {
      out.push(cur.slice(0, -1) + next.trimStart());
      i += 1;
      continue;
    }
    out.push(cur);
  }
  return out;
}

function cleanBody(body: string) {
  const rawLines = normalizeText(body).split("\n");
  const lines0 = rawLines
    .map((l) => l.trim())
    .filter((l) => !isLikelyMetadataLine(l));

  const lines1 = stitchHyphenation(lines0).map((l) => l.replace(/\s+/g, " ").trim());

  const kept: string[] = [];
  const dropped: Array<{ reason: string; line: string }> = [];

  for (const original of lines1) {
    let line = original;

    for (const fix of DATASET_FIXES) line = line.replace(fix.re, fix.to);
    line = applyCharMap(line, BASIC_LATIN_LOOKALIKES);

    // Remove obvious OCR junk tokens.
    line = line
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/«{2,}/g, "«")
      .replace(/»{2,}/g, "»")
      .replace(/\s*([,.;:!?])\s*/g, "$1 ")
      .replace(/\s+\)/g, ")")
      .replace(/\(\s+/g, "(")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!line) continue;
    const ratio = cyrillicRatio(line);
    const cyrCount = countMatches(line, /[\u0400-\u04FF]/gu);
    const latinCount = countMatches(line, /[A-Za-z]/g);

    // Keep lines that look like real Russian sentences/definitions.
    if (latinCount >= 3) {
      dropped.push({ reason: `too_much_latin(n=${latinCount})`, line: original });
      continue;
    }

    if (line.length < 12) {
      if (latinCount === 0 && cyrCount >= 5) {
        kept.push(line);
        continue;
      }
      dropped.push({ reason: "too_short", line: original });
      continue;
    }

    if (cyrCount >= 10 && ratio >= 0.6) {
      kept.push(line);
      continue;
    }

    dropped.push({ reason: `low_cyrillic(r=${ratio.toFixed(2)})`, line: original });
  }

  // Join into paragraphs; keep stable output (no randomization).
  const cleaned = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { cleaned, keptLines: kept.length, dropped };
}

function parseDocs(raw: string): Doc[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const docs: Doc[] = [];

  let inDoc = false;
  let current: Doc | null = null;
  const buf: string[] = [];

  for (const line of lines) {
    const l = line.trimEnd();
    if (l === DOC_BEGIN) {
      inDoc = true;
      current = { body: "" };
      buf.length = 0;
      continue;
    }
    if (l === DOC_END) {
      if (inDoc && current) {
        current.body = buf.join("\n");
        docs.push(current);
      }
      inDoc = false;
      current = null;
      buf.length = 0;
      continue;
    }
    if (!inDoc || !current) continue;

    if (l.startsWith("path: ")) current.path = l.slice("path: ".length).trim();
    else if (l.startsWith("type: ")) current.type = l.slice("type: ".length).trim();
    else buf.push(l);
  }

  return docs;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");

  const rawFile = path.join(repoRoot, "outputs", "raw_text.txt");
  const outFile = path.join(repoRoot, "outputs", "clean_text.txt");

  const raw = await fs.readFile(rawFile, "utf8");
  const docs = parseDocs(raw);

  let keptDocs = 0;
  let droppedDocs = 0;
  let keptLines = 0;
  let droppedLines = 0;
  const droppedExamples: string[] = [];

  const outParts: string[] = [];
  for (const doc of docs) {
    const { cleaned, keptLines: k, dropped } = cleanBody(doc.body);
    keptLines += k;
    droppedLines += dropped.length;
    if (droppedExamples.length < 10) {
      for (const d of dropped) {
        if (droppedExamples.length >= 10) break;
        droppedExamples.push(`${d.reason}: ${d.line}`);
      }
    }

    if (cleaned) {
      keptDocs += 1;
      outParts.push(cleaned);
    } else {
      droppedDocs += 1;
    }
  }

  const merged = outParts.join("\n\n").trim() + "\n";
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, merged, "utf8");

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        inFile: path.relative(repoRoot, rawFile),
        outFile: path.relative(repoRoot, outFile),
        docs_total: docs.length,
        docs_kept: keptDocs,
        docs_dropped: droppedDocs,
        lines_kept: keptLines,
        lines_dropped: droppedLines,
        dropped_examples: droppedExamples,
      },
      null,
      2
    )
  );
}

await main();

