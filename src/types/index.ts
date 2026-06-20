import type { Employer } from "@prisma/client";

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
  payAwardType: string;  // "weekday" | "saturday" | "sunday" | "public_holiday" | "custom"
  payRate: number;       // stored rate — not recalculated on employer rate change
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
  startDate: string;
  endDate: string;
  label: string;         // "16–29 Jun 2026"
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

// Re-export Employer so pages don't need to import from @prisma/client directly
export type { Employer };
