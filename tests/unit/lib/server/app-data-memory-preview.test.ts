import type { CoupleContext } from '@/lib/server/couple-context';
import type { MemoryCard } from '@/lib/server/phase-one-data';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHomeAppData, getOnThisDayAppData } from '@/lib/server/app-data';

// Hoisted mocks so the factories below can reference them (vi.mock is hoisted).
const { getHomePageData, getOnThisDayData, signMemoryMediaStorageItems } = vi.hoisted(() => ({
  getHomePageData: vi.fn(),
  getOnThisDayData: vi.fn(),
  signMemoryMediaStorageItems: vi.fn(),
}));

// `app-data.ts` is a server-only barrel that transitively pulls the phase-two/three
// data modules (which need real env/cookies). Stub everything except the two seams
// the home / on-this-day mappers actually use. (`server-only` itself is aliased to an
// empty module in vitest.config.mts.)
vi.mock('@/lib/server/phase-two-data', () => ({}));
vi.mock('@/lib/server/phase-three-data', () => ({}));
vi.mock('@/lib/server/phase-one-data', () => ({
  getHomePageData,
  getListsPageData: vi.fn(),
  getMemoryDetailData: vi.fn(),
  getOnThisDayData,
}));
vi.mock('@/lib/server/memory-media', () => ({ signMemoryMediaStorageItems }));

const coupleContext = {
  coupleId: 'couple-1',
  coupleName: 'Test Couple',
  coupleStartedAt: '2024-01-01',
  email: 'partner@example.test',
  role: 'partner_a',
  timezone: 'Asia/Ho_Chi_Minh',
  userId: 'user-1',
} as CoupleContext;

const memoryCard: MemoryCard = {
  happenedAt: '2024-06-01',
  id: 'memory-1',
  location: {
    address: null,
    latitude: null,
    longitude: null,
    name: null,
    provider: null,
    providerId: null,
  },
  locationName: 'Paris',
  mediaType: 'image',
  note: 'hello world',
  storagePath: 'couples/couple-1/memories/memory-1/photo.jpg',
};

const signedPreview = {
  id: 'memory-1',
  mediaType: 'image' as const,
  signedUrl: 'https://signed.example/photo.jpg',
};

describe('home + on-this-day app data omit private storage keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signMemoryMediaStorageItems.mockResolvedValue([signedPreview]);
  });

  it('getHomeAppData strips storagePath and keeps the signed imageUrl', async () => {
    getHomePageData.mockResolvedValue({
      checklists: [],
      memories: [memoryCard],
      relationshipDays: 5,
      wishItems: [],
    });

    const result = await getHomeAppData(coupleContext);
    const card = result.memories[0];
    if (!card) {
      throw new Error('expected a memory card');
    }

    expect(card).not.toHaveProperty('storagePath');
    expect(card.imageUrl).toBe('https://signed.example/photo.jpg');
    expect(card).toMatchObject({
      happenedAt: '2024-06-01',
      id: 'memory-1',
      locationName: 'Paris',
      mediaType: 'image',
      note: 'hello world',
    });
  });

  it('getOnThisDayAppData strips storagePath and keeps the signed imageUrl', async () => {
    getOnThisDayData.mockResolvedValue([memoryCard]);

    const result = await getOnThisDayAppData(coupleContext);
    const card = result.memories[0];
    if (!card) {
      throw new Error('expected a memory card');
    }

    expect(card).not.toHaveProperty('storagePath');
    expect(card.imageUrl).toBe('https://signed.example/photo.jpg');
    expect(card).toMatchObject({
      happenedAt: '2024-06-01',
      id: 'memory-1',
      locationName: 'Paris',
      mediaType: 'image',
      note: 'hello world',
    });
  });
});
