import { z } from "zod";

import { ANSWER_LIMITS, HOW_LONG_OPTIONS, TOPICS } from "@/lib/razbor/config";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().default("");

export const RazborRequestSchema = z
  .object({
    format: z.enum(["individual", "couple"]),
    topic: z.string().trim().min(1).max(80),
    answers: z.object({
      what: z
        .string()
        .trim()
        .min(ANSWER_LIMITS.what.min)
        .max(ANSWER_LIMITS.what.max),
      howLong: optionalText(ANSWER_LIMITS.howLong),
      tried: optionalText(ANSWER_LIMITS.text),
      want: optionalText(ANSWER_LIMITS.text),
      whyNow: optionalText(ANSWER_LIMITS.text),
    }),
    name: z.string().trim().min(1).max(ANSWER_LIMITS.name),
    contact: z.string().trim().min(3).max(ANSWER_LIMITS.contact),
    consent: z.literal(true),
    website: z.string().max(0).optional(),
  })
  .refine((v) => TOPICS[v.format].includes(v.topic), { path: ["topic"] })
  .refine(
    (v) =>
      !v.answers.howLong ||
      (HOW_LONG_OPTIONS as readonly string[]).includes(v.answers.howLong),
    {
      path: ["answers", "howLong"],
    },
  );

export type RazborRequest = z.infer<typeof RazborRequestSchema>;

const nonEmpty = z.string().trim().min(1);

export const AiResponseSchema = z.object({
  client_map: z.object({
    short: nonEmpty,
    focus: z.array(nonEmpty).min(2).max(4),
    first_session: nonEmpty,
    next_step: nonEmpty,
  }),
  internal_note: z.object({
    hypotheses: z.union([nonEmpty, z.array(nonEmpty).min(1)]),
    risks: z.union([z.string(), z.array(z.string())]),
    questions: z.array(nonEmpty).min(3).max(5),
    plan: z.union([nonEmpty, z.array(nonEmpty).min(1)]),
  }),
});
