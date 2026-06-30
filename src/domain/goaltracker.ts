// Pure domain logic for GoalTracker. No DB, no React.

import { parseLocalDate, daysBetween } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

export type GoalType = "numeric" | "checklist";
export type GoalStatus = "active" | "completed" | "archived";
export type AutoSource =
  | "none"
  | "moneyboard-income"
  | "moneyboard-expense"
  | "moneyboard-net"
  | "hoursboard-hours";

export const AUTO_SOURCE_OPTIONS: { value: AutoSource; label: string; unit: string }[] = [
  { value: "none", label: "Manual", unit: "" },
  { value: "moneyboard-income", label: "MoneyBoard — Total income", unit: "$" },
  { value: "moneyboard-expense", label: "MoneyBoard — Total expenses", unit: "$" },
  { value: "moneyboard-net", label: "MoneyBoard — Net balance", unit: "$" },
  { value: "hoursboard-hours", label: "HoursBoard — Hours worked", unit: "hours" },
];

// (Emoji picker removed — goals are identified by their title + auto/type tag.)

// ── Progress calculation ────────────────────────────────────────────────────

export function computeProgress(
  type: GoalType,
  currentValue: number,
  targetValue: number | null,
  milestonesDone: number,
  milestonesTotal: number
): number {
  if (type === "checklist") {
    return milestonesTotal === 0 ? 0 : Math.round((milestonesDone / milestonesTotal) * 100);
  }
  if (!targetValue || targetValue === 0) return 0;
  return Math.min(100, Math.round((currentValue / targetValue) * 100));
}

// ── Deadline helpers ────────────────────────────────────────────────────────

export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = parseLocalDate(todayDateStr());
  const target = parseLocalDate(deadline);
  return daysBetween(today, target);
}

export function deadlineLabel(deadline: string | null): string | null {
  if (!deadline) return null;
  const days = daysUntilDeadline(deadline);
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `${days}d left`;
  if (days <= 30) return `${Math.ceil(days / 7)}w left`;
  return `${Math.ceil(days / 30)}mo left`;
}

export function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return todayDateStr() > deadline;
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatGoalValue(value: number, unit: string | null): string {
  if (!unit) return String(Math.round(value * 100) / 100);
  if (unit === "$") {
    return `$${value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (unit === "hours") {
    return `${Math.round(value * 10) / 10}h`;
  }
  return `${Math.round(value * 100) / 100} ${unit}`;
}

export function formatDeadline(deadline: string): string {
  const d = parseLocalDate(deadline);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Pace / ETA helpers (GoalVault design) ──────────────────────────────────

export type GoalPace = "on-track" | "ahead" | "behind" | "steady" | "done";

/**
 * Status compares progress against time elapsed toward deadline.
 *  ahead     — progress fraction is well ahead of time fraction
 *  on-track  — within ±10% of expected
 *  behind    — falling more than 10% behind expected pace
 *  steady    — no deadline OR insufficient signal
 *  done      — status is completed
 */
export function computePace(
  status: string,
  progress: number,
  deadline: string | null,
  createdAtISO: string | null
): GoalPace {
  if (status === "completed") return "done";
  if (!deadline || !createdAtISO) return "steady";

  const today = parseLocalDate(todayDateStr());
  const created = new Date(createdAtISO);
  const target = parseLocalDate(deadline);

  const totalMs = target.getTime() - created.getTime();
  if (totalMs <= 0) return "steady";

  const elapsedMs = today.getTime() - created.getTime();
  const timeFrac = Math.max(0, Math.min(1, elapsedMs / totalMs)) * 100;

  const delta = progress - timeFrac;
  if (delta >= 10) return "ahead";
  if (delta <= -10) return "behind";
  return "on-track";
}

export function paceLabel(pace: GoalPace): string {
  switch (pace) {
    case "ahead": return "Ahead";
    case "on-track": return "On track";
    case "behind": return "Behind";
    case "done": return "Done";
    case "steady": return "Steady";
  }
}

/** "A$2,200 to go" / "3 steps left" / "" if complete */
export function formatRemaining(
  type: GoalType,
  currentValue: number,
  targetValue: number | null,
  unit: string | null,
  milestonesDone: number,
  milestonesTotal: number
): string {
  if (type === "checklist") {
    const left = milestonesTotal - milestonesDone;
    if (left <= 0) return "All steps done";
    return `${left} ${left === 1 ? "step" : "steps"} left`;
  }
  if (!targetValue) return "No target set";
  const left = Math.max(0, targetValue - currentValue);
  if (left === 0) return "Target reached";
  return `${formatGoalValue(left, unit)} to go`;
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Tiny "Oct 26" / "Mar 27" — for goal card bottom row */
export function formatShortEta(deadline: string): string {
  const d = parseLocalDate(deadline);
  const yy = String(d.getFullYear()).slice(2);
  return `${MONTH_ABBR[d.getMonth()]} ${yy}`;
}

/** "~4 months" / "~3 weeks" / "≤ 1 day" — relative-only label */
export function formatRelativeWindow(deadline: string): string {
  const days = daysUntilDeadline(deadline);
  if (days === null) return "";
  const abs = Math.abs(days);
  if (abs <= 1) return days < 0 ? "1d overdue" : "1d left";
  if (abs < 14) return days < 0 ? `${abs}d overdue` : `${abs}d`;
  if (abs < 60) {
    const w = Math.round(abs / 7);
    return days < 0 ? `${w}w overdue` : `~${w}w`;
  }
  const m = Math.round(abs / 30);
  return days < 0 ? `${m}mo overdue` : `~${m} months`;
}
