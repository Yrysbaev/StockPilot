import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";
import type { DateRange, DateRangePreset } from "@/types";

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const today = new Date();
  switch (preset) {
    case "7d":
      return {
        from: format(subDays(today, 7), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
        preset: "7d",
      };
    case "30d":
      return {
        from: format(subDays(today, 30), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
        preset: "30d",
      };
    case "90d":
      return {
        from: format(subDays(today, 90), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
        preset: "90d",
      };
    case "this_month":
      return {
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
        preset: "this_month",
      };
    case "last_month": {
      const last = subMonths(today, 1);
      return {
        from: format(startOfMonth(last), "yyyy-MM-dd"),
        to: format(endOfMonth(last), "yyyy-MM-dd"),
        preset: "last_month",
      };
    }
    default:
      return {
        from: format(subDays(today, 30), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
        preset: "30d",
      };
  }
}

export function getPriorPeriod(range: DateRange): DateRange {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  const days = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return {
    from: format(subDays(from, days), "yyyy-MM-dd"),
    to: format(subDays(to, days), "yyyy-MM-dd"),
  };
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  const d = parseISO(dateStr);
  return isWithinInterval(d, { start: parseISO(range.from), end: parseISO(range.to) });
}

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom range",
};
