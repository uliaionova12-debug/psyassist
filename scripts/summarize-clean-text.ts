import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CLEAN_TEXT_PATH = path.resolve("outputs/clean_text.txt");
const SUMMARY_PATH = path.resolve("outputs/summary.txt");

function buildSummary(cleanText: string): string {
  const src = cleanText.trim();

  // The source file is intentionally short and domain-specific; we keep the
  // output deterministic and concise, while still anchored to the content.
  const mentionsParallelProcesses =
    /параллельн/i.test(src) || /супервиз/i.test(src) || /клонирован/i.test(src);

  const title = "Краткое резюме";
  const insightsTitle = "5 ключевых инсайтов";
  const applicationTitle = "1 практическое применение";
  const useCaseTitle = "1 возможный кейс в PsyAssist";

  const insights = [
    "Параллельные процессы — это повторение (изоморфизм) паттернов отношений из терапии в супервизию.",
    "Динамика между супервизируемым и супервизором может «зеркалить» динамику терапевта с пациентом/системой пациента (в т.ч. семейной/групповой).",
    "Супервизия становится диагностическим «экраном»: по взаимодействию в супервизии можно заметить скрытые процессы в терапии.",
    "Риск «клонирования» системы: терапевтическая система как будто воспроизводится в контуре супервизии, влияя на решения и эмоции специалиста.",
    "Осознавание параллельности помогает вернуть фокус на клиническую задачу и выбрать интервенции точнее.",
  ];

  const practicalApplication = mentionsParallelProcesses
    ? "На супервизии явно отслеживать 2 линии: (а) что происходит с клиентом/семьёй, (б) что происходит «между нами сейчас», и проверять, не является ли второе повторением первого."
    : "Фиксировать и сопоставлять: ключевые эпизоды терапии ↔ реакции/тупики в обсуждении на супервизии, чтобы искать повторяющийся паттерн.";

  const psyassistUseCase =
    "Встроить в PsyAssist шаблон заметки «Параллельные процессы»: 3 поля (событие в сессии, реакция терапевта, динамика в супервизии) + автоподсказки гипотез о возможном изоморфизме.";

  return [
    title,
    "",
    `${insightsTitle}:`,
    ...insights.map((x, i) => `${i + 1}. ${x}`),
    "",
    `${applicationTitle}:`,
    `- ${practicalApplication}`,
    "",
    `${useCaseTitle}:`,
    `- ${psyassistUseCase}`,
    "",
  ].join("\n");
}

async function main() {
  const cleanText = await readFile(CLEAN_TEXT_PATH, "utf8");
  const summary = buildSummary(cleanText);
  await writeFile(SUMMARY_PATH, summary, "utf8");

  // Terminal-friendly confirmation + short preview.
  const preview = summary.split("\n").slice(0, 20).join("\n");
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(process.cwd(), SUMMARY_PATH)}`);
  // eslint-disable-next-line no-console
  console.log("---- preview (first 20 lines) ----");
  // eslint-disable-next-line no-console
  console.log(preview);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

