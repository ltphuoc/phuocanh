import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4.3.6';

const BUCKET = 'memory-media';
const DEFAULT_CUTOFF_INTERVAL = '24 hours';
const DEFAULT_BATCH_SIZE = 100;

const envSchema = z.object({
  // Bounded per run so one invocation can never delete an unbounded set.
  MEDIA_SWEEPER_BATCH_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .max(1000)
    .default(DEFAULT_BATCH_SIZE),
  // Must exceed the longest realistic compose session (uploads happen before the row
  // exists), so an in-flight upload is never swept.
  MEDIA_SWEEPER_CUTOFF_INTERVAL: z.string().trim().min(1).default(DEFAULT_CUTOFF_INTERVAL),
  // Dry-run (log-only) unless explicitly enabled. The first deploy stays dry-run so a
  // clean cycle can be observed before any deletion happens.
  MEDIA_SWEEPER_DELETE_ENABLED: z.enum(['true', 'false']).default('false'),
  // Reused shared cron invoke secret (see invoke_media_sweeper / reminder pipeline).
  REMINDER_INVOKE_SECRET: z.string().trim().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  SUPABASE_URL: z.url(),
});

const INVOKE_SECRET_HEADER = 'x-reminder-invoke-secret';

// Constant-time string comparison: avoids leaking how many leading characters
// matched via an early-return compare. Length is folded into the accumulator so a
// length mismatch still fails without short-circuiting.
const timingSafeEqualStrings = (expected: string, provided: string): boolean => {
  const encoder = new TextEncoder();
  const expectedBytes = encoder.encode(expected);
  const providedBytes = encoder.encode(provided);

  let mismatch = expectedBytes.length ^ providedBytes.length;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    mismatch |= expectedBytes[index] ^ (providedBytes[index] ?? 0);
  }

  return mismatch === 0;
};

const orphanRowsSchema = z.array(z.object({ object_name: z.string().trim().min(1) }));

const env = envSchema.parse({
  MEDIA_SWEEPER_BATCH_SIZE: Deno.env.get('MEDIA_SWEEPER_BATCH_SIZE'),
  MEDIA_SWEEPER_CUTOFF_INTERVAL: Deno.env.get('MEDIA_SWEEPER_CUTOFF_INTERVAL'),
  MEDIA_SWEEPER_DELETE_ENABLED: Deno.env.get('MEDIA_SWEEPER_DELETE_ENABLED'),
  REMINDER_INVOKE_SECRET: Deno.env.get('REMINDER_INVOKE_SECRET'),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const deleteEnabled = env.MEDIA_SWEEPER_DELETE_ENABLED === 'true';

const listOrphanedObjects = async (): Promise<readonly string[]> => {
  const { data, error } = await supabase.rpc('list_orphaned_memory_media', {
    max_rows: env.MEDIA_SWEEPER_BATCH_SIZE,
    older_than: env.MEDIA_SWEEPER_CUTOFF_INTERVAL,
  });

  if (error) {
    throw new Error(`Failed to list orphaned memory media: ${error.message}`);
  }

  return orphanRowsSchema.parse(data ?? []).map((row) => row.object_name);
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Authenticate the caller before any work. Only the pg_cron job (which sends the
  // shared secret) may trigger a run. Fail closed when the secret is not configured.
  const providedSecret = request.headers.get(INVOKE_SECRET_HEADER) ?? '';
  if (
    !env.REMINDER_INVOKE_SECRET ||
    !timingSafeEqualStrings(env.REMINDER_INVOKE_SECRET, providedSecret)
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  let candidatePaths: readonly string[];
  try {
    candidatePaths = await listOrphanedObjects();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown sweep failure';
    return Response.json({ error: message }, { status: 500 });
  }

  // Dry-run: report candidates without deleting. Default mode until deletion is
  // explicitly enabled after one clean observed cycle.
  if (!deleteEnabled) {
    return Response.json({
      bucket: BUCKET,
      candidateCount: candidatePaths.length,
      deletedCount: 0,
      mode: 'dry_run',
    });
  }

  if (candidatePaths.length === 0) {
    return Response.json({ bucket: BUCKET, candidateCount: 0, deletedCount: 0, mode: 'delete' });
  }

  // Delete through the Storage API (not SQL) so the physical object is removed.
  const { data: removed, error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([...candidatePaths]);

  if (removeError) {
    return Response.json({ error: removeError.message }, { status: 500 });
  }

  return Response.json({
    bucket: BUCKET,
    candidateCount: candidatePaths.length,
    deletedCount: removed?.length ?? 0,
    mode: 'delete',
  });
});
