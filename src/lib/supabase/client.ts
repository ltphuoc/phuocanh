'use client';

import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createBrowserClient } from '@supabase/ssr';

import { publicEnv } from '@/lib/public-env';

export type BrowserSupabaseClient = SupabaseClient<Database>;

export const createSupabaseBrowserClient = (): BrowserSupabaseClient =>
  createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
