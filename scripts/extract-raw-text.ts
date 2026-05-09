import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pLimit from "p-limit";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

const require = createRequire(import.meta.url);
const pdfParse: (data: Buffer) => Promise<{ text?: string }> = require("pdf-parse");
const engTrainedData: { langPath: string; gzip: boolean } = require("@tesseract.js-data/eng");

type ExtractedDoc = {
  relativePath: string;
  kind: "pdf" | "image";
  text: string;
};

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg"]);
const SUPPORTED_EXTS = new Set([".pdf", ".png", ".jpg", ".jpeg"]);

function isHiddenOrSystemFile(name: string) {
  return name.startsWith(".") || name === "Thumbs.db";
}

async function walkFiles(dirAbs: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  for (const entry of entries) {
    if (isHiddenOrSystemFile(entry.name)) continue;
    const full = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function extractPdfText(fileAbs: string): Promise<string> {
  const buf = await fs.readFile(fileAbs);
  const res = await pdfParse(buf);
  return (res.text ?? "").trim();
}

async function ocrImages(
  imagePathsAbs: string[],
  options: {
    language: string;
    concurrency: number;
    langPath: string;
    gzip: boolean;
    cachePath: string;
  }
): Promise<Map<string, string>> {
  const worker = await createWorker(options.language, undefined, {
    langPath: options.langPath,
    gzip: options.gzip,
    cachePath: options.cachePath,
  });
  const limit = pLimit(Math.max(1, Math.floor(options.concurrency)));

  try {
    const results = await Promise.all(
      imagePathsAbs.map((imgAbs) =>
        limit(async () => {
          // Normalize for OCR: rotate based on EXIF, upscale a bit, force grayscale.
          const png = await sharp(imgAbs)
            .rotate()
            .grayscale()
            .resize({ width: 2000, withoutEnlargement: false })
            .png()
            .toBuffer();

          const {
            data: { text },
          } = await worker.recognize(png);
          return [imgAbs, (text ?? "").trim()] as const;
        })
      )
    );

    return new Map(results);
  } finally {
    await worker.terminate();
  }
}

function buildOutput(docs: ExtractedDoc[]) {
  const parts: string[] = [];
  for (const doc of docs) {
    parts.push(
      [
        "===== DOCUMENT BEGIN =====",
        `path: ${doc.relativePath}`,
        `type: ${doc.kind}`,
        "",
        doc.text,
        "",
        "===== DOCUMENT END =====",
        "",
      ].join("\n")
    );
  }

  const merged = parts.join("\n").trim() + "\n";
  const sha256 = createHash("sha256").update(merged).digest("hex");

  return {
    merged,
    sha256,
    docCount: docs.length,
  };
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const repoRoot = path.resolve(__dirname, "..");
  const dataDir = path.join(repoRoot, "data");
  const outputsDir = path.join(repoRoot, "outputs");
  const outFile = path.join(outputsDir, "raw_text.txt");
  const logFile = path.join(outputsDir, "extraction_log.txt");

  const logLines: string[] = [];
  const startedAt = new Date();
  logLines.push(`started_at: ${startedAt.toISOString()}`);
  logLines.push(`data_dir: ${path.relative(repoRoot, dataDir)}`);

  const allFilesAbs = (await walkFiles(dataDir))
    .filter((p) => SUPPORTED_EXTS.has(path.extname(p).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const pdfsAbs = allFilesAbs.filter((p) => path.extname(p).toLowerCase() === ".pdf");
  const imagesAbs = allFilesAbs.filter((p) =>
    IMAGE_EXTS.has(path.extname(p).toLowerCase())
  );

  const extracted: ExtractedDoc[] = [];
  let pdfOk = 0;
  let pdfErr = 0;
  let imgOk = 0;
  let imgErr = 0;

  // PDFs (fast, no external worker needed)
  for (const pdfAbs of pdfsAbs) {
    const relativePath = path.relative(repoRoot, pdfAbs);
    try {
      const text = await extractPdfText(pdfAbs);
      extracted.push({ relativePath, kind: "pdf", text });
      pdfOk += 1;
      logLines.push(`ok pdf ${relativePath} chars=${text.length}`);
    } catch (err) {
      pdfErr += 1;
      logLines.push(
        `err pdf ${relativePath} ${(err as Error)?.message ?? String(err)}`
      );
    }
  }

  // Images (OCR)
  if (imagesAbs.length > 0) {
    try {
      const ocrMap = await ocrImages(imagesAbs, {
        language: "eng",
        concurrency: 2,
        langPath: engTrainedData.langPath,
        gzip: engTrainedData.gzip,
        cachePath: path.join(repoRoot, ".cache", "tesseract"),
      });

      for (const imgAbs of imagesAbs) {
        const relativePath = path.relative(repoRoot, imgAbs);
        const text = ocrMap.get(imgAbs);
        if (typeof text === "string") {
          extracted.push({ relativePath, kind: "image", text });
          imgOk += 1;
          logLines.push(`ok image ${relativePath} chars=${text.length}`);
        } else {
          imgErr += 1;
          logLines.push(`err image ${relativePath} missing_ocr_result`);
        }
      }
    } catch (err) {
      // If OCR worker fails, still write a useful log and continue gracefully.
      imgErr += imagesAbs.length;
      logLines.push(`err ocr_worker ${(err as Error)?.message ?? String(err)}`);
      for (const imgAbs of imagesAbs) {
        const relativePath = path.relative(repoRoot, imgAbs);
        logLines.push(`err image ${relativePath} ocr_worker_failed`);
      }
    }
  }

  // Keep output stable: sort by relative path.
  extracted.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const { merged, sha256, docCount } = buildOutput(extracted);

  await fs.mkdir(outputsDir, { recursive: true });
  await fs.writeFile(outFile, merged, "utf8");
  const finishedAt = new Date();
  logLines.push(`finished_at: ${finishedAt.toISOString()}`);
  logLines.push(
    `summary documents=${docCount} pdf_ok=${pdfOk} pdf_err=${pdfErr} image_ok=${imgOk} image_err=${imgErr} sha256=${sha256}`
  );
  await fs.writeFile(logFile, logLines.join("\n").trim() + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        dataDir: path.relative(repoRoot, dataDir),
        outFile: path.relative(repoRoot, outFile),
        logFile: path.relative(repoRoot, logFile),
        documents: docCount,
        sha256,
      },
      null,
      2
    )
  );
}

await main();
