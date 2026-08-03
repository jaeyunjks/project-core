import type { MoneyCategory, MoneyEntry, PayPeriod, PayPeriodDay, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
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
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const savedNames = new Set(savedItems.map((it) => it.name.trim().toLowerCase()));
  const virtualBillItems: CommittedItemDisplay[] = [];
  for (const b of activeBills) {
    const cadence = b.cadence as BudgetPeriodType;
    // How many of this bill land in the window:
    //  • same cadence → 1
    //  • monthly bill with a due-day that falls inside a shorter window → 1
    //  • shorter cadence than the period (weekly on a month, etc.) → scaled up
    //    (×2 / ×4), so its full cost for the period is committed & budgeted
    let occurrences: number;
    if (cadence === periodType) {
      occurrences = 1;
    } else if (
      cadence === "month" &&
      b.dueDay != null &&
      monthlyBillHitsWindow(b.dueDay, win.startDate, win.endDate)
    ) {
      occurrences = 1;
    } else {
      occurrences = billOccurrencesInPeriod(cadence, periodType);
    }
    if (occurrences <= 0) continue;
    const displayName =
      b.cadence === "month" && b.dueDay ? `${b.name} · ${ordinalDay(b.dueDay)}` : b.name;
    if (savedNames.has(displayName.trim().toLowerCase())) continue;
    virtualBillItems.push({
      id: `auto-bill-${b.id}`,
      name: displayName,
      amount: Math.round(b.amount * occurrences * 100) / 100,
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

  // Auto-count applicable bills as "paid" spend in their category, so the bar
  // fills without a manual entry. Weekly/fortnightly (no exact date) pay
  // immediately; monthly with a due day pays once that date has arrived.
  const billByBase = new Map<string, (typeof activeBills)[number]>();
  for (const b of activeBills) billByBase.set(b.name.trim().toLowerCase(), b);
  const billPaidByCatId = new Map<string, number>();
  let billPaidTotal = 0;
  for (const it of committedItems) {
    const baseName = it.name.split(" · ")[0].trim();
    const bill = billByBase.get(baseName.toLowerCase());
    if (!bill) continue;
    if (!billPaidForWindow(bill, win.startDate, win.endDate, today)) continue;
    const cat = catByLabel.get(baseName.toLowerCase());
    if (!cat) continue;
    const amt = Number(it.amount) || 0;
    spentByCatId.set(cat.id, (spentByCatId.get(cat.id) ?? 0) + amt);
    billPaidByCatId.set(cat.id, (billPaidByCatId.get(cat.id) ?? 0) + amt);
    billPaidTotal += amt;
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
    const budgeted = Math.round(a.budgeted * 100) / 100;
    const catSpent = Math.round((spentByCatId.get(catId) ?? 0) * 100) / 100;
    const billPaid = Math.round((billPaidByCatId.get(catId) ?? 0) * 100) / 100;
    return {
      key: catId,
      name: a.name,
      categoryId: catId,
      color: a.color,
      budgeted,
      spent: catSpent,
      remaining: Math.round((budgeted - catSpent) * 100) / 100,
      percentUsed: budgeted > 0 ? Math.max(0, Math.min(100, Math.round((catSpent / budgeted) * 100))) : 0,
      overBudget: catSpent > budgeted,
      paid: budgeted > 0 && billPaid >= budgeted - 0.005,
    };
  });

  // Spending split: expenses in an allocated category draw down that category's
  // budget; everything else (Other / unallocated) draws the flexible pool.
  let unplannedSpentRaw = 0;
  for (const e of expenses) {
    if (!allocatedCategoryIds.has(e.category.id)) unplannedSpentRaw += e.amount;
  }
  const unplannedSpent = Math.round(unplannedSpentRaw * 100) / 100;
  const plannedSpent = Math.round((spent - unplannedSpentRaw + billPaidTotal) * 100) / 100;
  const totalSpent = Math.round((spent + billPaidTotal) * 100) / 100;

  const leftToSpend = Math.round((plannedSpendable - unplannedSpentRaw) * 100) / 100;
  const perDay = counts.daysLeft > 0
    ? Math.max(0, leftToSpend) / counts.daysLeft
    : Math.max(0, leftToSpend);
  const progressPercent = plannedSpendable > 0
    ? Math.max(0, Math.min(100, Math.round((unplannedSpentRaw / plannedSpendable) * 100)))
    : 0;

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
    categorySegments,
    categoryBudgets,
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
