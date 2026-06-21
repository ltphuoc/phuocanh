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

const lit = (value: string): string => `'${value.replaceAll("'", "''")}'`;

// Seeds a parent memory via the privileged connection so the member-client inserts
// below exercise only the memory_media write path (the direct-PostgREST bypass the
// audit flagged — members hold a real INSERT grant on this table).
const seedMemory = (coupleId: string, authorUserId: string): string =>
  runSql(
    `insert into public.memories (couple_id, author_user_id, happened_at) ` +
      `values (${lit(coupleId)}, ${lit(authorUserId)}, '2026-01-15T00:00:00Z') returning id;`,
  );

describe('memory_media same-row check constraints', () => {
  let admin: SupabaseClient;
  let partnerA: TestMember;
  let coupleId: string;
  let memoryId: string;

  beforeAll(() => {
    admin = createAdminClient();
  });

  beforeEach(async () => {
    resetCoupleData();
    partnerA = await createSignedInMember(admin, `member-${randomUUID()}@example.test`);
    coupleId = await bootstrapCouple(partnerA, { timezone: COUPLE_TZ });
    memoryId = seedMemory(coupleId, partnerA.userId);
  });

  afterAll(() => {
    resetCoupleData();
  });

  const validStoragePath = (): string => `couples/${coupleId}/memories/${memoryId}/photo.jpg`;

  it('accepts a fully valid image row', async () => {
    const { error } = await partnerA.client.from('memory_media').insert({
      couple_id: coupleId,
      media_type: 'image',
      memory_id: memoryId,
      mime_type: 'image/jpeg',
      size_bytes: 1024,
      storage_path: validStoragePath(),
    });

    expect(error).toBeNull();
  });

  it('rejects a disallowed mime type', async () => {
    const { error } = await partnerA.client.from('memory_media').insert({
      couple_id: coupleId,
      media_type: 'image',
      memory_id: memoryId,
      mime_type: 'application/pdf',
      size_bytes: 1024,
      storage_path: validStoragePath(),
    });

    expect(error).not.toBeNull();
  });

  it('rejects a file larger than 25 MiB', async () => {
    const { error } = await partnerA.client.from('memory_media').insert({
      couple_id: coupleId,
      media_type: 'image',
      memory_id: memoryId,
      mime_type: 'image/jpeg',
      size_bytes: 26214401,
      storage_path: validStoragePath(),
    });

    expect(error).not.toBeNull();
  });

  it('rejects a non-positive size', async () => {
    const { error } = await partnerA.client.from('memory_media').insert({
      couple_id: coupleId,
      media_type: 'image',
      memory_id: memoryId,
      mime_type: 'image/jpeg',
      size_bytes: 0,
      storage_path: validStoragePath(),
    });

    expect(error).not.toBeNull();
  });

  it('rejects a storage path outside this row prefix', async () => {
    const { error } = await partnerA.client.from('memory_media').insert({
      couple_id: coupleId,
      media_type: 'image',
      memory_id: memoryId,
      mime_type: 'image/jpeg',
      size_bytes: 1024,
      storage_path: `couples/${randomUUID()}/memories/${randomUUID()}/evil.jpg`,
    });

    expect(error).not.toBeNull();
  });
});
