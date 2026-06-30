"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalDisplay } from "@/types";
import { cn } from "@/lib/utils";
import {
  computePace,
  formatGoalValue,
  formatRelativeWindow,
  formatRemaining,
  formatShortEta,
  paceLabel,
  type GoalPace,
} from "@/domain/goaltracker";
import {
  toggleMilestoneAction,
  updateGoalAction,
  deleteGoalAction,
} from "@/server/actions/goaltracker";
import { UpdateProgressModal } from "./UpdateProgressModal";

interface Props {
  goal: GoalDisplay;
}

export function GoalCard({ goal }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const pace = computePace(goal.status, goal.progress, goal.deadline, goal.createdAt);
  const milestonesDone = goal.milestones.filter((m) => m.done).length;
  const isComplete = goal.status === "completed";
  const isAuto = goal.autoSource !== "none";

  // Visual palette for the bar & status colors per pace
  const barColor =
    pace === "done" ? "#2D4A2E" :
    pace === "behind" ? "#B59A6F" :  // amber/sand to mirror the design's "Behind" tone
    pace === "ahead" ? "#2D4A2E" :
    pace === "on-track" ? "#2D4A2E" :
    "#7A8A6A"; // steady

  const tagText = getTagText(goal);

  function handleToggleMilestone(milestoneId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("milestoneId", milestoneId);
      await toggleMilestoneAction(fd);
      router.refresh();
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", goal.id);
      fd.set("status", status);
      await updateGoalAction(null, fd);
      router.refresh();
    });
    setMenuOpen(false);
  }

  function handleDelete() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", goal.id);
      await deleteGoalAction(fd);
      router.refresh();
    });
    setMenuOpen(false);
  }

  return (
    <>
      <div
        className={cn(
          "bg-[#F7F2E8] border border-[#E3DDC8] rounded-[14px] p-4 transition-all",
          isComplete && "opacity-75",
          isPending && "opacity-50 pointer-events-none"
        )}
      >
        {/* Top row */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="inline-flex items-center text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-[#5A4A2E] bg-[#E8E2D0] px-2 py-0.5 rounded-[4px]">
                {tagText}
              </span>
              {/* Status pill moves inline with tag on narrow viewports */}
              <span className="sm:hidden">
                <StatusPill pace={pace} />
              </span>
            </div>
            <div className="text-[15px] font-semibold text-[#1A1A18] leading-snug tracking-tight break-words">
              {goal.title}
            </div>
          </div>

          {/* Status pill (desktop) + menu */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline-flex">
              <StatusPill pace={pace} />
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8F8A78] hover:text-[#1A1A18] hover:bg-[#EFE9DC] transition-colors"
                aria-label="Goal options"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-30 w-[170px] bg-[#F7F2E8] border border-[#E3DDC8] rounded-[10px] shadow-card-lg p-1.5">
                    {goal.type === "numeric" && !isAuto && (
                      <MenuBtn label="Update progress" onClick={() => { setProgressOpen(true); setMenuOpen(false); }} />
                    )}
                    <MenuBtn
                      label={isComplete ? "Reopen goal" : "Mark complete"}
                      onClick={() => handleStatusChange(isComplete ? "active" : "completed")}
                    />
                    {goal.status !== "archived" && (
                      <MenuBtn label="Archive" onClick={() => handleStatusChange("archived")} />
                    )}
                    {goal.status === "archived" && (
                      <MenuBtn label="Restore" onClick={() => handleStatusChange("active")} />
                    )}
                    <div className="h-px bg-[#E3DDC8] my-1" />
                    <MenuBtn label="Delete" onClick={handleDelete} danger />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Big figure row */}
        <div className="flex items-baseline gap-2 mt-3">
          {goal.type === "numeric" ? (
            <>
              <div className="font-mono font-semibold text-[#1A1A18] text-[22px] tracking-tight tabular-nums leading-none">
                {formatGoalValue(goal.currentValue, goal.unit)}
              </div>
              <div className="font-mono text-[#6B6755] text-[13px] tabular-nums">
                / {formatGoalValue(goal.targetValue ?? 0, goal.unit)}
              </div>
            </>
          ) : (
            <>
              <div className="font-mono font-semibold text-[#1A1A18] text-[22px] tracking-tight tabular-nums leading-none">
                {milestonesDone}
              </div>
              <div className="font-mono text-[#6B6755] text-[13px] tabular-nums">
                / {goal.milestones.length} steps
              </div>
            </>
          )}
        </div>

        {/* Remaining / percent */}
        <div className="flex justify-between items-center mt-1.5">
          <div className="font-mono text-[11px] text-[#8F8A78]">
            {formatRemaining(goal.type, goal.currentValue, goal.targetValue, goal.unit, milestonesDone, goal.milestones.length)}
          </div>
          <div
            className="font-mono text-[11px] font-semibold tabular-nums"
            style={{ color: paceTextColor(pace) }}
          >
            {goal.progress}%
          </div>
        </div>

        {/* Bar — 6px per design */}
        <div className="h-[6px] bg-[#E8E2D0] rounded-[3px] mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-[3px] transition-all duration-500"
            style={{ width: `${Math.min(100, goal.progress)}%`, backgroundColor: barColor }}
          />
        </div>

        {/* Bottom meta strip */}
        {(goal.deadline || goal.type === "checklist") && (
          <div className="flex justify-between items-center gap-2 mt-3.5 pt-3 border-t border-[#E3DDC8] flex-wrap">
            <div className="font-mono text-[11px] text-[#6B6755] min-w-0">
              {goal.deadline ? (
                <>
                  {formatRelativeWindow(goal.deadline)} · ETA {formatShortEta(goal.deadline)}
                </>
              ) : (
                <>{goal.milestones.length} {goal.milestones.length === 1 ? "step" : "steps"} total</>
              )}
            </div>
            {goal.type === "checklist" && goal.milestones.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="bg-transparent text-[#3A382F] text-[12px] font-medium hover:text-[#1A1A18] transition-colors whitespace-nowrap"
              >
                {expanded ? "Hide steps ↑" : "View steps →"}
              </button>
            )}
          </div>
        )}

        {/* Milestones (checklist, when expanded) */}
        {goal.type === "checklist" && goal.milestones.length > 0 && expanded && (
          <div className="mt-2 pt-2 flex flex-col gap-0.5">
            {goal.milestones.map((ms) => (
              <button
                key={ms.id}
                type="button"
                onClick={() => handleToggleMilestone(ms.id)}
                className="flex items-center gap-3 py-2 px-1.5 -mx-1.5 rounded-[8px] hover:bg-[#EFE9DC] transition-colors text-left group"
              >
                <div className={cn(
                  "w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-all",
                  ms.done
                    ? "bg-[#2D4A2E] border-[#2D4A2E]"
                    : "border-[#D9D2BE] bg-[#F7F2E8] group-hover:border-[#3F5C3F]/50"
                )}>
                  {ms.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className={cn(
                  "text-[13px] flex-1",
                  ms.done ? "text-[#6B6755] line-through" : "text-[#1A1A18]"
                )}>
                  {ms.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {goal.type === "numeric" && !isAuto && (
        <UpdateProgressModal
          open={progressOpen}
          onClose={() => setProgressOpen(false)}
          goal={goal}
        />
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getTagText(goal: GoalDisplay): string {
  if (goal.autoSource === "moneyboard-income") return "AUTO · INCOME";
  if (goal.autoSource === "moneyboard-expense") return "AUTO · SPEND";
  if (goal.autoSource === "moneyboard-net") return "AUTO · NET";
  if (goal.autoSource === "hoursboard-hours") return "AUTO · HOURS";
  if (goal.type === "checklist") return "CHECKLIST";
  if (goal.unit === "$") return "SAVINGS";
  if (goal.unit) return goal.unit.toUpperCase();
  return "GOAL";
}

function paceTextColor(pace: GoalPace): string {
  switch (pace) {
    case "ahead":
    case "on-track":
    case "done":
      return "#2D4A2E";
    case "behind":
      return "#7A5A1F";
    case "steady":
    default:
      return "#6B6755";
  }
}

function StatusPill({ pace }: { pace: GoalPace }) {
  const styles = paceStyles(pace);
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ background: styles.bg, color: styles.fg }}
    >
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: styles.dot }} />
      {paceLabel(pace)}
    </span>
  );
}

function paceStyles(pace: GoalPace): { bg: string; fg: string; dot: string } {
  switch (pace) {
    case "ahead":
    case "on-track":
    case "done":
      return { bg: "#E8EEDF", fg: "#2D4A2E", dot: "#2D4A2E" };
    case "behind":
      return { bg: "#F2E9D5", fg: "#7A5A1F", dot: "#B59A6F" };
    case "steady":
    default:
      return { bg: "#EFE9DC", fg: "#6B6755", dot: "#8F8A78" };
  }
}

function MenuBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors",
        danger
          ? "text-[#8A3F2E] hover:bg-[#EFDFD9]"
          : "text-[#1A1A18] hover:bg-[#EFE9DC]"
      )}
    >
      {label}
    </button>
  );
}
