import type { Employer, Prisma, Shift, User } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  parseLocalDate,
  formatDateStr,
  addDays,
  daysBetween,
  getDayLabel,
  getDayNumber,
  getMonthLabel,
  formatPeriodLabelWithYear,
  formatShortDate,
  todayStr,
} from "@/lib/utils";
import {
  calculateShiftHours,
  calculateEstimatedPay,
  calculatePayPeriodSummary,
  getDefaultAwardType,
  getDefaultPayRate,
} from "@/domain/hoursboard";
import type {
  ShiftDisplay,
  PayPeriodDayDisplay,
  PayPeriodDisplay,
  DashboardHoursPreview,
} from "@/types";

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Days from today until a YYYY-MM-DD date */
export function daysUntil(dateStr: string): number {
  return daysBetween(new Date(), parseLocalDate(dateStr));
}

/** Short "Jul 3" payday label */
export function calculateNextPayday(
  periodEndDate: string,
  paydayOffsetDays: number
): string {
  return formatShortDate(
    formatDateStr(addDays(parseLocalDate(periodEndDate), paydayOffsetDays))
  );
}

// ── Mappers ───────────────────────────────────────────────────────────────────

type PayPeriodWithDays = Prisma.PayPeriodGetPayload<{
  include: { days: { orderBy: { date: "asc" } } };
}>;

function toDayDisplay(
  day: PayPeriodWithDays["days"][number],
  today: string
): PayPeriodDayDisplay {
  const date = parseLocalDate(day.date);
  const dow = date.getDay();
  const estimatedPay = Math.round(day.workHours * day.payRate * 100) / 100;
  return {
    id: day.id,
    date: day.date,
    dayLabel: getDayLabel(day.date),
    dayNumber: getDayNumber(day.date),
    monthLabel: getMonthLabel(day.date),
    isWeekend: dow === 0 || dow === 6,
    isToday: day.date === today,
    workHours: day.workHours,
    payAwardType: day.payAwardType,
    payRate: day.payRate,
    notes: day.notes,
    estimatedPay,
  };
}

function toPayPeriodDisplay(
  p: PayPeriodWithDays,
  today: string
): PayPeriodDisplay {
  const days = p.days.map((d) => toDayDisplay(d, today));
  const label = formatPeriodLabelWithYear(p.startDate, p.endDate);
  return {
    id: p.id,
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    label,
    displayName: p.name?.trim() || label,
    status: p.status,
    days,
    summary: calculatePayPeriodSummary(days),
  };
}

function generatePeriodDays(
  startDate: string,
  endDate: string,
  baseRate: number
) {
  const days = [];
  let current = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  while (current <= end) {
    const dateStr = formatDateStr(current);
    const awardType = getDefaultAwardType(dateStr);
    days.push({
      date: dateStr,
      workHours: 0,
      payAwardType: awardType,
      payRate: getDefaultPayRate(awardType, baseRate),
      notes: null,
    });
    current = addDays(current, 1);
  }
  return days;
}

// ── User / Employer ───────────────────────────────────────────────────────────

/** Current signed-in user. Throws if unauthenticated. */
export async function getCurrentUser(): Promise<User> {
  return requireUser();
}

/** First employer belonging to the current user. */
export async function getCurrentEmployer(): Promise<Employer> {
  const user = await requireUser();
  const employer = await db.employer.findFirst({ where: { userId: user.id } });
  if (!employer) {
    throw new Error("No employer found for current user.");
  }
  return employer;
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

// ── PayPeriod ─────────────────────────────────────────────────────────────────

export async function getPayPeriods(userId: string): Promise<PayPeriodDisplay[]> {
  const periods = await db.payPeriod.findMany({
    where: { userId },
    include: { days: { orderBy: { date: "asc" } } },
    orderBy: { startDate: "asc" },
  });
  const today = todayStr();
  return periods.map((p) => toPayPeriodDisplay(p, today));
}

export async function getLatestPayPeriod(
  userId: string
): Promise<PayPeriodDisplay | null> {
  const p = await db.payPeriod.findFirst({
    where: { userId },
    include: { days: { orderBy: { date: "asc" } } },
    orderBy: { startDate: "desc" },
  });
  if (!p) return null;
  return toPayPeriodDisplay(p, todayStr());
}

export async function getPayPeriodById(
  id: string
): Promise<PayPeriodDisplay | null> {
  const p = await db.payPeriod.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } } },
  });
  if (!p) return null;
  return toPayPeriodDisplay(p, todayStr());
}

export const MIN_PERIOD_DAYS = 7;
export const MAX_PERIOD_DAYS = 14;

export interface CreatePayPeriodInput {
  name: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Creates a pay period with caller-supplied dates.
 * Enforces 7–14 day duration inclusive.
 */
export async function createCustomPayPeriod(
  userId: string,
  input: CreatePayPeriodInput
): Promise<PayPeriodDisplay> {
  const employer = await getCurrentEmployer();
  const { name, startDate, endDate } = input;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Start and end dates must be in YYYY-MM-DD format.");
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const durationDays = daysBetween(start, end) + 1; // inclusive

  if (durationDays < MIN_PERIOD_DAYS) {
    throw new Error(`Pay period must be at least ${MIN_PERIOD_DAYS} days.`);
  }
  if (durationDays > MAX_PERIOD_DAYS) {
    throw new Error(`Pay period cannot exceed ${MAX_PERIOD_DAYS} days.`);
  }

  const duplicate = await db.payPeriod.findFirst({
    where: { userId, startDate },
  });
  if (duplicate) {
    throw new Error("A pay period starting on this date already exists.");
  }

  const period = await db.payPeriod.create({
    data: {
      userId,
      name: name?.trim() || null,
      startDate,
      endDate,
      status: "active",
      days: {
        create: generatePeriodDays(startDate, endDate, employer.hourlyRate),
      },
    },
    include: { days: { orderBy: { date: "asc" } } },
  });

  return toPayPeriodDisplay(period, todayStr());
}

export async function updatePayPeriodDay(
  id: string,
  data: {
    workHours: number;
    payAwardType: string;
    payRate: number;
    notes: string | null;
  }
): Promise<void> {
  await db.payPeriodDay.update({ where: { id }, data });
}

// ── Dashboard preview ─────────────────────────────────────────────────────────

export async function getDashboardHoursPreview(
  userId: string
): Promise<DashboardHoursPreview | null> {
  const employer = await getCurrentEmployer();
  const latest = await getLatestPayPeriod(userId);
  if (!latest) return null;

  const nextPaydayDate = formatDateStr(
    addDays(parseLocalDate(latest.endDate), employer.paydayOffsetDays)
  );

  return {
    periodLabel: latest.label,
    totalHours: latest.summary.totalHours,
    estimatedGross: latest.summary.estimatedGross,
    workedDays: latest.summary.workedDays,
    nextPayday: calculateNextPayday(latest.endDate, employer.paydayOffsetDays),
    nextPaydayDaysAway: Math.max(0, daysUntil(nextPaydayDate)),
    hourlyRate: employer.hourlyRate,
    periodId: latest.id,
  };
}

// ── Legacy Shift model ────────────────────────────────────────────────────────

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

export async function getAllShifts(userId: string): Promise<ShiftDisplay[]> {
  const shifts = await db.shift.findMany({
    where: { userId },
    orderBy: [{ shiftDate: "desc" }, { startTime: "desc" }],
  });
  return shifts.map(toShiftDisplay);
}

export async function deleteShift(id: string): Promise<void> {
  await db.shift.delete({ where: { id } });
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
