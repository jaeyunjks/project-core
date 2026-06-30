"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  AUTO_SOURCE_OPTIONS,
  formatGoalValue,
  formatRelativeWindow,
  type GoalType,
  type AutoSource,
} from "@/domain/goaltracker";
import { createGoalAction } from "@/server/actions/goaltracker";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateGoalModal({ open, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("numeric");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("$");
  const [autoSource, setAutoSource] = useState<AutoSource>("none");
  const [deadline, setDeadline] = useState("");
  const [milestones, setMilestones] = useState<string[]>([""]);

  function reset() {
    setTitle(""); setType("numeric"); setTargetValue("");
    setUnit("$"); setAutoSource("none"); setDeadline("");
    setMilestones([""]); setError(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanMilestones = milestones.map((m) => m.trim()).filter(Boolean);

    const fd = new FormData();
    fd.set("title", title);
    fd.set("type", type);
    fd.set("targetValue", targetValue);
    fd.set("unit", unit);
    fd.set("autoSource", autoSource);
    fd.set("deadline", deadline);
    fd.set("milestones", JSON.stringify(cleanMilestones));

    startTransition(async () => {
      const result = await createGoalAction(null, fd);
      if (result.ok) {
        handleClose();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) return null;

  const autoOpt = AUTO_SOURCE_OPTIONS.find((o) => o.value === autoSource);
  const targetNum = parseFloat(targetValue);
  const hasPreview = type === "numeric" && Number.isFinite(targetNum) && targetNum > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-[#1A1A18]/50 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative w-full max-w-[460px] max-h-[88dvh] md:max-h-[88vh] bg-[#ECE6D9] rounded-t-[22px] md:rounded-[22px] mx-auto overflow-y-auto shadow-card-lg flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Drag handle (mobile only) */}
          <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-[#D9D2BE]" />
          </div>

          {/* Sticky header */}
          <div className="sticky top-0 bg-[#ECE6D9]/95 backdrop-blur-sm z-10 px-5 pt-3 md:pt-4 pb-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[20px] md:text-[22px] font-semibold text-[#1A1A18] tracking-tight leading-tight">New goal</h2>
              <p className="text-[12px] md:text-[13px] text-[#6B6755] mt-0.5">What are you working toward?</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 -mt-0.5 shrink-0 rounded-full flex items-center justify-center text-[#6B6755] hover:text-[#1A1A18] hover:bg-[#EFE9DC] transition-colors"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="px-5 pb-4 pt-1.5">

            {/* Goal name */}
            <div className="bg-[#F7F2E8] border border-[#E3DDC8] rounded-[12px] px-3.5 py-3">
              <div className="font-mono text-[10px] tracking-[0.18em] text-[#8F8A78] uppercase">
                Goal name
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Emergency fund"
                autoFocus
                className="w-full bg-transparent border-0 outline-none text-[16px] font-medium text-[#1A1A18] placeholder:text-[#B3AC9E] pt-0.5"
              />
            </div>

            {/* Type segmented */}
            <div className="mt-3">
              <FieldLabel>Type</FieldLabel>
              <div className="flex gap-1.5">
                {([
                  { v: "numeric" as const, label: "Numeric" },
                  { v: "checklist" as const, label: "Checklist" },
                ]).map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setType(t.v)}
                    className={cn(
                      "flex-1 h-[38px] rounded-full text-[12px] font-medium transition-all",
                      type === t.v
                        ? "bg-[#2D4A2E] text-[#ECE6D9] border border-[#2D4A2E]"
                        : "bg-[#F7F2E8] text-[#6B6755] border border-[#D9D2BE] hover:text-[#1A1A18]"
                    )}
                  >
                    {t.label}{type === t.v ? " ✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Numeric: target + unit */}
            {type === "numeric" && (
              <div className="grid grid-cols-[1fr_96px] sm:grid-cols-[1fr_120px] gap-2.5 mt-3">
                <div className="bg-[#F7F2E8] border border-[#E3DDC8] rounded-[12px] px-3.5 py-3">
                  <FieldLabel inline>Target</FieldLabel>
                  <div className="flex items-baseline gap-1 mt-1">
                    {unit === "$" && (
                      <span className="font-mono text-[13px] text-[#6B6755]">A$</span>
                    )}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="5,000"
                      className="flex-1 min-w-0 bg-transparent border-0 outline-none font-mono text-[18px] font-semibold text-[#1A1A18] placeholder:text-[#B3AC9E]"
                    />
                  </div>
                </div>
                <div className="bg-[#F7F2E8] border border-[#E3DDC8] rounded-[12px] px-3.5 py-3">
                  <FieldLabel inline>Unit</FieldLabel>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full mt-1 bg-transparent border-0 outline-none font-mono text-[16px] sm:text-[14px] font-medium text-[#1A1A18] cursor-pointer appearance-none"
                  >
                    <option value="$">$</option>
                    <option value="hours">hours</option>
                    <option value="kg">kg</option>
                    <option value="km">km</option>
                    <option value="items">items</option>
                  </select>
                </div>
              </div>
            )}

            {/* Checklist steps */}
            {type === "checklist" && (
              <div className="mt-3">
                <FieldLabel>Steps</FieldLabel>
                <div className="flex flex-col gap-2">
                  {milestones.map((ms, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="font-mono text-[11px] text-[#8F8A78] w-5 text-center tabular-nums">{i + 1}.</span>
                      <input
                        type="text"
                        value={ms}
                        onChange={(e) => {
                          const next = [...milestones];
                          next[i] = e.target.value;
                          setMilestones(next);
                        }}
                        placeholder={`Step ${i + 1}`}
                        className="flex-1 h-11 px-3.5 rounded-[11px] border border-[#E3DDC8] bg-[#F7F2E8] text-[16px] sm:text-[13px] text-[#1A1A18] placeholder:text-[#B3AC9E] outline-none focus:border-[#3F5C3F] focus:ring-[3px] focus:ring-[#3F5C3F]/10 transition-all"
                      />
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#9A9486] hover:text-[#8A3F2E] hover:bg-[#EFDFD9] transition-colors"
                          aria-label="Remove step"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMilestones([...milestones, ""])}
                    className="h-10 rounded-[11px] border border-dashed border-[#D9D2BE] text-[12px] font-medium text-[#6B6755] hover:text-[#2D4A2E] hover:border-[#3F5C3F]/40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add step
                  </button>
                </div>
              </div>
            )}

            {/* Auto-source (numeric only) */}
            {type === "numeric" && (
              <div className="mt-3 bg-[#F7F2E8] border border-[#E3DDC8] rounded-[12px] px-3.5 py-3">
                <FieldLabel inline>Auto-track from</FieldLabel>
                <select
                  value={autoSource}
                  onChange={(e) => {
                    const v = e.target.value as AutoSource;
                    setAutoSource(v);
                    const opt = AUTO_SOURCE_OPTIONS.find((o) => o.value === v);
                    if (opt?.unit) setUnit(opt.unit);
                  }}
                  className="w-full mt-1 bg-transparent border-0 outline-none text-[16px] sm:text-[14px] font-medium text-[#1A1A18] cursor-pointer appearance-none"
                >
                  {AUTO_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {autoOpt && autoOpt.value !== "none" && (
                  <p className="text-[11px] text-[#6B6755] mt-2 leading-relaxed flex items-start gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0 text-[#2D4A2E]">
                      <circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><circle cx="12" cy="16" r="0.5" fill="currentColor" />
                    </svg>
                    Pulls live from your {autoOpt.value.startsWith("moneyboard") ? "MoneyBoard" : "HoursBoard"} data.
                  </p>
                )}
              </div>
            )}

            {/* Deadline */}
            <div className="mt-3 bg-[#F7F2E8] border border-[#E3DDC8] rounded-[12px] px-3.5 py-3 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <FieldLabel inline>Target deadline <span className="text-[#B3AC9E] normal-case tracking-normal font-sans font-normal">· optional</span></FieldLabel>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full mt-1 bg-transparent border-0 outline-none font-mono text-[16px] text-[#1A1A18] cursor-pointer appearance-none"
                />
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6755" strokeWidth="1.6" className="shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              </svg>
            </div>

            {/* Live preview */}
            {hasPreview && (
              <div className="mt-4 bg-[#E8EEDF] border border-[#C4D2B6] rounded-[14px] p-4">
                <div className="flex justify-between items-baseline mb-2">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-[#2D4A2E] uppercase font-semibold">
                    Preview
                  </div>
                  {deadline && (
                    <div className="font-mono text-[10px] tracking-[0.14em] text-[#7A5A1F] bg-[#F2E9D5] px-2 py-0.5 rounded-[4px]">
                      {formatRelativeWindow(deadline).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-0">
                  <div className="border-r border-[#C4D2B6] pr-3.5">
                    <div className="font-mono text-[10px] text-[#5A6A4F] tracking-[0.16em] uppercase">
                      Target
                    </div>
                    <div className="font-mono text-[18px] font-semibold text-[#2D4A2E] mt-1 tabular-nums">
                      {formatGoalValue(targetNum, unit)}
                    </div>
                  </div>
                  <div className="pl-3.5">
                    <div className="font-mono text-[10px] text-[#5A6A4F] tracking-[0.16em] uppercase">
                      {deadline ? "Deadline" : "Open"}
                    </div>
                    <div className="font-mono text-[18px] font-semibold text-[#2D4A2E] mt-1 tabular-nums">
                      {deadline ? formatRelativeWindow(deadline) : "No date"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 text-[13px] text-[#8A3F2E] bg-[#EFDFD9] rounded-[11px] px-4 py-2.5">
                {error}
              </div>
            )}
          </div>

          {/* Sticky footer (safe-area aware for notched phones) */}
          <div
            className="sticky bottom-0 border-t border-[#E3DDC8] bg-[#F7F2E8] px-5 pt-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="w-full h-[50px] rounded-[12px] bg-[#2D4A2E] text-[#ECE6D9] text-[15px] font-semibold hover:bg-[#1F351F] transition-colors shadow-btn disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <div className={cn(
      "font-mono text-[10px] tracking-[0.18em] text-[#8F8A78] uppercase",
      !inline && "mb-2 pl-0.5"
    )}>
      {children}
    </div>
  );
}
