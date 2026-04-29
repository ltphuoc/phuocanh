import { TZDate } from '@date-fns/tz';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

import { parseDateInputValueAsUtc } from '@/lib/utils/date-input';

const DATE_SEGMENT_COUNT = 3;

export const DEFAULT_COUPLE_TIMEZONE = 'Asia/Ho_Chi_Minh' as const;

interface DateSegments {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

const isValidDateSegment = (value: number): boolean => Number.isInteger(value) && value > 0;

const resolveSupportedCoupleTimeZones = (): readonly string[] => {
  if (typeof Intl.supportedValuesOf !== 'function') {
    return [DEFAULT_COUPLE_TIMEZONE];
  }

  const supportedTimeZones = Intl.supportedValuesOf('timeZone');
  if (supportedTimeZones.includes(DEFAULT_COUPLE_TIMEZONE)) {
    return supportedTimeZones;
  }

  return [DEFAULT_COUPLE_TIMEZONE, ...supportedTimeZones];
};

const supportedCoupleTimeZones = resolveSupportedCoupleTimeZones();
const supportedCoupleTimeZoneSet = new Set(supportedCoupleTimeZones);

const parseDateSegments = (dateValue: string): DateSegments => {
  const segments = dateValue.split('-');
  if (segments.length !== DATE_SEGMENT_COUNT) {
    throw new Error(`Invalid date input: ${dateValue}`);
  }

  const [yearSegment, monthSegment, daySegment] = segments;
  const year = Number(yearSegment);
  const month = Number(monthSegment);
  const day = Number(daySegment);

  if (!isValidDateSegment(year) || !isValidDateSegment(month) || !isValidDateSegment(day)) {
    throw new Error(`Invalid date input: ${dateValue}`);
  }

  return {
    day,
    month,
    year,
  };
};

const getTimeZoneDate = (dateValue: string, timeZone: string, dayOffset = 0): TZDate => {
  const { day, month, year } = parseDateSegments(dateValue);

  return new TZDate(year, month - 1, day + dayOffset, timeZone);
};

const normalizeInstantInput = (value: Date | string): number =>
  value instanceof Date ? value.getTime() : parseISO(value).getTime();

export const getSupportedCoupleTimeZones = (): readonly string[] => supportedCoupleTimeZones;

export const isSupportedCoupleTimeZone = (value: string): boolean =>
  supportedCoupleTimeZoneSet.has(value);

export const toTimeZoneDateStartIso = (dateValue: string, timeZone: string): string =>
  getTimeZoneDate(dateValue, timeZone).toISOString();

export const toTimeZoneDateEndExclusiveIso = (dateValue: string, timeZone: string): string =>
  getTimeZoneDate(dateValue, timeZone, 1).toISOString();

export const parseDateInputValueInTimeZone = (dateValue: string, timeZone: string): Date =>
  getTimeZoneDate(dateValue, timeZone);

export const getDateTokenForInstantInTimeZone = (value: Date | string, timeZone: string): string =>
  format(new TZDate(normalizeInstantInput(value), timeZone), 'yyyy-MM-dd');

export const getCurrentDateTokenInTimeZone = (timeZone: string): string =>
  format(TZDate.tz(timeZone), 'yyyy-MM-dd');

export const getDaysBetweenDateTokens = (leftDateToken: string, rightDateToken: string): number =>
  differenceInCalendarDays(
    parseDateInputValueAsUtc(leftDateToken),
    parseDateInputValueAsUtc(rightDateToken),
  );
