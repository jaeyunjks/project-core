// Pure domain logic for MoneyBoard. No DB, no React.

import { parseLocalDate, addDays, formatDateStr } from "@/lib/utils";

export const MONEYBOARD_TIME_ZONE = "Australia/Sydney";

/** Round monetary arithmetic through cents to avoid binary floating drift. */
export function toCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(Number(cents) || 0) / 100;
}

export function sumMoney(values: number[]): number {
  return fromCents(values.reduce((sum, value) => sum + toCents(value), 0));
}

function zonedParts(date: Date, timeZone = MONEYBOARD_TIME_ZONE): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

/** Convert a Sydney wall-clock date/time into an absolute instant, including DST. */
export function localDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone = MONEYBOARD_TIME_ZONE,
): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error("Date and time are invalid.");
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    throw new Error("Date and time are invalid.");
  }

  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wanted;
  for (let i = 0; i < 4; i += 1) {
    const p = zonedParts(new Date(instant), timeZone);
    const represented = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
    );
    const delta = wanted - represented;
    if (delta === 0) break;
    instant += delta;
  }
  const result = new Date(instant);
  const final = occurrenceLocalParts(result, timeZone);
  if (final.date !== dateStr || final.time !== timeStr) {
    throw new Error("That local time does not exist in Australia/Sydney because of daylight saving.");
  }
  return result;
}

export function occurrenceLocalParts(
  value: Date | string,
  timeZone = MONEYBOARD_TIME_ZONE,
): { date: string; time: string } {
  const p = zonedParts(typeof value === "string" ? new Date(value) : value, timeZone);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}

export function currentSydneyDateTime(): { date: string; time: string } {
  return occurrenceLocalParts(new Date());
}

// ── Icon keys (mirrored by CategoryIcon component) ───────────────────────────

export type CategoryIconKey =
  | "briefcase"
  | "chat"
  | "home"
  | "utensils"
  | "bolt"
  | "play"
  | "circle-plus"
  | "dots"
  | "cart"
  | "bag"
  | "book"
  | "shield"
  | "car"
  | "heart"
  | "sparkle"
  | "coffee"
  | "gift"
  | "tag";

/** Best-effort icon for a category based on its name. */
export function guessCategoryIcon(name: string): CategoryIconKey {
  const n = name.toLowerCase();
  const has = (...ks: string[]) => ks.some((k) => n.includes(k));
  if (has("grocer", "supermarket", "market", "woolworth", "coles", "aldi")) return "cart";
  if (has("food", "eat", "restaurant", "dining", "lunch", "dinner", "meal", "snack")) return "utensils";
  if (has("coffee", "cafe", "tea")) return "coffee";
  if (has("shop", "cloth", "fashion", "apparel", "retail")) return "bag";
  if (has("educat", "school", "study", "tuition", "course", "book", "learn", "univers", "college", "tutor")) return "book";
  if (has("makeup", "beauty", "cosmetic", "skincare", "salon", "hair", "nail")) return "sparkle";
  if (has("insur", "cover")) return "shield";
  if (has("save", "saving", "protect", "emergency")) return "shield";
  if (has("rent", "home", "house", "mortgage", "housing", "accom")) return "home";
  if (has("transport", "car", "fuel", "petrol", "gas ", "uber", "taxi", "bus", "train", "opal", "commut", "parking")) return "car";
  if (has("health", "medical", "doctor", "pharmacy", "gym", "fitness", "sport", "dental")) return "heart";
  if (has("entertain", "movie", "cinema", "game", "music", "concert")) return "play";
  if (has("subscri", "netflix", "spotify", "claude", "software", "app ", "membership")) return "play";
  if (has("util", "electric", "water", "power", "energy", "internet", "phone", "mobile", "bill")) return "bolt";
  if (has("gift", "present", "donat", "charity")) return "gift";
  if (has("work", "salary", "job", "freelance", "income", "wage")) return "briefcase";
  return "tag";
}

// ── Default categories — match the design brief ──────────────────────────────

export interface DefaultCategory {
  key: string;
  label: string;
  kind: "income" | "expense";
  color: string;
  icon: CategoryIconKey;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Income
  { key: "work", label: "Work", kind: "income", color: "#2D4A2E", icon: "briefcase", sortOrder: 0 },
  { key: "freelance", label: "Freelance", kind: "income", color: "#2D4A2E", icon: "chat", sortOrder: 1 },
  { key: "income_other", label: "Other", kind: "income", color: "#8F8772", icon: "dots", sortOrder: 2 },
  // Expense
  { key: "rent", label: "Rent", kind: "expense", color: "#2D4A2E", icon: "home", sortOrder: 0 },
  { key: "food", label: "Food", kind: "expense", color: "#5A6A3A", icon: "utensils", sortOrder: 1 },
  { key: "utilities", label: "Utilities", kind: "expense", color: "#B59A6F", icon: "bolt", sortOrder: 2 },
  { key: "entertainment", label: "Entertainment", kind: "expense", color: "#4F6B5E", icon: "play", sortOrder: 3 },
  { key: "transport", label: "Transport", kind: "expense", color: "#8A6A3F", icon: "circle-plus", sortOrder: 4 },
  { key: "expense_other", label: "Other", kind: "expense", color: "#8F8772", icon: "dots", sortOrder: 5 },
];

// ── Month / date helpers ─────────────────────────────────────────────────────

/** YYYY-MM month key, e.g. "2026-06" */
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** First and last date of a month, both YYYY-MM-DD inclusive */
export function monthRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // day 0 of next month = last day of this month
  return { start: formatDateStr(start), end: formatDateStr(end) };
}

/** Month label like "June 2026" */
export function formatMonthLong(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${y}`;
}

/** Short range label like "1–30 Jun" */
export function formatMonthShort(monthKey: string): string {
  const { start, end } = monthRange(monthKey);
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${s.getDate()}–${e.getDate()} ${months[s.getMonth()]}`;
}

/** Number of days in the given month */
export function daysInMonth(monthKey: string): number {
  const { start, end } = monthRange(monthKey);
  return parseLocalDate(end).getDate() - parseLocalDate(start).getDate() + 1;
}

/** Current month YYYY-MM */
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Previous/next month nav */
export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Group label like "MON · 22 JUN" for the entry list */
export function formatDayHeader(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
}

/** Whole-period date list */
export function datesBetween(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  let curr = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  while (curr <= end) {
    dates.push(formatDateStr(curr));
    curr = addDays(curr, 1);
  }
  return dates;
}

// ── Week / fortnight helpers ─────────────────────────────────────────────────

export type ViewMode = "month" | "week" | "fortnight";

/** Get the Monday-based week range containing a given date */
export function weekRange(dateStr: string): { start: string; end: string } {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(d, diff);
  const sunday = addDays(monday, 6);
  return { start: formatDateStr(monday), end: formatDateStr(sunday) };
}

/** Get a fortnight (2-week) range: the Monday-based fortnight containing a date */
export function fortnightRange(dateStr: string): { start: string; end: string } {
  const { start } = weekRange(dateStr);
  const monday = parseLocalDate(start);
  const endDate = addDays(monday, 13);
  return { start, end: formatDateStr(endDate) };
}

/** Shift a date range by +/-1 week */
export function shiftWeek(dateStr: string, delta: number): string {
  const d = parseLocalDate(dateStr);
  return formatDateStr(addDays(d, delta * 7));
}

/** Shift a date range by +/-1 fortnight */
export function shiftFortnight(dateStr: string, delta: number): string {
  const d = parseLocalDate(dateStr);
  return formatDateStr(addDays(d, delta * 14));
}

/** Format a date range like "23–29 Jun" or "23 Jun – 6 Jul" */
export function formatDateRange(startStr: string, endStr: string): string {
  const s = parseLocalDate(startStr);
  const e = parseLocalDate(endStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${months[s.getMonth()]}`;
  }
  return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]}`;
}

// ── Unified period window (week / fortnight / month) ────────────────────────

export type BudgetPeriodType = "week" | "fortnight" | "month";

export interface PeriodWindow {
  periodType: BudgetPeriodType;
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string;   // YYYY-MM-DD inclusive
  rangeLabel: string;
  heroLabel: string;
}

const HERO_LABELS: Record<BudgetPeriodType, string> = {
  week: "THIS WEEK",
  fortnight: "THIS FORTNIGHT",
  month: "THIS MONTH",
};

function monthLabelLong(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${y}`;
}

/** Build a period window from an anchor date (YYYY-MM-DD, defaults to today). */
export function periodWindow(periodType: BudgetPeriodType, anchor?: string): PeriodWindow {
  const anchorDate = anchor ?? todayDateStr();
  if (periodType === "week") {
    const { start, end } = weekRange(anchorDate);
    return {
      periodType,
      startDate: start,
      endDate: end,
      rangeLabel: formatDateRange(start, end),
      heroLabel: HERO_LABELS.week,
    };
  }
  if (periodType === "fortnight") {
    const { start, end } = fortnightRange(anchorDate);
    return {
      periodType,
      startDate: start,
      endDate: end,
      rangeLabel: formatDateRange(start, end),
      heroLabel: HERO_LABELS.fortnight,
    };
  }
  const mk = anchorDate.slice(0, 7);
  const { start, end } = monthRange(mk);
  return {
    periodType,
    startDate: start,
    endDate: end,
    rangeLabel: monthLabelLong(mk),
    heroLabel: HERO_LABELS.month,
  };
}

/**
 * Resolve the working window for a (periodType, anchor) pair.
 *
 *   • No anchor → snap to the natural calendar unit (Monday-based week /
 *     fortnight, calendar month). This is the "this week/fortnight/month" default.
 *   • Explicit anchor → the anchor IS the start date. Week and fortnight windows
 *     are NOT snapped back to Monday, so a custom start date is honoured exactly.
 *     Month keeps calendar-month semantics (the "August 2026" label).
 *
 * Both the read path (getBudgetSummary) and the write path (saveBudgetPlanAction)
 * must go through this so a plan is keyed by the same start date it's read with.
 */
export function resolvePeriodWindow(periodType: BudgetPeriodType, anchor?: string): PeriodWindow {
  if (!anchor) return periodWindow(periodType, undefined);
  if (periodType === "month") return periodWindow("month", anchor);
  return customPeriodWindow(periodType, anchor, derivePeriodEnd(periodType, anchor));
}

/** Derive the natural end date for a period type given a start date. */
export function derivePeriodEnd(periodType: BudgetPeriodType, startDate: string): string {
  const d = parseLocalDate(startDate);
  if (periodType === "week") return formatDateStr(addDays(d, 6));
  if (periodType === "fortnight") return formatDateStr(addDays(d, 13));
  // month: last day of the start-date's month
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return formatDateStr(end);
}

/**
 * Build a window from explicit start + end dates (custom length).
 * Range label uses the shared `formatDateRange` helper.
 */
export function customPeriodWindow(
  periodType: BudgetPeriodType,
  startDate: string,
  endDate: string,
): PeriodWindow {
  return {
    periodType,
    startDate,
    endDate,
    rangeLabel: formatDateRange(startDate, endDate),
    heroLabel: HERO_LABELS[periodType],
  };
}

/**
 * Project a saved plan's start date onto the window (of the same period type)
 * that contains `today`, preserving the plan's start weekday/cadence. Lets a
 * custom cycle (e.g. a Saturday-start week) become the ongoing default without
 * snapping back to Monday. Month keeps calendar-month semantics, so it's a
 * no-op there (returns today, which resolves to the calendar month).
 */
export function projectAnchorToToday(
  periodType: BudgetPeriodType,
  planStart: string,
  today: string,
): string {
  if (periodType === "month") return today;
  const step = periodType === "week" ? 7 : 14;
  const start = parseLocalDate(planStart);
  const t = parseLocalDate(today);
  const diffDays = Math.floor((t.getTime() - start.getTime()) / 86400000);
  const n = Math.floor(diffDays / step);
  return formatDateStr(addDays(start, n * step));
}

/**
 * How many times a bill of `billCadence` recurs inside one `periodType` window,
 * when the bill's cadence is shorter than the period (a month ≈ 4 weeks ≈ 2
 * fortnights). Returns 1 when they match, and 0 when the bill's cadence is
 * longer than the period (handled elsewhere via due-day hits). Used to scale a
 * sub-period bill's amount up to the period total — e.g. a weekly bill counts
 * ×4 on a monthly plan.
 */
export function billOccurrencesInPeriod(
  billCadence: BudgetPeriodType,
  periodType: BudgetPeriodType,
): number {
  const weeks: Record<BudgetPeriodType, number> = { week: 1, fortnight: 2, month: 4 };
  const occ = weeks[periodType] / weeks[billCadence];
  return occ >= 1 ? occ : 0;
}

/** Shift a window by ±1 unit, returning the new anchor (start date). */
export function shiftPeriodAnchor(periodType: BudgetPeriodType, anchor: string, delta: number): string {
  if (periodType === "week") return shiftWeek(anchor, delta);
  if (periodType === "fortnight") return shiftFortnight(anchor, delta);
  const mk = anchor.slice(0, 7);
  const next = shiftMonth(mk, delta);
  return `${next}-01`;
}

/** Days elapsed/left/total for a window vs today. */
export function periodDayCounts(win: PeriodWindow): {
  daysTotal: number;
  daysElapsed: number;
  daysLeft: number;
  isFuture: boolean;
} {
  const start = parseLocalDate(win.startDate);
  const end = parseLocalDate(win.endDate);
  const today = parseLocalDate(todayDateStr());
  const daysTotal = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (today < start) {
    return { daysTotal, daysElapsed: 0, daysLeft: daysTotal, isFuture: true };
  }
  if (today > end) {
    return { daysTotal, daysElapsed: daysTotal, daysLeft: 0, isFuture: false };
  }
  const daysElapsed = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  return {
    daysTotal,
    daysElapsed,
    daysLeft: Math.max(0, daysTotal - daysElapsed),
    isFuture: false,
  };
}

/** Today as YYYY-MM-DD */
export function todayDateStr(): string {
  return currentSydneyDateTime().date;
}

// ── Accounts, forecasting, and savings goals ───────────────────────────────

export type AccountType = "everyday" | "bills" | "savings" | "other";

export function calculateRecordedBalance(input: {
  openingBalance: number;
  income: number[];
  expenses: number[];
  transfersIn: number[];
  transfersOut: number[];
}): number {
  const cents =
    toCents(input.openingBalance) +
    input.income.reduce((sum, n) => sum + toCents(n), 0) -
    input.expenses.reduce((sum, n) => sum + toCents(n), 0) +
    input.transfersIn.reduce((sum, n) => sum + toCents(n), 0) -
    input.transfersOut.reduce((sum, n) => sum + toCents(n), 0);
  return fromCents(cents);
}

export function calculateBudgetPosition(budgetedValue: number, spentValue: number): {
  budgeted: number;
  spent: number;
  remaining: number;
  overBudget: boolean;
  overspentAmount: number;
  percentUsed: number;
} {
  const budgeted = fromCents(toCents(budgetedValue));
  const spent = fromCents(toCents(spentValue));
  const remaining = fromCents(toCents(budgeted) - toCents(spent));
  return {
    budgeted,
    spent,
    remaining,
    overBudget: spent > budgeted,
    overspentAmount: Math.max(0, -remaining),
    percentUsed: budgeted > 0 ? Math.round((spent / budgeted) * 1000) / 10 : spent > 0 ? 100 : 0,
  };
}

/**
 * Combine real bill expenses with planning-only coverage without counting the
 * same commitment twice. Planning coverage never represents a MoneyEntry.
 */
export function calculateRecurringBillCoverage(input: {
  committedAmount: number;
  actualPaidAmount: number;
  automaticallyCovered: boolean;
}): { actualPaid: number; planningCoverage: number; coveredAmount: number; covered: boolean } {
  const committed = Math.max(0, fromCents(toCents(input.committedAmount)));
  const actualPaid = Math.max(0, fromCents(toCents(input.actualPaidAmount)));
  const planningCoverage = input.automaticallyCovered
    ? Math.max(0, fromCents(toCents(committed) - toCents(actualPaid)))
    : 0;
  const coveredAmount = sumMoney([actualPaid, planningCoverage]);
  return {
    actualPaid,
    planningCoverage,
    coveredAmount,
    covered: committed > 0 && coveredAmount >= committed,
  };
}

export function calculateFlexibleBalance(input: {
  plannedSpendable: number;
  unplannedSpent: number;
  categoryPositions: Array<{ budgeted: number; spent: number }>;
}): { leftToSpend: number; categoryOverspend: number } {
  const categoryOverspend = sumMoney(
    input.categoryPositions.map((position) => Math.max(0, position.spent - position.budgeted)),
  );
  return {
    categoryOverspend,
    leftToSpend: sumMoney([input.plannedSpendable, -input.unplannedSpent, -categoryOverspend]),
  };
}

export function occurrenceFallsInWindow(
  occurredAt: Date | string,
  startDate: string,
  endDate: string,
): boolean {
  const localDate = occurrenceLocalParts(occurredAt).date;
  return localDate >= startDate && localDate <= endDate;
}

export function calculateBillAccountRequirements(input: {
  accounts: Array<{ id: string; available: number }>;
  bills: Array<{ accountId: string | null; amount: number; paid?: boolean }>;
}): Array<{ accountId: string | null; required: number; shortfall: number }> {
  const grouped = new Map<string, { accountId: string | null; required: number; unpaid: number }>();
  for (const bill of input.bills) {
    const key = bill.accountId ?? "unassigned";
    const row = grouped.get(key) ?? { accountId: bill.accountId, required: 0, unpaid: 0 };
    row.required = sumMoney([row.required, bill.amount]);
    if (!bill.paid) row.unpaid = sumMoney([row.unpaid, bill.amount]);
    grouped.set(key, row);
  }
  return [...grouped.values()].map((row) => {
    const available = input.accounts.find((account) => account.id === row.accountId)?.available ?? 0;
    return { accountId: row.accountId, required: row.required, shortfall: Math.max(0, sumMoney([row.unpaid, -available])) };
  });
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export interface ForecastProjection {
  periodsOfHistory: number;
  futureFortnights: number;
  confidence: "insufficient" | "limited" | "representative";
  currentTotalBalance: number;
  currentSavingsBalance: number;
  netPerFortnight: { conservative: number; baseline: number; optimistic: number };
  savingsPerFortnight: number;
  projectedTotal: { conservative: number; baseline: number; optimistic: number };
  projectedSavings: number;
}

export function fortnightsUntil(fromDate: string, targetDate: string): number {
  const start = parseLocalDate(fromDate).getTime();
  const target = parseLocalDate(targetDate).getTime();
  return Math.max(0, Math.ceil((target - start) / (14 * 86400000)));
}

export function calculateSavingsForecast(input: {
  periodNetCashFlow: number[];
  periodSavingsContributions: number[];
  currentTotalBalance: number;
  currentSavingsBalance: number;
  futureFortnights: number;
}): ForecastProjection {
  const net = input.periodNetCashFlow.map((value) => fromCents(toCents(value))).slice(-8);
  const savings = input.periodSavingsContributions.map((value) => fromCents(toCents(value))).slice(-8);
  const baseline = percentile(net, 0.5);
  const conservative = percentile(net, 0.25);
  const optimistic = percentile(net, 0.75);
  const savingsPerFortnight = percentile(savings, 0.5);
  const future = Math.max(0, Math.floor(input.futureFortnights));
  const project = (current: number, rate: number) => fromCents(toCents(current) + toCents(rate) * future);

  return {
    periodsOfHistory: net.length,
    futureFortnights: future,
    confidence: net.length < 3 ? "insufficient" : net.length < 6 ? "limited" : "representative",
    currentTotalBalance: fromCents(toCents(input.currentTotalBalance)),
    currentSavingsBalance: fromCents(toCents(input.currentSavingsBalance)),
    netPerFortnight: {
      conservative: fromCents(toCents(conservative)),
      baseline: fromCents(toCents(baseline)),
      optimistic: fromCents(toCents(optimistic)),
    },
    savingsPerFortnight: fromCents(toCents(savingsPerFortnight)),
    projectedTotal: {
      conservative: project(input.currentTotalBalance, conservative),
      baseline: project(input.currentTotalBalance, baseline),
      optimistic: project(input.currentTotalBalance, optimistic),
    },
    projectedSavings: project(input.currentSavingsBalance, savingsPerFortnight),
  };
}

export function calculateSavingsGoal(input: {
  currentAmount: number;
  targetAmount: number;
  targetDate: string;
  today: string;
  contributionPerFortnight: number;
}): {
  remaining: number;
  progressPercent: number;
  requiredPerFortnight: number;
  forecastAtDeadline: number;
  onTrack: boolean;
  estimatedCompletionDate: string | null;
} {
  const current = toCents(input.currentAmount);
  const target = toCents(input.targetAmount);
  const remaining = Math.max(0, target - current);
  const periods = fortnightsUntil(input.today, input.targetDate);
  const contribution = toCents(input.contributionPerFortnight);
  const forecast = current + contribution * periods;
  let estimatedCompletionDate: string | null = null;
  if (remaining === 0) estimatedCompletionDate = input.today;
  else if (contribution > 0) {
    estimatedCompletionDate = formatDateStr(
      addDays(parseLocalDate(input.today), Math.ceil(remaining / contribution) * 14),
    );
  }
  return {
    remaining: fromCents(remaining),
    progressPercent: target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 1000) / 10)) : 0,
    requiredPerFortnight: periods > 0 ? fromCents(Math.ceil(remaining / periods)) : fromCents(remaining),
    forecastAtDeadline: fromCents(forecast),
    onTrack: forecast >= target,
    estimatedCompletionDate,
  };
}

// ── Currency ────────────────────────────────────────────────────────────────

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "AUD", symbol: "A$", label: "Australian Dollar", locale: "en-AU" },
  { code: "USD", symbol: "$",  label: "US Dollar",         locale: "en-US" },
  { code: "GBP", symbol: "£",  label: "British Pound",     locale: "en-GB" },
  { code: "EUR", symbol: "€",  label: "Euro",              locale: "de-DE" },
  { code: "JPY", symbol: "¥",  label: "Japanese Yen",      locale: "ja-JP" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar",   locale: "en-CA" },
  { code: "NZD", symbol: "NZ$",label: "New Zealand Dollar",locale: "en-NZ" },
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah", locale: "id-ID" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit", locale: "ms-MY" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar",  locale: "en-SG" },
];

export const DEFAULT_CURRENCY = CURRENCIES[0];

/**
 * Group ("thousands") and decimal separators for a currency, derived from
 * Intl.NumberFormat — single source of truth, no hardcoded locale tables.
 */
export function getSeparators(currency: CurrencyOption): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(currency.locale).formatToParts(12345.6);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  return { group, decimal };
}

/** True if the currency uses no fractional digits (e.g. JPY). */
export function isWholeNumberCurrency(currency: CurrencyOption): boolean {
  return currency.code === "JPY";
}

/**
 * Parse a user-typed amount string against the currency's locale conventions.
 * Returns NaN for invalid input. Handles examples like:
 *   IDR: "100.000"     → 100000
 *   EUR: "1.234,56"    → 1234.56
 *   USD: "1,234.56"    → 1234.56
 *   JPY: "1,000"       → 1000
 */
export function parseAmountInput(str: string, currency: CurrencyOption): number {
  if (!str) return NaN;
  const { group, decimal } = getSeparators(currency);
  // Strip all group separators, then convert the locale decimal to '.'
  const normalized = str.split(group).join("").replace(decimal, ".");
  // Reject anything other than digits + a single dot
  if (!/^\d*(\.\d*)?$/.test(normalized)) return NaN;
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return NaN;
  return isWholeNumberCurrency(currency) ? Math.round(n) : n;
}

/**
 * Filter a raw input string to keep only chars valid for this currency
 * (digits + group/decimal separators; decimal forbidden for whole-number
 * currencies). Used in onChange to block typos in real time.
 */
export function sanitizeAmountInput(str: string, currency: CurrencyOption): string {
  const { group, decimal } = getSeparators(currency);
  const allowDecimal = !isWholeNumberCurrency(currency);
  // Build a character whitelist
  const allowed = new Set<string>(["0","1","2","3","4","5","6","7","8","9", group]);
  if (allowDecimal) allowed.add(decimal);
  let out = "";
  let decimalSeen = false;
  for (const ch of str) {
    if (!allowed.has(ch)) continue;
    if (ch === decimal) {
      if (decimalSeen) continue;
      decimalSeen = true;
    }
    out += ch;
  }
  return out;
}

/** Format money with a configurable currency. Optionally signed (+/−). */
export function formatMoney(
  amount: number,
  opts: { signed?: boolean; absolute?: boolean; currency?: CurrencyOption } = {}
): string {
  const cur = opts.currency ?? DEFAULT_CURRENCY;
  const value = opts.absolute ? Math.abs(amount) : amount;
  const decimals = cur.code === "JPY" ? 0 : 2;
  const formatted = Math.abs(value).toLocaleString(cur.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (opts.signed) {
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${cur.symbol}${formatted}`;
  }
  return `${cur.symbol}${formatted}`;
}
