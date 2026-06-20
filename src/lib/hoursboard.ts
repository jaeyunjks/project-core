import type { Employer, Shift, User } from "@prisma/client";
import { db } from "@/lib/db";
import {
  parseLocalDate,
  formatDateStr,
  addDays,
  daysBetween,
  getDayLabel,
  getDayNumber,
  formatPeriodLabel,
  formatShortDate,
} from "@/lib/utils";
import type { ShiftDisplay, HoursBoardSummary } from "@/types";

// ── Pure calculations ─────────────────────────────────────────────────────────

/**
 * Calculates decimal hours worked.
 * Handles overnight shifts (end < start).
 */
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

/** Rounds to 2 decimal places */
export function calculateEstimatedPay(hours: number, rate: number): number {
  return Math.round(hours * rate * 100) / 100;
}

/**
 * Returns the start and end date strings for the pay period that contains today.
 *
 * - fortnightly: 14-day windows anchored at payPeriodStartDate
 * - weekly:       7-day windows anchored at payPeriodStartDate
 * - monthly:      calendar-month windows starting on the same day-of-month
 *                 TODO: handle months shorter than startDay gracefully
 */
export function getCurrentPeriodRange(
  payPeriodStartDate: string,
  payCycle: string,
  today: Date = new Date()
): { start: string; end: string } {
  const ref = parseLocalDate(payPeriodStartDate);

  if (payCycle === "weekly") {
    const diff = daysBetween(ref, today);
    const idx = Math.max(0, Math.floor(diff / 7));
    const start = addDays(ref, idx * 7);
    return { start: formatDateStr(start), end: formatDateStr(addDays(start, 6)) };
  }

  if (payCycle === "fortnightly") {
    const diff = daysBetween(ref, today);
    const idx = Math.max(0, Math.floor(diff / 14));
    const start = addDays(ref, idx * 14);
    return { start: formatDateStr(start), end: formatDateStr(addDays(start, 13)) };
  }

  // monthly — TODO: edge cases for months shorter than start day
  const startDay = ref.getDate();
  const candidate = new Date(today.getFullYear(), today.getMonth(), startDay);
  const start = candidate > today ? new Date(today.getFullYear(), today.getMonth() - 1, startDay) : candidate;
  const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay - 1);
  return { start: formatDateStr(start), end: formatDateStr(end) };
}

/** Adds paydayOffsetDays to the period end date and returns a short label */
export function calculateNextPayday(
  periodEndDate: string,
  paydayOffsetDays: number
): string {
  return formatShortDate(
    formatDateStr(addDays(parseLocalDate(periodEndDate), paydayOffsetDays))
  );
}

/** Days from today until a given YYYY-MM-DD date */
export function daysUntil(dateStr: string): number {
  return daysBetween(new Date(), parseLocalDate(dateStr));
}

// ── DTO mapper ────────────────────────────────────────────────────────────────

export function toShiftDisplay(shift: Shift): ShiftDisplay {
  return {
    id: shift.id,
    shiftDate: shift.shiftDate,
    dayLabel: getDayLabel(shift.shiftDate),
    dayNumber: getDayNumber(shift.shiftDate),
    startTime: shift.startTime,
    endTime: shift.endTime,
    breakMinutes: shift.breakMinutes,
    totalHours: shift.totalHours,
    estimatedPay: shift.estimatedPay,
    notes: shift.notes,
  };
}

// ── DB queries ────────────────────────────────────────────────────────────────

export async function getDemoUser(): Promise<User> {
  const user = await db.user.findFirst();
  if (!user) throw new Error("No demo user found. Run: npm run db:seed");
  return user;
}

export async function getDemoEmployer(): Promise<Employer> {
  const employer = await db.employer.findFirst();
  if (!employer) throw new Error("No employer found. Run: npm run db:seed");
  return employer;
}

export async function getAllShifts(userId: string): Promise<ShiftDisplay[]> {
  const shifts = await db.shift.findMany({
    where: { userId },
    orderBy: [{ shiftDate: "desc" }, { startTime: "desc" }],
  });
  return shifts.map(toShiftDisplay);
}

export async function getShiftsInPeriod(
  userId: string,
  start: string,
  end: string
): Promise<ShiftDisplay[]> {
  const shifts = await db.shift.findMany({
    where: {
      userId,
      shiftDate: { gte: start, lte: end },
    },
    orderBy: [{ shiftDate: "desc" }, { startTime: "desc" }],
  });
  return shifts.map(toShiftDisplay);
}

export async function getRecentShifts(
  userId: string,
  limit = 3
): Promise<ShiftDisplay[]> {
  const shifts = await db.shift.findMany({
    where: { userId },
    orderBy: [{ shiftDate: "desc" }, { startTime: "desc" }],
    take: limit,
  });
  return shifts.map(toShiftDisplay);
}

export async function createShift(data: {
  userId: string;
  employerId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hourlyRate: number;
  notes?: string;
}): Promise<ShiftDisplay> {
  const totalHours = calculateShiftHours(
    data.startTime,
    data.endTime,
    data.breakMinutes
  );
  const estimatedPay = calculateEstimatedPay(totalHours, data.hourlyRate);
  const shift = await db.shift.create({
    data: {
      userId: data.userId,
      employerId: data.employerId,
      shiftDate: data.shiftDate,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes,
      totalHours,
      estimatedPay,
      notes: data.notes ?? null,
    },
  });
  return toShiftDisplay(shift);
}

export async function deleteShift(id: string): Promise<void> {
  await db.shift.delete({ where: { id } });
}

export async function updateEmployer(
  id: string,
  data: Partial<
    Pick<
      Employer,
      | "name"
      | "hourlyRate"
      | "payCycle"
      | "payPeriodStartDate"
      | "paydayOffsetDays"
      | "defaultBreakMinutes"
    >
  >
): Promise<Employer> {
  return db.employer.update({ where: { id }, data });
}

// ── Aggregated summary ────────────────────────────────────────────────────────

export async function getHoursBoardSummary(
  userId: string
): Promise<HoursBoardSummary> {
  const employer = await getDemoEmployer();
  const { start, end } = getCurrentPeriodRange(
    employer.payPeriodStartDate,
    employer.payCycle
  );
  const periodShifts = await getShiftsInPeriod(userId, start, end);
  const recentShifts = await getRecentShifts(userId, 3);

  const totalHours = periodShifts.reduce((s, sh) => s + sh.totalHours, 0);
  const totalGross = periodShifts.reduce((s, sh) => s + sh.estimatedPay, 0);
  const nextPaydayStr = calculateNextPayday(end, employer.paydayOffsetDays);
  // nextPaydayStr is "Jul 3" — we need the full date to calculate days away
  const nextPaydayDate = formatDateStr(
    addDays(parseLocalDate(end), employer.paydayOffsetDays)
  );

  return {
    periodLabel: formatPeriodLabel(start, end),
    periodStart: start,
    periodEnd: end,
    totalHours: Math.round(totalHours * 100) / 100,
    totalGross: Math.round(totalGross * 100) / 100,
    totalShifts: periodShifts.length,
    hourlyRate: employer.hourlyRate,
    nextPayday: nextPaydayStr,
    nextPaydayDaysAway: Math.max(0, daysUntil(nextPaydayDate)),
    recentShifts,
    employer,
  };
}
