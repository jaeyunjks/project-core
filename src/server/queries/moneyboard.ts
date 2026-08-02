import type { MoneyCategory, MoneyEntry, PayPeriod, PayPeriodDay, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import {
  currentMonthKey,
  monthRange,
  formatMonthLong,
  formatMonthShort,
  periodWindow,
  customPeriodWindow,
  periodDayCounts,
  DEFAULT_CATEGORIES,
} from "@/domain/moneyboard";
import type { BudgetPeriodType, PeriodWindow } from "@/domain/moneyboard";
import type {
  MoneyCategoryDisplay,
  MoneyEntryDisplay,
  MoneyEntryGroup,
  CategoryBreakdownRow,
  MonthlyMoneySummary,
  MonthNavOption,
  LifetimeMoneyStats,
  BudgetPeriodDisplay,
  BudgetCategorySegment,
  CommittedItemDisplay,
  RecurringBillDisplay,
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

// ── Fortnight-budget planner ────────────────────────────────────────────────

const RECENT_ENTRIES_LIMIT = 6;

const DAY_SUFFIX = ["th", "st", "nd", "rd"];
function ordinalDay(n: number): string {
  const v = n % 100;
  return n + (DAY_SUFFIX[(v - 20) % 10] || DAY_SUFFIX[v] || DAY_SUFFIX[0]);
}

/** True when a monthly bill's dueDay lands somewhere in [start, end] inclusive. */
function monthlyBillHitsWindow(dueDay: number, start: string, end: string): boolean {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const startDate = new Date(ys, ms - 1, ds);
  const endDate = new Date(ye, me - 1, de);
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (cursor.getDate() === dueDay) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

type BudgetWithItems = Prisma.BudgetPeriodGetPayload<{
  include: { committedItems: true };
}>;

function toCommittedItemDisplay(row: BudgetWithItems["committedItems"][number]): CommittedItemDisplay {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    recur: row.recur,
    sortOrder: row.sortOrder,
  };
}

/**
 * Build a full BudgetPeriodDisplay for a (periodType, anchor, currency) window.
 * Reads any saved plan (BudgetPeriod + CommittedItems), then joins actual
 * spending from MoneyEntry for the same window and currency.
 * Never mutates — plan creation happens through the savePlan action.
 */
export async function getBudgetSummary(
  userId: string,
  periodType: BudgetPeriodType,
  anchor: string | undefined,
  currency: string,
  endOverride?: string,
): Promise<BudgetPeriodDisplay> {
  const baseWin: PeriodWindow = periodWindow(periodType, anchor);
  const win: PeriodWindow =
    endOverride && endOverride >= baseWin.startDate
      ? customPeriodWindow(periodType, baseWin.startDate, endOverride)
      : baseWin;
  const counts = periodDayCounts(win);

  const plan: BudgetWithItems | null = await db.budgetPeriod.findUnique({
    where: {
      userId_currency_periodType_startDate: {
        userId,
        currency,
        periodType,
        startDate: win.startDate,
      },
    },
    include: {
      committedItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  const savedItems = plan ? plan.committedItems.map(toCommittedItemDisplay) : [];

  // Merge in any active recurring bills that belong on this window but aren't
  // already on the saved plan. Same rules as the client's Plan sheet auto-fill.
  const activeBills = await db.recurringBill.findMany({
    where: { userId, currency, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const savedNames = new Set(savedItems.map((it) => it.name.trim().toLowerCase()));
  const virtualBillItems: CommittedItemDisplay[] = [];
  for (const b of activeBills) {
    const cadenceMatch = b.cadence === periodType;
    const monthlyHit =
      b.cadence === "month" &&
      b.dueDay != null &&
      monthlyBillHitsWindow(b.dueDay, win.startDate, win.endDate);
    if (!cadenceMatch && !monthlyHit) continue;
    const displayName =
      b.cadence === "month" && b.dueDay ? `${b.name} · ${ordinalDay(b.dueDay)}` : b.name;
    if (savedNames.has(displayName.trim().toLowerCase())) continue;
    virtualBillItems.push({
      id: `auto-bill-${b.id}`,
      name: displayName,
      amount: b.amount,
      recur: b.cadence === "week" ? "Weekly" : b.cadence === "month" ? "Monthly" : "Fortnightly",
      sortOrder: 9000 + virtualBillItems.length,
    });
  }
  const committedItems: CommittedItemDisplay[] = [...savedItems, ...virtualBillItems];
  const committedTotal = committedItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const moneyIn = plan?.moneyIn ?? 0;
  const protectValue = plan?.protectValue ?? 0;

  const expensesRaw = await db.moneyEntry.findMany({
    where: {
      userId,
      currency,
      kind: "expense",
      date: { gte: win.startDate, lte: win.endDate },
    },
    include: { category: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const expenses = expensesRaw.map(toEntryDisplay);

  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const plannedSpendable = moneyIn - protectValue - committedTotal;
  const leftToSpend = plannedSpendable - spent;
  const perDay = counts.daysLeft > 0
    ? Math.max(0, leftToSpend) / counts.daysLeft
    : Math.max(0, leftToSpend);
  const progressPercent = plannedSpendable > 0
    ? Math.max(0, Math.min(100, Math.round((spent / plannedSpendable) * 100)))
    : 0;

  const byCat = new Map<string, BudgetCategorySegment>();
  for (const e of expenses) {
    const existing = byCat.get(e.category.id);
    if (existing) {
      existing.amount += e.amount;
    } else {
      byCat.set(e.category.id, {
        categoryId: e.category.id,
        label: e.category.label,
        color: e.category.color,
        amount: e.amount,
        percent: 0,
      });
    }
  }
  const categorySegments: BudgetCategorySegment[] = [...byCat.values()]
    .map((seg) => ({
      ...seg,
      amount: Math.round(seg.amount * 100) / 100,
      percent: spent > 0 ? Math.round((seg.amount / spent) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    id: plan?.id ?? null,
    periodType,
    startDate: win.startDate,
    endDate: win.endDate,
    currency,
    rangeLabel: win.rangeLabel,
    heroLabel: win.heroLabel,
    daysTotal: counts.daysTotal,
    daysElapsed: counts.daysElapsed,
    daysLeft: counts.daysLeft,
    isFuture: counts.isFuture,
    hasPlan: !!plan,
    moneyIn,
    protectValue,
    committedTotal: Math.round(committedTotal * 100) / 100,
    committedItems,
    plannedSpendable: Math.round(plannedSpendable * 100) / 100,
    spent: Math.round(spent * 100) / 100,
    leftToSpend: Math.round(leftToSpend * 100) / 100,
    perDay: Math.round(perDay * 100) / 100,
    progressPercent,
    categorySegments,
    recentEntries: expenses.slice(0, RECENT_ENTRIES_LIMIT),
  };
}

export interface SaveBudgetPlanInput {
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  currency: string;
  moneyIn: number;
  protectValue: number;
  committedItems: { name: string; amount: number; recur: string }[];
}

/** Upsert the plan for a window and replace its committed items. */
export async function saveBudgetPlan(userId: string, input: SaveBudgetPlanInput): Promise<void> {
  const cleanedItems = input.committedItems
    .map((it, i) => ({
      name: (it.name || "").trim() || "Item",
      amount: Math.max(0, Number(it.amount) || 0),
      recur: (it.recur || "Monthly").trim() || "Monthly",
      sortOrder: i,
    }))
    .filter((it) => it.amount > 0 || it.name !== "Item");

  await db.$transaction(async (tx) => {
    const plan = await tx.budgetPeriod.upsert({
      where: {
        userId_currency_periodType_startDate: {
          userId,
          currency: input.currency,
          periodType: input.periodType,
          startDate: input.startDate,
        },
      },
      create: {
        userId,
        currency: input.currency,
        periodType: input.periodType,
        startDate: input.startDate,
        endDate: input.endDate,
        moneyIn: Math.max(0, Number(input.moneyIn) || 0),
        protectValue: Math.max(0, Number(input.protectValue) || 0),
      },
      update: {
        endDate: input.endDate,
        moneyIn: Math.max(0, Number(input.moneyIn) || 0),
        protectValue: Math.max(0, Number(input.protectValue) || 0),
      },
    });

    await tx.committedItem.deleteMany({ where: { budgetPeriodId: plan.id } });
    if (cleanedItems.length > 0) {
      await tx.committedItem.createMany({
        data: cleanedItems.map((it) => ({ ...it, budgetPeriodId: plan.id })),
      });
    }
  });
}

// ── Recurring bills ─────────────────────────────────────────────────────────

export async function getRecurringBills(
  userId: string,
  currency: string,
): Promise<RecurringBillDisplay[]> {
  const rows = await db.recurringBill.findMany({
    where: { userId, currency },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    currency: r.currency,
    cadence: r.cadence as "week" | "fortnight" | "month",
    dueDay: r.dueDay,
    active: r.active,
    sortOrder: r.sortOrder,
  }));
}

export interface RecurringBillInput {
  name: string;
  amount: number;
  currency: string;
  cadence: "week" | "fortnight" | "month";
  dueDay?: number | null;
  active?: boolean;
}

function cleanBillDueDay(input: RecurringBillInput): number | null {
  if (input.cadence !== "month") return null;
  const d = Number(input.dueDay);
  return Number.isFinite(d) && d >= 1 && d <= 31 ? Math.floor(d) : null;
}

export async function createRecurringBill(userId: string, input: RecurringBillInput): Promise<void> {
  const max = await db.recurringBill.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  await db.recurringBill.create({
    data: {
      userId,
      name: input.name.trim() || "Bill",
      amount: Math.max(0, Number(input.amount) || 0),
      currency: input.currency,
      cadence: input.cadence,
      dueDay: cleanBillDueDay(input),
      active: input.active ?? true,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateRecurringBill(
  id: string,
  userId: string,
  input: RecurringBillInput,
): Promise<void> {
  const existing = await db.recurringBill.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Bill not found.");
  await db.recurringBill.update({
    where: { id },
    data: {
      name: input.name.trim() || "Bill",
      amount: Math.max(0, Number(input.amount) || 0),
      currency: input.currency,
      cadence: input.cadence,
      dueDay: cleanBillDueDay(input),
      active: input.active ?? existing.active,
    },
  });
}

export async function deleteRecurringBill(id: string, userId: string): Promise<void> {
  const existing = await db.recurringBill.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Bill not found.");
  await db.recurringBill.delete({ where: { id } });
}

// ── Convenience ──────────────────────────────────────────────────────────────

/** Resolves "is this user authenticated?" — mirrors HoursBoard convention */
export async function getCurrentUser() {
  return requireUser();
}
