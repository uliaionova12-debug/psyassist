/**
 * Профиль специалиста для клинических промптов супервизии (не биллинг).
 */

export const THERAPIST_SPECIALIZATION_OTHER = "Другое";
export const THERAPIST_METHOD_OTHER = "Другое";

export const THERAPIST_SPECIALIZATION_OPTIONS = [
  "Психолог-консультант",
  "Клинический психолог",
  "Психотерапевт",
  "Психоаналитик",
  "Гештальт-терапевт",
  "КПТ-терапевт",
  "Схема-терапевт",
  "ЭФТ-терапевт",
  "Психодраматист",
  "Семейный психолог",
  "Детский психолог",
  "Подростковый психолог",
  "Сексолог",
  "Кризисный психолог",
  "Коуч",
  "Ментор",
  "Супервизор",
  "Бизнес-тренер",
  THERAPIST_SPECIALIZATION_OTHER,
] as const;

export const THERAPIST_METHOD_OPTIONS = [
  "Когнитивно-поведенческая терапия",
  "Психоанализ",
  "Психодинамический подход",
  "Гештальт-подход",
  "Схема-терапия",
  "ЭФТ",
  "Психодрама",
  "Транзактный анализ",
  "Логотерапия",
  "Экзистенциальный подход",
  "Системная семейная терапия",
  "Нарративная практика",
  "ОРКТ",
  "Кризисная терапия",
  "Эриксоновский гипноз",
  "Телесно-ориентированный подход",
  "EMDR",
  "ACT",
  "DBT",
  "Интегративный подход",
  "Коучинговый подход",
  THERAPIST_METHOD_OTHER,
] as const;

export type TherapistProfileSlice = {
  therapistSpecializations: string[];
  therapistMethods: string[];
  therapistOtherSpecialization: string;
  therapistOtherMethods: string;
};

export function formatTherapistSpecializationsLine(p: TherapistProfileSlice): string {
  const parts = [...p.therapistSpecializations.filter((x) => x !== THERAPIST_SPECIALIZATION_OTHER)];
  if (p.therapistSpecializations.includes(THERAPIST_SPECIALIZATION_OTHER) && p.therapistOtherSpecialization.trim()) {
    parts.push(`Другое: ${p.therapistOtherSpecialization.trim()}`);
  }
  return parts.length ? parts.join("; ") : "не указано";
}

export function formatTherapistMethodsLine(p: TherapistProfileSlice): string {
  const parts = [...p.therapistMethods.filter((x) => x !== THERAPIST_METHOD_OTHER)];
  if (p.therapistMethods.includes(THERAPIST_METHOD_OTHER) && p.therapistOtherMethods.trim()) {
    parts.push(`Другое: ${p.therapistOtherMethods.trim()}`);
  }
  return parts.length ? parts.join("; ") : "не указано";
}

/** Блок для вставки в промпты супервизии (после CASE_BASE или в system context). */
export function buildTherapistSupervisionPromptInjection(p: TherapistProfileSlice): string {
  const specLine = formatTherapistSpecializationsLine(p);
  const methLine = formatTherapistMethodsLine(p);
  return (
    "\n\n=== ПРОФЕССИОНАЛЬНЫЙ ПРОФИЛЬ ТЕРАПЕВТА ===\n" +
    "Вы даёте супервизионную обратную связь специалисту, который указал профессиональную специализацию:\n" +
    `${specLine}\n\n` +
    "Специалист работает в подходах и методах:\n" +
    `${methLine}\n\n` +
    "Учитывайте эту профессиональную идентичность при выборе языка, гипотез, интервенций и тактики.\n" +
    "Говорите как опытный супервизор коллеге.\n" +
    "Не обучайте с нуля.\n" +
    "Не обесценивайте квалификацию специалиста.\n" +
    "Не навязывайте метод, которого специалист не заявлял.\n" +
    "Если метод специалиста не подходит к динамике кейса, мягко покажите ограничение и предложите профессионально совместимую рамку.\n\n" +
    "Требования к разбору:\n" +
    "— ответьте на супервизионный запрос терапевта напрямую;\n" +
    "— углубите и расширьте клиническое мышление;\n" +
    "— поддержите профессиональную позицию терапевта там, где это клинически обосновано;\n" +
    "— покажите скрытую динамику и контекст;\n" +
    "— используйте формулировки гипотез, не диагнозы;\n" +
    "— предложите следующие терапевтические шаги, совместимые с заявленными методами;\n" +
    "— при видимом контрпереносе называйте это аккуратно;\n" +
    "— при рисках границ обозначайте их прямо;\n" +
    "— без обобщающей мотивационной риторики и контент-маркетинга;\n" +
    "— без формулировок вроде «по представленному материалу»;\n" +
    "— без академической лекции.\n"
  );
}

/** Текст для append в case_context (Supabase). */
export function buildTherapistProfilePersistenceAddition(p: TherapistProfileSlice): string {
  return (
    `[Профиль специалиста]\n` +
    `Специализация: ${formatTherapistSpecializationsLine(p)}\n` +
    `Подходы и методы: ${formatTherapistMethodsLine(p)}\n`
  );
}

/** Для API-маршрутов: собрать блок профиля или вернуть undefined, если данных нет. */
export function therapistPromptInjectionFromArrays(input: {
  therapistSpecializations?: string[] | undefined;
  therapistMethods?: string[] | undefined;
  therapistOtherSpecialization?: string | undefined;
  therapistOtherMethods?: string | undefined;
}): string | undefined {
  const therapistSpecializations = input.therapistSpecializations ?? [];
  const therapistMethods = input.therapistMethods ?? [];
  if (therapistSpecializations.length === 0 && therapistMethods.length === 0) return undefined;
  return buildTherapistSupervisionPromptInjection({
    therapistSpecializations,
    therapistMethods,
    therapistOtherSpecialization: input.therapistOtherSpecialization ?? "",
    therapistOtherMethods: input.therapistOtherMethods ?? "",
  });
}
