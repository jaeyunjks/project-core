"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { PayPeriodDayDisplay, AwardLevelDisplay } from "@/types";
import { DAY_TYPE_LABELS, DAY_TYPE_MULTIPLIERS, getDefaultPayRate } from "@/domain/hoursboard";
import { formatCurrency, cn } from "@/lib/utils";
import { saveWorksheetAction } from "@/server/actions/hoursboard";

interface Props {
  open: boolean;
  onClose: () => void;
  todayEntry: PayPeriodDayDisplay;
  awards: AwardLevelDisplay[];
  employerBaseRate: number;
  periodName: string;
}

function getBaseRateFor(
  awardLevelId: string | null,
  awards: AwardLevelDisplay[],
  employerBaseRate: number
): number {
  if (!awardLevelId) return employerBaseRate;
  const award = awards.find((a) => a.id === awardLevelId);
  return award?.baseRate ?? employerBaseRate;
}

const QUICK_HOURS = [4, 5, 6, 7, 7.5, 8];

export function LogHoursModal({
  open,
  onClose,
  todayEntry,
  awards,
  employerBaseRate,
  periodName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [hours, setHours] = useState(todayEntry.workHours || 0);
  const [dayType, setDayType] = useState(todayEntry.dayType);
  const [awardLevelId, setAwardLevelId] = useState(todayEntry.awardLevelId);
  const [notes, setNotes] = useState(todayEntry.notes ?? "");

  const baseRate = getBaseRateFor(awardLevelId, awards, employerBaseRate);
  const payRate = dayType === "custom" ? todayEntry.payRate : getDefaultPayRate(dayType, baseRate);
  const estimatedPay = Math.round(hours * payRate * 100) / 100;
  const mult = DAY_TYPE_MULTIPLIERS[dayType as keyof typeof DAY_TYPE_MULTIPLIERS] ?? 1;

  function handleSave() {
    startTransition(async () => {
      await saveWorksheetAction([
        {
          id: todayEntry.id,
          workHours: hours,
          dayType,
          awardLevelId,
          payRate,
          notes: notes.trim() || null,
        },
      ]);
      onClose();
      router.refresh();
    });
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-white rounded-t-[24px] md:rounded-[22px] shadow-[0_-8px_40px_rgba(0,0,0,0.12),0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-9 h-[5px] rounded-full bg-border-soft" />
        </div>

        {/* ── Hero section — date + hours ── */}
        <div className="relative bg-gradient-to-b from-sage/[0.06] to-transparent px-5 pt-4 md:pt-6 pb-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-[12px] bg-sage text-white flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-ink leading-tight">Log hours</h2>
                <p className="text-[12px] text-subtle">
                  {todayEntry.dayLabel} {todayEntry.dayNumber} {todayEntry.monthLabel}
                  <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded-full bg-sage/10 text-sage text-[9px] font-bold uppercase tracking-wider">Today</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-ghost hover:text-ink hover:bg-white/80 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Hours — centered input + quick picks */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={hours || ""}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                placeholder="0"
                step="0.25"
                min="0"
                max="24"
                className="w-[100px] h-14 rounded-[14px] border-2 border-sage/25 bg-white text-center text-[26px] font-semibold font-mono text-ink outline-none focus:border-sage focus:ring-[4px] focus:ring-sage/10 transition-all tabular-nums placeholder:text-border"
                autoFocus
              />
              <span className="absolute -right-[20px] top-1/2 -translate-y-1/2 text-[12px] font-medium text-ghost">h</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              {QUICK_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h)}
                  className={cn(
                    "h-[30px] min-w-[36px] px-2 rounded-full text-[11px] font-semibold font-mono transition-all",
                    hours === h
                      ? "bg-sage text-white shadow-sm"
                      : "bg-white border border-border-soft text-subtle hover:border-sage/30 hover:text-ink"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Details section ── */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Day type + Award in a compact row */}
          <div className={cn("grid gap-2.5", awards.length > 0 ? "grid-cols-2" : "grid-cols-1")}>
            <div>
              <label className="block text-[9px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1">
                Day type
              </label>
              <div className="relative">
                <select
                  value={dayType}
                  onChange={(e) => setDayType(e.target.value)}
                  className="w-full h-10 pl-3 pr-8 rounded-[10px] border border-border-soft bg-white text-[13px] font-medium text-ink appearance-none outline-none focus:border-sage focus:ring-2 focus:ring-sage/15 transition-all"
                >
                  {Object.entries(DAY_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ghost">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>
            </div>
            {awards.length > 0 && (
              <div>
                <label className="block text-[9px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1">
                  Award level
                </label>
                <div className="relative">
                  <select
                    value={awardLevelId ?? ""}
                    onChange={(e) => setAwardLevelId(e.target.value || null)}
                    className="w-full h-10 pl-3 pr-8 rounded-[10px] border border-border-soft bg-white text-[13px] font-medium text-ink appearance-none outline-none focus:border-sage focus:ring-2 focus:ring-sage/15 transition-all"
                  >
                    <option value="">Default</option>
                    {awards.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {formatCurrency(a.baseRate)}/h</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ghost">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[9px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — e.g. covered Sarah's shift"
              className="w-full h-10 px-3 rounded-[10px] border border-border-soft bg-white text-[13px] text-ink outline-none focus:border-sage focus:ring-2 focus:ring-sage/15 placeholder:text-pale transition-all"
            />
          </div>

          {/* ── Pay estimate card ── */}
          <div className="bg-gradient-to-br from-sage/[0.07] via-paper to-paper rounded-[14px] border border-sage/15 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] font-semibold font-mono uppercase tracking-[0.12em] text-ghost mb-1">
                  Estimated pay
                </div>
                {hours > 0 ? (
                  <div className="text-[12px] text-subtle leading-snug">
                    {hours}h <span className="text-ghost">×</span> {formatCurrency(payRate)}/h
                    {mult !== 1 && (
                      <span className="ml-1 text-[10px] text-sage font-semibold">({mult}×)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] text-pale">Enter hours above</div>
                )}
              </div>
              <div className={cn(
                "text-[28px] font-semibold font-mono tabular-nums tracking-tight leading-none",
                estimatedPay > 0 ? "text-sage" : "text-border"
              )}>
                {estimatedPay > 0 ? formatCurrency(estimatedPay) : "—"}
              </div>
            </div>
          </div>

          {/* ── Save button ── */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={cn(
              "h-[52px] rounded-[14px] text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
              hours > 0
                ? "bg-sage text-white shadow-[0_6px_16px_rgba(62,91,77,0.24)] hover:bg-sage-deep"
                : "bg-ink/5 text-subtle hover:bg-ink/10"
            )}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Saving…
              </span>
            ) : hours > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                Save {hours}h for today
              </span>
            ) : (
              "Clear today's hours"
            )}
          </button>

          {/* Safe area spacer for mobile */}
          <div className="h-2 md:hidden" />
        </div>
      </div>
    </div>,
    document.body
  );
}
