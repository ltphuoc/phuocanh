import { differenceInCalendarDays } from "date-fns";
import { getFormatter, getTranslations } from "next-intl/server";
import type { TripCard, TripStatus } from "@/lib/server/phase-two-data";
import { parseDateInputValueInTimeZone } from "@/lib/utils/couple-timezone";

export const tripStatusTranslationKeyByValue = {
  active: "status.active",
  completed: "status.completed",
  planned: "status.planned",
} as const satisfies Record<TripStatus, string>;

export const formatTripDateRange = (
  trip: Pick<TripCard, "endDate" | "startDate">,
  format: Awaited<ReturnType<typeof getFormatter>>,
  t: Awaited<ReturnType<typeof getTranslations<"ui.tripCard">>>,
  timeZone: string,
): string => {
  const startDate = parseDateInputValueInTimeZone(trip.startDate, timeZone);
  const endDate = parseDateInputValueInTimeZone(trip.endDate, timeZone);

  return t("dateRange", {
    endDate: format.dateTime(endDate, {
      day: "numeric",
      month: "short",
      timeZone,
      year: "numeric",
    }),
    startDate: format.dateTime(startDate, {
      day: "numeric",
      month: "short",
      timeZone,
      year: "numeric",
    }),
  });
};

export const formatTripDuration = (
  trip: Pick<TripCard, "endDate" | "startDate">,
  t: Awaited<ReturnType<typeof getTranslations<"ui.tripCard">>>,
): string => {
  const durationDays =
    differenceInCalendarDays(
      parseDateInputValueInTimeZone(trip.endDate, "UTC"),
      parseDateInputValueInTimeZone(trip.startDate, "UTC"),
    ) + 1;

  return t("durationDays", {
    count: durationDays,
  });
};
