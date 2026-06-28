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
  note: string | null;
  source: "manual" | "hoursboard";
  payPeriodId: string | null;
  category: MoneyCategoryDisplay;
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

// Re-export Prisma types so pages don't need to import from @prisma/client directly
export type { AwardLevel, Employer };
