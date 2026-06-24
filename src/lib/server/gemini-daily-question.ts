import 'server-only';

import type { Locale } from '@/i18n/routing';

import { z } from 'zod';

import { env } from '@/lib/env';

const GEMINI_DAILY_QUESTION_TIMEOUT_MS = 15_000;
const GEMINI_MAX_OUTPUT_TOKENS = 200;
const GEMINI_TEMPERATURE = 0.9;

const generatedDailyQuestionSchema = z.object({
  question: z.string().trim().min(1).max(240),
});

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z.object({
                  text: z.string().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  error: z
    .object({
      message: z.string().trim().min(1),
    })
    .optional(),
  promptFeedback: z
    .object({
      blockReason: z.string().trim().min(1).optional(),
    })
    .optional(),
});

interface GenerateDailyQuestionPromptOptions {
  readonly coupleName: string | null;
  readonly locale: Locale;
  readonly roundDate: string;
}

const localeInstructionByValue: Record<Locale, string> = {
  en: 'Write the final question in English.',
  vi: 'Write the final question in Vietnamese.',
};

const buildPromptInput = ({
  coupleName,
  locale,
  roundDate,
}: GenerateDailyQuestionPromptOptions): string => {
  const namedCoupleInstruction = coupleName
    ? `The couple space is named "${coupleName}".`
    : 'The couple has not set a visible couple name.';

  return [
    'You are writing one daily question for a private two-person couple app.',
    'Return exactly one short open-ended question that invites a thoughtful personal answer.',
    'Keep it warm, specific, and safe for a real relationship.',
    'Do not mention games, scoring, or streaks.',
    'Avoid yes/no questions, roleplay, therapy language, or anything sexual, explicit, or hostile.',
    'Do not include numbering, labels, or extra commentary.',
    namedCoupleInstruction,
    `This question is for the couple's local day ${roundDate}.`,
    localeInstructionByValue[locale],
  ].join(' ');
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

const extractGeneratedQuestion = (response: z.infer<typeof geminiResponseSchema>): string => {
  if (response.promptFeedback?.blockReason) {
    throw new Error(`GEMINI_REFUSAL:${response.promptFeedback.blockReason}`);
  }

  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error('GEMINI_EMPTY_RESPONSE');
  }

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`GEMINI_INCOMPLETE_RESPONSE:${candidate.finishReason}`);
  }

  const generatedText = (candidate.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  if (generatedText.length === 0) {
    throw new Error('GEMINI_EMPTY_RESPONSE');
  }

  try {
    const parsedPromptJson: unknown = JSON.parse(generatedText);
    return generatedDailyQuestionSchema.parse(parsedPromptJson).question;
  } catch {
    throw new Error('GEMINI_UNPARSEABLE_OUTPUT_TEXT');
  }
};

export const generateDailyQuestionPrompt = async (
  options: GenerateDailyQuestionPromptOptions,
): Promise<string> => {
  if (env.DAILY_QUESTION_STUB_RESPONSE) {
    return generatedDailyQuestionSchema.parse({
      question: env.DAILY_QUESTION_STUB_RESPONSE,
    }).question;
  }

  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_DAILY_QUESTION_MODEL}:generateContent`,
    {
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPromptInput(options) }] }],
        generationConfig: {
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
          responseSchema: {
            properties: {
              question: {
                type: 'string',
              },
            },
            required: ['question'],
            type: 'object',
          },
          temperature: GEMINI_TEMPERATURE,
        },
      }),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      method: 'POST',
      signal: AbortSignal.timeout(GEMINI_DAILY_QUESTION_TIMEOUT_MS),
    },
  );

  const rawResponseText = await response.text();
  const parsedResponseJson = parseResponseJson(rawResponseText);
  const parsedResponseResult = geminiResponseSchema.safeParse(parsedResponseJson);

  if (!response.ok) {
    if (parsedResponseResult.success) {
      throw new Error(parsedResponseResult.data.error?.message ?? 'GEMINI_RESPONSE_FAILED');
    }

    throw new Error(`GEMINI_RESPONSE_FAILED:${response.status}`);
  }

  if (!parsedResponseResult.success) {
    throw new Error('GEMINI_RESPONSE_SCHEMA_INVALID');
  }

  return extractGeneratedQuestion(parsedResponseResult.data);
};
