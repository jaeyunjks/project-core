import type { AwardLevel, Employer, Prisma, Shift, User } from "@prisma/client";
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
  getDefaultDayType,
  getDefaultPayRate,
} from "@/domain/hoursboard";
import type {
  ShiftDisplay,
  PayPeriodDayDisplay,
  PayPeriodDisplay,
  DashboardHoursPreview,
  AwardLevelDisplay,
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
  include: {
    days: {
      orderBy: { date: "asc" };
      include: { awardLevel: true };
    };
  };
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
    dayType: day.dayType,
    awardLevelId: day.awardLevelId,
    awardLevelCode: day.awardLevel?.code ?? null,
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
    const dayType = getDefaultDayType(dateStr);
    days.push({
      date: dateStr,
      workHours: 0,
      dayType,
      awardLevelId: null,
      payRate: getDefaultPayRate(dayType, baseRate),
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
    include: { days: { orderBy: { date: "asc" }, include: { awardLevel: true } } },
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
    include: { days: { orderBy: { date: "asc" }, include: { awardLevel: true } } },
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
    include: { days: { orderBy: { date: "asc" }, include: { awardLevel: true } } },
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
    include: { days: { orderBy: { date: "asc" }, include: { awardLevel: true } } },
  });

  return toPayPeriodDisplay(period, todayStr());
}

export async function updatePayPeriodDay(
  id: string,
  data: {
    workHours: number;
    dayType: string;
    awardLevelId: string | null;
    payRate: number;
    notes: string | null;
  }
): Promise<void> {
  await db.payPeriodDay.update({ where: { id }, data });
}

/**
 * Updates a pay period's name and/or date range.
 * If dates change: keeps day-row data for dates that overlap, drops days now
 * outside the range, and creates fresh empty rows for newly-covered dates.
 */
export async function updatePayPeriod(
  id: string,
  userId: string,
  input: CreatePayPeriodInput
): Promise<PayPeriodDisplay> {
  const existing = await db.payPeriod.findUnique({
    where: { id },
    include: { days: true },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("Pay period not found.");
  }

  const { name, startDate, endDate } = input;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("Start and end dates must be in YYYY-MM-DD format.");
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const durationDays = daysBetween(start, end) + 1;

  if (durationDays < MIN_PERIOD_DAYS) {
    throw new Error(`Pay period must be at least ${MIN_PERIOD_DAYS} days.`);
  }
  if (durationDays > MAX_PERIOD_DAYS) {
    throw new Error(`Pay period cannot exceed ${MAX_PERIOD_DAYS} days.`);
  }

  // Check for another period with the same start date (excluding this one)
  if (startDate !== existing.startDate) {
    const duplicate = await db.payPeriod.findFirst({
      where: { userId, startDate, NOT: { id } },
    });
    if (duplicate) {
      throw new Error("Another pay period starts on this date.");
    }
  }

  const datesChanged =
    startDate !== existing.startDate || endDate !== existing.endDate;

  await db.payPeriod.update({
    where: { id },
    data: {
      name: name?.trim() || null,
      startDate,
      endDate,
    },
  });

  if (datesChanged) {
    const employer = await getCurrentEmployer();
    const newRange = new Set<string>();
    let current = parseLocalDate(startDate);
    while (current <= end) {
      newRange.add(formatDateStr(current));
      current = addDays(current, 1);
    }

    const existingByDate = new Map(existing.days.map((d) => [d.date, d]));

    // Delete days that fell outside the new range
    const toDelete = existing.days
      .filter((d) => !newRange.has(d.date))
      .map((d) => d.id);
    if (toDelete.length > 0) {
      await db.payPeriodDay.deleteMany({ where: { id: { in: toDelete } } });
    }

    // Create empty days for dates not previously covered
    const toCreate = [...newRange]
      .filter((date) => !existingByDate.has(date))
      .map((date) => {
        const dayType = getDefaultDayType(date);
        return {
          payPeriodId: id,
          date,
          workHours: 0,
          dayType,
          awardLevelId: null,
          payRate: getDefaultPayRate(dayType, employer.hourlyRate),
          notes: null,
        };
      });
    if (toCreate.length > 0) {
      await db.payPeriodDay.createMany({ data: toCreate });
    }
  }

  const updated = await db.payPeriod.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" }, include: { awardLevel: true } } },
  });
  return toPayPeriodDisplay(updated!, todayStr());
}

/** Permanently deletes a pay period and all its days. */
export async function deletePayPeriod(
  id: string,
  userId: string
): Promise<void> {
  const existing = await db.payPeriod.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Pay period not found.");
  }
  await db.payPeriod.delete({ where: { id } });
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

// ── AwardLevel CRUD ───────────────────────────────────────────────────────────

function toAwardLevelDisplay(a: AwardLevel): AwardLevelDisplay {
  return {
    id: a.id,
    code: a.code,
    description: a.description,
    baseRate: a.baseRate,
  };
}

export async function getAwardLevels(
  userId: string,
  employerId?: string
): Promise<AwardLevelDisplay[]> {
  const rows = await db.awardLevel.findMany({
    where: { userId, ...(employerId ? { employerId } : {}) },
    orderBy: { code: "asc" },
  });
  return rows.map(toAwardLevelDisplay);
}

export interface AwardLevelInput {
  code: string;
  description: string | null;
  baseRate: number;
}

export async function createAwardLevel(
  userId: string,
  employerId: string,
  input: AwardLevelInput
): Promise<AwardLevelDisplay> {
  const code = input.code.trim();
  if (!code) throw new Error("Award code is required.");
  if (!Number.isFinite(input.baseRate) || input.baseRate < 0) {
    throw new Error("Base rate must be a non-negative number.");
  }

  const dup = await db.awardLevel.findFirst({ where: { employerId, code } });
  if (dup) throw new Error(`Award level "${code}" already exists.`);

  const created = await db.awardLevel.create({
    data: {
      userId,
      employerId,
      code,
      description: input.description?.trim() || null,
      baseRate: Math.round(input.baseRate * 100) / 100,
    },
  });
  return toAwardLevelDisplay(created);
}

export async function updateAwardLevel(
  id: string,
  userId: string,
  input: AwardLevelInput
): Promise<AwardLevelDisplay> {
  const existing = await db.awardLevel.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Award level not found.");
  }

  const code = input.code.trim();
  if (!code) throw new Error("Award code is required.");
  if (!Number.isFinite(input.baseRate) || input.baseRate < 0) {
    throw new Error("Base rate must be a non-negative number.");
  }

  // If code changed, check uniqueness within the same employer
  if (code !== existing.code) {
    const dup = await db.awardLevel.findFirst({
      where: { employerId: existing.employerId, code, NOT: { id } },
    });
    if (dup) throw new Error(`Award level "${code}" already exists.`);
  }

  const updated = await db.awardLevel.update({
    where: { id },
    data: {
      code,
      description: input.description?.trim() || null,
      baseRate: Math.round(input.baseRate * 100) / 100,
    },
  });
  return toAwardLevelDisplay(updated);
}

export async function deleteAwardLevel(
  id: string,
  userId: string
): Promise<void> {
  const existing = await db.awardLevel.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Award level not found.");
  }
  await db.awardLevel.delete({ where: { id } });
}
