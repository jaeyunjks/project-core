import type { AwardLevel, Employer } from "@prisma/client";

// ── Legacy: Shift model (used by /shifts history page) ───────────────────────

export interface ShiftDisplay {
  id: string;
  shiftDate: string;
  dayLabel: string;
  dayNumber: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalHours: number;
  estimatedPay: number;
  notes: string | null;
}

// ── PayPeriod worksheet types ────────────────────────────────────────────────

export interface PayPeriodDayDisplay {
  id: string;
  date: string;          // YYYY-MM-DD
  dayLabel: string;      // "Mon"
  dayNumber: number;     // 16
  monthLabel: string;    // "Jun"
  isWeekend: boolean;
  isToday: boolean;
  workHours: number;
  dayType: string;       // "weekday" | "saturday" | "sunday" | "public_holiday" | "custom"
  awardLevelId: string | null;
  awardLevelCode: string | null;  // denormalised for display
  payRate: number;       // stored rate — not recalculated on base rate change
  notes: string | null;
  estimatedPay: number;  // workHours × payRate (derived, not stored)
}

export interface PayPeriodSummary {
  totalHours: number;
  estimatedGross: number;
  workedDays: number;
  avgHoursPerWorkedDay: number;
}

export interface PayPeriodDisplay {
  id: string;
  name: string | null;
  startDate: string;
  endDate: string;
  label: string;         // "16–29 Jun 2026" — date-range label
  displayName: string;   // user name if set, else date range
  status: string;
  days: PayPeriodDayDisplay[];
  summary: PayPeriodSummary;
}

export interface DashboardHoursPreview {
  periodLabel: string;
  totalHours: number;
  estimatedGross: number;
  workedDays: number;
  nextPayday: string;
  nextPaydayDaysAway: number;
  hourlyRate: number;
  periodId: string;
}

// ── Module launcher config ───────────────────────────────────────────────────

export interface Module {
  id: string;
  name: string;
  description: string;
  href: string;
  status: "active" | "coming-soon";
  icon: "clock" | "wallet" | "book" | "target" | "briefcase";
}

export interface AwardLevelDisplay {
  id: string;
  code: string;
  description: string | null;
  baseRate: number;
}

// ── MoneyBoard ───────────────────────────────────────────────────────────────

export interface MoneyCategoryDisplay {
  id: string;
  key: string;
  label: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  sortOrder: number;
}

export interface MoneyEntryDisplay {
  id: string;
  kind: "income" | "expense";
  amount: number;            // positive
  currency: string;          // ISO 4217 code, e.g. "AUD", "IDR"
  date: string;              // YYYY-MM-DD
  time: string;              // HH:mm in Australia/Sydney
  occurrenceTimeKnown: boolean; // false when only the legacy calendar date is known
  occurredAt: string;        // absolute ISO timestamp used for reporting
  createdAt: string;
  updatedAt: string;
  note: string | null;
  source: "manual" | "hoursboard";
  payPeriodId: string | null;
  recurringBillId: string | null;
  account: FinancialAccountRef | null;
  category: MoneyCategoryDisplay;
}

export interface FinancialAccountRef {
  id: string;
  name: string;
  type: "everyday" | "bills" | "savings" | "other";
  currency: string;
}

export interface FinancialAccountDisplay extends FinancialAccountRef {
  openingBalance: number;
  currentBalance: number;
  color: string | null;
  sortOrder: number;
  archived: boolean;
  transactionCount: number;
}

export interface AccountTransferDisplay {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  currency: string;
  occurredAt: string;
  date: string;
  time: string;
  note: string | null;
  createdAt: string;
}

export interface AccountOverview {
  accounts: FinancialAccountDisplay[];
  recentTransfers: AccountTransferDisplay[];
  totalRecordedBalance: number;
  totalSavings: number;
  actualSavingsContributions: number;
  unassignedTransactionCount: number;
}

/** A date with its grouped entries — for the recent-entries list. */
export interface MoneyEntryGroup {
  date: string;              // YYYY-MM-DD
  entries: MoneyEntryDisplay[];
}

export interface CategoryBreakdownRow {
  categoryId: string;
  key: string;
  label: string;
  color: string;
  total: number;
  percent: number;           // 0..100
}

export interface MonthlyMoneySummary {
  monthKey: string;          // "2026-06"
  monthLabel: string;        // "June 2026"
  monthRange: string;        // "1–30 Jun"
  totalIncome: number;
  totalExpenses: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
  savingsRate: number | null; // 0..100 — null when no income
  breakdown: CategoryBreakdownRow[]; // expenses only, descending
  groups: MoneyEntryGroup[];         // newest date first
}

export interface MonthNavOption {
  monthKey: string;
  label: string;             // "May 2026"
  net: number;
}

export interface LifetimeMoneyStats {
  months: number;            // distinct months with at least one entry
  totalIncome: number;
  totalExpenses: number;
  net: number;
}

// ── Recurring bills / subscriptions ─────────────────────────────────────────

export interface RecurringBillDisplay {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cadence: "week" | "fortnight" | "month" | "year";
  /** Day-of-month (1..31) for monthly cadence. Null when not set. */
  dueDay: number | null;
  nextPaymentDate: string | null;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  paidThroughDate: string | null;
  active: boolean;
  sortOrder: number;
}

// ── Fortnight-budget planner ────────────────────────────────────────────────

export type BudgetPeriodType = "week" | "fortnight" | "month";

export interface CommittedItemDisplay {
  id: string;
  name: string;
  amount: number;
  recur: string;
  sortOrder: number;
}

/** Category slice on the segmented bar under the hero. */
export interface BudgetCategorySegment {
  categoryId: string;
  label: string;
  color: string;
  amount: number;   // absolute spend within the period
  percent: number;  // 0..100 of total spend
}

/**
 * A committed item that maps to a spending category, drawn down by actual
 * spend in that category. e.g. "Food" budgeted $80, spent $10 → $70 remaining.
 */
export interface CategoryBudgetRow {
  key: string;              // committed item id
  name: string;             // committed item / category name
  categoryId: string;       // matched category
  color: string;
  budgeted: number;
  spent: number;             // actual spend + planning-only recurring-bill coverage
  actualSpent: number;       // real MoneyEntry expenses only
  planningCoverage: number;  // virtual plan coverage; never a MoneyEntry
  remaining: number;        // budgeted − spent (can be negative)
  percentUsed: number;      // 0..100, clamped for the bar
  overBudget: boolean;
  paid: boolean;            // fully covered in the plan by a recurring bill
}

export interface BudgetPeriodDisplay {
  id: string | null;          // null when no plan saved yet for this window
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  today: string;              // YYYY-MM-DD — server's current date
  currency: string;
  rangeLabel: string;         // "1–14 Aug"
  heroLabel: string;          // "THIS FORTNIGHT" / "THIS MONTH" / "THIS WEEK"
  daysTotal: number;
  daysElapsed: number;        // clamped to daysTotal
  daysLeft: number;           // may be 0 when period has ended
  isFuture: boolean;
  hasPlan: boolean;
  moneyIn: number;
  protectValue: number;
  committedTotal: number;     // sum of committed items amount
  committedItems: CommittedItemDisplay[];
  plannedSpendable: number;   // moneyIn − protect − committedTotal — the flexible pool
  spent: number;              // all period expenses
  plannedSpent: number;       // spend in allocated categories (draws category budgets)
  unplannedSpent: number;     // spend in unallocated categories (draws the flexible pool)
  leftToSpend: number;        // plannedSpendable − unplannedSpent (flexible balance)
  perDay: number;             // leftToSpend / max(daysLeft, 1)
  progressPercent: number;    // 0..100 (unplannedSpent / plannedSpendable)
  overspentAmount: number;    // category overruns plus negative plan capacity
  overallOverBudget: boolean;
  transactionCount: number;
  categorySegments: BudgetCategorySegment[];
  categoryBudgets: CategoryBudgetRow[]; // committed items matched to categories, with drawdown
  recentEntries: MoneyEntryDisplay[];  // most recent period expenses (up to N)
}

export interface BillAllocationRow {
  accountId: string | null;
  accountName: string;
  required: number;
  available: number;
  shortfall: number;
  bills: Array<{
    id: string;
    name: string;
    amount: number;
    dueDate: string | null;
    paid: boolean;
  }>;
}

export interface BillFundingSummary {
  rows: BillAllocationRow[];
  totalRequired: number;
  totalShortfall: number;
}

export interface TransactionHistoryPage {
  entries: MoneyEntryDisplay[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SavingsForecastDisplay {
  targetDate: string;
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

export interface SavingsGoalDisplay {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  currency: string;
  accountId: string | null;
  accountName: string | null;
  currentAmount: number;
  remaining: number;
  progressPercent: number;
  requiredPerFortnight: number;
  forecastAtDeadline: number;
  onTrack: boolean;
  estimatedCompletionDate: string | null;
  active: boolean;
}

// ── GoalTracker ─────────────────────────────────────────────────────────────

export interface GoalMilestoneDisplay {
  id: string;
  title: string;
  done: boolean;
  sortOrder: number;
}

export interface GoalDisplay {
  id: string;
  title: string;
  emoji: string;
  type: "numeric" | "checklist";
  status: "active" | "completed" | "archived";
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  autoSource: string;
  autoCurrency: string | null;
  deadline: string | null;
  createdAt: string;            // ISO string
  completedAt: string | null;   // ISO string
  milestones: GoalMilestoneDisplay[];
  progress: number;             // 0–100
}

export interface GoalTrackerSummary {
  active: number;
  completed: number;
  overdue: number;
}

// Re-export Prisma types so pages don't need to import from @prisma/client directly
export type { AwardLevel, Employer };
