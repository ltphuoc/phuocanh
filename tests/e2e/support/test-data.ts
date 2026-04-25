import { TZDate } from "@date-fns/tz";
import { randomUUID } from "node:crypto";
import { addDays, format } from "date-fns";
import { onboardingTimeZone } from "./runtime";

export interface PartnerIdentity {
  readonly email: string;
}

const E2E_RUN_TOKEN = process.env.E2E_RUN_TOKEN ?? randomUUID().slice(0, 8);

const getTimeZoneNow = (): TZDate => TZDate.tz(onboardingTimeZone);

export const buildUniqueText = (prefix: string, caseId?: string): string =>
  `${caseId ? `${caseId} ` : ""}${prefix} ${E2E_RUN_TOKEN}-${randomUUID().slice(0, 6)}`;

export const createPartnerIdentity = (label: "partner-a" | "partner-b"): PartnerIdentity => ({
  email: `${label}-${E2E_RUN_TOKEN}@example.com`,
});

export const createOffsetDateInput = (days: number): string =>
  format(addDays(getTimeZoneNow(), days), "yyyy-MM-dd");

export const createOffsetDateTimeLocalInput = (
  days: number,
  hour = 12,
  minute = 0,
): string => {
  const date = addDays(getTimeZoneNow(), days);
  date.setHours(hour, minute, 0, 0);

  return format(date, "yyyy-MM-dd'T'HH:mm");
};

export const createTodayDateInput = (): string => format(getTimeZoneNow(), "yyyy-MM-dd");

export const createTodayDateTimeLocalInput = (
  hour = 12,
  minute = 0,
): string => {
  const date = getTimeZoneNow();
  date.setHours(hour, minute, 0, 0);

  return format(date, "yyyy-MM-dd'T'HH:mm");
};
