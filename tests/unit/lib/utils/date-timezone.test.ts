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
