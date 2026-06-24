// Pure domain logic for MoneyBoard. No DB, no React.

import { parseLocalDate, addDays, formatDateStr } from "@/lib/utils";

// ── Icon keys (mirrored by CategoryIcon component) ───────────────────────────

export type CategoryIconKey =
  | "briefcase"
  | "chat"
  | "home"
  | "utensils"
  | "bolt"
  | "play"
  | "circle-plus"
  | "dots";

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

// ── Currency formatting (matches A$1,262.00 style) ───────────────────────────

/** Format A$ with thousands sep + 2 decimals. Optionally signed (+/−). */
export function formatMoney(
  amount: number,
  opts: { signed?: boolean; absolute?: boolean } = {}
): string {
  const value = opts.absolute ? Math.abs(amount) : amount;
  const formatted = Math.abs(value).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (opts.signed) {
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}A$${formatted}`;
  }
  return `A$${formatted}`;
}
