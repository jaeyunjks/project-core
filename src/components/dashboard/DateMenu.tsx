"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DateContext {
  /** Long label like "Tue, 25 Jun 2026" */
  longLabel: string;
  /** Greeting like "Good afternoon" */
  greeting: string;
  /** Period progress — null when no active period */
  period: {
    label: string;          // "16–29 Jun"
    dayOf: number;          // 1-indexed
    totalDays: number;
    remainingDays: number;
  } | null;
  /** Day of month + days left in month */
  monthDay: number;
  daysLeftInMonth: number;
}

interface Props {
  context: DateContext;
}

export function DateMenu({ context }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 h-11 px-3.5 rounded-[12px] backdrop-blur-sm border transition-colors",
          open
            ? "bg-white border-border text-ink"
            : "bg-white/70 border-border-soft hover:border-border text-subtle"
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-faint">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span className="text-[12.5px] font-medium tabular-nums">{context.longLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[300px] bg-white border border-border-soft rounded-[14px] shadow-[0_18px_44px_rgba(0,0,0,0.16)] overflow-hidden z-50">
          <div className="px-4 py-4 bg-gradient-to-br from-sage/[0.07] to-transparent border-b border-border-soft">
            <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.18em] text-sage mb-1">
              Today
            </div>
            <div className="text-[20px] font-semibold tracking-tight text-ink leading-none">
              {context.longLabel}
            </div>
            <div className="text-[12px] text-muted mt-1.5">{context.greeting}</div>
          </div>

          <div className="px-4 py-3">
            {context.period ? (
              <Row
                label="Pay period"
                primary={context.period.label}
                secondary={`Day ${context.period.dayOf} of ${context.period.totalDays} · ${context.period.remainingDays} remaining`}
                bar={(context.period.dayOf / context.period.totalDays) * 100}
              />
            ) : (
              <Row
                label="Pay period"
                primary="None active"
                secondary="Create one in HoursBoard"
              />
            )}
            <div className="h-px bg-border-soft my-2" />
            <Row
              label="This month"
              primary={`Day ${context.monthDay}`}
              secondary={`${context.daysLeftInMonth} day${context.daysLeftInMonth === 1 ? "" : "s"} remaining`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  primary,
  secondary,
  bar,
}: {
  label: string;
  primary: string;
  secondary: string;
  bar?: number;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.14em] text-faint">
          {label}
        </span>
        <span className="text-[12.5px] font-mono font-medium text-ink tabular-nums">
          {primary}
        </span>
      </div>
      <div className="text-[11.5px] text-muted">{secondary}</div>
      {bar !== undefined && (
        <div className="h-1 mt-1.5 bg-paper rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-sage transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      )}
    </div>
  );
}
