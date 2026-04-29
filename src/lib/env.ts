import { z } from 'zod';

const emptyStringToUndefined = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().length === 0 ? undefined : value;
};

const optionalNonEmptyString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

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

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  E2E_ENABLE_EMAIL_OTP_HELPER: defaultedBoolean(false),
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_DAILY_QUESTION_MODEL: defaultedNonEmptyString('gpt-4o-mini'),
  OPENAI_DAILY_QUESTION_STUB_RESPONSE: optionalNonEmptyString,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  // NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  E2E_ENABLE_EMAIL_OTP_HELPER: process.env.E2E_ENABLE_EMAIL_OTP_HELPER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_DAILY_QUESTION_MODEL: process.env.OPENAI_DAILY_QUESTION_MODEL,
  OPENAI_DAILY_QUESTION_STUB_RESPONSE: process.env.OPENAI_DAILY_QUESTION_STUB_RESPONSE,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
