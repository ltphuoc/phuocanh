import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  getCurrentDateTokenInTimeZone,
  getDateTokenForInstantInTimeZone,
  getDaysBetweenDateTokens,
  isSupportedCoupleTimeZone,
  toTimeZoneDateEndExclusiveIso,
  toTimeZoneDateStartIso,
} from '@/lib/utils/couple-timezone';
import {
  parseDateInputValueAsUtc,
  toUtcDateEndExclusiveIso,
  toUtcDateStartIso,
} from '@/lib/utils/date-input';

describe('date input utilities', () => {
  test('builds UTC day boundaries from date inputs', () => {
    expect(toUtcDateStartIso('2026-04-29')).toBe('2026-04-29T00:00:00.000Z');
    expect(toUtcDateEndExclusiveIso('2026-04-29')).toBe('2026-04-30T00:00:00.000Z');
    expect(parseDateInputValueAsUtc('2026-04-29').toISOString()).toBe('2026-04-29T00:00:00.000Z');
  });

  test('throws for malformed date inputs', () => {
    expect(() => toUtcDateStartIso('2026-04')).toThrow('Invalid date input');
    expect(() => toUtcDateStartIso('2026-aa-29')).toThrow('Invalid date input');
    expect(() => toTimeZoneDateStartIso('2026-04', 'Asia/Ho_Chi_Minh')).toThrow(
      'Invalid date input',
    );
  });
});

describe('couple timezone utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('converts date-only values to timezone day boundaries', () => {
    expect(new Date(toTimeZoneDateStartIso('2026-04-29', 'Asia/Ho_Chi_Minh')).toISOString()).toBe(
      '2026-04-28T17:00:00.000Z',
    );
    expect(
      new Date(toTimeZoneDateEndExclusiveIso('2026-04-29', 'Asia/Ho_Chi_Minh')).toISOString(),
    ).toBe('2026-04-29T17:00:00.000Z');
  });

  test('derives date tokens for the requested timezone', () => {
    const instant = '2026-04-28T18:00:00.000Z';

    expect(getDateTokenForInstantInTimeZone(instant, 'UTC')).toBe('2026-04-28');
    expect(getDateTokenForInstantInTimeZone(instant, 'Asia/Ho_Chi_Minh')).toBe('2026-04-29');
  });

  test('uses the active clock when reading the current date token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-28T18:00:00.000Z'));

    expect(getCurrentDateTokenInTimeZone('UTC')).toBe('2026-04-28');
    expect(getCurrentDateTokenInTimeZone('Asia/Ho_Chi_Minh')).toBe('2026-04-29');
  });

  test('computes day deltas and validates supported timezone names', () => {
    expect(getDaysBetweenDateTokens('2026-05-02', '2026-04-29')).toBe(3);
    expect(getDaysBetweenDateTokens('2026-04-28', '2026-04-29')).toBe(-1);
    expect(isSupportedCoupleTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isSupportedCoupleTimeZone('Not/A_Real_Zone')).toBe(false);
  });
});

// The couple-default zone (Asia/Ho_Chi_Minh) has no DST, so DST edges use a DST-observing zone.
// US spring-forward 2026 is 2026-03-08 (02:00 -> 03:00 local); that local day is only 23 hours.
// Expected values are hand-derived from the EST/EDT offsets and cross-checked against the helpers.
const DST_TZ = 'America/New_York';

describe('couple timezone DST + leap-year boundaries', () => {
  test('day-start/end-exclusive stay calendar-correct across the 23-hour spring-forward day', () => {
    // Start of the DST day is still EST (UTC-5); the next day's start is already EDT (UTC-4).
    expect(new Date(toTimeZoneDateStartIso('2026-03-08', DST_TZ)).toISOString()).toBe(
      '2026-03-08T05:00:00.000Z',
    );
    // End-exclusive is exactly the NEXT calendar day's local start (04:00Z, EDT) — 23 hours after
    // the start, NOT a naive +24h (which would land on 2026-03-09T05:00:00.000Z).
    expect(new Date(toTimeZoneDateEndExclusiveIso('2026-03-08', DST_TZ)).toISOString()).toBe(
      '2026-03-09T04:00:00.000Z',
    );
    expect(toTimeZoneDateEndExclusiveIso('2026-03-08', DST_TZ)).toBe(
      toTimeZoneDateStartIso('2026-03-09', DST_TZ),
    );
  });

  test('derives the local date token without off-by-one as the DST offset switches', () => {
    // End of the DST day: the midnight boundary must use EDT (UTC-4), not the pre-shift EST.
    expect(getDateTokenForInstantInTimeZone('2026-03-09T03:59:00Z', DST_TZ)).toBe('2026-03-08');
    expect(getDateTokenForInstantInTimeZone('2026-03-09T04:00:00Z', DST_TZ)).toBe('2026-03-09');
    // Start of the DST day: the midnight boundary is still EST (UTC-5).
    expect(getDateTokenForInstantInTimeZone('2026-03-08T04:59:00Z', DST_TZ)).toBe('2026-03-07');
    expect(getDateTokenForInstantInTimeZone('2026-03-08T05:00:00Z', DST_TZ)).toBe('2026-03-08');
  });

  test('a valid leap day round-trips and day deltas count Feb-29 only in leap years', () => {
    expect(new Date(toTimeZoneDateStartIso('2024-02-29', DST_TZ)).toISOString()).toBe(
      '2024-02-29T05:00:00.000Z',
    );
    expect(
      getDateTokenForInstantInTimeZone(toTimeZoneDateStartIso('2024-02-29', DST_TZ), DST_TZ),
    ).toBe('2024-02-29');
    // 2024 is a leap year (Feb has 29 days) so Feb-28 -> Mar-01 is 2 days; 2023 is not, so it is 1.
    expect(getDaysBetweenDateTokens('2024-03-01', '2024-02-28')).toBe(2);
    expect(getDaysBetweenDateTokens('2023-03-01', '2023-02-28')).toBe(1);
  });

  test('characterizes the current handling of Feb-29 in a non-leap year (silent roll, no throw)', () => {
    // parseDateSegments accepts 2023-02-29 (positive integers), and the TZDate/JS Date constructor
    // overflows the day into the next month — so the input silently normalizes to 2023-03-01 rather
    // than throwing. Pin the actual behavior; do not invent a stricter contract.
    expect(
      getDateTokenForInstantInTimeZone(toTimeZoneDateStartIso('2023-02-29', DST_TZ), DST_TZ),
    ).toBe('2023-03-01');
  });
});
