export function formatCurrency(amount: number, symbol = "£"): string {
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatHours(hours: number): string {
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} h`;
}

export function formatBreak(minutes: number): string {
  if (minutes === 0) return "No break";
  return `${minutes}m break`;
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Date helpers ─────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Parse YYYY-MM-DD to a local midnight Date */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a local Date to YYYY-MM-DD */
export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Add/subtract days from a Date, returning a new Date */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Whole-day difference between two dates (b - a), normalised to midnight */
export function daysBetween(a: Date, b: Date): number {
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bMid.getTime() - aMid.getTime()) / 86_400_000);
}

/** "Thu" */
export function getDayLabel(dateStr: string): string {
  return DAY_LABELS[parseLocalDate(dateStr).getDay()];
}

/** "18" */
export function getDayNumber(dateStr: string): number {
  return parseLocalDate(dateStr).getDate();
}

/**
 * Human-readable period label.
 * Same month → "16–29 Jun"
 * Cross month → "30 Jun–3 Jul"
 */
export function formatPeriodLabel(start: string, end: string): string {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${MONTH_LABELS[s.getMonth()]}`;
  }
  return `${s.getDate()} ${MONTH_LABELS[s.getMonth()]}–${e.getDate()} ${MONTH_LABELS[e.getMonth()]}`;
}

/** "Jul 3" */
export function formatShortDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

/** Today as YYYY-MM-DD */
export function todayStr(): string {
  return formatDateStr(new Date());
}

/** Greeting based on hour of day */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "Friday · 20 June" */
export function formatDayline(): string {
  const d = new Date();
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
}
