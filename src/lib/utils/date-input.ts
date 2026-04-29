import { format, parseISO } from 'date-fns';

const DATE_SEGMENT_COUNT = 3;

const isValidDateSegment = (value: number): boolean => Number.isInteger(value) && value > 0;

export const formatDateInputValue = (value: Date): string => format(value, 'yyyy-MM-dd');

export const parseDateInputValueAsUtc = (dateValue: string): Date => {
  const segments = dateValue.split('-');
  if (segments.length !== DATE_SEGMENT_COUNT) {
    throw new Error(`Invalid date input: ${dateValue}`);
  }

  return parseISO(`${dateValue}T00:00:00Z`);
};

export const toUtcDateStartIso = (dateValue: string): string => {
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

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
};

export const toUtcDateEndExclusiveIso = (dateValue: string): string => {
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

  return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0)).toISOString();
};
