import { z } from 'zod';

import { isProductionRuntime } from './runtime-env';

// In production a missing NEXT_PUBLIC_SITE_URL must fail fast: silently defaulting
// to localhost would point every magic-link/invite callback at the developer's
// machine. In development and preview, keep the localhost default so local builds
// and per-branch preview deploys (which resolve the forwarded host at request
// time) keep working without extra configuration.
const siteUrlSchema = isProductionRuntime() ? z.url() : z.url().default('http://localhost:3000');

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: siteUrlSchema,
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const publicEnv: PublicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
