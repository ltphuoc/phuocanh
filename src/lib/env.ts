import 'server-only';

import type { PublicEnv } from './public-env';

import { z } from 'zod';

import { publicEnv } from './public-env';

const emptyStringToUndefined = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().length === 0 ? undefined : value;
};

const defaultedNonEmptyString = (defaultValue: string) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().min(1).default(defaultValue));

const defaultedBoolean = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return defaultValue;
    }

    const normalizedValue = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
      return false;
    }

    return defaultValue;
  }, z.boolean());

const serverEnvSchema = z.object({
  DAILY_QUESTION_STUB_RESPONSE: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).optional(),
  ),
  E2E_ENABLE_EMAIL_OTP_HELPER: defaultedBoolean(false),
  GEMINI_API_KEY: z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional()),
  GEMINI_DAILY_QUESTION_MODEL: defaultedNonEmptyString('gemini-3.5-flash'),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).optional(),
  ),
});

export type AppEnv = PublicEnv & z.infer<typeof serverEnvSchema>;

export const env: AppEnv = {
  ...publicEnv,
  ...serverEnvSchema.parse({
    DAILY_QUESTION_STUB_RESPONSE: process.env.DAILY_QUESTION_STUB_RESPONSE,
    E2E_ENABLE_EMAIL_OTP_HELPER: process.env.E2E_ENABLE_EMAIL_OTP_HELPER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_DAILY_QUESTION_MODEL: process.env.GEMINI_DAILY_QUESTION_MODEL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
};
