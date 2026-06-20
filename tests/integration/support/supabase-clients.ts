import type { SupabaseClient } from '@supabase/supabase-js';

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

// Integration harness for SQL-invariant tests against the LOCAL Supabase stack.
//
// The schema is locked down: no PostgREST role (anon/authenticated/service_role)
// holds direct DML on the game tables — all access flows through SECURITY DEFINER
// RPCs. So fixture setup/teardown and assertion reads use a privileged psql
// connection (the postgres superuser, already provided by the local stack), while
// the BEHAVIOUR UNDER TEST is still invoked through a signed-in user client (real
// JWT) so auth.uid() / is_couple_member() / RLS apply genuinely. The superuser
// connection only manages fixtures; it never stands in for the authenticated call.
//
// SAFETY: both the Supabase URL and the database URL are pinned to a local host.
// These helpers truncate couple + auth data, so they must never touch a deployed
// database.

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

// Minimal .env.local reader so the harness works without a dotenv dependency.
// process.env always wins over the file.
const parseDotEnvLocal = (): Record<string, string> => {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    const parsed: Record<string, string> = {};

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      parsed[key] = value;
    }

    return parsed;
  } catch {
    return {};
  }
};

const resolveEnv = (): Record<EnvKey, string> => {
  const fromFile = parseDotEnvLocal();
  const resolved = {} as Record<EnvKey, string>;

  for (const key of ENV_KEYS) {
    const value = process.env[key] ?? fromFile[key];
    if (!value) {
      throw new Error(
        `Missing required env var ${key}. Set it in process.env or .env.local before running integration tests.`,
      );
    }
    resolved[key] = value;
  }

  return resolved;
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

const assertLocalSupabaseUrl = (url: string): void => {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Invalid Supabase URL for integration tests: ${url}`);
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run integration tests against non-local Supabase host "${host}". ` +
        `Only ${[...LOCAL_HOSTS].join(', ')} are permitted.`,
    );
  }
};

const env = resolveEnv();
assertLocalSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
assertLocalSupabaseUrl(env.DATABASE_URL);

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const DATABASE_URL = env.DATABASE_URL;

// Runs SQL as the local postgres superuser (fixture setup/teardown + assertion
// reads only). Tuples-only, unaligned output; throws on the first SQL error.
export const runSql = (sql: string): string =>
  execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-tAqc', sql], {
    encoding: 'utf8',
  }).trim();

export const createAdminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export const createAnonClient = (): SupabaseClient =>
  createClient(SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export interface TestMember {
  readonly userId: string;
  readonly email: string;
  // A client signed in as this member; every RPC call it makes carries a real JWT.
  readonly client: SupabaseClient;
}

const TEST_PASSWORD = 'integration-test-password-123';

// Creates a confirmed auth user and returns a client already signed in as them.
export const createSignedInMember = async (
  admin: SupabaseClient,
  email: string,
): Promise<TestMember> => {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (createError || !created.user) {
    throw new Error(
      `Failed to create test user ${email}: ${createError?.message ?? 'unknown error'}`,
    );
  }

  const client = createAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user ${email}: ${signInError.message}`);
  }

  return { userId: created.user.id, email, client };
};

// Wipes all couple and auth data so the next test starts from a clean slate
// (the single-couple invariant means only one couple may exist at a time).
// `truncate couples cascade` clears the entire couple-scoped graph (memberships,
// invites, memories, media, albums, game rounds + answers + targets, ...); auth
// users are removed last (their child auth rows cascade).
export const resetCoupleData = (): void => {
  runSql(
    'set client_min_messages to warning; truncate table public.couples cascade; delete from auth.users;',
  );
};
