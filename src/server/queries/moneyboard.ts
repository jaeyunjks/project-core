import type { MoneyCategory, MoneyEntry, PayPeriod, PayPeriodDay, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { addDays, formatDateStr, parseLocalDate } from "@/lib/utils";
import {
  currentMonthKey,
  monthRange,
  formatMonthLong,
  formatMonthShort,
  customPeriodWindow,
  resolvePeriodWindow,
  projectAnchorToToday,
  billOccurrencesInPeriod,
  periodDayCounts,
  guessCategoryIcon,
  DEFAULT_CATEGORIES,
  localDateTimeToUtc,
  occurrenceLocalParts,
  calculateRecordedBalance,
  calculateBudgetPosition,
  calculateRecurringBillCoverage,
  calculateFlexibleBalance,
  calculateSavingsForecast,
  calculateSavingsGoal,
  fortnightsUntil,
  sumMoney,
  todayDateStr,
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
  CategoryBudgetRow,
  CommittedItemDisplay,
  RecurringBillDisplay,
  FinancialAccountDisplay,
  AccountOverview,
  AccountTransferDisplay,
  TransactionHistoryPage,
  BillFundingSummary,
  SavingsForecastDisplay,
  SavingsGoalDisplay,
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
  include: { category: true; account: true };
}>;

function toEntryDisplay(e: EntryWithCat): MoneyEntryDisplay {
  const local = occurrenceLocalParts(e.occurredAt);
  return {
    id: e.id,
    kind: e.kind as "income" | "expense",
    amount: e.amount,
    currency: e.currency,
    date: local.date,
    time: local.time,
    occurrenceTimeKnown: e.occurrenceTimeKnown,
    occurredAt: e.occurredAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    note: e.note,
    source: e.source as "manual" | "hoursboard",
    payPeriodId: e.payPeriodId,
    recurringBillId: e.recurringBillId,
    account: e.account
      ? {
          id: e.account.id,
          name: e.account.name,
          type: e.account.type as "everyday" | "bills" | "savings" | "other",
          currency: e.account.currency,
        }
      : null,
    category: toCategoryDisplay(e.category),
  };
}

function occurrenceRange(start: string, end: string): { gte: Date; lt: Date } {
  const endDate = new Date(`${end}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const nextDate = endDate.toISOString().slice(0, 10);
  return {
    gte: localDateTimeToUtc(start, "00:00"),
    lt: localDateTimeToUtc(nextDate, "00:00"),
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
      where: { userId, currency, occurredAt: occurrenceRange(start, end) },
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
    where: { userId, currency, occurredAt: occurrenceRange(start, end) },
    include: { category: true, account: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
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
    where: { userId, currency, occurredAt: occurrenceRange(start, end) },
    include: { category: true, account: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
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
  time: string;              // HH:mm Australia/Sydney
  occurrenceTimeKnown?: boolean;
  categoryId: string;
  accountId: string | null;
  recurringBillId?: string | null;
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
  const account = input.accountId
    ? await db.financialAccount.findUnique({ where: { id: input.accountId } })
    : null;
  if (input.accountId && (!account || account.userId !== userId || account.archivedAt)) {
    throw new Error("Invalid account.");
  }
  if (account && account.currency !== input.currency) throw new Error("Account currency does not match entry currency.");
  if (input.recurringBillId) {
    const bill = await db.recurringBill.findUnique({ where: { id: input.recurringBillId } });
    if (!bill || bill.userId !== userId) throw new Error("Invalid bill.");
  }
  const occurredAt = localDateTimeToUtc(input.date, input.time);

  const entry = await db.moneyEntry.create({
    data: {
      userId,
      kind: input.kind,
      amount: Math.round(Math.abs(input.amount) * 100) / 100,
      currency: input.currency,
      date: input.date,
      occurredAt,
      occurrenceTimeKnown: input.occurrenceTimeKnown ?? true,
      categoryId: input.categoryId,
      accountId: input.accountId,
      recurringBillId: input.recurringBillId ?? null,
      note: input.note?.trim() || null,
      source: input.source ?? "manual",
      payPeriodId: input.payPeriodId ?? null,
    },
    include: { category: true, account: true },
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
  const account = input.accountId
    ? await db.financialAccount.findUnique({ where: { id: input.accountId } })
    : null;
  if (input.accountId && (!account || account.userId !== userId || account.archivedAt)) {
    throw new Error("Invalid account.");
  }
  if (account && account.currency !== input.currency) throw new Error("Account currency does not match entry currency.");
  const occurredAt = localDateTimeToUtc(input.date, input.time);

  const entry = await db.moneyEntry.update({
    where: { id },
    data: {
      kind: input.kind,
      amount: Math.round(Math.abs(input.amount) * 100) / 100,
      currency: input.currency,
      date: input.date,
      occurredAt,
      occurrenceTimeKnown: input.occurrenceTimeKnown ?? existing.occurrenceTimeKnown,
      categoryId: input.categoryId,
      accountId: input.accountId,
      recurringBillId: input.recurringBillId ?? existing.recurringBillId,
      note: input.note?.trim() || null,
    },
    include: { category: true, account: true },
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
    include: { category: true, account: true },
  });
  if (!src || src.userId !== userId) throw new Error("Entry not found.");
  const copy = await db.moneyEntry.create({
    data: {
      userId,
      kind: src.kind,
      amount: src.amount,
      currency: src.currency,
      date: src.date,
      occurredAt: src.occurredAt,
      occurrenceTimeKnown: src.occurrenceTimeKnown,
      categoryId: src.categoryId,
      accountId: src.accountId,
      recurringBillId: src.recurringBillId,
      note: src.note,
      source: "manual",
    },
    include: { category: true, account: true },
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
    include: { category: true, account: true },
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
    time: "12:00",
    occurrenceTimeKnown: false,
    categoryId: workCat.id,
    accountId: null,
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

// Colours assigned to auto-created plan categories, cycled by sort order.
const CATEGORY_PALETTE = [
  "#2D4A2E", "#5A6A3A", "#B59A6F", "#4F6B5E", "#8A6A3F", "#4A5B7A", "#7A4A6B", "#8F8772",
];
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The YYYY-MM-DD of a monthly due-day within [start, end], or null if absent. */
function monthlyDueDateInWindow(dueDay: number, start: string, end: string): string | null {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const cursor = new Date(ys, ms - 1, ds);
  const endDate = new Date(ye, me - 1, de);
  while (cursor <= endDate) {
    if (cursor.getDate() === dueDay) return fmtDate(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

/** True when a monthly bill's dueDay lands somewhere in [start, end] inclusive. */
function monthlyBillHitsWindow(dueDay: number, start: string, end: string): boolean {
  return monthlyDueDateInWindow(dueDay, start, end) !== null;
}

/**
 * Whether a bill counts as already paid within [start, end].
 * Weekly / fortnightly (and monthly without a due day) have no exact date, so
 * they're considered paid as soon as the plan covers them. A monthly bill with
 * a due day is paid only once that date has arrived.
 */
function billPaidForWindow(
  bill: { cadence: string; dueDay: number | null },
  start: string,
  end: string,
  today: string,
): boolean {
  if (bill.cadence !== "month") return true;
  if (bill.dueDay == null) return true;
  const due = monthlyDueDateInWindow(bill.dueDay, start, end);
  if (!due) return false;
  return due <= today;
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
  const today = fmtDate(new Date());

  // Default view (no explicit anchor): if the user has a saved plan for this
  // period type, follow its custom cycle start instead of snapping to Monday —
  // so a start date they set once carries forward across visits.
  let effectiveAnchor = anchor;
  if (!effectiveAnchor && periodType !== "month") {
    const latestPlan = await db.budgetPeriod.findFirst({
      where: { userId, currency, periodType },
      orderBy: { startDate: "desc" },
      select: { startDate: true },
    });
    if (latestPlan) {
      effectiveAnchor = projectAnchorToToday(periodType, latestPlan.startDate, today);
    }
  }

  const baseWin: PeriodWindow = resolvePeriodWindow(periodType, effectiveAnchor);
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
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const savedNames = new Set(savedItems.map((it) => it.name.trim().toLowerCase()));
  const virtualBillItems: CommittedItemDisplay[] = [];
  for (const b of activeBills) {
    const occurrences = billOccurrencesForWindow(b, win.startDate, win.endDate, periodType).count;
    if (occurrences <= 0) continue;
    const displayName =
      b.cadence === "month" && b.dueDay ? `${b.name} · ${ordinalDay(b.dueDay)}` : b.name;
    if (savedNames.has(displayName.trim().toLowerCase())) continue;
    virtualBillItems.push({
      id: `auto-bill-${b.id}`,
      name: displayName,
      amount: Math.round(b.amount * occurrences * 100) / 100,
      recur: b.cadence === "week" ? "Weekly" : b.cadence === "month" ? "Monthly" : b.cadence === "year" ? "Yearly" : "Fortnightly",
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
      occurredAt: occurrenceRange(win.startDate, win.endDate),
    },
    include: { category: true, account: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });
  const expenses = expensesRaw.map(toEntryDisplay);

  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const plannedSpendable = moneyIn - protectValue - committedTotal;

  // Per-category spend map (feeds both the segment bar and category budgets).
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

  // Category budgets — committed items whose name matches a spending category,
  // drawn down by actual spend in that category (e.g. Food $80 − $10 = $70).
  const expenseCats = await db.moneyCategory.findMany({
    where: { userId, kind: "expense" },
  });
  const catByLabel = new Map<string, { id: string; color: string }>();
  for (const c of expenseCats) catByLabel.set(c.label.trim().toLowerCase(), { id: c.id, color: c.color });
  const billCategoryByName = new Map<string, { id: string; color: string }>();
  for (const bill of activeBills) {
    if (bill.category) billCategoryByName.set(bill.name.trim().toLowerCase(), { id: bill.category.id, color: bill.category.color });
  }

  // Backfill a meaningful icon for previously auto-created plan categories that
  // still carry the generic placeholder ("dots"). Leaves "Other" alone.
  for (const c of expenseCats) {
    if (c.icon === "dots" && c.label.trim().toLowerCase() !== "other") {
      await db.moneyCategory.update({ where: { id: c.id }, data: { icon: guessCategoryIcon(c.label) } });
    }
  }

  // Materialize a real expense category for every committed item that doesn't
  // have one yet — including auto-filled recurring bills, so a bill reflects in
  // the drawdown + Add-spend picker as soon as it's added, without waiting for a
  // plan to be saved. Idempotent.
  let maxSort = expenseCats.reduce((m, c) => Math.max(m, c.sortOrder), -1);
  for (const it of committedItems) {
    const baseName = it.name.split(" · ")[0].trim();
    if (!baseName || baseName === "Item") continue;
    const key = baseName.toLowerCase();
    const linkedBillCategory = billCategoryByName.get(key);
    if (linkedBillCategory) {
      catByLabel.set(key, linkedBillCategory);
      continue;
    }
    if (catByLabel.has(key)) continue;
    maxSort += 1;
    const created = await db.moneyCategory.create({
      data: {
        userId,
        key: `${slugify(baseName)}-${Math.random().toString(36).slice(2, 7)}`,
        label: baseName,
        kind: "expense",
        color: CATEGORY_PALETTE[maxSort % CATEGORY_PALETTE.length],
        icon: guessCategoryIcon(baseName),
        sortOrder: maxSort,
      },
    });
    catByLabel.set(key, { id: created.id, color: created.color });
  }

  const spentByCatId = new Map<string, number>();
  for (const seg of byCat.values()) spentByCatId.set(seg.categoryId, seg.amount);

  // Linked expenses remain real spending. Eligible recurring bills may also
  // provide planning-only coverage, matching the original budget workflow.
  // Only the uncovered remainder is added, so a linked expense is never
  // counted twice and no MoneyEntry or account balance is fabricated.
  const actualPaidByBillId = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.recurringBillId) continue;
    actualPaidByBillId.set(
      expense.recurringBillId,
      sumMoney([(actualPaidByBillId.get(expense.recurringBillId) ?? 0), expense.amount]),
    );
  }

  const billByBaseName = new Map(activeBills.map((bill) => [bill.name.trim().toLowerCase(), bill]));
  const billCoveredByCatId = new Map<string, number>();
  const planningCoverageByCatId = new Map<string, number>();
  const processedBillIds = new Set<string>();
  for (const item of committedItems) {
    const baseName = item.name.split(" · ")[0].trim();
    const bill = billByBaseName.get(baseName.toLowerCase());
    const category = catByLabel.get(baseName.toLowerCase());
    if (!bill || !category || processedBillIds.has(bill.id)) continue;
    processedBillIds.add(bill.id);

    const automaticallyCovered =
      billPaidForWindow(bill, win.startDate, win.endDate, today) ||
      (!!bill.paidThroughDate && bill.paidThroughDate >= win.endDate);
    const coverage = calculateRecurringBillCoverage({
      committedAmount: Number(item.amount) || 0,
      actualPaidAmount: actualPaidByBillId.get(bill.id) ?? 0,
      automaticallyCovered,
    });
    if (coverage.planningCoverage > 0) {
      planningCoverageByCatId.set(
        category.id,
        sumMoney([(planningCoverageByCatId.get(category.id) ?? 0), coverage.planningCoverage]),
      );
      spentByCatId.set(
        category.id,
        sumMoney([(spentByCatId.get(category.id) ?? 0), coverage.planningCoverage]),
      );
    }
    billCoveredByCatId.set(
      category.id,
      sumMoney([(billCoveredByCatId.get(category.id) ?? 0), coverage.coveredAmount]),
    );
  }

  // Sum committed-item allocations per matched category (dedupe by category).
  const allocMap = new Map<string, { name: string; color: string; budgeted: number }>();
  for (const it of committedItems) {
    // Strip any " · suffix" (e.g. a monthly bill's due-day tag) before matching.
    const baseName = it.name.split(" · ")[0].trim();
    const match = catByLabel.get(baseName.toLowerCase());
    if (!match) continue;
    const prev = allocMap.get(match.id);
    if (prev) prev.budgeted += Number(it.amount) || 0;
    else allocMap.set(match.id, { name: baseName, color: match.color, budgeted: Number(it.amount) || 0 });
  }
  const allocatedCategoryIds = new Set(allocMap.keys());
  const categoryBudgets: CategoryBudgetRow[] = [...allocMap.entries()].map(([catId, a]) => {
    const position = calculateBudgetPosition(a.budgeted, spentByCatId.get(catId) ?? 0);
    const budgeted = position.budgeted;
    const catSpent = position.spent;
    const billCovered = Math.round((billCoveredByCatId.get(catId) ?? 0) * 100) / 100;
    const planningCoverage = Math.round((planningCoverageByCatId.get(catId) ?? 0) * 100) / 100;
    const actualSpent = Math.round((byCat.get(catId)?.amount ?? 0) * 100) / 100;
    return {
      key: catId,
      name: a.name,
      categoryId: catId,
      color: a.color,
      budgeted,
      spent: catSpent,
      actualSpent,
      planningCoverage,
      remaining: position.remaining,
      percentUsed: Math.max(0, Math.min(100, Math.round(position.percentUsed))),
      overBudget: position.overBudget,
      paid: budgeted > 0 && billCovered >= budgeted - 0.005,
    };
  });

  // Spending split: expenses in an allocated category draw down that category's
  // budget; everything else (Other / unallocated) draws the flexible pool.
  let unplannedSpentRaw = 0;
  for (const e of expenses) {
    if (!allocatedCategoryIds.has(e.category.id)) unplannedSpentRaw += e.amount;
  }
  const unplannedSpent = Math.round(unplannedSpentRaw * 100) / 100;
  const plannedSpent = Math.round((spent - unplannedSpentRaw) * 100) / 100;
  const totalSpent = Math.round(spent * 100) / 100;
  const flexible = calculateFlexibleBalance({
    plannedSpendable,
    unplannedSpent: unplannedSpentRaw,
    categoryPositions: categoryBudgets,
  });
  const categoryOverspend = flexible.categoryOverspend;
  const negativePlanCapacity = Math.max(0, -plannedSpendable);
  const overspentAmount = sumMoney([categoryOverspend, negativePlanCapacity]);

  const leftToSpend = flexible.leftToSpend;
  const perDay = counts.daysLeft > 0
    ? Math.max(0, leftToSpend) / counts.daysLeft
    : Math.max(0, leftToSpend);
  const progressPercent = plannedSpendable > 0
    ? Math.max(0, Math.min(100, Math.round(((unplannedSpentRaw + categoryOverspend) / plannedSpendable) * 100)))
    : 0;
  const transactionCount = await db.moneyEntry.count({
    where: { userId, currency, occurredAt: occurrenceRange(win.startDate, win.endDate) },
  });
  const recentEntries = (
    await db.moneyEntry.findMany({
      where: { userId, currency, occurredAt: occurrenceRange(win.startDate, win.endDate) },
      include: { category: true, account: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: RECENT_ENTRIES_LIMIT,
    })
  ).map(toEntryDisplay);

  return {
    id: plan?.id ?? null,
    periodType,
    startDate: win.startDate,
    endDate: win.endDate,
    today,
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
    spent: totalSpent,
    plannedSpent,
    unplannedSpent,
    leftToSpend,
    perDay: Math.round(perDay * 100) / 100,
    progressPercent,
    overspentAmount,
    overallOverBudget: leftToSpend < 0 || categoryBudgets.some((row) => row.overBudget),
    transactionCount,
    categorySegments,
    categoryBudgets,
    recentEntries,
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

    // Ensure each plan category exists as a real expense category, so it shows
    // up everywhere — the drawdown bars AND the Add-spend picker.
    const existingCats = await tx.moneyCategory.findMany({ where: { userId, kind: "expense" } });
    const byLabel = new Map(existingCats.map((c) => [c.label.trim().toLowerCase(), c]));
    let maxSort = existingCats.reduce((m, c) => Math.max(m, c.sortOrder), -1);
    for (const it of cleanedItems) {
      const baseName = it.name.split(" · ")[0].trim();
      if (!baseName || baseName === "Item") continue;
      const key = baseName.toLowerCase();
      if (byLabel.has(key)) continue;
      maxSort += 1;
      const created = await tx.moneyCategory.create({
        data: {
          userId,
          key: `${slugify(baseName)}-${Math.random().toString(36).slice(2, 7)}`,
          label: baseName,
          kind: "expense",
          color: CATEGORY_PALETTE[maxSort % CATEGORY_PALETTE.length],
          icon: guessCategoryIcon(baseName),
          sortOrder: maxSort,
        },
      });
      byLabel.set(key, created);
    }

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
    include: { account: true, category: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    currency: r.currency,
    cadence: r.cadence as "week" | "fortnight" | "month" | "year",
    dueDay: r.dueDay,
    nextPaymentDate: r.nextPaymentDate,
    accountId: r.accountId,
    accountName: r.account?.name ?? null,
    categoryId: r.categoryId,
    categoryName: r.category?.label ?? null,
    description: r.description,
    paidThroughDate: r.paidThroughDate,
    active: r.active,
    sortOrder: r.sortOrder,
  }));
}

export interface RecurringBillInput {
  name: string;
  amount: number;
  currency: string;
  cadence: "week" | "fortnight" | "month" | "year";
  dueDay?: number | null;
  nextPaymentDate?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  paidThroughDate?: string | null;
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
  if (input.accountId) {
    const account = await db.financialAccount.findUnique({ where: { id: input.accountId } });
    if (!account || account.userId !== userId || account.currency !== input.currency) throw new Error("Invalid payment account.");
  }
  if (input.categoryId) {
    const category = await db.moneyCategory.findUnique({ where: { id: input.categoryId } });
    if (!category || category.userId !== userId || category.kind !== "expense") throw new Error("Invalid bill category.");
  }
  await db.recurringBill.create({
    data: {
      userId,
      name: input.name.trim() || "Bill",
      amount: Math.max(0, Number(input.amount) || 0),
      currency: input.currency,
      cadence: input.cadence,
      dueDay: cleanBillDueDay(input),
      nextPaymentDate: input.nextPaymentDate || null,
      accountId: input.accountId || null,
      categoryId: input.categoryId || null,
      description: input.description?.trim() || null,
      paidThroughDate: input.paidThroughDate || null,
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
  if (input.accountId) {
    const account = await db.financialAccount.findUnique({ where: { id: input.accountId } });
    if (!account || account.userId !== userId || account.currency !== input.currency) throw new Error("Invalid payment account.");
  }
  if (input.categoryId) {
    const category = await db.moneyCategory.findUnique({ where: { id: input.categoryId } });
    if (!category || category.userId !== userId || category.kind !== "expense") throw new Error("Invalid bill category.");
  }
  await db.recurringBill.update({
    where: { id },
    data: {
      name: input.name.trim() || "Bill",
      amount: Math.max(0, Number(input.amount) || 0),
      currency: input.currency,
      cadence: input.cadence,
      dueDay: cleanBillDueDay(input),
      nextPaymentDate: input.nextPaymentDate || null,
      accountId: input.accountId || null,
      categoryId: input.categoryId || null,
      description: input.description?.trim() || null,
      paidThroughDate: input.paidThroughDate || null,
      active: input.active ?? existing.active,
    },
  });
}

export async function deleteRecurringBill(id: string, userId: string): Promise<void> {
  const existing = await db.recurringBill.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Bill not found.");
  await db.recurringBill.delete({ where: { id } });
}

// ── Financial accounts and transfers ───────────────────────────────────────

export interface FinancialAccountInput {
  name: string;
  type: "everyday" | "bills" | "savings" | "other";
  currency: string;
  openingBalance: number;
  color?: string | null;
}

async function ensureDefaultAccount(userId: string, currency: string): Promise<void> {
  const count = await db.financialAccount.count({ where: { userId, currency } });
  if (count > 0) return;
  await db.financialAccount.upsert({
    where: { userId_name_currency: { userId, name: "Everyday", currency } },
    create: { userId, name: "Everyday", type: "everyday", currency, openingBalance: 0 },
    update: {},
  });
}

export async function getAccountOverview(
  userId: string,
  currency: string,
  includeArchived = false,
): Promise<AccountOverview> {
  await ensureDefaultAccount(userId, currency);
  const accounts = await db.financialAccount.findMany({
    where: { userId, currency, ...(includeArchived ? {} : { archivedAt: null }) },
    include: {
      entries: { select: { kind: true, amount: true } },
      incomingTransfers: { select: { amount: true } },
      outgoingTransfers: { select: { amount: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const display: FinancialAccountDisplay[] = accounts.map((account) => {
    const currentBalance = calculateRecordedBalance({
      openingBalance: Number(account.openingBalance),
      income: account.entries.filter((e) => e.kind === "income").map((e) => e.amount),
      expenses: account.entries.filter((e) => e.kind === "expense").map((e) => e.amount),
      transfersIn: account.incomingTransfers.map((t) => Number(t.amount)),
      transfersOut: account.outgoingTransfers.map((t) => Number(t.amount)),
    });
    return {
      id: account.id,
      name: account.name,
      type: account.type as FinancialAccountDisplay["type"],
      currency: account.currency,
      openingBalance: Number(account.openingBalance),
      currentBalance,
      color: account.color,
      sortOrder: account.sortOrder,
      archived: !!account.archivedAt,
      transactionCount: account.entries.length,
    };
  });

  const recent = await db.accountTransfer.findMany({
    where: { userId, currency },
    include: { fromAccount: true, toAccount: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 8,
  });
  const recentTransfers: AccountTransferDisplay[] = recent.map((transfer) => {
    const local = occurrenceLocalParts(transfer.occurredAt);
    return {
      id: transfer.id,
      fromAccountId: transfer.fromAccountId,
      fromAccountName: transfer.fromAccount.name,
      toAccountId: transfer.toAccountId,
      toAccountName: transfer.toAccount.name,
      amount: Number(transfer.amount),
      currency: transfer.currency,
      occurredAt: transfer.occurredAt.toISOString(),
      date: local.date,
      time: local.time,
      note: transfer.note,
      createdAt: transfer.createdAt.toISOString(),
    };
  });

  const savingsIds = new Set(display.filter((a) => a.type === "savings").map((a) => a.id));
  const contributionTransfers = await db.accountTransfer.findMany({
    where: {
      userId,
      currency,
      OR: [{ fromAccountId: { in: [...savingsIds] } }, { toAccountId: { in: [...savingsIds] } }],
    },
    select: { fromAccountId: true, toAccountId: true, amount: true },
  });
  const contributionCents = contributionTransfers.reduce((sum, transfer) => {
    const intoSavings = savingsIds.has(transfer.toAccountId) && !savingsIds.has(transfer.fromAccountId);
    const outOfSavings = savingsIds.has(transfer.fromAccountId) && !savingsIds.has(transfer.toAccountId);
    return sum + (intoSavings ? Math.round(Number(transfer.amount) * 100) : 0) - (outOfSavings ? Math.round(Number(transfer.amount) * 100) : 0);
  }, 0);

  return {
    accounts: display,
    recentTransfers,
    totalRecordedBalance: sumMoney(display.map((account) => account.currentBalance)),
    totalSavings: sumMoney(display.filter((account) => account.type === "savings").map((account) => account.currentBalance)),
    actualSavingsContributions: Math.round(contributionCents) / 100,
    unassignedTransactionCount: await db.moneyEntry.count({ where: { userId, currency, accountId: null } }),
  };
}

export async function createFinancialAccount(userId: string, input: FinancialAccountInput): Promise<string> {
  const max = await db.financialAccount.aggregate({ where: { userId }, _max: { sortOrder: true } });
  const account = await db.financialAccount.create({
    data: {
      userId,
      name: input.name.trim(),
      type: input.type,
      currency: input.currency,
      openingBalance: input.openingBalance.toFixed(2),
      color: input.color || null,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  return account.id;
}

export async function updateFinancialAccount(
  id: string,
  userId: string,
  input: FinancialAccountInput,
): Promise<void> {
  const existing = await db.financialAccount.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Account not found.");
  await db.financialAccount.update({
    where: { id },
    data: {
      name: input.name.trim(),
      type: input.type,
      openingBalance: input.openingBalance.toFixed(2),
      color: input.color || null,
    },
  });
}

export async function setFinancialAccountArchived(id: string, userId: string, archived: boolean): Promise<void> {
  const existing = await db.financialAccount.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw new Error("Account not found.");
  await db.financialAccount.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
}

export async function createAccountTransfer(
  userId: string,
  input: { fromAccountId: string; toAccountId: string; amount: number; date: string; time: string; note: string | null },
): Promise<string> {
  if (input.fromAccountId === input.toAccountId) throw new Error("Choose two different accounts.");
  return db.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.financialAccount.findUnique({ where: { id: input.fromAccountId } }),
      tx.financialAccount.findUnique({ where: { id: input.toAccountId } }),
    ]);
    if (!from || !to || from.userId !== userId || to.userId !== userId) throw new Error("Account not found.");
    if (from.archivedAt || to.archivedAt) throw new Error("Archived accounts cannot be used for new transfers.");
    if (from.currency !== to.currency) throw new Error("Transfers require accounts in the same currency.");
    const transfer = await tx.accountTransfer.create({
      data: {
        userId,
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: input.amount.toFixed(2),
        currency: from.currency,
        occurredAt: localDateTimeToUtc(input.date, input.time),
        note: input.note?.trim() || null,
      },
    });
    return transfer.id;
  });
}

// ── Complete transaction history ───────────────────────────────────────────

export interface TransactionHistoryFilters {
  start: string;
  end: string;
  currency: string;
  kind?: "income" | "expense";
  categoryId?: string;
  accountId?: string;
  search?: string;
  sort?: "newest" | "oldest" | "amount-high" | "amount-low";
  page?: number;
  pageSize?: number;
}

export async function getTransactionHistory(
  userId: string,
  filters: TransactionHistoryFilters,
): Promise<TransactionHistoryPage> {
  const pageSize = Math.max(10, Math.min(100, filters.pageSize ?? 25));
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.MoneyEntryWhereInput = {
    userId,
    currency: filters.currency,
    occurredAt: occurrenceRange(filters.start, filters.end),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.accountId === "unassigned"
      ? { accountId: null }
      : filters.accountId
        ? { accountId: filters.accountId }
        : {}),
    ...(filters.search ? { note: { contains: filters.search, mode: "insensitive" } } : {}),
  };
  const orderBy: Prisma.MoneyEntryOrderByWithRelationInput[] =
    filters.sort === "oldest"
      ? [{ occurredAt: "asc" }, { createdAt: "asc" }]
      : filters.sort === "amount-high"
        ? [{ amount: "desc" }, { occurredAt: "desc" }]
        : filters.sort === "amount-low"
          ? [{ amount: "asc" }, { occurredAt: "desc" }]
          : [{ occurredAt: "desc" }, { createdAt: "desc" }];
  const [total, rows] = await Promise.all([
    db.moneyEntry.count({ where }),
    db.moneyEntry.findMany({
      where,
      include: { category: true, account: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    entries: rows.map(toEntryDisplay),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ── Bill funding ────────────────────────────────────────────────────────────

function addBillCadence(dateStr: string, cadence: string): string {
  const date = parseLocalDate(dateStr);
  if (cadence === "week") return formatDateStr(addDays(date, 7));
  if (cadence === "fortnight") return formatDateStr(addDays(date, 14));
  const day = date.getDate();
  const months = cadence === "year" ? 12 : 1;
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return formatDateStr(target);
}

function billOccurrencesForWindow(
  bill: { cadence: string; nextPaymentDate: string | null; dueDay: number | null },
  start: string,
  end: string,
  periodType: BudgetPeriodType,
): { count: number; dates: string[] } {
  if (bill.nextPaymentDate) {
    let cursor = bill.nextPaymentDate;
    let guard = 0;
    while (cursor < start && guard < 600) {
      cursor = addBillCadence(cursor, bill.cadence);
      guard += 1;
    }
    const dates: string[] = [];
    while (cursor <= end && guard < 650) {
      dates.push(cursor);
      cursor = addBillCadence(cursor, bill.cadence);
      guard += 1;
    }
    return { count: dates.length, dates };
  }
  if (bill.cadence === "year") return { count: 0, dates: [] };
  if (bill.cadence === "month" && bill.dueDay != null) {
    const due = monthlyDueDateInWindow(bill.dueDay, start, end);
    return { count: due ? 1 : 0, dates: due ? [due] : [] };
  }
  const count = bill.cadence === periodType ? 1 : billOccurrencesInPeriod(bill.cadence as BudgetPeriodType, periodType);
  return { count, dates: [] };
}

export async function getBillFundingSummary(
  userId: string,
  periodType: BudgetPeriodType,
  start: string,
  end: string,
  currency: string,
  accountsOverview?: AccountOverview,
): Promise<BillFundingSummary> {
  const overview = accountsOverview ?? await getAccountOverview(userId, currency);
  const bills = await db.recurringBill.findMany({
    where: { userId, currency, active: true },
    include: { account: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const paidEntries = await db.moneyEntry.findMany({
    where: {
      userId,
      currency,
      kind: "expense",
      recurringBillId: { not: null },
      occurredAt: occurrenceRange(start, end),
    },
    select: { recurringBillId: true, amount: true },
  });
  const paidByBill = new Map<string, number>();
  for (const entry of paidEntries) {
    if (entry.recurringBillId) paidByBill.set(entry.recurringBillId, (paidByBill.get(entry.recurringBillId) ?? 0) + entry.amount);
  }

  const rowMap = new Map<string, BillFundingSummary["rows"][number]>();
  for (const bill of bills) {
    const occurrence = billOccurrencesForWindow(bill, start, end, periodType);
    if (occurrence.count <= 0) continue;
    const amount = Math.round(bill.amount * occurrence.count * 100) / 100;
    const key = bill.accountId ?? "unassigned";
    const account = overview.accounts.find((item) => item.id === bill.accountId);
    const row = rowMap.get(key) ?? {
      accountId: bill.accountId,
      accountName: account?.name ?? "Account not assigned",
      required: 0,
      available: account?.currentBalance ?? 0,
      shortfall: 0,
      bills: [],
    };
    const paid = (paidByBill.get(bill.id) ?? 0) >= amount - 0.005 || (!!bill.paidThroughDate && bill.paidThroughDate >= end);
    row.required = sumMoney([row.required, amount]);
    row.bills.push({ id: bill.id, name: bill.name, amount, dueDate: occurrence.dates[0] ?? null, paid });
    rowMap.set(key, row);
  }
  const rows = [...rowMap.values()].map((row) => {
    const unpaid = sumMoney(row.bills.filter((bill) => !bill.paid).map((bill) => bill.amount));
    return { ...row, shortfall: Math.max(0, sumMoney([unpaid, -row.available])) };
  });
  return {
    rows,
    totalRequired: sumMoney(rows.map((row) => row.required)),
    totalShortfall: sumMoney(rows.map((row) => row.shortfall)),
  };
}

// ── Forecasting and savings goals ──────────────────────────────────────────

export async function getSavingsForecast(
  userId: string,
  currency: string,
  targetDate: string,
  overviewInput?: AccountOverview,
): Promise<SavingsForecastDisplay> {
  const today = todayDateStr();
  const end = parseLocalDate(today);
  const start = addDays(end, -14 * 8);
  const startStr = formatDateStr(start);
  const [overview, entries, transfers] = await Promise.all([
    overviewInput ?? getAccountOverview(userId, currency),
    db.moneyEntry.findMany({
      where: { userId, currency, occurredAt: occurrenceRange(startStr, today) },
      select: { kind: true, amount: true, occurredAt: true },
    }),
    db.accountTransfer.findMany({
      where: { userId, currency, occurredAt: occurrenceRange(startStr, today) },
      include: { fromAccount: true, toAccount: true },
    }),
  ]);
  const net = Array.from({ length: 8 }, () => 0);
  const savings = Array.from({ length: 8 }, () => 0);
  const activity = Array.from({ length: 8 }, () => false);
  for (const entry of entries) {
    const local = occurrenceLocalParts(entry.occurredAt).date;
    const index = Math.min(7, Math.max(0, Math.floor((parseLocalDate(local).getTime() - start.getTime()) / (14 * 86400000))));
    net[index] = sumMoney([net[index], entry.kind === "income" ? entry.amount : -entry.amount]);
    activity[index] = true;
  }
  for (const transfer of transfers) {
    const qualifies = transfer.toAccount.type === "savings" && transfer.fromAccount.type !== "savings";
    if (!qualifies) continue;
    const local = occurrenceLocalParts(transfer.occurredAt).date;
    const index = Math.min(7, Math.max(0, Math.floor((parseLocalDate(local).getTime() - start.getTime()) / (14 * 86400000))));
    savings[index] = sumMoney([savings[index], Number(transfer.amount)]);
    activity[index] = true;
  }
  // Exclude the current partial fortnight to avoid overstating/understating a trend.
  const completedActivity = activity.slice(0, 7);
  const firstActive = completedActivity.findIndex(Boolean);
  const completedNet = firstActive < 0 ? [] : net.slice(firstActive, 7);
  const completedSavings = firstActive < 0 ? [] : savings.slice(firstActive, 7);
  return {
    targetDate,
    ...calculateSavingsForecast({
      periodNetCashFlow: completedNet,
      periodSavingsContributions: completedSavings,
      currentTotalBalance: overview.totalRecordedBalance,
      currentSavingsBalance: overview.totalSavings,
      futureFortnights: fortnightsUntil(today, targetDate),
    }),
  };
}

export async function getSavingsGoals(
  userId: string,
  currency: string,
  overviewInput?: AccountOverview,
): Promise<SavingsGoalDisplay[]> {
  const overview = overviewInput ?? await getAccountOverview(userId, currency);
  const rows = await db.savingsGoal.findMany({
    where: { userId, currency },
    include: { account: true },
    orderBy: [{ active: "desc" }, { targetDate: "asc" }],
  });
  const forecasts = new Map<string, SavingsForecastDisplay>();
  for (const targetDate of new Set(rows.map((row) => row.targetDate))) {
    forecasts.set(targetDate, await getSavingsForecast(userId, currency, targetDate, overview));
  }
  return rows.map((goal) => {
    const account = overview.accounts.find((item) => item.id === goal.accountId);
    const currentAmount = account?.currentBalance ?? overview.totalSavings;
    const forecast = forecasts.get(goal.targetDate)!;
    const status = calculateSavingsGoal({
      currentAmount,
      targetAmount: Number(goal.targetAmount),
      targetDate: goal.targetDate,
      today: todayDateStr(),
      contributionPerFortnight: forecast.savingsPerFortnight,
    });
    return {
      id: goal.id,
      name: goal.name,
      targetAmount: Number(goal.targetAmount),
      targetDate: goal.targetDate,
      currency: goal.currency,
      accountId: goal.accountId,
      accountName: goal.account?.name ?? null,
      currentAmount,
      ...status,
      active: goal.active,
    };
  });
}

export async function createSavingsGoal(
  userId: string,
  input: { name: string; targetAmount: number; targetDate: string; currency: string; accountId: string | null },
): Promise<string> {
  if (input.accountId) {
    const account = await db.financialAccount.findUnique({ where: { id: input.accountId } });
    if (!account || account.userId !== userId || account.type !== "savings") throw new Error("Choose a valid savings account.");
  }
  const goal = await db.savingsGoal.create({
    data: {
      userId,
      name: input.name.trim(),
      targetAmount: input.targetAmount.toFixed(2),
      targetDate: input.targetDate,
      currency: input.currency,
      accountId: input.accountId,
    },
  });
  return goal.id;
}

export async function deleteSavingsGoal(id: string, userId: string): Promise<void> {
  const goal = await db.savingsGoal.findUnique({ where: { id } });
  if (!goal || goal.userId !== userId) throw new Error("Savings goal not found.");
  await db.savingsGoal.delete({ where: { id } });
}

// ── Convenience ──────────────────────────────────────────────────────────────

/** Resolves "is this user authenticated?" — mirrors HoursBoard convention */
export async function getCurrentUser() {
  const { requireUser } = await import("@/server/auth");
  return requireUser();
}
