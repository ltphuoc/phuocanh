import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import { env } from '@/lib/env';

export type AppSupabaseClient = SupabaseClient<Database>;

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type CookieMutation = {
  name: string;
  options: Parameters<CookieStore['set']>[2];
  value: string;
};

interface ServerClientOptions {
  readonly cookieOptions?: {
    readonly getAll: () => ReturnType<CookieStore['getAll']>;
    readonly setAll: (cookiesToSet: CookieMutation[]) => void;
  };
}

const buildServerClient = async (
  supabaseUrl: string,
  options?: ServerClientOptions,
): Promise<AppSupabaseClient> => {
  const cookieStore = await cookies();
  const getAll = options?.cookieOptions?.getAll ?? (() => cookieStore.getAll());
  const setAll =
    options?.cookieOptions?.setAll ??
    ((cookiesToSet: CookieMutation[]) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          // In Server Component render contexts Next.js disallows cookie mutation.
          // Middleware/route handlers remain the canonical session refresh write path.
          cookieStore.set(name, value, options);
        } catch {
          // Ignore mutation failures outside Server Actions/Route Handlers.
        }
      });
    });

  return createServerClient<Database>(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll,
      setAll,
    },
  });
};

export const createSupabaseServerClient = async (
  options?: ServerClientOptions,
): Promise<AppSupabaseClient> => buildServerClient(env.NEXT_PUBLIC_SUPABASE_URL, options);

export const createSupabaseServerClientForUrl = async (
  supabaseUrl: string,
  options?: ServerClientOptions,
): Promise<AppSupabaseClient> => buildServerClient(supabaseUrl, options);
