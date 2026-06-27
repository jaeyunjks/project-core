"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createPayPeriodAction,
  updatePayPeriodAction,
} from "@/server/actions/hoursboard";
import type { PayPeriodDisplay } from "@/types";

const MIN_DAYS = 7;
const MAX_DAYS = 14;

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function durationDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return diff;
}

interface Props {
  open: boolean;
  onClose: () => void;
  editPeriod?: PayPeriodDisplay | null;
  latestPeriodEndDate?: string | null;
  employerId?: string;
}

export function NewPayPeriodModal({
  open,
  onClose,
  editPeriod,
  latestPeriodEndDate,
  employerId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editPeriod;
  const defaultStart = todayStr();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(addDaysStr(defaultStart, 13));

  // Reset form when modal opens (use edit values if editing)
  useEffect(() => {
    if (open) {
      if (editPeriod) {
        setName(editPeriod.name ?? "");
        setStartDate(editPeriod.startDate);
        setEndDate(editPeriod.endDate);
      } else {
        const s = todayStr();
        setName("");
        setStartDate(s);
        setEndDate(addDaysStr(s, 13));
      }
      setError(null);
    }
  }, [open, editPeriod]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const duration = useMemo(
    () => durationDays(startDate, endDate),
    [startDate, endDate]
  );

  const durationError =
    duration === null
      ? null
      : duration < MIN_DAYS
        ? `Pay period must be at least ${MIN_DAYS} days (currently ${duration}).`
        : duration > MAX_DAYS
          ? `Pay period cannot exceed ${MAX_DAYS} days (currently ${duration}).`
          : null;

  const canSubmit = !durationError && duration !== null && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("startDate", startDate);
    fd.set("endDate", endDate);
    if (editPeriod) fd.set("id", editPeriod.id);
    if (employerId) fd.set("employerId", employerId);

    startTransition(async () => {
      const result = editPeriod
        ? await updatePayPeriodAction(null, fd)
        : await createPayPeriodAction(null, fd);
      if (result.ok) {
        onClose();
        if (editPeriod) {
          router.refresh();
        } else {
          router.push(`/dashboard/hoursboard?period=${result.id}`);
        }
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 pb-20 md:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] max-h-[calc(100dvh-7rem)] md:max-h-[calc(100dvh-3rem)] overflow-y-auto bg-white rounded-[20px] border border-border-soft shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-period-title"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
            <h2 id="new-period-title" className="text-[16px] font-semibold text-ink">
              {isEditing ? "Edit pay period" : "New pay period"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-[9px] flex items-center justify-center text-subtle hover:text-ink hover:bg-paper transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                Name <span className="font-normal normal-case text-ghost">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. June fortnight, Week 12"
                maxLength={60}
                className="w-full h-[46px] rounded-[12px] border border-border bg-white px-3.5 text-[14px] text-ink placeholder:text-pale outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all"
              />
            </div>

            {/* Quick-fill — only when creating + a previous period exists */}
            {!isEditing && latestPeriodEndDate && (
              <div>
                <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                  Continue from last period
                </div>
                <div className="flex gap-2">
                  {[
                    { label: "+1 week", days: 7 },
                    { label: "+2 weeks", days: 14 },
                  ].map(({ label, days }) => {
                    const newStart = addDaysStr(latestPeriodEndDate, 1);
                    const newEnd = addDaysStr(newStart, days - 1);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setStartDate(newStart);
                          setEndDate(newEnd);
                        }}
                        className="flex-1 h-9 px-3 rounded-[10px] border border-border bg-white text-[12px] font-semibold text-ink hover:border-sage/40 hover:bg-sage/5 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                  Start date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-[46px] rounded-[12px] border border-border bg-white px-3 text-[14px] text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all appearance-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold font-mono uppercase tracking-[0.08em] text-faint mb-1.5">
                  End date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-[46px] rounded-[12px] border border-border bg-white px-3 text-[14px] text-ink outline-none focus:border-sage focus:ring-[3px] focus:ring-sage/10 transition-all appearance-none"
                />
              </div>
            </div>

            {/* Duration hint */}
            <div className="text-[12px] text-subtle flex items-center justify-between">
              <span>Pay periods must be {MIN_DAYS}–{MAX_DAYS} days.</span>
              {duration !== null && (
                <span className={durationError ? "text-red-600 font-medium" : "text-sage font-medium"}>
                  {duration} day{duration === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {isEditing && editPeriod && (startDate !== editPeriod.startDate || endDate !== editPeriod.endDate) && (
              <div className="px-3 py-2.5 rounded-[10px] bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
                Dates changed. Hours entered for days now outside the range will be removed.
              </div>
            )}

            {(durationError || error) && (
              <div className="px-3 py-2.5 rounded-[10px] bg-red-50 border border-red-200 text-[13px] text-red-700">
                {error ?? durationError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border-soft bg-paper/40 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-[11px] text-[13px] font-semibold text-subtle hover:bg-paper transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 px-5 rounded-[11px] bg-sage text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(62,91,77,0.22)] hover:bg-sage/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending
                ? isEditing ? "Saving…" : "Creating…"
                : isEditing ? "Save changes" : "Create pay period"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
