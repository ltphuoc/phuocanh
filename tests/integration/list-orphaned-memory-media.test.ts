import type { SupabaseClient } from '@supabase/supabase-js';
import type { TestMember } from './support/supabase-clients';

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootstrapCouple } from './support/couple-factory';
import {
  createAdminClient,
  createSignedInMember,
  resetCoupleData,
  runSql,
} from './support/supabase-clients';

const COUPLE_TZ = 'Asia/Ho_Chi_Minh';
const BUCKET = 'memory-media';

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// storage.objects has a protect_delete trigger that blocks direct SQL deletes (the
// real sweep deletes through the Storage API for exactly this reason). For fixture
// teardown only, bypass triggers within a single privileged session.
const clearBucketObjects = (): void => {
  runSql(
    `set session_replication_role = replica; ` +
      `delete from storage.objects where bucket_id = ${lit(BUCKET)}; ` +
      `set session_replication_role = default;`,
  );
};

const seedStorageObject = (name: string, createdAtSql: string): void => {
  runSql(
    `insert into storage.objects (bucket_id, name, created_at) ` +
      `values (${lit(BUCKET)}, ${lit(name)}, ${createdAtSql});`,
  );
};

// The sweep RPC is service-role only, so it is invoked via the admin client.
describe('list_orphaned_memory_media', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;
  let referencedPath: string;
  let orphanPastCutoffPath: string;
  let orphanWithinWindowPath: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    clearBucketObjects();
    partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });

    const memoryId = runSql(
      `insert into public.memories (couple_id, author_user_id, happened_at) ` +
        `values (${lit(coupleId)}, ${lit(partnerA.userId)}, '2026-01-15T12:00:00Z') returning id;`,
    );

    referencedPath = `couples/${coupleId}/memories/${memoryId}/referenced.jpg`;
    orphanPastCutoffPath = `couples/${coupleId}/memories/${memoryId}/orphan-old.jpg`;
    orphanWithinWindowPath = `couples/${coupleId}/memories/${memoryId}/orphan-new.jpg`;

    // A real memory_media row makes referencedPath a live object the sweep must never touch.
    runSql(
      `insert into public.memory_media (couple_id, memory_id, storage_path, media_type, mime_type, size_bytes) ` +
        `values (${lit(coupleId)}, ${lit(memoryId)}, ${lit(referencedPath)}, 'image', 'image/jpeg', 1024);`,
    );

    seedStorageObject(referencedPath, `now() - interval '26 hours'`);
    seedStorageObject(orphanPastCutoffPath, `now() - interval '25 hours'`);
    seedStorageObject(orphanWithinWindowPath, `now()`);
  });

  afterAll(() => {
    resetCoupleData();
    clearBucketObjects();
  });

  it('returns only orphaned objects older than the cutoff', async () => {
    const { data, error } = await admin.rpc('list_orphaned_memory_media', {
      max_rows: 100,
      older_than: '24 hours',
    });

    expect(error).toBeNull();
    const names = ((data ?? []) as { object_name: string }[]).map((row) => row.object_name);

    expect(names).toContain(orphanPastCutoffPath);
    expect(names).not.toContain(referencedPath);
    expect(names).not.toContain(orphanWithinWindowPath);
  });
});
