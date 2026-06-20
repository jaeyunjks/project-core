import type { Employer, Prisma, Shift, User } from "@prisma/client";
import { db } from "@/lib/db";
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
import type {
  ShiftDisplay,
  PayPeriodDayDisplay,
  PayPeriodDisplay,
  PayPeriodSummary,
  DashboardHoursPreview,
} from "@/types";

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

function getDefaultAwardType(dateStr: string): string {
  const day = parseLocalDate(dateStr).getDay();
  if (day === 6) return "saturday";
  if (day === 0) return "sunday";
  return "weekday";
}

export function getDefaultPayRate(awardType: string, baseRate: number): number {
  return Math.round(baseRate * (AWARD_MULTIPLIERS[awardType] ?? 1.0) * 100) / 100;
}

// ── Pure calculations ─────────────────────────────────────────────────────────

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

/** Pure summary from a list of displayed days */
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

// ── Type helpers ──────────────────────────────────────────────────────────────

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
  return {
    id: p.id,
    startDate: p.startDate,
    endDate: p.endDate,
    label: formatPeriodLabelWithYear(p.startDate, p.endDate),
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

// ── DB: User / Employer ───────────────────────────────────────────────────────

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

// ── DB: PayPeriod ─────────────────────────────────────────────────────────────

/** All pay periods for a user, sorted oldest → newest */
export async function getPayPeriods(userId: string): Promise<PayPeriodDisplay[]> {
  const periods = await db.payPeriod.findMany({
    where: { userId },
    include: { days: { orderBy: { date: "asc" } } },
    orderBy: { startDate: "asc" },
  });
  const today = todayStr();
  return periods.map((p) => toPayPeriodDisplay(p, today));
}

/** Most recent pay period (newest startDate) */
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

/** Pay period by ID */
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

/**
 * Creates the next 14-day pay period immediately after the latest one.
 * If no periods exist yet, uses employer.payPeriodStartDate as the start.
 * Throws if a period with the same startDate already exists.
 */
export async function createNextPayPeriod(
  userId: string
): Promise<PayPeriodDisplay> {
  const employer = await getDemoEmployer();
  const latest = await db.payPeriod.findFirst({
    where: { userId },
    orderBy: { startDate: "desc" },
  });

  const startDate = latest
    ? formatDateStr(addDays(parseLocalDate(latest.endDate), 1))
    : employer.payPeriodStartDate;
  const endDate = formatDateStr(addDays(parseLocalDate(startDate), 13));

  const duplicate = await db.payPeriod.findFirst({
    where: { userId, startDate },
  });
  if (duplicate) {
    throw new Error("A pay period starting on this date already exists.");
  }

  const period = await db.payPeriod.create({
    data: {
      userId,
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

/** Update a single day row in the worksheet */
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

// ── DB: Dashboard preview ─────────────────────────────────────────────────────

/**
 * Lightweight summary for the dashboard HoursBoard preview card.
 * Returns null if no pay periods exist yet.
 */
export async function getDashboardHoursPreview(
  userId: string
): Promise<DashboardHoursPreview | null> {
  const employer = await getDemoEmployer();
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

// ── DB: Legacy Shift model ────────────────────────────────────────────────────

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
