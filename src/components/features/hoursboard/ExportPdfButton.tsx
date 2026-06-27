"use client";

import type { PayPeriodDisplay } from "@/types";
import { exportPayPeriodPdf } from "@/lib/exportPdf";

interface Props {
  period: PayPeriodDisplay;
  employerName: string;
}

export function ExportPdfButton({ period, employerName }: Props) {
  return (
    <button
      type="button"
      onClick={() => exportPayPeriodPdf({ period, employerName })}
      aria-label="Export PDF"
      className="w-[38px] h-[38px] rounded-[11px] border border-border bg-white flex items-center justify-center text-subtle hover:text-ink hover:border-sage/40 transition-colors"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}
