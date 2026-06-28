import type { MoneyCategory, MoneyEntry, PayPeriod, PayPeriodDay, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  currentMonthKey,
  monthRange,
  formatMonthLong,
  formatMonthShort,
  DEFAULT_CATEGORIES,
} from "@/domain/moneyboard";
import type {
  MoneyCategoryDisplay,
  MoneyEntryDisplay,
  MoneyEntryGroup,
  CategoryBreakdownRow,
  MonthlyMoneySummary,
  MonthNavOption,
  LifetimeMoneyStats,
} from "@/types";

// ── Mappers ──────────────────────────────────────────────────────────────────

function toCategoryDisplay(c: MoneyCategory): MoneyCategoryDisplay {
  return {
    id: c.id,
    key: c.key,
    label: c.label,
    kind: c.kind as "income" | "expense",
    color: c.color,
    icon: c.icon,
    sortOrder: c.sortOrder,
  };
}

type EntryWithCat = Prisma.MoneyEntryGetPayload<{
  include: { category: true };
}>;

function toEntryDisplay(e: EntryWithCat): MoneyEntryDisplay {
  return {
    id: e.id,
    kind: e.kind as "income" | "expense",
    amount: e.amount,
    currency: e.currency,
    date: e.date,
    note: e.note,
    source: e.source as "manual" | "hoursboard",
    payPeriodId: e.payPeriodId,
    category: toCategoryDisplay(e.category),
  };
}

// ── Categories ───────────────────────────────────────────────────────────────

/**
 * Returns categories for the user. If somehow none exist (e.g. user predates
 * the MoneyBoard rollout), they're lazily seeded with the default set.
 */
export async function getCategories(userId: string): Promise<MoneyCategoryDisplay[]> {
  let rows = await db.moneyCategory.findMany({
    where: { userId },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
  });

  if (rows.length === 0) {
    await db.moneyCategory.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        userId,
      })),
    });
    rows = await db.moneyCategory.findMany({
      where: { userId },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    });
  }

  return rows.map(toCategoryDisplay);
}

// ── Monthly query — the heart of MoneyBoard ─────────────────────────────────

/** All months that have at least one entry, newest first */
export async function getMonthsWithEntries(userId: string): Promise<string[]> {
  const entries = await db.moneyEntry.findMany({
    where: { userId },
    select: { date: true },
  });
  const months = new Set<string>();
  for (const e of entries) months.add(e.date.slice(0, 7));
  return [...months].sort().reverse();
}

/** Build month nav options (current month always included, even if empty) */
export async function getMonthNavOptions(
  userId: string,
  currency: string
): Promise<MonthNavOption[]> {
  const months = await getMonthsWithEntries(userId);
  const curr = currentMonthKey();
  if (!months.includes(curr)) months.unshift(curr);

  const sorted = [...new Set(months)].sort().reverse();
  const options: MonthNavOption[] = [];

  for (const mk of sorted) {
    const { start, end } = monthRange(mk);
    const entries = await db.moneyEntry.findMany({
      where: { userId, currency, date: { gte: start, lte: end } },
      select: { kind: true, amount: true },
    });
    let income = 0;
    let expenses = 0;
    for (const e of entries) {
      if (e.kind === "income") income += e.amount;
      else expenses += e.amount;
    }
    const net = income - expenses;
    options.push({
      monthKey: mk,
      label: formatMonthLong(mk),
      net: Math.round(net * 100) / 100,
    });
  }

  return options;
}

/** Full monthly summary — overview hero + breakdown + grouped entry list */
export async function getMonthlyMoneyData(
  userId: string,
  monthKey: string,
  currency: string
): Promise<MonthlyMoneySummary> {
  const { start, end } = monthRange(monthKey);

  const entriesRaw = await db.moneyEntry.findMany({
    where: { userId, currency, date: { gte: start, lte: end } },
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const entries = entriesRaw.map(toEntryDisplay);

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  for (const e of entries) {
    if (e.kind === "income") {
      totalIncome += e.amount;
      incomeCount++;
    } else {
      totalExpenses += e.amount;
      expenseCount++;
    }
  }
  const net = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? Math.round((net / totalIncome) * 1000) / 10 : null;

  // Category breakdown — expenses only, descending
  const byCat = new Map<string, { row: CategoryBreakdownRow; total: number }>();
  for (const e of entries) {
    if (e.kind !== "expense") continue;
    const existing = byCat.get(e.category.id);
    if (existing) {
      existing.total += e.amount;
    } else {
      byCat.set(e.category.id, {
        row: {
          categoryId: e.category.id,
          key: e.category.key,
          label: e.category.label,
          color: e.category.color,
          total: 0,
          percent: 0,
        },
        total: e.amount,
      });
    }
  }
  const breakdown: CategoryBreakdownRow[] = [...byCat.values()]
    .map(({ row, total }) => ({
      ...row,
      total: Math.round(total * 100) / 100,
      percent:
        totalExpenses > 0
          ? Math.round((total / totalExpenses) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Group entries by date (newest first — entries already sorted desc)
  const groups: MoneyEntryGroup[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else groups.push({ date: e.date, entries: [e] });
  }

  return {
    monthKey,
    monthLabel: formatMonthLong(monthKey),
    monthRange: formatMonthShort(monthKey),
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    net: Math.round(net * 100) / 100,
    incomeCount,
    expenseCount,
    totalCount: entries.length,
    savingsRate,
    breakdown,
    groups,
  };
}

/** Generic date-range query — used for week/fortnight views */
export async function getDateRangeMoneyData(
  userId: string,
  start: string,
  end: string,
  rangeLabel: string,
  rangeShort: string,
  key: string,
  currency: string
): Promise<MonthlyMoneySummary> {
  const entriesRaw = await db.moneyEntry.findMany({
    where: { userId, currency, date: { gte: start, lte: end } },
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const entries = entriesRaw.map(toEntryDisplay);

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  for (const e of entries) {
    if (e.kind === "income") {
      totalIncome += e.amount;
      incomeCount++;
    } else {
      totalExpenses += e.amount;
      expenseCount++;
    }
  }
  const net = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? Math.round((net / totalIncome) * 1000) / 10 : null;

  const byCat = new Map<string, { row: CategoryBreakdownRow; total: number }>();
  for (const e of entries) {
    if (e.kind !== "expense") continue;
    const existing = byCat.get(e.category.id);
    if (existing) {
      existing.total += e.amount;
    } else {
      byCat.set(e.category.id, {
        row: {
          categoryId: e.category.id,
          key: e.category.key,
          label: e.category.label,
          color: e.category.color,
          total: 0,
          percent: 0,
        },
        total: e.amount,
      });
    }
  }
  const breakdown: CategoryBreakdownRow[] = [...byCat.values()]
    .map(({ row, total }) => ({
      ...row,
      total: Math.round(total * 100) / 100,
      percent: totalExpenses > 0 ? Math.round((total / totalExpenses) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const groups: MoneyEntryGroup[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else groups.push({ date: e.date, entries: [e] });
  }

  return {
    monthKey: key,
    monthLabel: rangeLabel,
    monthRange: rangeShort,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    net: Math.round(net * 100) / 100,
    incomeCount,
    expenseCount,
    totalCount: entries.length,
    savingsRate,
    breakdown,
    groups,
  };
}

/** Lifetime totals — for the "Across all time" card */
export async function getLifetimeMoneyStats(
  userId: string,
  currency: string
): Promise<LifetimeMoneyStats> {
  const entries = await db.moneyEntry.findMany({
    where: { userId, currency },
    select: { kind: true, amount: true, date: true },
  });
  let income = 0;
  let expenses = 0;
  const months = new Set<string>();
  for (const e of entries) {
    months.add(e.date.slice(0, 7));
    if (e.kind === "income") income += e.amount;
    else expenses += e.amount;
  }
  return {
    months: months.size,
    totalIncome: Math.round(income * 100) / 100,
    totalExpenses: Math.round(expenses * 100) / 100,
    net: Math.round((income - expenses) * 100) / 100,
  };
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface MoneyEntryInput {
  kind: "income" | "expense";
  amount: number;            // positive
  currency: string;          // ISO 4217 code
  date: string;              // YYYY-MM-DD
  categoryId: string;
  note: string | null;
  source?: "manual" | "hoursboard";
  payPeriodId?: string | null;
}

export async function createMoneyEntry(
  userId: string,
  input: MoneyEntryInput
): Promise<MoneyEntryDisplay> {
  // Validate category belongs to user
  const cat = await db.moneyCategory.findUnique({ where: { id: input.categoryId } });
  if (!cat || cat.userId !== userId) throw new Error("Invalid category.");
  if (cat.kind !== input.kind) {
    throw new Error(`Category "${cat.label}" can't be used for ${input.kind}.`);
  }

  const entry = await db.moneyEntry.create({
    data: {
      userId,
      kind: input.kind,
      amount: Math.round(Math.abs(input.amount) * 100) / 100,
      currency: input.currency,
      date: input.date,
      categoryId: input.categoryId,
      note: input.note?.trim() || null,
      source: input.source ?? "manual",
      payPeriodId: input.payPeriodId ?? null,
    },
    include: { category: true },
  });
  return toEntryDisplay(entry);
}

export async function updateMoneyEntry(
  id: string,
  userId: string,
  input: MoneyEntryInput
): Promise<MoneyEntryDisplay> {
  const existing = await db.moneyEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Entry not found.");
  const cat = await db.moneyCategory.findUnique({ where: { id: input.categoryId } });
  if (!cat || cat.userId !== userId) throw new Error("Invalid category.");
  if (cat.kind !== input.kind) {
    throw new Error(`Category "${cat.label}" can't be used for ${input.kind}.`);
  }

  const entry = await db.moneyEntry.update({
    where: { id },
    data: {
      kind: input.kind,
      amount: Math.round(Math.abs(input.amount) * 100) / 100,
      currency: input.currency,
      date: input.date,
      categoryId: input.categoryId,
      note: input.note?.trim() || null,
    },
    include: { category: true },
  });
  return toEntryDisplay(entry);
}

export async function deleteMoneyEntry(id: string, userId: string): Promise<void> {
  const existing = await db.moneyEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Entry not found.");
  await db.moneyEntry.delete({ where: { id } });
}

export async function duplicateMoneyEntry(id: string, userId: string): Promise<MoneyEntryDisplay> {
  const src = await db.moneyEntry.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!src || src.userId !== userId) throw new Error("Entry not found.");
  const copy = await db.moneyEntry.create({
    data: {
      userId,
      kind: src.kind,
      amount: src.amount,
      currency: src.currency,
      date: src.date,
      categoryId: src.categoryId,
      note: src.note,
      source: "manual",
    },
    include: { category: true },
  });
  return toEntryDisplay(copy);
}

// ── HoursBoard import ────────────────────────────────────────────────────────

type PeriodWithDays = Prisma.PayPeriodGetPayload<{
  include: { days: true };
}>;

export interface HoursBoardImportPreview {
  payPeriodId: string;
  label: string;             // "8–21 Jun 2026"
  totalHours: number;
  workedDays: number;
  estimatedGross: number;
  paydayDate: string;        // YYYY-MM-DD — date the entry will land on
  alreadyImported: boolean;
}

/** Preview the latest completed (i.e. fully past) pay period for import */
export async function previewHoursBoardImport(
  userId: string
): Promise<HoursBoardImportPreview | null> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const period: PeriodWithDays | null = await db.payPeriod.findFirst({
    where: { userId, endDate: { lt: todayStr } }, // strictly ended
    include: { days: true },
    orderBy: { endDate: "desc" },
  });
  if (!period) return null;

  const totalHours = period.days.reduce((s, d) => s + d.workHours, 0);
  const workedDays = period.days.filter((d) => d.workHours > 0).length;
  const estimatedGross = period.days.reduce(
    (s, d) => s + Math.round(d.workHours * d.payRate * 100) / 100,
    0
  );

  // Payday: end date (acts as the entry's date)
  const paydayDate = period.endDate;

  // Has this period already been imported?
  const existing = await db.moneyEntry.findFirst({
    where: { userId, payPeriodId: period.id, source: "hoursboard" },
  });

  const startD = period.startDate.slice(8);
  const endD = period.endDate.slice(8);
  const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][
    Number(period.startDate.slice(5, 7)) - 1
  ];
  const year = period.startDate.slice(0, 4);
  const label = `${Number(startD)}–${Number(endD)} ${monthShort} ${year}`;

  return {
    payPeriodId: period.id,
    label,
    totalHours: Math.round(totalHours * 100) / 100,
    workedDays,
    estimatedGross: Math.round(estimatedGross * 100) / 100,
    paydayDate,
    alreadyImported: !!existing,
  };
}

/** Create an income entry from a HoursBoard pay period. */
export async function importHoursBoardPeriod(
  userId: string,
  payPeriodId: string
): Promise<MoneyEntryDisplay> {
  const period: PeriodWithDays | null = await db.payPeriod.findUnique({
    where: { id: payPeriodId },
    include: { days: true },
  });
  if (!period || period.userId !== userId) throw new Error("Pay period not found.");

  // Find the user's "work" category (the default income category)
  const categories = await getCategories(userId);
  const workCat = categories.find((c) => c.key === "work" && c.kind === "income");
  if (!workCat) throw new Error("Work category missing — re-seed needed.");

  const estimatedGross = period.days.reduce(
    (s, d) => s + Math.round(d.workHours * d.payRate * 100) / 100,
    0
  );

  // Idempotency: if already imported, return the existing entry
  const existing = await db.moneyEntry.findFirst({
    where: { userId, payPeriodId, source: "hoursboard" },
    include: { category: true },
  });
  if (existing) return toEntryDisplay(existing);

  const startD = period.startDate.slice(8);
  const endD = period.endDate.slice(8);
  const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][
    Number(period.startDate.slice(5, 7)) - 1
  ];
  const note = `Pay period ${Number(startD)}–${Number(endD)} ${monthShort}`;

  return createMoneyEntry(userId, {
    kind: "income",
    amount: estimatedGross,
    currency: "AUD", // HoursBoard pay periods are tracked in AUD
    date: period.endDate,
    categoryId: workCat.id,
    note,
    source: "hoursboard",
    payPeriodId,
  });
}

// ── Convenience ──────────────────────────────────────────────────────────────

/** Resolves "is this user authenticated?" — mirrors HoursBoard convention */
export async function getCurrentUser() {
  return requireUser();
}
