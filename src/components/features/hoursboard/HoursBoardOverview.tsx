"use client";

import Link from "next/link";
import { useState } from "react";
import type { PayPeriodDisplay } from "@/types";
import { formatCurrency, formatHours, cn } from "@/lib/utils";
import { NewPayPeriodModal } from "./NewPayPeriodModal";

interface Props {
  periods: PayPeriodDisplay[];          // newest first
  latest: PayPeriodDisplay | null;
}

export function HoursBoardOverview({ periods, latest }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasPeriods = periods.length > 0;

  return (
    <>
      {/* Latest period summary */}
      {latest ? (
        <Link href={`/dashboard/hoursboard?period=${latest.id}`}>
          <div className="bg-white border border-border-soft rounded-[18px] p-5 shadow-[0_2px_12px_rgba(41,38,33,0.05)] mb-5 hover:shadow-[0_4px_18px_rgba(41,38,33,0.08)] transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-1">
                  Current pay period
                </div>
                <div className="text-[16px] font-semibold text-ink">{latest.displayName}</div>
                {latest.name && (
                  <div className="text-[12px] text-subtle mt-0.5">{latest.label}</div>
                )}
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-ghost mt-1">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-px bg-border-soft rounded-[12px] overflow-hidden border border-border-soft">
              {[
                { label: "Hours", value: formatHours(latest.summary.totalHours) },
                { label: "Est. Gross", value: formatCurrency(latest.summary.estimatedGross), accent: true },
                { label: "Days", value: String(latest.summary.workedDays) },
              ].map((item) => (
                <div key={item.label} className="bg-white px-3 py-2.5">
                  <div className="text-[9px] font-semibold font-mono uppercase tracking-[0.08em] text-ghost mb-0.5">
                    {item.label}
                  </div>
                  <div className={cn("text-[18px] font-semibold font-mono", item.accent ? "text-sage" : "text-ink")}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-white border border-dashed border-border rounded-[16px] p-10 text-center mb-5">
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
            className="h-10 px-5 rounded-[13px] bg-sage text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(62,91,77,0.22)] hover:bg-sage/90 transition-colors"
          >
            + New Pay Period
          </button>
        </div>
      )}

      {/* Action button (when periods exist) */}
      {hasPeriods && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setModalOpen(true)}
            className="h-10 px-4 rounded-[12px] bg-sage text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(62,91,77,0.22)] hover:bg-sage/90 transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 6v12M6 12h12" />
            </svg>
            New Pay Period
          </button>
        </div>
      )}

      {/* Period list */}
      {hasPeriods && (
        <>
          <div className="text-[11px] font-semibold font-mono uppercase tracking-[0.1em] text-ghost mb-2.5">
            All pay periods
          </div>
          <div className="flex flex-col gap-2">
            {periods.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/hoursboard?period=${p.id}`}
                className="bg-white border border-border-soft rounded-[14px] px-4 py-3 flex items-center justify-between hover:border-sage/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink truncate">
                    {p.displayName}
                  </div>
                  {p.name && (
                    <div className="text-[11px] text-ghost mt-0.5">{p.label}</div>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-3">
                  <div className="text-right">
                    <div className="text-[13px] font-semibold font-mono text-ink">
                      {formatHours(p.summary.totalHours)}
                    </div>
                    <div className="text-[12px] font-semibold font-mono text-sage">
                      {formatCurrency(p.summary.estimatedGross)}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-ghost">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <NewPayPeriodModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
