'use client';

import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';

export type BrowserSupabaseClient = SupabaseClient<Database>;

export const createSupabaseBrowserClient = (): BrowserSupabaseClient =>
  createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
