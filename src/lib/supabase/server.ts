import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export type AppSupabaseClient = SupabaseClient<Database>;

const buildServerClient = async (supabaseUrl: string): Promise<AppSupabaseClient> => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              // In Server Component render contexts Next.js disallows cookie mutation.
              // Middleware/route handlers remain the canonical session refresh write path.
              cookieStore.set(name, value, options);
            } catch {
              // Ignore mutation failures outside Server Actions/Route Handlers.
            }
          });
        },
      },
    },
  );
};

export const createSupabaseServerClient = async (): Promise<AppSupabaseClient> =>
  buildServerClient(env.NEXT_PUBLIC_SUPABASE_URL);

export const createSupabaseServerClientForUrl = async (
  supabaseUrl: string,
): Promise<AppSupabaseClient> => buildServerClient(supabaseUrl);
