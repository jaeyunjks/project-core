import type { Employer } from "@prisma/client";

/** Display-ready shift DTO (derived from Prisma Shift + date helpers) */
export interface ShiftDisplay {
  id: string;
  shiftDate: string;   // YYYY-MM-DD
  dayLabel: string;    // "Thu"
  dayNumber: number;   // 18
  startTime: string;   // "09:00"
  endTime: string;     // "17:30"
  breakMinutes: number;
  totalHours: number;
  estimatedPay: number;
  notes: string | null;
}

/** Aggregated summary for the current pay period */
export interface HoursBoardSummary {
  periodLabel: string;       // "16–29 Jun"
  periodStart: string;       // "2026-06-16"
  periodEnd: string;         // "2026-06-29"
  totalHours: number;
  totalGross: number;
  totalShifts: number;
  hourlyRate: number;
  nextPayday: string;        // "Jul 3"
  nextPaydayDaysAway: number;
  recentShifts: ShiftDisplay[];
  employer: Employer;
}

/** Static config for dashboard module cards */
export interface Module {
  id: string;
  name: string;
  description: string;
  href: string;
  status: "active" | "coming-soon";
  icon: "clock" | "wallet" | "book" | "target" | "briefcase";
}
