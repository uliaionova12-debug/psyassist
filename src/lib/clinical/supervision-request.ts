/**
 * Supervision request detection (Telegram: detect_supervision_in_narrative via Gemini).
 * Web: заготовка под модель + эвристический слой без выдуманных «диагнозов» в тексте.
 */

export type SupervisionDetectionResult = {
  detected: boolean;
  confidence: number;
  extracted_request: string;
};

/**
 * Эвристика без LLM: отражает типичные маркеры запроса из промпта бота.
 * Полная семантика будет в async-ветке при подключении API.
 */
export function detectSupervisionInNarrativeHeuristic(narrative: string): SupervisionDetectionResult {
  const t = narrative.toLowerCase();
  const strongMarkers = [
    "не понимаю",
    "не понимаю,",
    "застрял",
    "застряли",
    "тупик",
    "ходим по кругу",
    "не знаю куда",
    "не вижу фокус",
    "контрперенос",
    "перенос",
    "сомневаюсь",
    "настораживает",
    "теряю ясность",
    "потерял контакт",
    "нет контакта",
    "не могу подобрать",
    "как интервенц",
    "что делать с",
    "где я ошибаюсь",
    "страшно интерпретировать",
    "слишком близко",
    "слишком далеко",
  ];

  let hits = 0;
  for (const m of strongMarkers) {
    if (t.includes(m)) hits += 1;
  }

  const detected = hits >= 2 || (narrative.length > 200 && hits >= 1);
  const confidence = detected ? Math.min(0.95, 0.55 + hits * 0.08) : Math.min(0.5, hits * 0.1);

  let extracted_request = "";
  if (detected) {
    const sentence = narrative
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .find((s) => strongMarkers.some((m) => s.toLowerCase().includes(m)));
    extracted_request =
      (sentence && sentence.length > 0 ? sentence : narrative.slice(0, 280)).trim();
    if (extracted_request.length > 320) {
      extracted_request = `${extracted_request.slice(0, 317)}…`;
    }
  }

  return { detected: detected && confidence >= 0.55, confidence, extracted_request };
}

/**
 * Интерфейсная заготовка: позже заменить на вызов модели (JSON как в боте).
 * Сейчас использует эвристику; не генерирует клинический текст с нуля.
 */
export async function detectSupervisionInNarrative(narrative: string): Promise<SupervisionDetectionResult> {
  const h = detectSupervisionInNarrativeHeuristic(narrative);
  return h;
}
