"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { PayPeriodDisplay } from "@/types";
import { formatCurrency, formatHours, cn, parseLocalDate, daysBetween, todayStr } from "@/lib/utils";
import { NewPayPeriodModal } from "./NewPayPeriodModal";
import { PayPeriodActions } from "./PayPeriodActions";
import { HoursBarChart, type HoursBarDatum } from "./HoursBarChart";

interface Props {
  periods: PayPeriodDisplay[];          // newest first
  latest: PayPeriodDisplay | null;
  /** id of the period that contains today (preferred Log Hours target). */
  activePeriodId: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface PeriodProgress {
  totalDays: number;
  elapsedDays: number;       // 0..totalDays
  remainingDays: number;     // 0..totalDays
  percent: number;           // 0..100
  state: "future" | "active" | "ended";
  daysRemainingLabel: string;
}

function calcProgress(period: PayPeriodDisplay): PeriodProgress {
  const today = parseLocalDate(todayStr());
  const start = parseLocalDate(period.startDate);
  const end = parseLocalDate(period.endDate);
  const totalDays = daysBetween(start, end) + 1;
  const offset = daysBetween(start, today);

  if (offset < 0) {
    const daysUntil = -offset;
    return {
      totalDays,
      elapsedDays: 0,
      remainingDays: totalDays,
      percent: 0,
      state: "future",
      daysRemainingLabel:
        daysUntil === 1 ? "Starts tomorrow" : `Starts in ${daysUntil} days`,
    };
  }

  if (offset >= totalDays) {
    const daysAgo = offset - totalDays + 1;
    return {
      totalDays,
      elapsedDays: totalDays,
      remainingDays: 0,
      percent: 100,
      state: "ended",
      daysRemainingLabel:
        daysAgo === 1 ? "Ended yesterday" : `Ended ${daysAgo} days ago`,
    };
  }

  // active — today is between start and end inclusive
  const elapsed = offset + 1;
  const remaining = totalDays - elapsed;
  return {
    totalDays,
    elapsedDays: elapsed,
    remainingDays: remaining,
    percent: Math.round((elapsed / totalDays) * 100),
    state: "active",
    daysRemainingLabel:
      remaining === 0
        ? "Last day"
        : remaining === 1
          ? "1 day remaining"
          : `${remaining} days remaining`,
  };
}

interface Trend {
  direction: "up" | "down" | "flat";
  deltaPct: number; // signed
}

function calcTrend(curr: PayPeriodDisplay, prev: PayPeriodDisplay | undefined): Trend | null {
  if (!prev) return null;
  const a = curr.summary.totalHours;
  const b = prev.summary.totalHours;
  if (a === 0 && b === 0) return null;
  if (b === 0) return { direction: "up", deltaPct: 100 };
  const delta = ((a - b) / b) * 100;
  if (Math.abs(delta) < 1) return { direction: "flat", deltaPct: 0 };
  return { direction: delta > 0 ? "up" : "down", deltaPct: Math.round(delta) };
}

// ── Components ───────────────────────────────────────────────────────────────

function ProgressBar({ percent, state }: { percent: number; state: PeriodProgress["state"] }) {
  return (
    <div className="h-1 w-full bg-border-soft rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          state === "ended" ? "bg-ghost" : "bg-sage"
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-3">
      <div className="text-[9px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1">
        {label}
      </div>
      <div className={cn("text-[20px] font-semibold font-mono tracking-tight leading-none", accent ? "text-sage" : "text-ink")}>
        {value}
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: Trend }) {
  if (trend.direction === "flat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold font-mono text-ghost">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </span>
    );
  }
  const isUp = trend.direction === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold font-mono",
        isUp ? "text-sage" : "text-amber"
      )}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {isUp ? <path d="M6 14l6-6 6 6" /> : <path d="M6 10l6 6 6-6" />}
      </svg>
      {Math.abs(trend.deltaPct)}%
    </span>
  );
}

// ── Summary panel (desktop right column) ─────────────────────────────────────

function shortDateLabel(startDate: string): string {
  const d = parseLocalDate(startDate);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

interface SummaryPanelProps {
  latest: PayPeriodDisplay | null;
  periods: PayPeriodDisplay[]; // newest first
  activePeriodId: string | null;
  progress: PeriodProgress | null;
}

function SummaryPanel({ latest, periods, activePeriodId, progress }: SummaryPanelProps) {
  const summary = latest?.summary;

  // Last up-to-6 periods, oldest → newest for the chart
  const chartData: HoursBarDatum[] = useMemo(() => {
    const slice = periods.slice(0, 6).reverse();
    return slice.map((p) => ({
      id: p.id,
      label: shortDateLabel(p.startDate),
      hours: p.summary.totalHours,
      gross: p.summary.estimatedGross,
      isCurrent: p.id === activePeriodId,
    }));
  }, [periods, activePeriodId]);

  // Averages derived from latest period
  const hoursPerShift = summary && summary.workedDays > 0
    ? Math.round((summary.totalHours / summary.workedDays) * 10) / 10
    : 0;
  const hoursPerWeek = latest && progress && progress.totalDays > 0
    ? Math.round((summary!.totalHours / progress.totalDays) * 7 * 10) / 10
    : 0;

  // Chart renders with ≥2 periods that actually have hours logged
  const periodsWithData = chartData.filter((d) => d.hours > 0).length;
  const showChart = periodsWithData >= 2;

  if (!latest || !summary) {
    return (
      <aside className="flex flex-col gap-4">
        <div className="bg-white border border-border-soft/70 rounded-[18px] p-5 shadow-card">
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-2">
            Overview
          </div>
          <p className="text-[13px] text-subtle leading-relaxed">
            Once you create a pay period, this panel fills with your hours, averages
            and a trend chart.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-4">
      {/* Snapshot — this period */}
      <div className="bg-white border border-border-soft/70 rounded-[18px] p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost">
            This period
          </span>
          <span className="text-[10px] font-mono text-ghost">{latest.label}</span>
        </div>

        <div className="space-y-3.5">
          <SummaryRow
            label="Total hours"
            value={formatHours(summary.totalHours)}
          />
          <SummaryRow
            label="Estimated gross"
            value={formatCurrency(summary.estimatedGross)}
            accent
          />
          <SummaryRow
            label="Days worked"
            value={`${summary.workedDays} of ${progress?.totalDays ?? "—"}`}
          />
        </div>

        <div className="h-px bg-border-soft my-4" />

        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-3">
          Averages
        </div>
        <div className="space-y-3.5">
          <SummaryRow
            label="Hours per shift"
            value={hoursPerShift > 0 ? `${hoursPerShift} h` : "—"}
          />
          <SummaryRow
            label="Hours per week"
            value={hoursPerWeek > 0 ? `${hoursPerWeek} h` : "—"}
          />
        </div>
      </div>

      {/* Chart — only when there's enough signal to be meaningful */}
      <div className="bg-white border border-border-soft/70 rounded-[18px] p-5 shadow-card">
        {showChart ? (
          <HoursBarChart data={chartData} height={220} />
        ) : (
          <div>
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-2">
              Hours per period
            </div>
            <div className="rounded-[12px] border border-dashed border-border bg-paper/40 px-4 py-6 text-center">
              <p className="text-[13px] text-subtle leading-relaxed">
                Track a few more periods to see your trend.
              </p>
            </div>
          </div>
        )}
      </div>

    </aside>
  );
}

/**
 * Lifetime totals across all periods.
 * - `variant="card"` → normal inline card (desktop right col)
 * - `variant="sticky-mobile"` → mobile-only sticky bar above the bottom nav
 */
function LifetimeFooter({
  periods,
  variant,
}: {
  periods: PayPeriodDisplay[];
  variant: "card" | "sticky-mobile";
}) {
  if (periods.length <= 1) return null;
  const lifetimeHours = periods.reduce((s, p) => s + p.summary.totalHours, 0);
  const lifetimeGross = periods.reduce((s, p) => s + p.summary.estimatedGross, 0);

  if (variant === "sticky-mobile") {
    return (
      <div className="md:hidden sticky bottom-16 z-30 mt-3 -mx-5 px-5 pb-2 pt-2 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
        <div className="bg-white border border-border-soft/80 rounded-[14px] px-4 py-3 shadow-card flex items-center justify-between">
          <div>
            <div className="text-[9px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-0.5">
              Across {periods.length} periods
            </div>
            <div className="text-[14px] font-semibold text-ink tracking-tight tabular-nums">
              {formatHours(lifetimeHours)} logged
            </div>
          </div>
          <div className="text-[16px] font-semibold font-mono text-sage tabular-nums">
            {formatCurrency(lifetimeGross)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-soft/70 rounded-[18px] px-5 py-4 shadow-card flex items-center justify-between">
      <div>
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-1">
          Across {periods.length} periods
        </div>
        <div className="text-[14px] font-semibold text-ink tracking-tight">
          {formatHours(lifetimeHours)} logged
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-1">
          Estimated total
        </div>
        <div className="text-[14px] font-semibold text-sage font-mono tabular-nums">
          {formatCurrency(lifetimeGross)}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] text-subtle">{label}</span>
      <span
        className={cn(
          "text-[15px] font-semibold font-mono tabular-nums tracking-tight",
          accent ? "text-sage" : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function HoursBoardOverview({ periods, latest, activePeriodId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasPeriods = periods.length > 0;

  const latestProgress = useMemo(
    () => (latest ? calcProgress(latest) : null),
    [latest]
  );

  // Log Hours target: active period if any, else latest
  const logHoursHref = activePeriodId
    ? `/dashboard/hoursboard?period=${activePeriodId}`
    : latest
      ? `/dashboard/hoursboard?period=${latest.id}`
      : null;

  return (
    <div className="md:grid md:grid-cols-5 md:gap-6">
      {/* ── Left column (60%) ── */}
      <div className="md:col-span-3 flex flex-col pb-4 md:pb-0">
      {/* ── Current pay period ── */}
      {latest && latestProgress ? (
        <Link href={`/dashboard/hoursboard?period=${latest.id}`} className="block group pc-rise">
          <div className="relative bg-white border border-border-soft/70 rounded-[18px] p-5 shadow-card group-hover:shadow-card-lg group-hover:border-border transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-1.5">
                  Current pay period
                </div>
                <div className="text-[17px] font-semibold tracking-tight text-ink truncate">
                  {latest.displayName}
                </div>
                <div className="text-[12px] text-subtle mt-0.5 font-mono">
                  {latest.label}
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ghost mt-1 group-hover:text-sage group-hover:translate-x-0.5 transition-all"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    "text-[11px] font-semibold font-mono",
                    latestProgress.state === "active"
                      ? "text-ink"
                      : latestProgress.state === "ended"
                        ? "text-ghost"
                        : "text-sage"
                  )}
                >
                  {latestProgress.daysRemainingLabel}
                </span>
                <span className="text-[10px] font-mono text-ghost tracking-wide">
                  Day {Math.min(latestProgress.elapsedDays, latestProgress.totalDays)} of {latestProgress.totalDays}
                </span>
              </div>
              <ProgressBar percent={latestProgress.percent} state={latestProgress.state} />
            </div>

            {/* Stats */}
            {latest.summary.totalHours === 0 ? (
              <div className="rounded-[12px] border border-dashed border-border bg-paper/40 px-4 py-4 text-center">
                <p className="text-[13px] text-subtle leading-relaxed">
                  No shifts logged yet —{" "}
                  <span className="font-semibold text-ink">tap + to add your first</span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-px bg-border-soft/80 rounded-[12px] overflow-hidden border border-border-soft">
                <StatCell label="Hours" value={formatHours(latest.summary.totalHours)} />
                <StatCell
                  label="Est. Gross"
                  value={formatCurrency(latest.summary.estimatedGross)}
                  accent
                />
                <StatCell label="Days" value={String(latest.summary.workedDays)} />
              </div>
            )}
          </div>
        </Link>
      ) : (
        <div className="bg-white border border-dashed border-border rounded-[18px] p-10 text-center pc-rise">
          <div className="w-12 h-12 rounded-[14px] bg-sage/10 flex items-center justify-center mx-auto mb-4 text-sage">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-ink mb-1.5">No pay periods yet</p>
          <p className="text-[13px] text-subtle leading-relaxed mb-5">
            Create your first pay period to begin tracking hours and earnings.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="h-10 px-5 rounded-[13px] bg-sage text-white text-[13px] font-semibold shadow-btn hover:bg-sage-deep transition-colors"
          >
            + New Pay Period
          </button>
        </div>
      )}

      {/* ── Action row (secondary) ── */}
      {hasPeriods && (
        <div className="flex items-center justify-between gap-2 mt-5 mb-3 pc-rise" style={{ animationDelay: "60ms" }}>
          {/* Desktop-only inline Log Hours — FAB stays only on mobile */}
          {logHoursHref ? (
            <Link
              href={logHoursHref}
              className="hidden md:inline-flex h-9 px-3.5 rounded-[11px] bg-sage text-white text-[12px] font-semibold hover:bg-sage-deep transition-colors items-center gap-1.5 shadow-btn"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Log Hours
            </Link>
          ) : (
            <span className="hidden md:block" />
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="h-9 px-3.5 rounded-[11px] border border-border bg-white text-[12px] font-semibold text-ink hover:border-sage/40 hover:text-sage transition-colors flex items-center gap-1.5 ml-auto"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 6v12M6 12h12" />
            </svg>
            New pay period
          </button>
        </div>
      )}

      {/* ── Period list ── */}
      {hasPeriods && (
        <div className="pc-rise" style={{ animationDelay: "120ms" }}>
          <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-3">
            All pay periods
          </div>
          {(() => {
            const peakHours = Math.max(...periods.map((p) => p.summary.totalHours), 0);
            return (
              <div className="flex flex-col gap-2">
                {periods.map((p, i) => {
                  const prev = periods[i + 1]; // newer-first array → next index is older
                  const trend = calcTrend(p, prev);
                  const isEmpty = p.summary.totalHours === 0;
                  const isActive = p.id === activePeriodId;
                  const fillPct =
                    peakHours > 0 ? Math.round((p.summary.totalHours / peakHours) * 100) : 0;
                  return (
                    <div
                      key={p.id}
                      data-period-card
                      className={cn(
                        "group bg-white border rounded-[14px] pl-4 pr-2 py-3 flex items-center gap-3 transition-all duration-150",
                        isActive
                          ? "border-sage/40 ring-1 ring-sage/15"
                          : "border-border-soft/70 hover:border-sage/30 hover:shadow-card"
                      )}
                    >
                      <Link
                        href={`/dashboard/hoursboard?period=${p.id}`}
                        className="flex-1 min-w-0 flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold tracking-tight text-ink truncate">
                              {p.displayName}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">
                                Now
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ghost mt-0.5 font-mono">{p.label}</div>
                          {/* Per-period fill bar — relative to peak */}
                          {!isEmpty && peakHours > 0 && (
                            <div className="mt-2 h-[3px] bg-border-soft/70 rounded-full overflow-hidden max-w-[220px]">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isActive ? "bg-sage" : "bg-sage/60"
                                )}
                                style={{ width: `${fillPct}%` }}
                                aria-label={`${fillPct}% of peak period`}
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          {isEmpty ? (
                            <span className="text-[12px] text-ghost italic">No shifts logged</span>
                          ) : (
                            <>
                              {trend && (
                                <div className="hidden sm:block">
                                  <TrendBadge trend={trend} />
                                </div>
                              )}
                              <div>
                                <div className="text-[15px] font-semibold font-mono text-ink leading-none tabular-nums">
                                  {formatHours(p.summary.totalHours)}
                                </div>
                                <div className="text-[13px] font-semibold font-mono text-sage mt-1.5 leading-none tabular-nums">
                                  {formatCurrency(p.summary.estimatedGross)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </Link>
                      <PayPeriodActions period={p} />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

        {/* ── Mobile-only stacked summary (below period list) ── */}
        {hasPeriods && (
          <div className="md:hidden mt-6 pc-rise" style={{ animationDelay: "80ms" }}>
            <SummaryPanel
              latest={latest}
              periods={periods}
              activePeriodId={activePeriodId}
              progress={latestProgress}
            />
          </div>
        )}

        {/* ── Mobile-only sticky lifetime footer ── */}
        <LifetimeFooter periods={periods} variant="sticky-mobile" />
      </div>

      {/* ── Right column (40%) — desktop only ── */}
      <div className="hidden md:block md:col-span-2 mt-0">
        <div className="md:sticky md:top-6 pc-rise space-y-4" style={{ animationDelay: "80ms" }}>
          <SummaryPanel
            latest={latest}
            periods={periods}
            activePeriodId={activePeriodId}
            progress={latestProgress}
          />
          <LifetimeFooter periods={periods} variant="card" />
        </div>
      </div>

      {/* ── Floating Log Hours FAB — mobile only ── */}
      {logHoursHref && (
        <Link
          href={logHoursHref}
          aria-label="Log hours"
          className={cn(
            "md:hidden fixed right-5 z-40 group",
            periods.length > 1 ? "bottom-[152px]" : "bottom-[88px]"
          )}
        >
          <div className="flex items-center gap-2 h-14 pl-5 pr-6 rounded-full bg-sage text-white shadow-[0_8px_24px_rgba(50,74,62,0.32)] hover:bg-sage-deep hover:shadow-[0_10px_28px_rgba(50,74,62,0.38)] transition-all duration-200 active:scale-95">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-[14px] font-semibold tracking-tight">Log Hours</span>
          </div>
        </Link>
      )}

      <NewPayPeriodModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        latestPeriodEndDate={latest?.endDate ?? null}
      />
    </div>
  );
}
