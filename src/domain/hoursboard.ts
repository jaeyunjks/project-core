// Pure domain logic for HoursBoard.
// No DB access, no React, no framework imports — trivially testable.

import { parseLocalDate } from "@/lib/utils";
import type { PayPeriodDayDisplay, PayPeriodSummary } from "@/types";

// ── Award type config ─────────────────────────────────────────────────────────

export const AWARD_MULTIPLIERS: Record<string, number> = {
  weekday: 1.0,
  saturday: 1.25,
  sunday: 1.5,
  public_holiday: 2.0,
  custom: 1.0,
};

export const AWARD_LABELS: Record<string, string> = {
  weekday: "Weekday",
  saturday: "Saturday",
  sunday: "Sunday",
  public_holiday: "Public Hol.",
  custom: "Custom",
};

export function getDefaultAwardType(dateStr: string): string {
  const day = parseLocalDate(dateStr).getDay();
  if (day === 6) return "saturday";
  if (day === 0) return "sunday";
  return "weekday";
}

export function getDefaultPayRate(awardType: string, baseRate: number): number {
  return Math.round(baseRate * (AWARD_MULTIPLIERS[awardType] ?? 1.0) * 100) / 100;
}

// ── Calculations ──────────────────────────────────────────────────────────────

/** Decimal hours from HH:MM times minus break. Handles overnight. */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const workedMins =
    (endMins > startMins ? endMins - startMins : endMins + 1440 - startMins) -
    breakMinutes;
  return Math.round((Math.max(0, workedMins) / 60) * 100) / 100;
}

export function calculateEstimatedPay(hours: number, rate: number): number {
  return Math.round(hours * rate * 100) / 100;
}

export function calculatePayPeriodSummary(
  days: PayPeriodDayDisplay[]
): PayPeriodSummary {
  const workedDaysList = days.filter((d) => d.workHours > 0);
  const totalHours = days.reduce((s, d) => s + d.workHours, 0);
  const estimatedGross = days.reduce((s, d) => s + d.estimatedPay, 0);
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    estimatedGross: Math.round(estimatedGross * 100) / 100,
    workedDays: workedDaysList.length,
    avgHoursPerWorkedDay:
      workedDaysList.length > 0
        ? Math.round((totalHours / workedDaysList.length) * 100) / 100
        : 0,
  };
}
