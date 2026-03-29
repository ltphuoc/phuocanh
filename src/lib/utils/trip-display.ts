import { differenceInCalendarDays } from "date-fns";
import { getFormatter, getTranslations } from "next-intl/server";
import type { TripCard, TripStatus } from "@/lib/server/phase-two-data";
import { parseDateInputValueAsUtc } from "@/lib/utils/date-input";

export const tripStatusTranslationKeyByValue = {
  active: "status.active",
  completed: "status.completed",
  planned: "status.planned",
} as const satisfies Record<TripStatus, string>;

export const formatTripDateRange = (
  trip: Pick<TripCard, "endDate" | "startDate">,
  format: Awaited<ReturnType<typeof getFormatter>>,
  t: Awaited<ReturnType<typeof getTranslations<"ui.tripCard">>>,
): string => {
  const startDate = parseDateInputValueAsUtc(trip.startDate);
  const endDate = parseDateInputValueAsUtc(trip.endDate);

  return t("dateRange", {
    endDate: format.dateTime(endDate, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }),
    startDate: format.dateTime(startDate, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
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
      parseDateInputValueAsUtc(trip.endDate),
      parseDateInputValueAsUtc(trip.startDate),
    ) + 1;

  return t("durationDays", {
    count: durationDays,
  });
};
