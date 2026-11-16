export const RAZBOR_HOST = "razbor.psyassist.pro";
export const RAZBOR_SITE_URL = `https://${RAZBOR_HOST}`;

export const PAY_INDIVIDUAL_URL =
  "https://qr.nspk.ru/AD201033DSMORS2E8IE8VMAPKVS11EPI";
export const BOOKING_URL = "https://calendar.app.google/cXbQjt8vaGnwimGF8";

export const PRICE_INDIVIDUAL = "4 000 ₽";
export const PRICE_COUPLE = "5 000 ₽";

export const CONTACTS = {
  ownerFull: "ИП Ионова Юлия Витальевна",
  inn: "860201593696",
  ogrnip: "307860204500052",
  address: "Санкт-Петербург, ул. Монетная, 29/1",
  email: "uliaionova12@gmail.com",
  phoneDisplay: "+7 (982) 515 63 77",
  phoneHref: "tel:+79825156377",
} as const;

export type RazborFormat = "individual" | "couple";

export const FORMAT_LABELS: Record<RazborFormat, string> = {
  individual: "Индивидуально",
  couple: "Семейная пара",
};

export const TOPICS: Record<RazborFormat, readonly string[]> = {
  individual: [
    "Тревога и страхи",
    "Отношения",
    "Карьера и выгорание",
    "Другое",
  ],
  couple: [
    "Конфликты",
    "Ревность и недоверие",
    "Развод или расставание",
    "Другое",
  ],
};

export const HOW_LONG_OPTIONS = [
  "Меньше месяца",
  "1–6 месяцев",
  "От полугода до года",
  "Больше года",
] as const;

export const ANSWER_LIMITS = {
  what: { min: 10, max: 3000 },
  text: 2000,
  howLong: 200,
  name: 80,
  contact: 120,
} as const;

export type RazborAnswers = {
  what: string;
  howLong: string;
  tried: string;
  want: string;
  whyNow: string;
};

export type ClientMap = {
  short: string;
  focus: string[];
  first_session: string;
  next_step: string;
};

export type InternalNote = {
  hypotheses: string;
  risks: string;
  questions: string[];
  plan: string;
};

export type RazborApiSuccess = {
  ok: true;
  client_map: ClientMap;
  ai_status: "ok" | "error";
  saved: boolean;
};

export type RazborApiError = {
  ok: false;
  code: "INVALID_BODY" | "RATE_LIMITED" | "SERVER_ERROR";
  message: string;
};
