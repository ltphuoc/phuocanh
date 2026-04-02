import "server-only";
import { z } from "zod";
import type { Locale } from "@/i18n/routing";
import { env } from "@/lib/env";

const OPENAI_DAILY_QUESTION_TIMEOUT_MS = 15_000;

const generatedDailyQuestionSchema = z.object({
  question: z.string().trim().min(1).max(240),
});

const responsesApiContentSchema = z.object({
  parsed: generatedDailyQuestionSchema.optional(),
  refusal: z.string().trim().min(1).optional(),
  text: z.string().optional(),
  type: z.string().optional(),
});

const responsesApiResponseSchema = z.object({
  error: z
    .object({
      message: z.string().trim().min(1),
    })
    .optional(),
  incomplete_details: z
    .object({
      reason: z.string().trim().min(1),
    })
    .optional(),
  output: z
    .array(
      z.object({
        type: z.string().optional(),
        content: z
          .array(responsesApiContentSchema)
          .optional(),
      }),
    )
    .optional(),
  output_parsed: generatedDailyQuestionSchema.optional(),
  output_text: z.string().optional(),
  status: z.string().optional(),
});

interface GenerateDailyQuestionPromptOptions {
  readonly coupleName: string | null;
  readonly locale: Locale;
  readonly roundDate: string;
}

const localeInstructionByValue: Record<Locale, string> = {
  en: "Write the final question in English.",
  vi: "Write the final question in Vietnamese.",
};

const buildPromptInput = ({
  coupleName,
  locale,
  roundDate,
}: GenerateDailyQuestionPromptOptions): string => {
  const namedCoupleInstruction = coupleName
    ? `The couple space is named "${coupleName}".`
    : "The couple has not set a visible couple name.";

  return [
    "You are writing one daily question for a private two-person couple app.",
    "Return exactly one short open-ended question that invites a thoughtful personal answer.",
    "Keep it warm, specific, and safe for a real relationship.",
    "Do not mention games, scoring, or streaks.",
    "Avoid yes/no questions, roleplay, therapy language, or anything sexual, explicit, or hostile.",
    "Do not include numbering, labels, or extra commentary.",
    namedCoupleInstruction,
    `This question is for the couple's local day ${roundDate}.`,
    localeInstructionByValue[locale],
  ].join(" ");
};

const parseResponseJson = (rawResponseText: string): unknown | null => {
  if (rawResponseText.length === 0) {
    return null;
  }

  try {
    return JSON.parse(rawResponseText) as unknown;
  } catch {
    return null;
  }
};

const extractParsedPrompt = (
  response: z.infer<typeof responsesApiResponseSchema>,
): string => {
  if (response.status === "incomplete") {
    throw new Error(
      response.incomplete_details?.reason
        ? `OPENAI_INCOMPLETE_RESPONSE:${response.incomplete_details.reason}`
        : "OPENAI_INCOMPLETE_RESPONSE",
    );
  }

  if (response.output_parsed) {
    return response.output_parsed.question;
  }

  const refusalMessage = (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .find((content) => typeof content.refusal === "string" && content.refusal.trim().length > 0)
    ?.refusal;

  if (refusalMessage) {
    throw new Error(`OPENAI_REFUSAL:${refusalMessage}`);
  }

  const parsedPrompt = (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .find((content) => content.parsed)
    ?.parsed;

  if (parsedPrompt) {
    return parsedPrompt.question;
  }

  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    try {
      const parsedPromptJson: unknown = JSON.parse(response.output_text);
      return generatedDailyQuestionSchema.parse(parsedPromptJson).question;
    } catch {
      throw new Error("OPENAI_UNPARSEABLE_OUTPUT_TEXT");
    }
  }

  throw new Error("OPENAI_EMPTY_RESPONSE");
};

export const generateDailyQuestionPrompt = async (
  options: GenerateDailyQuestionPromptOptions,
): Promise<string> => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: buildPromptInput(options),
      model: env.OPENAI_DAILY_QUESTION_MODEL,
      store: false,
      text: {
        format: {
          name: "daily_question_prompt",
          schema: {
            additionalProperties: false,
            properties: {
              question: {
                maxLength: 240,
                minLength: 1,
                type: "string",
              },
            },
            required: ["question"],
            type: "object",
          },
          strict: true,
          type: "json_schema",
        },
      },
    }),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "X-Client-Request-Id": crypto.randomUUID(),
    },
    method: "POST",
    signal: AbortSignal.timeout(OPENAI_DAILY_QUESTION_TIMEOUT_MS),
  });

  const rawResponseText = await response.text();
  const parsedResponseJson = parseResponseJson(rawResponseText);
  const parsedResponseResult = responsesApiResponseSchema.safeParse(parsedResponseJson);

  if (!response.ok) {
    if (parsedResponseResult.success) {
      throw new Error(parsedResponseResult.data.error?.message ?? "OPENAI_RESPONSE_FAILED");
    }

    throw new Error(`OPENAI_RESPONSE_FAILED:${response.status}`);
  }

  if (!parsedResponseResult.success) {
    throw new Error("OPENAI_RESPONSE_SCHEMA_INVALID");
  }

  return extractParsedPrompt(parsedResponseResult.data);
};
