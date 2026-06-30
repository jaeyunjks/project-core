"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalDisplay, GoalTrackerSummary } from "@/types";
import { cn } from "@/lib/utils";
import {
  computePace,
  formatGoalValue,
  formatShortEta,
} from "@/domain/goaltracker";
import { GoalCard } from "./GoalCard";
import { CreateGoalModal } from "./CreateGoalModal";
import { refreshAutoGoalsAction } from "@/server/actions/goaltracker";

interface Props {
  goals: GoalDisplay[];
  summary: GoalTrackerSummary;
  filter: "active" | "completed" | "archived";
}

export function GoalTrackerOverview({ goals, summary, filter }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  function handleRefresh() {
    startRefresh(async () => {
      await refreshAutoGoalsAction();
      router.refresh();
    });
  }

  const hasAutoGoals = goals.some((g) => g.autoSource !== "none");

  // Aggregate for the hero: total saved across $ numeric goals, remaining, avg progress, nearest deadline
  const moneyGoals = goals.filter(
    (g) => g.type === "numeric" && g.unit === "$" && g.status === "active"
  );
  const totalSaved = moneyGoals.reduce((s, g) => s + g.currentValue, 0);
  const totalTarget = moneyGoals.reduce((s, g) => s + (g.targetValue ?? 0), 0);
  const remaining = Math.max(0, totalTarget - totalSaved);

  const activeGoals = goals.filter((g) => g.status === "active");
  const avgProgress =
    activeGoals.length === 0
      ? 0
      : Math.round(
          activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length
        );

  // "Nearest" = earliest upcoming deadline among active goals
  const nearestDeadline = activeGoals
    .filter((g) => g.deadline)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))[0]
    ?.deadline ?? null;

  // Pace summary for headline pill
  const overallPace = derivePagePace(activeGoals);
  const showMoneyHero = totalTarget > 0;

  return (
    <div className="md:grid md:grid-cols-5 md:gap-6">
      {/* ── LEFT (60%) ── */}
      <div className="md:col-span-3 flex flex-col pb-4 md:pb-0">
        {/* Hero summary */}
        <div className="bg-[#F7F2E8] border border-[#E3DDC8] rounded-[14px] p-4 sm:p-5 md:p-6">
          <div className="font-mono text-[10px] tracking-[0.18em] text-[#8F8A78] uppercase">
            {showMoneyHero ? "Total saved · all goals" : summary.active === 0 ? "Your goals" : "Active goals"}
          </div>

          {showMoneyHero ? (
            <div className="mt-1.5 font-mono font-semibold text-[#2D4A2E] tracking-tight leading-none text-[30px] sm:text-[36px] md:text-[44px] break-all">
              {formatGoalValue(totalSaved, "$")}
            </div>
          ) : (
            <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
              <div className={cn(
                "font-mono font-semibold tracking-tight leading-none text-[30px] sm:text-[36px] md:text-[44px]",
                summary.active === 0 ? "text-[#8F8A78]" : "text-[#1A1A18]"
              )}>
                {summary.active}
              </div>
              <div className="text-[13px] md:text-[14px] text-[#6B6755]">
                {summary.active === 1 ? "active goal" : "active goals"}
              </div>
            </div>
          )}

          {/* Headline pill */}
          {(summary.active > 0 || summary.overdue > 0) && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <HeroPill pace={overallPace} overdue={summary.overdue} />
              {showMoneyHero && (
                <span className="text-[11px] text-[#6B6755]">vs your plans</span>
              )}
            </div>
          )}

          {summary.active === 0 && summary.completed === 0 && (
            <div className="text-[13px] text-[#6B6755] mt-2">
              Nothing tracked yet — set your first goal below.
            </div>
          )}

          {/* 2x2 stat band */}
          {(summary.active > 0 || summary.completed > 0) && (
            <div className="grid grid-cols-2 gap-0 mt-[18px] pt-4 border-t border-[#E3DDC8]">
              <StatCell
                label="Active"
                value={`${summary.active} ${summary.active === 1 ? "goal" : "goals"}`}
                divider
              />
              <StatCell
                label={showMoneyHero ? "Remaining" : "Completed"}
                value={showMoneyHero ? formatGoalValue(remaining, "$") : String(summary.completed)}
              />
              <StatCell
                label="Avg progress"
                value={`${avgProgress}%`}
                divider
                topPad
              />
              <StatCell
                label="Nearest"
                value={nearestDeadline ? formatShortEta(nearestDeadline) : "—"}
                topPad
              />
            </div>
          )}
        </div>

        {/* Filter pills + refresh */}
        <div className="flex items-center gap-2 mt-5 mb-4 min-w-0">
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center gap-1 p-1 bg-[#EFE9DC] rounded-full">
              {(["active", "completed", "archived"] as const).map((f) => {
                const count =
                  f === "active" ? summary.active :
                  f === "completed" ? summary.completed : null;
                return (
                  <a
                    key={f}
                    href={f === "active" ? "/dashboard/goals" : `/dashboard/goals?filter=${f}`}
                    className={cn(
                      "h-8 px-3 sm:px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all capitalize whitespace-nowrap shrink-0",
                      filter === f
                        ? "bg-[#F7F2E8] text-[#1A1A18] shadow-sm"
                        : "text-[#6B6755] hover:text-[#1A1A18]"
                    )}
                  >
                    <span>{f}</span>
                    {count !== null && count > 0 && (
                      <span className={cn(
                        "text-[10px] font-mono tabular-nums",
                        filter === f ? "text-[#8F8A78]" : "text-[#9A9486]"
                      )}>
                        {count}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
          {hasAutoGoals && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh auto-tracked goals"
              className={cn(
                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#8F8A78] hover:text-[#2D4A2E] hover:bg-[#EFE9DC] transition-all",
                isRefreshing && "animate-spin pointer-events-none"
              )}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          )}
        </div>

        {/* Goals list */}
        {goals.length === 0 ? (
          <EmptyState filter={filter} onCreate={() => setCreateOpen(true)} />
        ) : (
          <>
            <div className="flex justify-between items-baseline mb-2.5">
              <div className="font-mono text-[11px] tracking-[0.18em] text-[#6B6755] uppercase">
                Your goals
              </div>
              <div className="text-[11px] text-[#8F8A78]">
                {goals.length} {filter}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </>
        )}

        {/* New goal CTA — bottom button to match the design */}
        {filter === "active" && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 w-full bg-[#2D4A2E] text-[#ECE6D9] rounded-[12px] py-4 text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#1F351F] transition-colors shadow-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Goal
          </button>
        )}
      </div>

      {/* ── RIGHT (40%) — desktop only ── */}
      <div className="hidden md:block md:col-span-2 mt-0">
        <div className="md:sticky md:top-6 flex flex-col gap-4">
          <BreakdownCard goals={goals} summary={summary} />
        </div>
      </div>

      {/* Mobile-only breakdown */}
      <div className="md:hidden mt-6">
        <BreakdownCard goals={goals} summary={summary} />
      </div>

      <CreateGoalModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  divider,
  topPad,
}: {
  label: string;
  value: string;
  divider?: boolean;
  topPad?: boolean;
}) {
  return (
    <div className={cn(
      "min-w-0",
      divider ? "border-r border-[#E3DDC8] pr-2.5 sm:pr-3.5" : "pl-2.5 sm:pl-3.5",
      topPad && "pt-3"
    )}>
      <div className="font-mono text-[10px] text-[#8F8A78] tracking-[0.16em] uppercase truncate">
        {label}
      </div>
      <div className="font-mono text-[15px] sm:text-[16px] md:text-[18px] font-semibold text-[#1A1A18] mt-1 tabular-nums truncate">
        {value}
      </div>
    </div>
  );
}

function HeroPill({
  pace,
  overdue,
}: {
  pace: "on-pace" | "behind" | "ahead" | "steady" | "empty";
  overdue: number;
}) {
  if (overdue > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#EFDFD9] text-[#8A3F2E]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
        {overdue} overdue
      </span>
    );
  }
  if (pace === "empty") return null;
  const map = {
    "on-pace": { bg: "#E8EEDF", fg: "#2D4A2E", dot: "#2D4A2E", label: "On pace" },
    "ahead": { bg: "#E8EEDF", fg: "#2D4A2E", dot: "#2D4A2E", label: "Ahead" },
    "behind": { bg: "#F2E9D5", fg: "#7A5A1F", dot: "#B59A6F", label: "Falling behind" },
    "steady": { bg: "#EFE9DC", fg: "#6B6755", dot: "#8F8A78", label: "Steady" },
  } as const;
  const s = map[pace];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: s.bg, color: s.fg }}>
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function derivePagePace(
  active: GoalDisplay[]
): "on-pace" | "behind" | "ahead" | "steady" | "empty" {
  if (active.length === 0) return "empty";
  const paces = active.map((g) => computePace(g.status, g.progress, g.deadline, g.createdAt));
  if (paces.some((p) => p === "behind")) return "behind";
  if (paces.every((p) => p === "ahead")) return "ahead";
  if (paces.some((p) => p === "on-track" || p === "ahead")) return "on-pace";
  return "steady";
}

function BreakdownCard({
  goals,
  summary,
}: {
  goals: GoalDisplay[];
  summary: GoalTrackerSummary;
}) {
  const numeric = goals.filter((g) => g.type === "numeric").length;
  const checklist = goals.filter((g) => g.type === "checklist").length;
  const auto = goals.filter((g) => g.autoSource !== "none").length;
  const withDeadline = goals.filter((g) => g.deadline).length;

  return (
    <div className="bg-[#F7F2E8] border border-[#E3DDC8] rounded-[14px] p-5">
      <div className="font-mono text-[10px] tracking-[0.18em] text-[#8F8A78] uppercase mb-3.5">
        At a glance
      </div>
      <div className="flex flex-col">
        <Row label="Numeric targets" value={numeric} />
        <Row label="Checklists" value={checklist} />
        <Row label="Auto-tracked" value={auto} accent={auto > 0} />
        <Row label="With deadlines" value={withDeadline} />
        {summary.overdue > 0 && (
          <Row label="Overdue" value={summary.overdue} color="red" last />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color = "ink",
  accent,
  last,
}: {
  label: string;
  value: number;
  color?: "ink" | "red";
  accent?: boolean;
  last?: boolean;
}) {
  const colorClass =
    color === "red" ? "text-[#8A3F2E]" : accent ? "text-[#2D4A2E]" : "text-[#1A1A18]";
  return (
    <div className={cn(
      "flex justify-between items-center py-2.5",
      !last && "border-b border-[#E3DDC8]"
    )}>
      <span className="text-[13px] text-[#3A382F]">{label}</span>
      <span className={cn("text-[14px] font-mono font-semibold tabular-nums", colorClass)}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  filter,
  onCreate,
}: {
  filter: string;
  onCreate: () => void;
}) {
  if (filter !== "active") {
    return (
      <div className="bg-[#F7F2E8] border border-dashed border-[#D9D2BE] rounded-[14px] p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#EFE9DC] flex items-center justify-center mx-auto mb-4 text-[#6B6755]">
          {filter === "completed" ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M3 11h18" /><path d="M10 7V4h4v3" />
            </svg>
          )}
        </div>
        <div className="text-[16px] font-semibold text-[#1A1A18] mb-1.5">
          No {filter} goals
        </div>
        <p className="text-[13px] text-[#6B6755]">
          {filter === "completed"
            ? "Goals you complete will appear here."
            : "Goals you archive will appear here."}
        </p>
      </div>
    );
  }

  const ideas = [
    "Emergency fund — A$5,000",
    "Run 50km this month",
    "Finish 3 books",
  ];

  return (
    <div className="bg-[#F7F2E8] border border-dashed border-[#D9D2BE] rounded-[14px] p-8 md:p-10">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#F2E9D5] flex items-center justify-center mx-auto mb-4 text-[#8A6A2E]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <div className="text-[17px] font-semibold text-[#1A1A18] mb-2">
          Set your first goal
        </div>
        <p className="text-[13px] text-[#6B6755] leading-relaxed max-w-[340px] mx-auto mb-5">
          Track a number, tick off milestones, or auto-link to MoneyBoard and HoursBoard.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="h-10 px-5 rounded-full bg-[#2D4A2E] text-[#ECE6D9] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#1F351F] transition-colors shadow-btn"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New goal
        </button>
      </div>

      <div className="mt-7 pt-5 border-t border-[#E3DDC8]">
        <div className="font-mono text-[10px] tracking-[0.18em] text-[#8F8A78] uppercase mb-3 text-center">
          Ideas to get started
        </div>
        <div className="flex flex-col gap-1.5">
          {ideas.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={onCreate}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#EFE9DC] text-left transition-colors group"
            >
              <span className="font-mono text-[10px] text-[#8F8A78] tracking-[0.16em] uppercase w-7 shrink-0">
                Idea
              </span>
              <span className="text-[13px] text-[#3A382F] group-hover:text-[#1A1A18] flex-1">{idea}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#B3AC9E] group-hover:text-[#2D4A2E]">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
