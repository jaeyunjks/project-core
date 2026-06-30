"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalDisplay } from "@/types";
import { cn } from "@/lib/utils";
import { formatGoalValue } from "@/domain/goaltracker";
import { updateGoalAction } from "@/server/actions/goaltracker";

interface Props {
  open: boolean;
  onClose: () => void;
  goal: GoalDisplay;
}

export function UpdateProgressModal({ open, onClose, goal }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(String(goal.currentValue));
  }, [open, goal.currentValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const num = parseFloat(value);
  const valid = Number.isFinite(num) && num >= 0;
  const target = goal.targetValue ?? 0;
  const projectedPct = target > 0 ? Math.min(100, Math.round((num / target) * 100)) : 0;
  const reachedTarget = target > 0 && num >= target;
  const isDollar = goal.unit === "$";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", goal.id);
      fd.set("currentValue", String(num));
      if (reachedTarget) fd.set("status", "completed");
      await updateGoalAction(null, fd);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-[#1A1A18]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-[#ECE6D9] rounded-t-[22px] md:rounded-[22px] mx-auto overflow-hidden shadow-card-lg">
        <form onSubmit={handleSubmit}>
          {/* Handle bar (mobile bottom-sheet feel) */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-[#D9D2BE]" />
          </div>

          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-start justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-[0.18em] text-[#8F8A78] uppercase">
                Contribution to
              </div>
              <h2 className="text-[18px] font-semibold text-[#1A1A18] tracking-tight mt-1">
                {goal.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B6755] hover:text-[#1A1A18] hover:bg-[#EFE9DC] transition-colors shrink-0"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Big centered value */}
          <div className="px-5">
            <div className="bg-[#F7F2E8] border border-[#E3DDC8] rounded-[14px] p-5 text-center">
              <div className="font-mono text-[10px] tracking-[0.18em] text-[#8F8A78] uppercase">
                Current value
              </div>
              <div className="flex items-baseline gap-1.5 mt-2 justify-center max-w-full overflow-hidden">
                {isDollar && (
                  <span className="font-mono text-[20px] sm:text-[22px] text-[#6B6755] shrink-0">A$</span>
                )}
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                  autoFocus
                  size={1}
                  style={{ width: `${Math.max(2, value.length || 1)}ch`, maxWidth: "100%" }}
                  className={cn(
                    "min-w-0 bg-transparent border-0 outline-none font-mono text-[36px] sm:text-[44px] font-semibold tracking-tight leading-none placeholder:text-[#B3AC9E] text-center tabular-nums",
                    reachedTarget ? "text-[#2D4A2E]" : "text-[#1A1A18]"
                  )}
                />
                {goal.unit && !isDollar && (
                  <span className="font-mono text-[14px] sm:text-[16px] text-[#6B6755] shrink-0">{goal.unit}</span>
                )}
              </div>
              <div className="font-mono text-[11px] text-[#8F8A78] mt-1">
                Target {formatGoalValue(target, goal.unit)}
              </div>

              {/* Quick add pills */}
              <div className="flex gap-1.5 justify-center mt-3.5 flex-wrap">
                {[10, 50, 100, 500].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(value) || 0;
                      setValue(String(cur + inc));
                    }}
                    className="bg-[#EFE9DC] border border-[#E3DDC8] rounded-full px-3 py-1.5 text-[11px] font-mono font-semibold text-[#3A382F] hover:bg-[#E8E2D0] transition-colors tabular-nums"
                  >
                    +{inc}
                  </button>
                ))}
              </div>

              {/* Projected bar */}
              {target > 0 && valid && (
                <div className="mt-4">
                  <div className="h-[6px] rounded-[3px] bg-[#E8E2D0] overflow-hidden">
                    <div
                      className="h-full rounded-[3px] transition-all duration-300"
                      style={{
                        width: `${projectedPct}%`,
                        backgroundColor: reachedTarget ? "#2D4A2E" : "#3F5C3F"
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="font-mono text-[10px] text-[#8F8A78] tabular-nums">{projectedPct}%</span>
                    {reachedTarget && (
                      <span className="font-mono text-[10px] font-semibold text-[#2D4A2E]">
                        Target reached
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer (safe-area aware) */}
          <div
            className="grid grid-cols-2 gap-2.5 px-5 pt-4"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="h-[50px] rounded-[12px] border border-[#D9D2BE] bg-[#F7F2E8] text-[14px] font-semibold text-[#6B6755] hover:text-[#1A1A18] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || isPending}
              className="h-[50px] rounded-[12px] bg-[#2D4A2E] text-[#ECE6D9] text-[14px] font-semibold hover:bg-[#1F351F] transition-colors shadow-btn disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
